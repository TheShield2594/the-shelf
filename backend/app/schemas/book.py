import datetime
from pydantic import BaseModel
from typing import Optional

from .multi_dimensional_rating import BookFingerprintResponse


class GenreOut(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class BookCreate(BaseModel):
    title: str
    author: str
    isbn: str | None = None
    description: str | None = None
    cover_url: str | None = None
    publication_date: datetime.date | None = None
    genre_ids: list[int] = []


class BookUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    isbn: str | None = None
    description: str | None = None
    cover_url: str | None = None
    publication_date: datetime.date | None = None
    genre_ids: list[int] | None = None


class ContentRatingAvg(BaseModel):
    violence_level: float = 0
    language_level: float = 0
    sexual_content_level: float = 0
    substance_use_level: float = 0
    common_tags: list[str] = []
    count: int = 0


class BookOut(BaseModel):
    id: int
    title: str
    author: str
    isbn: str | None = None
    description: str | None = None
    cover_url: str | None = None
    publication_date: datetime.date | None = None
    created_at: datetime.datetime
    genres: list[GenreOut] = []
    avg_rating: float | None = None
    rating_count: int = 0
    content_rating: ContentRatingAvg | None = None
    fingerprint: Optional[BookFingerprintResponse] = None  # Multi-dimensional ratings

    model_config = {"from_attributes": True}


class BookSummary(BaseModel):
    id: int
    title: str
    author: str
    cover_url: str | None = None
    genres: list[GenreOut] = []
    avg_rating: float | None = None
    rating_count: int = 0
    content_rating: ContentRatingAvg | None = None
    fingerprint: Optional[BookFingerprintResponse] = None  # Multi-dimensional ratings

    model_config = {"from_attributes": True}


class RelatedBookOut(BaseModel):
    id: int
    title: str
    author: str
    cover_url: str | None = None
    model_config = {"from_attributes": True}


class BookDetail(BookOut):
    reviews: list["ReviewOut"] = []
    related_books: list[RelatedBookOut] = []


class ReviewOut(BaseModel):
    id: int
    user_id: int
    username: str
    book_id: int
    review_text: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = {"from_attributes": True}


class OpenLibraryImport(BaseModel):
    query: str
    isbn: bool = False
