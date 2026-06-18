"""Embeddings service - placeholder.

The heavy ML dependencies (sentence-transformers, pgvector, scikit-learn)
have been removed to keep the Docker image lean.
This module is kept for import compatibility but does nothing.
"""


def get_embeddings(texts: list[str]) -> list[list[float]]:
    return [[0.0] for _ in texts]


def store_embedding(book_id: int, embedding: list[float]) -> None:
    pass
