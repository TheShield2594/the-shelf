"""Recommendations service stub.

The full recommendation engine (scikit-learn + embeddings) has been removed
to keep the Docker image lightweight. This stub preserves the module interface.
"""


async def get_recommendations(book_id: int, limit: int = 5) -> list[dict]:
    """Return empty recommendations (stub)."""
    _ = (book_id, limit)
    return []
