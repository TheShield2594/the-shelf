"""Recommendation engine service.

This module provides personalized book recommendations using:
1. Content-based filtering (embedding similarity)
2. Collaborative filtering (user-user and item-item)
3. Multi-dimensional rating analysis
"""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from ..models.book import Book
from ..models.user_book import UserBook
from ..models.multi_dimensional_rating import MultiDimensionalRating, BookFingerprint
from .embeddings import cosine_similarity

logger = logging.getLogger(__name__)


async def get_similar_books_by_embedding(
    db: AsyncSession,
    book_id: int,
    limit: int = 10,
    exclude_book_ids: Optional[list[int]] = None,
) -> list[Book]:
    """Find books similar to a given book using embedding similarity.

    This uses pgvector's cosine distance operator for fast similarity search.
    Requires the book to have a description_embedding.

    Args:
        db: Database session
        book_id: ID of the target book
        limit: Maximum number of recommendations
        exclude_book_ids: Book IDs to exclude (e.g., already read)

    Returns:
        List of similar books, ordered by similarity (most similar first)
    """
    # Get target book's embedding
    target_result = await db.execute(
        select(Book.description_embedding).where(Book.id == book_id)
    )
    target_embedding = target_result.scalar_one_or_none()

    if not target_embedding:
        logger.warning(f"Book {book_id} has no embedding, cannot find similar books")
        return []

    # Build query
    query = select(Book).where(Book.id != book_id)

    if exclude_book_ids:
        query = query.where(Book.id.notin_(exclude_book_ids))

    # TODO: Use pgvector's cosine distance operator when pgvector is set up
    # For now, we'll do in-memory similarity calculation
    # query = query.order_by(Book.description_embedding.cosine_distance(target_embedding))

    result = await db.execute(query.limit(100))  # Get top 100 candidates
    books = result.scalars().all()

    # Calculate similarities in-memory (temporary until pgvector is set up)
    books_with_similarity = []
    for book in books:
        if book.description_embedding:
            similarity = cosine_similarity(target_embedding, book.description_embedding)
            books_with_similarity.append((book, similarity))

    # Sort by similarity (highest first) and take top N
    books_with_similarity.sort(key=lambda x: x[1], reverse=True)
    return [book for book, _ in books_with_similarity[:limit]]


async def get_similar_books_by_fingerprint(
    db: AsyncSession,
    book_id: int,
    limit: int = 10,
    exclude_book_ids: Optional[list[int]] = None,
) -> list[Book]:
    """Find books with similar multi-dimensional rating fingerprints.

    This finds books that have a similar "feel" based on community ratings
    (pace, emotional impact, complexity, etc.).

    Args:
        db: Database session
        book_id: ID of the target book
        limit: Maximum number of recommendations
        exclude_book_ids: Book IDs to exclude

    Returns:
        List of similar books by fingerprint
    """
    # Get target book's fingerprint
    target_result = await db.execute(
        select(BookFingerprint).where(BookFingerprint.book_id == book_id)
    )
    target_fp = target_result.scalar_one_or_none()

    if not target_fp or target_fp.total_ratings < 3:
        logger.warning(f"Book {book_id} has insufficient ratings for fingerprint matching")
        return []

    target_vector = target_fp.fingerprint_vector

    # Get other books with fingerprints
    query = select(Book, BookFingerprint).join(
        BookFingerprint, Book.id == BookFingerprint.book_id
    ).where(
        and_(
            BookFingerprint.book_id != book_id,
            BookFingerprint.total_ratings >= 3,  # Minimum ratings for reliability
        )
    )

    if exclude_book_ids:
        query = query.where(Book.id.notin_(exclude_book_ids))

    result = await db.execute(query)
    books_with_fps = result.all()

    # Calculate fingerprint similarities
    books_with_similarity = []
    for book, fingerprint in books_with_fps:
        fp_vector = fingerprint.fingerprint_vector
        similarity = cosine_similarity(target_vector, fp_vector)
        books_with_similarity.append((book, similarity))

    # Sort by similarity
    books_with_similarity.sort(key=lambda x: x[1], reverse=True)
    return [book for book, _ in books_with_similarity[:limit]]


