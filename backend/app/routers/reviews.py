from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models.user import User
from ..models.review import Review
from ..schemas.review import ReviewCreate, ReviewUpdate, ReviewOut
from ..auth import get_current_user

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("/book/{book_id}", response_model=list[ReviewOut])
async def get_book_reviews(book_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user))
        .where(Review.book_id == book_id)
        .order_by(Review.created_at.desc())
    )
    reviews = result.scalars().all()
    return [
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
    ]


@router.post("", response_model=ReviewOut, status_code=201)
async def create_review(
    data: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Review).where(Review.user_id == user.id, Review.book_id == data.book_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already reviewed this book")

    review = Review(
        user_id=user.id,
        book_id=data.book_id,
        review_text=data.review_text,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return {
        "id": review.id,
        "user_id": review.user_id,
        "username": user.username,
        "book_id": review.book_id,
        "review_text": review.review_text,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
    }


@router.put("/{review_id}", response_model=ReviewOut)
async def update_review(
    review_id: int,
    data: ReviewUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your review")

    review.review_text = data.review_text
    await db.commit()
    await db.refresh(review)
    return {
        "id": review.id,
        "user_id": review.user_id,
        "username": user.username,
        "book_id": review.book_id,
        "review_text": review.review_text,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
    }


@router.delete("/{review_id}", status_code=204)
async def delete_review(
    review_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your review")
    await db.delete(review)
    await db.commit()
