"""Goodreads CSV import router."""

import asyncio
import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.user import User
from ..models.book import Book
from ..models.user_book import UserBook
from ..auth import get_current_user
from ..schemas.goodreads import GoodreadsResolveMatch
from .books import (
    _openlibrary_get,
    _fetch_google_books_enrichment,
    _fetch_openlibrary_author_bio,
    _extract_subject_names,
    _clean_genre_names,
    _get_or_create_genres,
    _parse_loose_date,
)

router = APIRouter(prefix="/api/goodreads", tags=["goodreads"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
SEARCH_CONCURRENCY = 5  # cap concurrent OpenLibrary lookups during import
ENRICH_CONCURRENCY = 5  # cap concurrent Google Books enrichment calls during import

STATUS_MAP = {
    "read": "finished",
    "currently-reading": "currently_reading",
    "to-read": "want_to_read",
}


def clean_isbn(raw: str) -> str | None:
    if not raw:
        return None
    cleaned = raw.strip()
    if cleaned.startswith('="') and cleaned.endswith('""'):
        cleaned = cleaned[2:-1]
    cleaned = cleaned.replace("-", "").replace(" ", "").strip()
    if len(cleaned) == 13 and cleaned.isdigit():
        return cleaned
    if len(cleaned) == 10 and cleaned[:-1].isdigit() and cleaned[-1] in "0123456789X":
        return cleaned
    return None


async def _search_match(title: str, author: str, semaphore: asyncio.Semaphore) -> dict:
    """Best-effort OpenLibrary title/author match for rows with no usable ISBN.

    Goodreads CSV exports frequently omit ISBN for older or library-sourced
    books, which otherwise leaves the imported book with no cover art at all.
    """
    query = f"{title} {author}".strip() if author else title
    async with semaphore:
        try:
            data = await _openlibrary_get(
                "https://openlibrary.org/search.json",
                params={"q": query, "limit": 1},
            )
        except HTTPException:
            return {}

    docs = data.get("docs", [])
    if not docs:
        return {}
    doc = docs[0]
    isbns = doc.get("isbn", [])
    matched_isbn = None
    for candidate in isbns:
        matched_isbn = clean_isbn(candidate)
        if matched_isbn:
            break
    cover_id = doc.get("cover_i")
    cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None
    author_keys = doc.get("author_key", [])
    author_url = (
        f"https://openlibrary.org/authors/{author_keys[0]}" if author_keys else None
    )
    return {
        "isbn": matched_isbn,
        "cover_url": cover_url,
        "subjects": doc.get("subject", []),
        "author_url": author_url,
    }


def _csv_page_count(row: dict) -> int | None:
    raw = (row.get("Number of Pages") or "").strip()
    return int(raw) if raw.isdigit() else None


def _csv_publication_date(row: dict):
    raw = (row.get("Original Publication Year") or row.get("Year Published") or "").strip()
    return _parse_loose_date(raw) if raw else None


async def _enrich_metadata(
    isbn: str | None,
    title: str,
    author: str,
    subjects: list[str],
    author_url: str | None,
    semaphore: asyncio.Semaphore,
) -> dict:
    """Fetch description/genres/author bio for a newly imported book.

    Goodreads CSVs carry no description or author bio at all, so every
    genuinely new book needs at least one enrichment round-trip to match
    the data depth of a manual/ISBN import.
    """
    async with semaphore:
        google = await _fetch_google_books_enrichment(isbn, title, author)
        author_bio = await _fetch_openlibrary_author_bio(author_url)
    genre_names = _clean_genre_names(subjects, google.get("categories", []))
    return {
        "description": google.get("description"),
        "author_bio": author_bio,
        "genre_names": genre_names,
        "page_count": google.get("page_count"),
        "published_date": _parse_loose_date(google.get("published_date")),
        "external_rating": google.get("rating"),
        "external_rating_count": google.get("rating_count"),
        "buy_link": google.get("buy_link"),
    }


@router.post("/import")
async def import_goodreads_csv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import books from a Goodreads CSV export."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    # Pre-collect all rows and unique ISBNs for batch lookup
    rows = list(reader)
    all_isbns = set()
    for row in rows:
        isbn = clean_isbn(row.get("ISBN", "")) or clean_isbn(row.get("ISBN13", ""))
        if isbn:
            all_isbns.add(isbn)

    # For rows with no usable ISBN, fall back to an OpenLibrary title/author
    # search so these books still get matched and get cover art.
    semaphore = asyncio.Semaphore(SEARCH_CONCURRENCY)
    search_tasks: dict[int, asyncio.Task] = {}
    for idx, row in enumerate(rows):
        title = row.get("Title", "").strip()
        if not title:
            continue
        isbn = clean_isbn(row.get("ISBN", "")) or clean_isbn(row.get("ISBN13", ""))
        if isbn:
            continue
        author = row.get("Author", "").strip()
        search_tasks[idx] = asyncio.create_task(_search_match(title, author, semaphore))

    search_results: dict[int, dict] = {}
    for idx, task in search_tasks.items():
        search_results[idx] = await task
        matched_isbn = search_results[idx].get("isbn")
        if matched_isbn:
            all_isbns.add(matched_isbn)

    # Batch lookup: fetch all existing books by ISBN (explicit + search-matched) in one query
    existing_books_map: dict[str, Book] = {}
    if all_isbns:
        result = await db.execute(
            select(Book).where(Book.isbn.in_(list(all_isbns)))
        )
        for book in result.scalars().all():
            if book.isbn:
                existing_books_map[book.isbn] = book

    # Batch lookup: fetch all existing user_book entries for these books
    existing_book_ids = [b.id for b in existing_books_map.values()]
    existing_user_books: set[int] = set()
    if existing_book_ids:
        ub_result = await db.execute(
            select(UserBook.book_id).where(
                UserBook.user_id == user.id,
                UserBook.book_id.in_(existing_book_ids),
            )
        )
        existing_user_books = set(ub_result.scalars().all())

    # For rows that will become genuinely new books (no existing DB match),
    # fetch description/genres/author bio so imported books reach the same
    # data depth as a manual ISBN import instead of just title+author+cover.
    enrich_semaphore = asyncio.Semaphore(ENRICH_CONCURRENCY)
    enrich_tasks: dict[int, asyncio.Task] = {}
    for idx, row in enumerate(rows):
        title = row.get("Title", "").strip()
        if not title:
            continue
        explicit_isbn = clean_isbn(row.get("ISBN", "")) or clean_isbn(row.get("ISBN13", ""))
        search_match = search_results.get(idx, {})
        isbn = explicit_isbn or search_match.get("isbn")
        if not isbn:
            # No full match (no ISBN from the CSV or from the OpenLibrary
            # search fallback) — this row needs manual review, so skip
            # enrichment entirely rather than spending a round-trip on it.
            continue
        if isbn in existing_books_map:
            continue
        author = row.get("Author", "").strip()
        enrich_tasks[idx] = asyncio.create_task(
            _enrich_metadata(
                isbn,
                title,
                author,
                search_match.get("subjects", []),
                search_match.get("author_url"),
                enrich_semaphore,
            )
        )

    enrich_results: dict[int, dict] = {}
    for idx, task in enrich_tasks.items():
        enrich_results[idx] = await task

    imported = 0
    skipped = 0
    errors = 0
    needs_review = 0
    results = []

    for idx, row in enumerate(rows):
        title = row.get("Title", "").strip()
        if not title:
            skipped += 1
            results.append({"title": "(empty)", "status": "skipped"})
            continue

        author = row.get("Author", "").strip()
        explicit_isbn = clean_isbn(row.get("ISBN", "")) or clean_isbn(row.get("ISBN13", ""))
        search_match = search_results.get(idx, {})
        isbn = explicit_isbn or search_match.get("isbn")

        rating_str = row.get("My Rating", "0").strip()
        try:
            rating = int(rating_str) if rating_str and rating_str != "0" else None
        except ValueError:
            rating = None
        if rating is not None and not (1 <= rating <= 5):
            rating = None

        shelf = row.get("Exclusive Shelf", "to-read").strip()
        status = STATUS_MAP.get(shelf, "want_to_read")

        if not isbn:
            # Neither the CSV nor the OpenLibrary search fallback resolved an
            # ISBN, so this isn't a full match — surface it for the user to
            # manually search and pick the right book instead of importing a
            # bare title/author stub with no cover or metadata.
            needs_review += 1
            results.append({
                "title": title,
                "status": "needs_review",
                "pending": {
                    "title": title,
                    "author": author or "Unknown",
                    "reading_status": status,
                    "rating": rating,
                    "page_count": _csv_page_count(row),
                    "publication_date": _csv_publication_date(row),
                },
            })
            continue

        row_status = None
        try:
            # Use savepoint isolation so an IntegrityError on one row
            # doesn't invalidate the session for remaining rows
            async with db.begin_nested():
                # Use pre-fetched book from batch lookup
                book = existing_books_map.get(isbn)

                if not book:
                    cover_url = search_match.get("cover_url") or (
                        f"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg"
                    )
                    enrichment = enrich_results.get(idx, {})
                    book = Book(
                        title=title,
                        author=author or "Unknown",
                        author_bio=enrichment.get("author_bio"),
                        isbn=isbn,
                        description=enrichment.get("description"),
                        cover_url=cover_url,
                        publication_date=_csv_publication_date(row) or enrichment.get("published_date"),
                        page_count=_csv_page_count(row) or enrichment.get("page_count"),
                        external_rating=enrichment.get("external_rating"),
                        external_rating_count=enrichment.get("external_rating_count"),
                        buy_link=enrichment.get("buy_link"),
                    )
                    book.genres = await _get_or_create_genres(db, enrichment.get("genre_names", []))
                    db.add(book)
                    await db.flush()
                    existing_books_map[isbn] = book

                # Check if already in user's library (using pre-fetched set)
                if book.id in existing_user_books:
                    row_status = "already_in_library"
                else:
                    now = datetime.now(timezone.utc)
                    ub = UserBook(
                        user_id=user.id,
                        book_id=book.id,
                        status=status,
                        rating=rating,
                        date_started=now if status == "currently_reading" else None,
                        date_finished=now if status == "finished" else None,
                    )
                    db.add(ub)
                    await db.flush()
                    existing_user_books.add(book.id)
                    row_status = "imported"

            # Savepoint released successfully — update counters
            if row_status == "imported":
                imported += 1
            else:
                skipped += 1
            results.append({"title": title, "status": row_status})
        except Exception as e:
            errors += 1
            results.append(
                {"title": title, "status": "error", "error": str(e)}
            )

    await db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "needs_review": needs_review,
        "total": imported + skipped + errors + needs_review,
        "results": results,
    }


@router.post("/resolve")
async def resolve_goodreads_match(
    data: GoodreadsResolveMatch,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Finish importing a row the CSV import couldn't fully match.

    Takes the ISBN of a book the user picked via manual search (e.g. against
    `/api/books/search-external`) plus the reading status/rating/etc. carried
    over from the original CSV row, and creates the book (if it isn't already
    in the catalog) and the user's library entry for it.
    """
    isbn = clean_isbn(data.isbn)
    if not isbn:
        raise HTTPException(status_code=400, detail="A valid ISBN is required")

    result = await db.execute(select(Book).where(Book.isbn == isbn))
    book = result.scalar_one_or_none()

    if not book:
        ol_data = await _openlibrary_get(
            "https://openlibrary.org/api/books.json",
            params={"bibkeys": f"ISBN:{isbn}", "format": "data", "jscmd": "data"},
        )
        ol = ol_data.get(f"ISBN:{isbn}", {})
        title = ol.get("title") or data.title
        authors_raw = ol.get("authors", [])
        author = ", ".join(a.get("name", "") for a in authors_raw) or data.author
        cover_url = ol.get("cover", {}).get("large", ol.get("cover", {}).get("medium")) or (
            f"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg"
        )
        desc = ol.get("notes") if isinstance(ol.get("notes"), str) else None
        pub_date = _parse_loose_date(ol.get("publish_date")) or data.publication_date
        page_count = ol.get("number_of_pages") or data.page_count
        subjects = _extract_subject_names(ol.get("subjects"))
        author_url = authors_raw[0].get("url") if authors_raw else None

        google = await _fetch_google_books_enrichment(isbn, title, author)
        author_bio = await _fetch_openlibrary_author_bio(author_url)
        desc = desc or google.get("description")
        pub_date = pub_date or _parse_loose_date(google.get("published_date"))
        page_count = page_count or google.get("page_count")
        genre_names = _clean_genre_names(subjects, google.get("categories", []))

        book = Book(
            title=title,
            author=author,
            author_bio=author_bio,
            isbn=isbn,
            description=desc,
            cover_url=cover_url,
            publication_date=pub_date,
            page_count=page_count,
            external_rating=google.get("rating"),
            external_rating_count=google.get("rating_count"),
            buy_link=google.get("buy_link"),
        )
        book.genres = await _get_or_create_genres(db, genre_names)
        db.add(book)
        try:
            await db.flush()
        except IntegrityError:
            # Another concurrent request created a Book with this ISBN first.
            await db.rollback()
            result = await db.execute(select(Book).where(Book.isbn == isbn))
            book = result.scalar_one()

    existing = await db.execute(
        select(UserBook).where(UserBook.user_id == user.id, UserBook.book_id == book.id)
    )
    if existing.scalar_one_or_none():
        await db.commit()
        return {"title": book.title, "status": "already_in_library"}

    now = datetime.now(timezone.utc)
    ub = UserBook(
        user_id=user.id,
        book_id=book.id,
        status=data.reading_status.value,
        rating=data.rating,
        date_started=now if data.reading_status.value == "currently_reading" else None,
        date_finished=now if data.reading_status.value == "finished" else None,
    )
    db.add(ub)
    try:
        await db.commit()
    except IntegrityError:
        # Another concurrent request already added this book to the user's
        # library first — that's the same end state, so treat it as success.
        await db.rollback()
        return {"title": book.title, "status": "already_in_library"}
    return {"title": book.title, "status": "imported"}
