from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from .book import book_genres


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)

    books: Mapped[list["Book"]] = relationship(  # noqa: F821
        secondary=book_genres, back_populates="genres"
    )
