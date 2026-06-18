"""Recommendations service - placeholder.

The heavy ML dependencies (scikit-learn, numpy) have been removed
to keep the Docker image lean.
This module is kept for import compatibility but does nothing.
"""


def get_recommendations(book_id: int, limit: int = 10) -> list[dict]:
    return []
