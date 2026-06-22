import datetime
from pydantic import BaseModel, EmailStr, Field


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
    role: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class EmailChange(BaseModel):
    new_email: EmailStr
    current_password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


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
