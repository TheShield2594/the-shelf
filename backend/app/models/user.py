import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user_books: Mapped[list["UserBook"]] = relationship(back_populates="user")  # noqa: F821
    reviews: Mapped[list["Review"]] = relationship(back_populates="user")  # noqa: F821
    content_ratings: Mapped[list["ContentRating"]] = relationship(back_populates="user")  # noqa: F821