async def get_personalized_recommendations(
    db: AsyncSession,
    user_id: int,
    limit: int = 10,
    exclude_read: bool = True,
) -> list[dict]:
    """Get personalized book recommendations for a user.

    This combines multiple signals:
    1. Books similar to highly-rated books
    2. Books popular among users with similar taste
    3. Trending books the user hasn't seen

    Args:
        db: Database session
        user_id: ID of the user
        limit: Number of recommendations
        exclude_read: Whether to exclude books the user has already read

    Returns:
        List of recommended books with recommendation reasons
    """
    # Get user's reading history
    user_books_result = await db.execute(
        select(UserBook).where(UserBook.user_id == user_id)
    )
    user_books = user_books_result.scalars().all()

    # Get user's highly-rated books (multi-dimensional ratings with star_equivalent >= 4)
    highly_rated_result = await db.execute(
        select(MultiDimensionalRating)
        .where(MultiDimensionalRating.user_id == user_id)
    )
    user_ratings = highly_rated_result.scalars().all()

    highly_rated_book_ids = [
        r.book_id for r in user_ratings
        if r.star_equivalent and r.star_equivalent >= 4.0
    ]

    # Books to exclude
    exclude_ids = set()
    if exclude_read:
        exclude_ids.update(ub.book_id for ub in user_books)
    else:
        # At least exclude finished books
        exclude_ids.update(
            ub.book_id for ub in user_books
            if ub.status in ["finished", "dnf"]
        )

    recommendations = []

    # Strategy 1: Find books similar to highly-rated books
    for book_id in highly_rated_book_ids[:3]:  # Top 3 favorites
        similar = await get_similar_books_by_fingerprint(
            db, book_id, limit=5, exclude_book_ids=list(exclude_ids)
        )

        for book in similar:
            if book.id not in exclude_ids:
                recommendations.append({
                    "book": book,
                    "reason": f"Similar feel to books you loved",
                    "score": 0.9,
                })
                exclude_ids.add(book.id)

    # Strategy 2: Trending books (books with recent ratings)
    # TODO: Implement trending algorithm

    # Strategy 3: Fill with high-rated books the user hasn't seen
    if len(recommendations) < limit:
        popular_result = await db.execute(
            select(Book, BookFingerprint)
            .join(BookFingerprint, Book.id == BookFingerprint.book_id)
            .where(
                and_(
                    BookFingerprint.total_ratings >= 10,
                    BookFingerprint.star_equivalent >= 4.0,
                    Book.id.notin_(list(exclude_ids)),
                )
            )
            .order_by(BookFingerprint.total_ratings.desc())
            .limit(limit - len(recommendations))
        )
        popular_books = popular_result.all()

        for book, fp in popular_books:
            recommendations.append({
                "book": book,
                "reason": f"Highly rated ({fp.star_equivalent:.1f}/5.0)",
                "score": 0.7,
            })

    # Sort by score and return
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations[:limit]


async def get_books_by_mood(
    db: AsyncSession,
    mood: str,
    limit: int = 10,
) -> list[Book]:
    """Get book recommendations based on reading mood.

    Args:
        db: Database session
        mood: Reading mood (e.g., "comfort", "challenge", "escape")
        limit: Number of recommendations

    Returns:
        List of books matching the mood

    Mood mappings:
    - "comfort": High emotional impact, lower complexity
    - "challenge": High complexity, high originality
    - "escape": Fast pace, high plot quality
    - "contemplative": Slow pace, high prose quality
    """
    mood_filters = {
        "comfort": {
            "emotional_impact_min": 4.0,
            "complexity_max": 3.0,
        },
        "challenge": {
            "complexity_min": 4.0,
            "originality_min": 4.0,
        },
        "escape": {
            "pace_min": 4.0,
            "plot_quality_min": 4.0,
        },
        "contemplative": {
            "pace_max": 2.5,
            "prose_style_min": 4.0,
        },
    }

    filters = mood_filters.get(mood.lower())
    if not filters:
        logger.warning(f"Unknown mood: {mood}")
        return []

    # Build query based on fingerprint filters
    query = select(Book).join(BookFingerprint, Book.id == BookFingerprint.book_id).where(
        BookFingerprint.total_ratings >= 5  # Minimum ratings for reliability
    )

    # Apply mood-specific filters
    for key, value in filters.items():
        if key.endswith("_min"):
            field = key.replace("_min", "")
            column = getattr(BookFingerprint, f"avg_{field}")
            query = query.where(column >= value)
        elif key.endswith("_max"):
            field = key.replace("_max", "")
            column = getattr(BookFingerprint, f"avg_{field}")
            query = query.where(column <= value)

    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
