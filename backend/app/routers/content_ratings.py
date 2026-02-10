from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models.user import User
from ..models.user_book import UserBook
from ..models.content_rating import ContentRating
from ..schemas.content_rating import ContentRatingCreate, ContentRatingUpdate, ContentRatingOut
from ..auth import get_current_user

router = APIRouter(prefix="/api/content-ratings", tags=["content-ratings"])


@router.get("/book/{book_id}", response_model=list[ContentRatingOut])
async def get_book_content_ratings(book_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ContentRating)
        .options(selectinload(ContentRating.user))
        .where(ContentRating.book_id == book_id)
    )
    ratings = result.scalars().all()
    return [
        {
            "id": r.id,
            "book_id": r.book_id,
            "user_id": r.user_id,
            "username": r.user.username,
            "violence_level": r.violence_level,
            "language_level": r.language_level,
            "sexual_content_level": r.sexual_content_level,
            "substance_use_level": r.substance_use_level,
            "other_tags": r.other_tags or [],
            "created_at": r.created_at,
        }
        for r in ratings
    ]


@router.post("", response_model=ContentRatingOut, status_code=201)
async def create_content_rating(
    data: ContentRatingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check user has finished the book
    ub_result = await db.execute(
        select(UserBook).where(
            UserBook.user_id == user.id,
            UserBook.book_id == data.book_id,
            UserBook.status == "finished",
        )
    )
    if not ub_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="You must mark this book as 'Finished' before submitting a content rating",
        )

    existing = await db.execute(
        select(ContentRating).where(
            ContentRating.user_id == user.id, ContentRating.book_id == data.book_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already rated this book's content")

    cr = ContentRating(
        book_id=data.book_id,
        user_id=user.id,
        violence_level=data.violence_level,
        language_level=data.language_level,
        sexual_content_level=data.sexual_content_level,
        substance_use_level=data.substance_use_level,
        other_tags=data.other_tags or None,
    )
    db.add(cr)
    await db.commit()
    await db.refresh(cr)
    return {
        "id": cr.id,
        "book_id": cr.book_id,
        "user_id": cr.user_id,
        "username": user.username,
        "violence_level": cr.violence_level,
        "language_level": cr.language_level,
        "sexual_content_level": cr.sexual_content_level,
        "substance_use_level": cr.substance_use_level,
        "other_tags": cr.other_tags or [],
        "created_at": cr.created_at,
    }


@router.put("/{rating_id}", response_model=ContentRatingOut)
async def update_content_rating(
    rating_id: int,
    data: ContentRatingUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentRating).where(ContentRating.id == rating_id)
    )
    cr = result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="Content rating not found")
    if cr.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your content rating")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cr, field, value)

    await db.commit()
    await db.refresh(cr)
    return {
        "id": cr.id,
        "book_id": cr.book_id,
        "user_id": cr.user_id,
        "username": user.username,
        "violence_level": cr.violence_level,
        "language_level": cr.language_level,
        "sexual_content_level": cr.sexual_content_level,
        "substance_use_level": cr.substance_use_level,
        "other_tags": cr.other_tags or [],
        "created_at": cr.created_at,
    }
