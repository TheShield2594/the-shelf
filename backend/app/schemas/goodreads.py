import datetime
from pydantic import BaseModel, Field

from ..models.user_book import ReadingStatus


class GoodreadsResolveMatch(BaseModel):
    """Payload for manually resolving a Goodreads import row that had no full match.

    The frontend collects `title`/`author`/etc. from the original CSV row (returned
    in the import response's `pending` field) and `isbn` from the book the user
    picked via a manual OpenLibrary search.
    """

    title: str
    author: str
    isbn: str
    reading_status: ReadingStatus = ReadingStatus.WANT_TO_READ
    rating: int | None = Field(default=None, ge=1, le=5)
    page_count: int | None = None
    publication_date: datetime.date | None = None
