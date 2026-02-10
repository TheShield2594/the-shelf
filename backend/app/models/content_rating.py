import datetime
from sqlalchemy import ForeignKey, SmallInteger, DateTime, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, VARCHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class ContentRating(Base):
    __tablename__ = "content_ratings"
    __table_args__ = (UniqueConstraint("user_id", "book_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    violence_level: Mapped[int] = mapped_column(SmallInteger, default=0)
    language_level: Mapped[int] = mapped_column(SmallInteger, default=0)
    sexual_content_level: Mapped[int] = mapped_column(SmallInteger, default=0)
    substance_use_level: Mapped[int] = mapped_column(SmallInteger, default=0)
    other_tags: Mapped[list[str] | None] = mapped_column(
        ARRAY(VARCHAR(100)), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    book: Mapped["Book"] = relationship(back_populates="content_ratings")  # noqa: F821
    user: Mapped["User"] = relationship(back_populates="content_ratings")  # noqa: F821
