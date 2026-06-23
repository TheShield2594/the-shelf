import asyncio
import datetime
import re
import time
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..config import settings
from ..database import get_db
from ..models.book import Book, book_genres
from ..models.genre import Genre
from ..models.user_book import UserBook
from ..models.review import Review
from ..models.content_rating import ContentRating
from ..models.related_book import RelatedBook
from ..models.user import User
from ..schemas.book import (
    BookCreate,
    BookUpdate,
    BookOut,
    BookDetail,
    BookSummary,
    ContentRatingAvg,
    OpenLibraryImport,
    RecommendationOut,
)
from ..schemas.trending import TrendingBookOut, TrendingListOut, TrendingResponse
from ..services.recommendations import get_recommendations_for_user
from ..auth import get_current_admin_user, get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/books", tags=["books"])

# Reusable httpx client for external API calls
_http_client: httpx.AsyncClient | None = None
_http_client_lock = asyncio.Lock()


async def get_http_client() -> httpx.AsyncClient:
    """Return the shared httpx.AsyncClient, creating it if needed.

    Uses an asyncio.Lock with double-check to prevent concurrent
    requests from creating multiple client instances.
    """
    global _http_client
    if _http_client is not None and not _http_client.is_closed:
        return _http_client
    async with _http_client_lock:
        # Double-check after acquiring the lock
        if _http_client is not None and not _http_client.is_closed:
            return _http_client
        _http_client = httpx.AsyncClient(timeout=10)
    return _http_client


async def _openlibrary_get(url: str, params: dict) -> dict:
    """Shared helper for OpenLibrary GET requests.

    Wraps httpx transport errors and JSON parse errors into 502 responses.
    """
    client = await get_http_client()
    try:
        resp = await client.get(url, params=params)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="OpenLibrary service unavailable")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="OpenLibrary service unavailable")
    try:
        return resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to parse OpenLibrary response")


# ---------------------------------------------------------------------------
# Enrichment helpers (Google Books + OpenLibrary authors/subjects)
#
# These augment OpenLibrary's bibliographic data with description/rating/
# genre/buy-link data Open Library doesn't have. They are best-effort: any
# failure returns an empty result rather than failing the request, since a
# missing rating shouldn't block an ISBN lookup or import.
# ---------------------------------------------------------------------------

_GENRE_NOISE = {
    "protected daisy",
    "in library",
    "accessible book",
    "large type books",
    "open library staff picks",
    "overdrive",
    "internet archive wishlist",
    "lending library",
    "popular print disabled books",
}


async def _google_books_get(params: dict) -> dict:
    """Best-effort GET against the Google Books API. Returns {} on any failure."""
    client = await get_http_client()
    if settings.google_books_api_key:
        params = {**params, "key": settings.google_books_api_key}
    try:
        resp = await client.get(
            "https://www.googleapis.com/books/v1/volumes", params=params
        )
    except httpx.HTTPError:
        return {}
    if resp.status_code != 200:
        return {}
    try:
        return resp.json()
    except Exception:
        return {}


async def _fetch_google_books_enrichment(
    isbn: str | None, title: str | None = None, author: str | None = None
) -> dict:
    """Fetch description/rating/genres/buy-link for a book from Google Books."""
    if isbn:
        query = f"isbn:{isbn}"
    elif title:
        query = f"intitle:{title}"
        if author:
            query += f"+inauthor:{author}"
    else:
        return {}

    data = await _google_books_get({"q": query, "maxResults": 1})
    items = data.get("items")
    if not items:
        return {}

    info = items[0].get("volumeInfo", {})
    sale = items[0].get("saleInfo", {})
    return {
        "description": info.get("description"),
        "rating": info.get("averageRating"),
        "rating_count": info.get("ratingsCount"),
        "categories": info.get("categories", []),
        "buy_link": sale.get("buyLink"),
        "page_count": info.get("pageCount"),
        "published_date": info.get("publishedDate"),
    }


async def _fetch_openlibrary_author_bio(author_url: str | None) -> str | None:
    """Fetch an author's bio from OpenLibrary's Authors API given their profile URL."""
    if not author_url:
        return None
    author_key = author_url.rstrip("/").rsplit("/", 1)[-1]
    client = await get_http_client()
    try:
        resp = await client.get(f"https://openlibrary.org/authors/{author_key}.json")
    except httpx.HTTPError:
        return None
    if resp.status_code != 200:
        return None
    try:
        data = resp.json()
    except Exception:
        return None
    bio = data.get("bio")
    return bio.get("value") if isinstance(bio, dict) else bio


