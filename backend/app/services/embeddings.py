"""Book embedding service using Sentence Transformers.

This service generates semantic embeddings for book descriptions,
enabling intelligent similarity-based recommendations.
"""

import logging
from typing import Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

# Lazy import to avoid loading model on module import
_model = None


def get_embedding_model():
    """Get or initialize the embedding model (singleton pattern)."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer

            # all-MiniLM-L6-v2: 384-dim, fast, good balance of quality/speed
            # ~80MB model, takes 1-2 seconds to load
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Loaded sentence-transformers model: all-MiniLM-L6-v2")
        except ImportError:
            logger.warning(
                "sentence-transformers not installed. "
                "Embeddings generation will not work. "
                "Install with: pip install sentence-transformers"
            )
            _model = None
    return _model


@lru_cache(maxsize=1000)
def generate_embedding(text: str) -> Optional[list[float]]:
    """Generate a 384-dimensional embedding vector for text.

    Args:
        text: The text to embed (typically book description)

    Returns:
        A list of 384 floats, or None if embeddings are not available

    Note:
        Results are cached (up to 1000 unique texts) to avoid recomputation
    """
    if not text or not text.strip():
        return None

    model = get_embedding_model()
    if model is None:
        return None

    try:
        # Generate embedding
        embedding = model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        return None


def generate_book_embedding(
    title: str,
    author: str,
    description: Optional[str] = None,
    genres: Optional[list[str]] = None,
) -> Optional[list[float]]:
    """Generate an embedding for a book combining multiple fields.

    Args:
        title: Book title
        author: Book author
        description: Book description (optional but recommended)
        genres: List of genre names (optional)

    Returns:
        A 384-dimensional embedding vector, or None if generation fails

    Strategy:
        We combine title, author, description, and genres into a rich text
        representation that captures the book's essence. The embedding model
        will learn semantic similarity (e.g., "mystery" and "detective" are close).
    """
    # Combine fields into a rich representation
    parts = []

    if title:
        parts.append(f"Title: {title}")

    if author:
        parts.append(f"Author: {author}")

    if genres:
        parts.append(f"Genres: {', '.join(genres)}")

    if description:
        # Truncate description to ~500 chars to avoid token limits
        desc = description[:500] + "..." if len(description) > 500 else description
        parts.append(f"Description: {desc}")

    if not parts:
        return None

    combined_text = " | ".join(parts)
    return generate_embedding(combined_text)


def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    """Calculate cosine similarity between two vectors.

    Args:
        vec1: First embedding vector
        vec2: Second embedding vector

    Returns:
        Similarity score between -1 and 1 (higher = more similar)
    """
    if len(vec1) != len(vec2):
        raise ValueError("Vectors must have same dimension")

    # Dot product
    dot_product = sum(a * b for a, b in zip(vec1, vec2))

    # Magnitudes
    mag1 = sum(a * a for a in vec1) ** 0.5
    mag2 = sum(b * b for b in vec2) ** 0.5

    if mag1 == 0 or mag2 == 0:
        return 0.0

    return dot_product / (mag1 * mag2)


def clear_cache():
    """Clear the embedding cache.

    Useful for testing or if memory usage becomes an issue.
    """
    generate_embedding.cache_clear()
    logger.info("Cleared embedding cache")
