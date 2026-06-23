"""Personalized book recommendations.

Suggests unread books similar to what the user has finished and rated
highly, combining genre overlap with multi-dimensional rating "fingerprint"
similarity. Runs in pure Python (no ML deps) to keep the Docker image
lightweight, which is fine at the scale of a single user's library.
"""

import math
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.book import Book
from ..models.multi_dimensional_rating import MultiDimensionalRating
from ..models.user_book import ReadingStatus, UserBook

_SEED_RATING_THRESHOLD = 4.0
_GENRE_WEIGHT = 0.6
_FINGERPRINT_WEIGHT = 0.4


@dataclass
class _Seed:
    title: str
    genre_ids: set[int]
    vector: list[float] | None


def _fingerprint_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two fingerprint vectors, centered at the
    neutral midpoint (3.0) first.

    Dimensions are always positive (1-5), so raw cosine similarity between
    any two profiles skews high no matter how different the tastes actually
    are. Centering lets genuinely divergent profiles (e.g. "loved it" vs
    "hated it" on every dimension) score as dissimilar rather than merely
    "less similar".
    """
    ca = [x - 3.0 for x in a]
    cb = [x - 3.0 for x in b]
    dot = sum(x * y for x, y in zip(ca, cb))
    norm_a = math.sqrt(sum(x * x for x in ca))
    norm_b = math.sqrt(sum(y * y for y in cb))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def get_recommendations_for_user(
    db: AsyncSession, user_id: int, limit: int = 12
) -> list[tuple[Book, str]]:
    """Recommend unread books similar to what the user finished and rated highly.

    Seed books are the user's finished library entries rated >= 4 stars,
    preferring their own multi-dimensional rating's star equivalent and
    falling back to the simple library rating. Each candidate is scored
    against every seed by genre overlap and, when both sides have a rating
    fingerprint, cosine similarity; the best-matching seed determines both
    the candidate's score and its displayed reason.
    """
    library_result = await db.execute(
        select(UserBook.book_id).where(UserBook.user_id == user_id)
    )
    library_book_ids = {row[0] for row in library_result.all()}
    if not library_book_ids:
        return []

    seed_result = await db.execute(
        select(UserBook, MultiDimensionalRating)
        .outerjoin(
            MultiDimensionalRating,
            (MultiDimensionalRating.user_id == UserBook.user_id)
            & (MultiDimensionalRating.book_id == UserBook.book_id),
        )
        .where(UserBook.user_id == user_id, UserBook.status == ReadingStatus.FINISHED)
    )

    seed_book_ids: set[int] = set()
    md_ratings_by_book: dict[int, MultiDimensionalRating] = {}
    for user_book, md_rating in seed_result.all():
        score = md_rating.star_equivalent if md_rating else None
        if score is None:
            score = user_book.rating
        if score is None or score < _SEED_RATING_THRESHOLD:
            continue
        seed_book_ids.add(user_book.book_id)
        if md_rating:
            md_ratings_by_book[user_book.book_id] = md_rating

    if not seed_book_ids:
        return []

    seed_books_result = await db.execute(select(Book).where(Book.id.in_(seed_book_ids)))
    seeds = [
        _Seed(
            title=book.title,
            genre_ids={g.id for g in book.genres},
            vector=(
                md_ratings_by_book[book.id].fingerprint_vector
                if book.id in md_ratings_by_book
                else None
            ),
        )
        for book in seed_books_result.scalars().all()
    ]

    candidates_result = await db.execute(select(Book).where(Book.id.notin_(library_book_ids)))
    candidates = candidates_result.scalars().all()

    scored: list[tuple[Book, str, float]] = []
    for book in candidates:
        candidate_genre_ids = {g.id for g in book.genres}
        candidate_vector = (
            book.fingerprint.fingerprint_vector
            if book.fingerprint and book.fingerprint.total_ratings > 0
            else None
        )

        best_score = 0.0
        best_seed: _Seed | None = None
        for seed in seeds:
            union = seed.genre_ids | candidate_genre_ids
            genre_score = len(seed.genre_ids & candidate_genre_ids) / len(union) if union else 0.0

            if seed.vector and candidate_vector:
                pair_score = _GENRE_WEIGHT * genre_score + _FINGERPRINT_WEIGHT * _fingerprint_similarity(
                    seed.vector, candidate_vector
                )
            else:
                pair_score = genre_score

            if pair_score > best_score:
                best_score = pair_score
                best_seed = seed

        if best_seed is None or best_score <= 0:
            continue

        scored.append((book, f"Because you enjoyed {best_seed.title}", best_score))

    scored.sort(key=lambda row: row[2], reverse=True)
    return [(book, reason) for book, reason, _ in scored[:limit]]