def _parse_loose_date(raw: str | None) -> "datetime.date | None":
    """Parse OpenLibrary/Google Books date strings, which vary widely in format.

    Examples seen: "2018-02-27", "2018-02", "2018", "March 27, 2018", "March 2018".
    Falls back to Jan 1 of the year if only a year is found.
    """
    if not raw:
        return None
    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%Y-%m", "%B %d, %Y", "%B %Y", "%Y"):
        try:
            return datetime.datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    match = re.search(r"\d{4}", raw)
    if match:
        return datetime.date(int(match.group()), 1, 1)
    return None


def _extract_subject_names(subjects) -> list[str]:
    """Normalize OpenLibrary's subjects field, which may be dicts or plain strings."""
    names = []
    for s in subjects or []:
        name = s.get("name") if isinstance(s, dict) else s
        if name:
            names.append(name)
    return names


def _clean_genre_names(*sources: list[str], limit: int = 8) -> list[str]:
    """Flatten, dedupe, and filter genre/category names from multiple sources.

    Splits Google's "Fiction / Thrillers" BISAC-style categories into separate
    tags and drops OpenLibrary's non-genre administrative subjects.
    """
    seen = set()
    cleaned = []
    for source in sources:
        for raw in source or []:
            if not isinstance(raw, str):
                continue
            for part in raw.split(" / "):
                name = part.strip()
                key = name.lower()
                if not name or key in seen or key in _GENRE_NOISE:
                    continue
                seen.add(key)
                cleaned.append(name)
                if len(cleaned) >= limit:
                    return cleaned
    return cleaned


async def _get_or_create_genres(db: AsyncSession, names: list[str]) -> list[Genre]:
    """Match genre names to existing Genre rows case-insensitively, creating new ones.

    Inserts happen inside a savepoint so a unique-constraint race against a
    concurrent request (both missing the SELECT, both inserting) falls back
    to re-fetching the row instead of raising.
    """
    genres = []
    for name in names:
        result = await db.execute(select(Genre).where(Genre.name.ilike(name)))
        genre = result.scalar_one_or_none()
        if not genre:
            try:
                async with db.begin_nested():
                    genre = Genre(name=name)
                    db.add(genre)
                    await db.flush()
            except IntegrityError:
                result = await db.execute(select(Genre).where(Genre.name.ilike(name)))
                genre = result.scalar_one_or_none()
        genres.append(genre)
    return genres


# ---------------------------------------------------------------------------
# Lookup & Search endpoints (must be defined before /{book_id})
# ---------------------------------------------------------------------------


