import datetime
from sqlalchemy import ForeignKey, DateTime, Date, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class ReadingSession(Base):
    """A single day's reading activity, used to power streaks/XP and daily charts."""

    __tablename__ = "reading_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[int | None] = mapped_column(
        ForeignKey("books.id", ondelete="SET NULL"), nullable=True
    )
    session_date: Mapped[datetime.date] = mapped_column(Date, index=True)
    minutes_read: Mapped[int] = mapped_column(Integer)
    pages_read: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
