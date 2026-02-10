import datetime
from pydantic import BaseModel, field_validator


class ContentRatingCreate(BaseModel):
    book_id: int
    violence_level: int = 0
    language_level: int = 0
    sexual_content_level: int = 0
    substance_use_level: int = 0
    other_tags: list[str] = []

    @field_validator("violence_level", "language_level", "sexual_content_level", "substance_use_level")
    @classmethod
    def validate_level(cls, v: int) -> int:
        if v < 0 or v > 4:
            raise ValueError("Level must be between 0 and 4")
        return v


class ContentRatingUpdate(BaseModel):
    violence_level: int | None = None
    language_level: int | None = None
    sexual_content_level: int | None = None
    substance_use_level: int | None = None
    other_tags: list[str] | None = None

    @field_validator("violence_level", "language_level", "sexual_content_level", "substance_use_level")
    @classmethod
    def validate_level(cls, v: int | None) -> int | None:
        if v is not None and (v < 0 or v > 4):
            raise ValueError("Level must be between 0 and 4")
        return v


class ContentRatingOut(BaseModel):
    id: int
    book_id: int
    user_id: int
    username: str
    violence_level: int
    language_level: int
    sexual_content_level: int
    substance_use_level: int
    other_tags: list[str] = []
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