@router.get("/lookup/{isbn}")
async def lookup_isbn(
    isbn: str,
    save: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    """Look up a book by ISBN. Checks the database first, then OpenLibrary.

    If save=True, the book is persisted to the database before returning.
    Requires authentication when save=True.
    """
    clean_isbn = isbn.replace("-", "").replace(" ", "")

    # Check database first
    result = await db.execute(
        select(Book).where(Book.isbn == clean_isbn)
    )
    book = result.scalar_one_or_none()
    if book:
        avg_r, r_count, cr = await _compute_book_stats(db, book.id)
        return {
            "source": "database",
            "book": _book_to_summary(book, avg_r, r_count, cr),
        }

    # Query OpenLibrary
    data = await _openlibrary_get(
        "https://openlibrary.org/api/books.json",
        params={
            "bibkeys": f"ISBN:{clean_isbn}",
            "format": "data",
            "jscmd": "data",
        },
    )

    key = f"ISBN:{clean_isbn}"
    if key not in data:
        raise HTTPException(
            status_code=404, detail="Book not found for this ISBN"
        )

    ol = data[key]
    title = ol.get("title", "")
    authors_raw = ol.get("authors", [])
    authors = ", ".join(a.get("name", "") for a in authors_raw)
    cover = ol.get("cover", {}).get(
        "large", ol.get("cover", {}).get("medium")
    )
    desc = ol.get("notes") if isinstance(ol.get("notes"), str) else None
    pub_date = _parse_loose_date(ol.get("publish_date"))
    page_count = ol.get("number_of_pages")
    subjects = _extract_subject_names(ol.get("subjects"))

    google = await _fetch_google_books_enrichment(clean_isbn, title, authors)
    author_bio = await _fetch_openlibrary_author_bio(
        authors_raw[0].get("url") if authors_raw else None
    )
    desc = desc or google.get("description")
    pub_date = pub_date or _parse_loose_date(google.get("published_date"))
    page_count = page_count or google.get("page_count")
    genre_names = _clean_genre_names(subjects, google.get("categories", []))

    if save:
        if not user:
            raise HTTPException(
                status_code=401, detail="Authentication required to save books"
            )
        book = Book(
            title=title,
            author=authors,
            author_bio=author_bio,
            isbn=clean_isbn,
            description=desc,
            cover_url=cover,
            publication_date=pub_date,
            page_count=page_count,
            external_rating=google.get("rating"),
            external_rating_count=google.get("rating_count"),
            buy_link=google.get("buy_link"),
        )
        book.genres = await _get_or_create_genres(db, genre_names)
        db.add(book)
        await db.commit()
        await db.refresh(book)
        return {
            "source": "openlibrary_saved",
            "book": _book_to_summary(book, None, 0, None),
        }

    return {
        "source": "openlibrary",
        "book": {
            "title": title,
            "author": authors,
            "author_bio": author_bio,
            "isbn": clean_isbn,
            "description": desc,
            "cover_url": cover,
            "publication_date": pub_date,
            "page_count": page_count,
            "genres": genre_names,
            "avg_rating": None,
            "rating_count": 0,
            "external_rating": google.get("rating"),
            "external_rating_count": google.get("rating_count"),
            "buy_link": google.get("buy_link"),
            "content_rating": None,
        },
    }


@router.get("/search-external")
async def search_external(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, le=50),
):
    """Search OpenLibrary for books without saving to database."""
    results = await _openlibrary_get(
        "https://openlibrary.org/search.json",
        params={
            "q": q,
            "limit": limit,
            "fields": "title,author_name,isbn,cover_i,first_publish_year,subject",
        },
    )

    books = []
    for doc in results.get("docs", []):
        cover_id = doc.get("cover_i")
        cover = (
            f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
            if cover_id
            else None
        )
        isbns = doc.get("isbn", [])
        pub_year = doc.get("first_publish_year")
        pub_date = f"{pub_year}-01-01" if pub_year else None
        # search.json's "subject" field is free (no extra request); per-result
        # Google Books/author-bio enrichment is skipped here since this can
        # return up to 50 results and we don't want 50x extra external calls.
        genre_names = _clean_genre_names(doc.get("subject", []))
        books.append(
            {
                "title": doc.get("title", ""),
                "author": ", ".join(doc.get("author_name", [])),
                "isbn": isbns[0] if isbns else None,
                "cover_url": cover,
                "publication_date": pub_date,
                "description": None,
                "genres": genre_names,
                "avg_rating": None,
                "rating_count": 0,
                "content_rating": None,
            }
        )
    return books


# ---------------------------------------------------------------------------
# Trending — NYT Best Sellers (optional; requires NYT_BOOKS_API_KEY)
# ---------------------------------------------------------------------------

# NYT bestseller lists only refresh weekly, and the free API tier is capped
# at 5 requests/minute and 500/day, so the raw overview response is cached
# in-process well past any plausible page-load frequency.
_NYT_CACHE_TTL_SECONDS = 6 * 60 * 60
_nyt_cache: dict | None = None
_nyt_cache_time: float = 0.0

# Curated subset of NYT's ~50 current lists, in display order. Kept small so
# the page stays focused rather than mirroring NYT's full site.
_NYT_DEFAULT_LISTS = {
    "combined-print-and-e-book-fiction": "Fiction",
    "combined-print-and-e-book-nonfiction": "Nonfiction",
}


async def _fetch_nyt_overview() -> dict:
    global _nyt_cache, _nyt_cache_time
    now = time.monotonic()
    if _nyt_cache is not None and now - _nyt_cache_time < _NYT_CACHE_TTL_SECONDS:
        return _nyt_cache

    client = await get_http_client()
    try:
        resp = await client.get(
            "https://api.nytimes.com/svc/books/v3/lists/overview.json",
            params={"api-key": settings.nyt_books_api_key},
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="NYT Books service unavailable")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="NYT Books service unavailable")
    try:
        data = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to parse NYT Books response")

    _nyt_cache = data
    _nyt_cache_time = now
    return data


