import datetime
from sqlalchemy import ForeignKey, Date, DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class ChallengeCompletion(Base):
    """Records a one-time bonus XP award for completing a personal weekly challenge.

    Challenges are computed on the fly from existing reading data (see
    routers/gamification.py); this table only remembers that a given
    user/code/week has already been rewarded, so re-checking doesn't
    double-award XP.
    """

    __tablename__ = "challenge_completions"
    __table_args__ = (UniqueConstraint("user_id", "code", "period_start"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    period_start: Mapped[datetime.date] = mapped_column(Date)
    completed_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
