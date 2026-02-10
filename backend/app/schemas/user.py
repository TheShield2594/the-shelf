import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    id: int
    username: str
    created_at: datetime.datetime
    books_read: int = 0
    currently_reading: int = 0
    want_to_read: int = 0
    dnf: int = 0
    reviews_count: int = 0

    model_config = {"from_attributes": True}