@router.get("/trending", response_model=TrendingResponse)
async def get_trending(db: AsyncSession = Depends(get_db)):
    """Currently trending books, sourced from the NYT Best Sellers lists.

    This is an optional, self-hosted-friendly feature: if NYT_BOOKS_API_KEY
    isn't configured, this returns enabled=False rather than erroring, so
    instances that skip the key just see the feature quietly disabled.
    """
    if not settings.nyt_books_api_key:
        return TrendingResponse(enabled=False, lists=[])

    data = await _fetch_nyt_overview()
    lists_by_encoded = {
        lst.get("list_name_encoded"): lst for lst in data.get("results", {}).get("lists", [])
    }
    selected = [
        (encoded, display, lists_by_encoded[encoded])
        for encoded, display in _NYT_DEFAULT_LISTS.items()
        if encoded in lists_by_encoded
    ]

    isbns = {
        isbn
        for _, _, lst in selected
        for b in lst.get("books", [])
        if (isbn := b.get("primary_isbn13") or b.get("primary_isbn10"))
    }

    # Match against locally-known books so cards can link to the shelf's own
    # book page instead of always treating NYT entries as external.
    book_id_by_isbn: dict[str, int] = {}
    if isbns:
        result = await db.execute(select(Book.id, Book.isbn).where(Book.isbn.in_(isbns)))
        book_id_by_isbn = {isbn: bid for bid, isbn in result.all()}

    out_lists = []
    for encoded, display, lst in selected:
        books_out = []
        for b in lst.get("books", []):
            isbn = b.get("primary_isbn13") or b.get("primary_isbn10")
            books_out.append(
                TrendingBookOut(
                    title=b.get("title", ""),
                    author=b.get("author", ""),
                    isbn=isbn,
                    cover_url=b.get("book_image") or None,
                    description=b.get("description") or None,
                    buy_link=b.get("amazon_product_url") or None,
                    rank=b.get("rank", 0),
                    weeks_on_list=b.get("weeks_on_list", 0),
                    book_id=book_id_by_isbn.get(isbn) if isbn else None,
                )
            )
        out_lists.append(
            TrendingListOut(list_name=encoded, display_name=display, books=books_out)
        )

    return TrendingResponse(enabled=True, lists=out_lists)


# ---------------------------------------------------------------------------
# Recommendations — personalized, based on the user's own finished+rated books
# ---------------------------------------------------------------------------


