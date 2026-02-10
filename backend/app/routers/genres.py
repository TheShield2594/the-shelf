from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.genre import Genre
from ..models.book import Book, book_genres
from ..schemas.book import GenreOut
from ..auth import get_current_user

router = APIRouter(prefix="/api/genres", tags=["genres"])


@router.get("", response_model=list[GenreOut])
async def list_genres(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Genre).order_by(Genre.name))
    return result.scalars().all()


@router.post("", response_model=GenreOut, status_code=201)
async def create_genre(
    name: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    existing = await db.execute(select(Genre).where(Genre.name.ilike(name)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Genre already exists")
    genre = Genre(name=name)
    db.add(genre)
    await db.commit()
    await db.refresh(genre)
    return genre


@router.post("/{genre_id}/books/{book_id}", status_code=201)
async def add_genre_to_book(
    genre_id: int,
    book_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    genre = await db.get(Genre, genre_id)
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    await db.execute(book_genres.insert().values(book_id=book_id, genre_id=genre_id))
    await db.commit()
    return {"detail": "Genre added to book"}
