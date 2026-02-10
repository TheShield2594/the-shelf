import datetime
from pydantic import BaseModel, field_validator

from .book import BookSummary


class UserBookCreate(BaseModel):
    book_id: int
    status: str = "want_to_read"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid = {"want_to_read", "currently_reading", "finished", "dnf"}
        if v not in valid:
            raise ValueError(f"Status must be one of: {valid}")
        return v


class UserBookUpdate(BaseModel):
    status: str | None = None
    rating: int | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        valid = {"want_to_read", "currently_reading", "finished", "dnf"}
        if v not in valid:
            raise ValueError(f"Status must be one of: {valid}")
        return v

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int | None) -> int | None:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("Rating must be between 1 and 5")
        return v


class UserBookOut(BaseModel):
    id: int
    book_id: int
    status: str
    rating: int | None = None
    date_added: datetime.datetime
    date_started: datetime.datetime | None = None
    date_finished: datetime.datetime | None = None
    book: BookSummary

    model_config = {"from_attributes": True}