@router.get("/recommendations", response_model=list[RecommendationOut])
async def get_recommendations(
    limit: int = Query(12, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Books similar to what the current user has finished and rated highly.

    Returns an empty list rather than erroring if the user hasn't rated
    enough books yet — there's simply nothing to base suggestions on.
    """
    results = await get_recommendations_for_user(db, current_user.id, limit=limit)

    book_ids = [book.id for book, _ in results]
    stats = await _compute_batch_stats(db, book_ids)

    return [
        RecommendationOut(
            book=_book_to_summary(book, *stats.get(book.id, (None, 0, None))),
            reason=reason,
        )
        for book, reason in results
    ]


# ---------------------------------------------------------------------------
# Stats helpers — optimized batch queries
# ---------------------------------------------------------------------------


async def _compute_book_stats(db: AsyncSession, book_id: int):
    """Compute avg rating, rating count, and content rating for a single book.

    Uses a single combined query for content rating averages + tag aggregation
    instead of separate round-trips.
    """
    # Combine rating avg/count into one query
    rating_result = await db.execute(
        select(func.avg(UserBook.rating), func.count(UserBook.rating)).where(
            UserBook.book_id == book_id, UserBook.rating.isnot(None)
        )
    )
    avg_rating, rating_count = rating_result.one()

    # Single query for content rating averages + count + tags (using array_agg)
    cr_result = await db.execute(
        select(
            func.avg(ContentRating.violence_level),
            func.avg(ContentRating.language_level),
            func.avg(ContentRating.sexual_content_level),
            func.avg(ContentRating.substance_use_level),
            func.count(ContentRating.id),
        ).where(ContentRating.book_id == book_id)
    )
    cr_row = cr_result.one()
    cr_count = cr_row[4]

    content_rating = None
    if cr_count > 0:
        # Fetch tags only when they exist (avoid unnecessary query otherwise)
        all_tags_result = await db.execute(
            select(ContentRating.other_tags).where(
                ContentRating.book_id == book_id,
                ContentRating.other_tags.isnot(None),
            )
        )
        all_tags = []
        for (tags,) in all_tags_result:
            if tags:
                all_tags.extend(tags)
        from collections import Counter

        tag_counts = Counter(all_tags)
        common = [t for t, c in tag_counts.most_common(10)]

        content_rating = ContentRatingAvg(
            violence_level=round(float(cr_row[0] or 0), 1),
            language_level=round(float(cr_row[1] or 0), 1),
            sexual_content_level=round(float(cr_row[2] or 0), 1),
            substance_use_level=round(float(cr_row[3] or 0), 1),
            common_tags=common,
            count=cr_count,
        )

    return (
        round(float(avg_rating), 2) if avg_rating else None,
        rating_count or 0,
        content_rating,
    )


async def _compute_batch_stats(db: AsyncSession, book_ids: list[int]) -> dict[int, tuple]:
    """Compute stats for multiple books in a single set of queries.

    Returns a dict mapping book_id -> (avg_rating, rating_count, content_rating).
    This eliminates N+1 query patterns when listing multiple books.
    """
    if not book_ids:
        return {}

    # Single query for all ratings
    rating_result = await db.execute(
        select(
            UserBook.book_id,
            func.avg(UserBook.rating),
            func.count(UserBook.rating),
        )
        .where(UserBook.book_id.in_(book_ids), UserBook.rating.isnot(None))
        .group_by(UserBook.book_id)
    )
    rating_map = {row[0]: (row[1], row[2]) for row in rating_result}

    # Single query for all content rating averages
    cr_result = await db.execute(
        select(
            ContentRating.book_id,
            func.avg(ContentRating.violence_level),
            func.avg(ContentRating.language_level),
            func.avg(ContentRating.sexual_content_level),
            func.avg(ContentRating.substance_use_level),
            func.count(ContentRating.id),
        )
        .where(ContentRating.book_id.in_(book_ids))
        .group_by(ContentRating.book_id)
    )
    cr_map = {row[0]: row for row in cr_result}

    # Single query for all tags (only for books that have content ratings)
    books_with_cr = list(cr_map.keys())
    tags_map: dict[int, list[str]] = {}
    if books_with_cr:
        tags_result = await db.execute(
            select(ContentRating.book_id, ContentRating.other_tags)
            .where(
                ContentRating.book_id.in_(books_with_cr),
                ContentRating.other_tags.isnot(None),
            )
        )
        for book_id, tags in tags_result:
            if tags:
                tags_map.setdefault(book_id, []).extend(tags)

    from collections import Counter

    result = {}
    for bid in book_ids:
        avg_r, r_count = rating_map.get(bid, (None, 0))
        cr_row = cr_map.get(bid)
        content_rating = None
        if cr_row and cr_row[5] > 0:
            tags = tags_map.get(bid, [])
            tag_counts = Counter(tags)
            common = [t for t, c in tag_counts.most_common(10)]
            content_rating = ContentRatingAvg(
                violence_level=round(float(cr_row[1] or 0), 1),
                language_level=round(float(cr_row[2] or 0), 1),
                sexual_content_level=round(float(cr_row[3] or 0), 1),
                substance_use_level=round(float(cr_row[4] or 0), 1),
                common_tags=common,
                count=cr_row[5],
            )
        result[bid] = (
            round(float(avg_r), 2) if avg_r else None,
            r_count or 0,
            content_rating,
        )
    return result


def _book_to_summary(book: Book, avg_rating, rating_count, content_rating) -> BookSummary:
    return BookSummary.model_validate(book).model_copy(
        update={
            "avg_rating": avg_rating,
            "rating_count": rating_count,
            "content_rating": content_rating,
        }
    )


def _book_to_out(book: Book, avg_rating, rating_count, content_rating) -> BookOut:
    return BookOut.model_validate(book).model_copy(
        update={
            "avg_rating": avg_rating,
            "rating_count": rating_count,
            "content_rating": content_rating,
        }
    )


# ---------------------------------------------------------------------------
# CRUD endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=list[BookSummary])
async def list_books(
    q: str | None = Query(None),
    genre: str | None = Query(None),
    max_violence: int | None = Query(None, ge=0, le=4),
    max_language: int | None = Query(None, ge=0, le=4),
    max_sexual: int | None = Query(None, ge=0, le=4),
    max_substance: int | None = Query(None, ge=0, le=4),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Book).options(selectinload(Book.genres))

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(Book.title.ilike(pattern), Book.author.ilike(pattern))
        )

    if genre:
        stmt = stmt.join(book_genres).join(Genre).where(Genre.name.ilike(f"%{genre}%"))

    content_filters = [
        (max_violence, ContentRating.violence_level),
        (max_language, ContentRating.language_level),
        (max_sexual, ContentRating.sexual_content_level),
        (max_substance, ContentRating.substance_use_level),
    ]
    active_filters = [(val, col) for val, col in content_filters if val is not None]
    if active_filters:
        for max_val, col in active_filters:
            sub = (
                select(ContentRating.book_id)
                .group_by(ContentRating.book_id)
                .having(func.avg(col) > max_val)
            )
            stmt = stmt.where(Book.id.notin_(sub))

    stmt = stmt.order_by(Book.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    books = result.scalars().unique().all()

    # Batch compute stats for all books in 3 queries instead of N*3
    book_ids = [b.id for b in books]
    stats = await _compute_batch_stats(db, book_ids)

    return [
        _book_to_summary(book, *stats.get(book.id, (None, 0, None)))
        for book in books
    ]


@router.get("/{book_id}", response_model=BookDetail)
async def get_book(book_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Book)
        .options(selectinload(Book.genres), selectinload(Book.related_to))
        .where(Book.id == book_id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    avg_r, r_count, cr = await _compute_book_stats(db, book.id)

    reviews_result = await db.execute(
        select(Review)
        .options(selectinload(Review.user))
        .where(Review.book_id == book_id)
        .order_by(Review.created_at.desc())
    )
    reviews = reviews_result.scalars().all()

    out = _book_to_out(book, avg_r, r_count, cr)
    return BookDetail(**out.model_dump(), reviews=reviews, related_books=book.related_to)


@router.post("", response_model=BookOut, status_code=201)
async def create_book(
    data: BookCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_admin_user),
):
    # Avoid creating duplicate catalog entries for a book that already exists,
    # which would let the same title be added to a shelf more than once under
    # different book ids.
    existing_stmt = select(Book).options(selectinload(Book.genres))
    if data.isbn:
        existing_stmt = existing_stmt.where(Book.isbn == data.isbn)
    else:
        existing_stmt = existing_stmt.where(
            func.lower(Book.title) == data.title.lower(),
            func.lower(Book.author) == data.author.lower(),
        )
    existing = (await db.execute(existing_stmt)).scalars().first()
    if existing:
        avg_r, r_count, cr = await _compute_book_stats(db, existing.id)
        return _book_to_out(existing, avg_r, r_count, cr)

    book = Book(
        title=data.title,
        author=data.author,
        isbn=data.isbn,
        description=data.description,
        cover_url=data.cover_url,
        publication_date=data.publication_date,
    )
    if data.genre_ids:
        genres = await db.execute(select(Genre).where(Genre.id.in_(data.genre_ids)))
        book.genres = list(genres.scalars().all())

    db.add(book)
    await db.commit()
    await db.refresh(book)
    avg_r, r_count, cr = await _compute_book_stats(db, book.id)
    return _book_to_out(book, avg_r, r_count, cr)


@router.put("/{book_id}", response_model=BookOut)
async def update_book(
    book_id: int,
    data: BookUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Book).options(selectinload(Book.genres)).where(Book.id == book_id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "genre_ids":
            genres = await db.execute(select(Genre).where(Genre.id.in_(value)))
            book.genres = list(genres.scalars().all())
        else:
            setattr(book, field, value)

    await db.commit()
    await db.refresh(book)
    avg_r, r_count, cr = await _compute_book_stats(db, book.id)
    return _book_to_out(book, avg_r, r_count, cr)


@router.delete("/{book_id}", status_code=204)
async def delete_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_admin_user),
):
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    await db.delete(book)
    await db.commit()


@router.post("/{book_id}/related/{related_id}", status_code=201)
async def add_related_book(
    book_id: int,
    related_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_admin_user),
):
    if book_id == related_id:
        raise HTTPException(
            status_code=400, detail="A book cannot be related to itself"
        )
    existing = await db.execute(
        select(RelatedBook).where(
            RelatedBook.book_id == book_id,
            RelatedBook.related_book_id == related_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Relationship already exists")
    db.add(RelatedBook(book_id=book_id, related_book_id=related_id))
    db.add(RelatedBook(book_id=related_id, related_book_id=book_id))
    await db.commit()
    return {"detail": "Related book added"}


@router.delete("/{book_id}/related/{related_id}", status_code=204)
async def remove_related_book(
    book_id: int,
    related_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_admin_user),
):
    result = await db.execute(
        select(RelatedBook).where(
            RelatedBook.book_id == book_id,
            RelatedBook.related_book_id == related_id,
        )
    )
    rel = result.scalar_one_or_none()
    if rel:
        await db.delete(rel)
    result2 = await db.execute(
        select(RelatedBook).where(
            RelatedBook.book_id == related_id,
            RelatedBook.related_book_id == book_id,
        )
    )
    rel2 = result2.scalar_one_or_none()
    if rel2:
        await db.delete(rel2)
    await db.commit()


@router.post("/import", response_model=BookOut, status_code=201)
async def import_from_open_library(
    data: OpenLibraryImport,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_admin_user),
):
    clean_isbn = data.query.replace("-", "").replace(" ", "") if data.isbn else None

    if data.isbn:
        result = await _openlibrary_get(
            "https://openlibrary.org/api/books.json",
            params={
                "bibkeys": f"ISBN:{clean_isbn}",
                "format": "data",
                "jscmd": "data",
            },
        )
        key = f"ISBN:{clean_isbn}"
        if key not in result:
            raise HTTPException(
                status_code=404, detail="Book not found on Open Library"
            )
        ol = result[key]
        title = ol.get("title", "")
        authors_raw = ol.get("authors", [])
        authors = ", ".join(a.get("name", "") for a in authors_raw)
        cover = ol.get("cover", {}).get(
            "large", ol.get("cover", {}).get("medium")
        )
        desc = ol.get("notes") if isinstance(ol.get("notes"), str) else None
        pub_date = _parse_loose_date(ol.get("publish_date"))
        page_count = ol.get("number_of_pages")
        subjects = _extract_subject_names(ol.get("subjects"))
        author_url = authors_raw[0].get("url") if authors_raw else None
    else:
        results = await _openlibrary_get(
            "https://openlibrary.org/search.json",
            params={"q": data.query, "limit": 1},
        )
        if not results.get("docs"):
            raise HTTPException(
                status_code=404, detail="Book not found on Open Library"
            )
        doc = results["docs"][0]
        title = doc.get("title", "")
        authors = ", ".join(doc.get("author_name", []))
        cover_id = doc.get("cover_i")
        cover = (
            f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
            if cover_id
            else None
        )
        desc = None
        pub_date = _parse_loose_date(str(doc.get("first_publish_year")) if doc.get("first_publish_year") else None)
        page_count = None
        subjects = doc.get("subject", [])
        author_keys = doc.get("author_key", [])
        author_url = (
            f"https://openlibrary.org/authors/{author_keys[0]}"
            if author_keys
            else None
        )

    google = await _fetch_google_books_enrichment(clean_isbn, title, authors)
    author_bio = await _fetch_openlibrary_author_bio(author_url)
    desc = desc or google.get("description")
    pub_date = pub_date or _parse_loose_date(google.get("published_date"))
    page_count = page_count or google.get("page_count")
    genre_names = _clean_genre_names(subjects, google.get("categories", []))

    book = Book(
        title=title,
        author=authors,
        author_bio=author_bio,
        isbn=clean_isbn,
        description=desc,
        cover_url=cover,
        publication_date=pub_date,
        page_count=page_count,
        external_rating=google.get("rating"),
        external_rating_count=google.get("rating_count"),
        buy_link=google.get("buy_link"),
    )
    book.genres = await _get_or_create_genres(db, genre_names)
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return _book_to_out(book, None, 0, None)
