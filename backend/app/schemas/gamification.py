import datetime
from pydantic import BaseModel


class ReadingSessionCreate(BaseModel):
    book_id: int | None = None
    session_date: datetime.date
    minutes_read: int
    pages_read: int | None = None


class ReadingSessionOut(BaseModel):
    id: int
    book_id: int | None
    session_date: datetime.date
    minutes_read: int
    pages_read: int | None

    model_config = {"from_attributes": True}


class BadgeOut(BaseModel):
    code: str
    name: str
    description: str
    earned_at: datetime.datetime

    model_config = {"from_attributes": True}


class GamificationStats(BaseModel):
    xp_total: int
    level: int
    current_streak: int
    longest_streak: int
    mascot_mood: str
    badges: list[BadgeOut] = []


class LogSessionResponse(BaseModel):
    session: ReadingSessionOut
    stats: GamificationStats
    new_badges: list[BadgeOut] = []
