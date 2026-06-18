"""Embeddings service stub.

The full embedding functionality (pgvector + sentence-transformers) has been
removed to keep the Docker image lightweight. This stub preserves the module
interface so any future imports don't crash.
"""


async def get_embedding(text: str) -> list[float]:
    """Return an empty embedding vector (stub)."""
    return []


async def index_book(book_id: int) -> None:
    """No-op book indexing stub."""
    pass
