"""API endpoints for multi-dimensional book ratings."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from ..database import get_db
from ..auth import get_current_user
from ..models.user import User
from ..models.book import Book
from ..models.multi_dimensional_rating import MultiDimensionalRating, BookFingerprint
from ..schemas.multi_dimensional_rating import (
    MultiDimensionalRatingCreate,
    MultiDimensionalRatingResponse,
    BookFingerprintResponse,
    RadarChartData,
)

router = APIRouter(prefix="/ratings", tags=["multi-dimensional-ratings"])


@router.post("/", response_model=MultiDimensionalRatingResponse, status_code=201)
async def create_or_update_rating(
    rating_data: MultiDimensionalRatingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update a multi-dimensional rating for a book.

    All dimensions are optional. Users can rate only what matters to them.
    Automatically updates the book's aggregate fingerprint.
    """
    # Verify book exists
    book_result = await db.execute(select(Book).where(Book.id == rating_data.book_id))
    book = book_result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Check if rating already exists
    existing_result = await db.execute(
        select(MultiDimensionalRating).where(
            MultiDimensionalRating.user_id == current_user.id,
            MultiDimensionalRating.book_id == rating_data.book_id,
        )
    )
    existing_rating = existing_result.scalar_one_or_none()

    if existing_rating:
        # Update existing rating
        update_data = rating_data.model_dump(exclude_unset=True, exclude={"book_id"})
        for key, value in update_data.items():
            setattr(existing_rating, key, value)
        existing_rating.updated_at = func.now()
        rating = existing_rating
    else:
        # Create new rating
        rating = MultiDimensionalRating(
            user_id=current_user.id, **rating_data.model_dump()
        )
        db.add(rating)

    await db.commit()
    await db.refresh(rating)

    # Update book fingerprint (aggregate ratings)
    await update_book_fingerprint(db, rating_data.book_id)

    return rating


@router.get("/{book_id}", response_model=MultiDimensionalRatingResponse)
async def get_user_rating(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's rating for a specific book.

    Returns 404 if the user hasn't rated this book yet.
    """
    result = await db.execute(
        select(MultiDimensionalRating).where(
            MultiDimensionalRating.user_id == current_user.id,
            MultiDimensionalRating.book_id == book_id,
        )
    )
    rating = result.scalar_one_or_none()

    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    return rating


@router.delete("/{book_id}", status_code=204)
async def delete_rating(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete the current user's rating for a book.

    Automatically updates the book's aggregate fingerprint.
    """
    result = await db.execute(
        select(MultiDimensionalRating).where(
            MultiDimensionalRating.user_id == current_user.id,
            MultiDimensionalRating.book_id == book_id,
        )
    )
    rating = result.scalar_one_or_none()

    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    await db.delete(rating)
    await db.commit()

    # Update book fingerprint
    await update_book_fingerprint(db, book_id)

    return None


@router.get("/{book_id}/fingerprint", response_model=BookFingerprintResponse)
async def get_book_fingerprint(
    book_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the aggregated rating fingerprint for a book.

    This shows the average ratings across all users.
    Returns a fingerprint with zero ratings if the book hasn't been rated yet.
    """
    # Verify book exists
    book_result = await db.execute(select(Book).where(Book.id == book_id))
    book = book_result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Get fingerprint
    result = await db.execute(
        select(BookFingerprint).where(BookFingerprint.book_id == book_id)
    )
    fingerprint = result.scalar_one_or_none()

    if not fingerprint:
        # Create empty fingerprint
        fingerprint = BookFingerprint(book_id=book_id, total_ratings=0)

    return fingerprint


@router.get("/{book_id}/chart-data", response_model=RadarChartData)
async def get_radar_chart_data(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get radar chart data for a book.

    If the user is authenticated and has rated the book, returns their rating.
    Otherwise, returns the aggregate fingerprint.
    """
    # Try to get user's rating first
    if current_user:
        result = await db.execute(
            select(MultiDimensionalRating).where(
                MultiDimensionalRating.user_id == current_user.id,
                MultiDimensionalRating.book_id == book_id,
            )
        )
        user_rating = result.scalar_one_or_none()
        if user_rating:
            return RadarChartData.from_rating(user_rating)

    # Fall back to book fingerprint
    fingerprint = await get_book_fingerprint(book_id, db)
    return RadarChartData.from_rating(fingerprint)


async def update_book_fingerprint(db: AsyncSession, book_id: int):
    """Recalculate and update the aggregate rating fingerprint for a book.

    This function is called automatically when ratings are created, updated, or deleted.
    """
    # Calculate aggregate statistics
    stats_result = await db.execute(
        select(
            func.avg(MultiDimensionalRating.pace).label("avg_pace"),
            func.avg(MultiDimensionalRating.emotional_impact).label("avg_emotional_impact"),
            func.avg(MultiDimensionalRating.complexity).label("avg_complexity"),
            func.avg(MultiDimensionalRating.character_development).label(
                "avg_character_development"
            ),
            func.avg(MultiDimensionalRating.plot_quality).label("avg_plot_quality"),
            func.avg(MultiDimensionalRating.prose_style).label("avg_prose_style"),
            func.avg(MultiDimensionalRating.originality).label("avg_originality"),
            func.count().label("total_ratings"),
        ).where(MultiDimensionalRating.book_id == book_id)
    )
    stats = stats_result.one()

    # Calculate star equivalent (average of all non-null dimensions)
    dimensions = [
        stats.avg_pace,
        stats.avg_emotional_impact,
        stats.avg_complexity,
        stats.avg_character_development,
        stats.avg_plot_quality,
        stats.avg_prose_style,
        stats.avg_originality,
    ]
    non_null = [d for d in dimensions if d is not None]
    star_equivalent = sum(non_null) / len(non_null) if non_null else None

    # Check if fingerprint exists
    fingerprint_result = await db.execute(
        select(BookFingerprint).where(BookFingerprint.book_id == book_id)
    )
    fingerprint = fingerprint_result.scalar_one_or_none()

    if fingerprint:
        # Update existing fingerprint
        fingerprint.avg_pace = stats.avg_pace
        fingerprint.avg_emotional_impact = stats.avg_emotional_impact
        fingerprint.avg_complexity = stats.avg_complexity
        fingerprint.avg_character_development = stats.avg_character_development
        fingerprint.avg_plot_quality = stats.avg_plot_quality
        fingerprint.avg_prose_style = stats.avg_prose_style
        fingerprint.avg_originality = stats.avg_originality
        fingerprint.star_equivalent = star_equivalent
        fingerprint.total_ratings = stats.total_ratings
    else:
        # Create new fingerprint
        fingerprint = BookFingerprint(
            book_id=book_id,
            avg_pace=stats.avg_pace,
            avg_emotional_impact=stats.avg_emotional_impact,
            avg_complexity=stats.avg_complexity,
            avg_character_development=stats.avg_character_development,
            avg_plot_quality=stats.avg_plot_quality,
            avg_prose_style=stats.avg_prose_style,
            avg_originality=stats.avg_originality,
            star_equivalent=star_equivalent,
            total_ratings=stats.total_ratings,
        )
        db.add(fingerprint)

    await db.commit()
    return fingerprint
