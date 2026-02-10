from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models.book import Book, book_genres
from ..models.genre import Genre
from ..models.user_book import UserBook
from ..models.review import Review
from ..models.content_rating import ContentRating
from ..models.related_book import RelatedBook
from ..schemas.book import (
    BookCreate, BookUpdate, BookOut, BookDetail, BookSummary,
    RelatedBookOut, ReviewOut, ContentRatingAvg, OpenLibraryImport,
)
from ..auth import get_current_user

import httpx

router = APIRouter(prefix="/api/books", tags=["books"])


async def _compute_book_stats(db: AsyncSession, book_id: int):
    rating_result = await db.execute(
        select(func.avg(UserBook.rating), func.count(UserBook.rating)).where(
            UserBook.book_id == book_id, UserBook.rating.isnot(None)
        )
    )
    avg_rating, rating_count = rating_result.one()

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


def _book_to_summary(book: Book, avg_rating, rating_count, content_rating) -> dict:
    return {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "cover_url": book.cover_url,
        "genres": [{"id": g.id, "name": g.name} for g in book.genres],
        "avg_rating": avg_rating,
        "rating_count": rating_count,
        "content_rating": content_rating,
    }


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

    # Content rating filters: exclude books whose average exceeds the max
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

    out = []
    for book in books:
        avg_r, r_count, cr = await _compute_book_stats(db, book.id)
        out.append(_book_to_summary(book, avg_r, r_count, cr))
    return out


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

    return {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "isbn": book.isbn,
        "description": book.description,
        "cover_url": book.cover_url,
        "publication_date": book.publication_date,
        "created_at": book.created_at,
        "genres": [{"id": g.id, "name": g.name} for g in book.genres],
        "avg_rating": avg_r,
        "rating_count": r_count,
        "content_rating": cr,
        "reviews": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "username": r.user.username,
                "book_id": r.book_id,
                "review_text": r.review_text,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            }
            for r in reviews
        ],
        "related_books": [
            {
                "id": rb.id,
                "title": rb.title,
                "author": rb.author,
                "cover_url": rb.cover_url,
            }
            for rb in book.related_to
        ],
    }


@router.post("", response_model=BookOut, status_code=201)
async def create_book(
    data: BookCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
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
    return {**book.__dict__, "genres": [{"id": g.id, "name": g.name} for g in book.genres], "avg_rating": avg_r, "rating_count": r_count, "content_rating": cr}


@router.put("/{book_id}", response_model=BookOut)
async def update_book(
    book_id: int,
    data: BookUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
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
    return {**book.__dict__, "genres": [{"id": g.id, "name": g.name} for g in book.genres], "avg_rating": avg_r, "rating_count": r_count, "content_rating": cr}


@router.delete("/{book_id}", status_code=204)
async def delete_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
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
    _user=Depends(get_current_user),
):
    if book_id == related_id:
        raise HTTPException(status_code=400, detail="A book cannot be related to itself")
    existing = await db.execute(
        select(RelatedBook).where(
            RelatedBook.book_id == book_id, RelatedBook.related_book_id == related_id
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
    _user=Depends(get_current_user),
):
    result = await db.execute(
        select(RelatedBook).where(
            RelatedBook.book_id == book_id, RelatedBook.related_book_id == related_id
        )
    )
    rel = result.scalar_one_or_none()
    if rel:
        await db.delete(rel)
    result2 = await db.execute(
        select(RelatedBook).where(
            RelatedBook.book_id == related_id, RelatedBook.related_book_id == book_id
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
    _user=Depends(get_current_user),
):
    async with httpx.AsyncClient() as client:
        if data.isbn:
            resp = await client.get(
                f"https://openlibrary.org/api/books.json",
                params={"bibkeys": f"ISBN:{data.query}", "format": "data", "jscmd": "data"},
            )
            result = resp.json()
            key = f"ISBN:{data.query}"
            if key not in result:
                raise HTTPException(status_code=404, detail="Book not found on Open Library")
            ol = result[key]
            title = ol.get("title", "")
            authors = ", ".join(a.get("name", "") for a in ol.get("authors", []))
            cover = ol.get("cover", {}).get("large", ol.get("cover", {}).get("medium"))
            desc = ol.get("notes") if isinstance(ol.get("notes"), str) else None
            pub_date = None
        else:
            resp = await client.get(
                "https://openlibrary.org/search.json",
                params={"q": data.query, "limit": 1},
            )
            results = resp.json()
            if not results.get("docs"):
                raise HTTPException(status_code=404, detail="Book not found on Open Library")
            doc = results["docs"][0]
            title = doc.get("title", "")
            authors = ", ".join(doc.get("author_name", []))
            cover_id = doc.get("cover_i")
            cover = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None
            desc = None
            pub_date = None

    book = Book(
        title=title,
        author=authors,
        isbn=data.query if data.isbn else None,
        description=desc,
        cover_url=cover,
        publication_date=pub_date,
    )
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return {**book.__dict__, "genres": [], "avg_rating": None, "rating_count": 0, "content_rating": None}
