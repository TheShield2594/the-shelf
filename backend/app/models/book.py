import datetime
from sqlalchemy import String, Text, Date, DateTime, Table, Column, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

book_genres = Table(
    "book_genres",
    Base.metadata,
    Column("book_id", ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
)


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500), index=True)
    author: Mapped[str] = mapped_column(String(500), index=True)
    isbn: Mapped[str | None] = mapped_column(String(13), unique=True, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    publication_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    genres: Mapped[list["Genre"]] = relationship(  # noqa: F821
        secondary=book_genres, back_populates="books", lazy="selectin"
    )
    user_books: Mapped[list["UserBook"]] = relationship(back_populates="book")  # noqa: F821
    reviews: Mapped[list["Review"]] = relationship(back_populates="book", cascade="all, delete-orphan")  # noqa: F821
    content_ratings: Mapped[list["ContentRating"]] = relationship(back_populates="book", cascade="all, delete-orphan")  # noqa: F821
    multi_dimensional_ratings: Mapped[list["MultiDimensionalRating"]] = relationship(back_populates="book", cascade="all, delete-orphan")  # noqa: F821
    fingerprint: Mapped["BookFingerprint | None"] = relationship(back_populates="book", uselist=False, cascade="all, delete-orphan")  # noqa: F821

    related_to: Mapped[list["Book"]] = relationship(
        secondary="related_books",
        primaryjoin="Book.id == RelatedBook.book_id",
        secondaryjoin="Book.id == RelatedBook.related_book_id",
        lazy="selectin",
    )
