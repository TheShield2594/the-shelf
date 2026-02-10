import datetime
from pydantic import BaseModel


class ReviewCreate(BaseModel):
    book_id: int
    review_text: str


class ReviewUpdate(BaseModel):
    review_text: str


class ReviewOut(BaseModel):
    id: int
    user_id: int
    username: str
    book_id: int
    review_text: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}
