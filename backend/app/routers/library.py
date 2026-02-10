from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models.user import User
from ..models.user_book import UserBook
from ..models.book import Book
from ..schemas.library import UserBookCreate, UserBookUpdate, UserBookOut
from ..schemas.book import ContentRatingAvg
from ..auth import get_current_user
from .books import _compute_book_stats

router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("", response_model=list[UserBookOut])
async def get_library(
    status: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(UserBook)
        .options(selectinload(UserBook.book).selectinload(Book.genres))
        .where(UserBook.user_id == user.id)
    )
    if status:
        stmt = stmt.where(UserBook.status == status)
    stmt = stmt.order_by(UserBook.date_added.desc())

    result = await db.execute(stmt)
    user_books = result.scalars().all()

    out = []
    for ub in user_books:
        avg_r, r_count, cr = await _compute_book_stats(db, ub.book_id)
        book_data = {
            "id": ub.book.id,
            "title": ub.book.title,
            "author": ub.book.author,
            "cover_url": ub.book.cover_url,
            "genres": [{"id": g.id, "name": g.name} for g in ub.book.genres],
            "avg_rating": avg_r,
            "rating_count": r_count,
            "content_rating": cr,
        }
        out.append({
            "id": ub.id,
            "book_id": ub.book_id,
            "status": ub.status,
            "rating": ub.rating,
            "date_added": ub.date_added,
            "date_started": ub.date_started,
            "date_finished": ub.date_finished,
            "book": book_data,
        })
    return out


@router.post("", response_model=UserBookOut, status_code=201)
async def add_to_library(
    data: UserBookCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(UserBook).where(UserBook.user_id == user.id, UserBook.book_id == data.book_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Book already in library")

    book = await db.get(Book, data.book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    now = datetime.now(timezone.utc)
    ub = UserBook(
        user_id=user.id,
        book_id=data.book_id,
        status=data.status,
        date_started=now if data.status == "currently_reading" else None,
        date_finished=now if data.status == "finished" else None,
    )
    db.add(ub)
    await db.commit()
    await db.refresh(ub)

    result = await db.execute(
        select(UserBook)
        .options(selectinload(UserBook.book).selectinload(Book.genres))
        .where(UserBook.id == ub.id)
    )
    ub = result.scalar_one()
    avg_r, r_count, cr = await _compute_book_stats(db, ub.book_id)
    return {
        "id": ub.id,
        "book_id": ub.book_id,
        "status": ub.status,
        "rating": ub.rating,
        "date_added": ub.date_added,
        "date_started": ub.date_started,
        "date_finished": ub.date_finished,
        "book": {
            "id": ub.book.id,
            "title": ub.book.title,
            "author": ub.book.author,
            "cover_url": ub.book.cover_url,
            "genres": [{"id": g.id, "name": g.name} for g in ub.book.genres],
            "avg_rating": avg_r,
            "rating_count": r_count,
            "content_rating": cr,
        },
    }


@router.put("/{book_id}", response_model=UserBookOut)
async def update_library_entry(
    book_id: int,
    data: UserBookUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserBook)
        .options(selectinload(UserBook.book).selectinload(Book.genres))
        .where(UserBook.user_id == user.id, UserBook.book_id == book_id)
    )
    ub = result.scalar_one_or_none()
    if not ub:
        raise HTTPException(status_code=404, detail="Book not in library")

    now = datetime.now(timezone.utc)
    if data.status:
        ub.status = data.status
        if data.status == "currently_reading" and not ub.date_started:
            ub.date_started = now
        if data.status == "finished" and not ub.date_finished:
            ub.date_finished = now
    if data.rating is not None:
        ub.rating = data.rating

    await db.commit()
    await db.refresh(ub)

    result2 = await db.execute(
        select(UserBook)
        .options(selectinload(UserBook.book).selectinload(Book.genres))
        .where(UserBook.id == ub.id)
    )
    ub = result2.scalar_one()
    avg_r, r_count, cr = await _compute_book_stats(db, ub.book_id)
    return {
        "id": ub.id,
        "book_id": ub.book_id,
        "status": ub.status,
        "rating": ub.rating,
        "date_added": ub.date_added,
        "date_started": ub.date_started,
        "date_finished": ub.date_finished,
        "book": {
            "id": ub.book.id,
            "title": ub.book.title,
            "author": ub.book.author,
            "cover_url": ub.book.cover_url,
            "genres": [{"id": g.id, "name": g.name} for g in ub.book.genres],
            "avg_rating": avg_r,
            "rating_count": r_count,
            "content_rating": cr,
        },
    }


@router.delete("/{book_id}", status_code=204)
async def remove_from_library(
    book_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserBook).where(UserBook.user_id == user.id, UserBook.book_id == book_id)
    )
    ub = result.scalar_one_or_none()
    if not ub:
        raise HTTPException(status_code=404, detail="Book not in library")
    await db.delete(ub)
    await db.commit()
