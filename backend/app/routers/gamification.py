"""Personal reading gamification: sessions, streaks, XP, and badges.

Strictly private and self-referential (no leaderboards, no public counters) -
see PRODUCT_VISION.md "Personal Reading Companion" for the philosophy.
"""

import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..auth import get_current_user
from ..models.user import User
from ..models.reading_session import ReadingSession
from ..models.gamification import UserGamification, Badge, UserBadge
from ..schemas.gamification import (
    ReadingSessionCreate,
    ReadingSessionOut,
    GamificationStats,
    BadgeOut,
    LogSessionResponse,
)

router = APIRouter(prefix="/api/gamification", tags=["gamification"])

XP_PER_SESSION = 10
XP_PER_MINUTE = 1
XP_PER_LEVEL = 100
COMEBACK_GAP_DAYS = 14

# Behavior-based, not volume-based: rewards consistency and depth, not raw page/book counts.
BADGE_DEFINITIONS = {
    "first_session": ("First Page", "Logged your first reading session."),
    "streak_3": ("Getting Going", "Read on 3 days in a row."),
    "streak_7": ("One Week Strong", "Read on 7 days in a row."),
    "streak_30": ("Habit Formed", "Read on 30 days in a row."),
    "comeback": ("Welcome Back", "Picked reading back up after a break."),
    "deep_dive": ("Deep Dive", "Rated a book across all seven dimensions."),
}


async def _get_or_create_stats(db: AsyncSession, user_id: int) -> UserGamification:
    result = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    stats = result.scalar_one_or_none()
    if not stats:
        stats = UserGamification(user_id=user_id)
        db.add(stats)
        await db.flush()
    return stats


async def _award_badge(db: AsyncSession, user_id: int, code: str) -> Badge | None:
    """Award a badge if not already earned. Returns the Badge if newly awarded, else None."""
    badge_result = await db.execute(select(Badge).where(Badge.code == code))
    badge = badge_result.scalar_one_or_none()
    if not badge:
        name, description = BADGE_DEFINITIONS[code]
        badge = Badge(code=code, name=name, description=description)
        db.add(badge)
        await db.flush()

    existing_result = await db.execute(
        select(UserBadge).where(UserBadge.user_id == user_id, UserBadge.badge_id == badge.id)
    )
    if existing_result.scalar_one_or_none():
        return None

    db.add(UserBadge(user_id=user_id, badge_id=badge.id))
    await db.flush()
    return badge


async def check_deep_dive_badge(db: AsyncSession, user_id: int, rating) -> Badge | None:
    """Award the Deep Dive badge when a rating fills all seven dimensions.

    Called from the multi-dimensional-ratings router after a rating is saved.
    """
    dimensions = [
        rating.pace,
        rating.emotional_impact,
        rating.complexity,
        rating.character_development,
        rating.plot_quality,
        rating.prose_style,
        rating.originality,
    ]
    if all(d is not None for d in dimensions):
        return await _award_badge(db, user_id, "deep_dive")
    return None


def _mood_for_streak(streak: int) -> str:
    if streak >= 7:
        return "ecstatic"
    if streak >= 3:
        return "happy"
    if streak >= 1:
        return "content"
    return "neutral"


async def _earned_badges(db: AsyncSession, user_id: int) -> list[BadgeOut]:
    result = await db.execute(
        select(Badge, UserBadge.earned_at)
        .join(UserBadge, UserBadge.badge_id == Badge.id)
        .where(UserBadge.user_id == user_id)
        .order_by(UserBadge.earned_at)
    )
    return [
        BadgeOut(code=badge.code, name=badge.name, description=badge.description, earned_at=earned_at)
        for badge, earned_at in result.all()
    ]


@router.post("/sessions", response_model=LogSessionResponse, status_code=201)
async def log_reading_session(
    data: ReadingSessionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = ReadingSession(
        user_id=user.id,
        book_id=data.book_id,
        session_date=data.session_date,
        minutes_read=data.minutes_read,
        pages_read=data.pages_read,
    )
    db.add(session)

    stats = await _get_or_create_stats(db, user.id)
    new_badges: list[Badge] = []
    is_first_session = stats.last_session_date is None

    if stats.last_session_date is None:
        stats.current_streak = 1
    elif data.session_date == stats.last_session_date:
        pass  # additional session logged for a day already counted
    elif data.session_date == stats.last_session_date + datetime.timedelta(days=1):
        stats.current_streak += 1
    else:
        gap = (data.session_date - stats.last_session_date).days
        if gap >= COMEBACK_GAP_DAYS:
            badge = await _award_badge(db, user.id, "comeback")
            if badge:
                new_badges.append(badge)
        stats.current_streak = 1

    stats.last_session_date = data.session_date
    stats.longest_streak = max(stats.longest_streak, stats.current_streak)
    stats.xp_total += XP_PER_SESSION + data.minutes_read * XP_PER_MINUTE
    stats.level = stats.xp_total // XP_PER_LEVEL + 1
    stats.mascot_mood = _mood_for_streak(stats.current_streak)

    if is_first_session:
        badge = await _award_badge(db, user.id, "first_session")
        if badge:
            new_badges.append(badge)

    for streak_code, threshold in (("streak_30", 30), ("streak_7", 7), ("streak_3", 3)):
        if stats.current_streak >= threshold:
            badge = await _award_badge(db, user.id, streak_code)
            if badge:
                new_badges.append(badge)
            break

    await db.commit()
    await db.refresh(session)
    await db.refresh(stats)

    badges = await _earned_badges(db, user.id)

    return LogSessionResponse(
        session=ReadingSessionOut.model_validate(session),
        stats=GamificationStats(
            xp_total=stats.xp_total,
            level=stats.level,
            current_streak=stats.current_streak,
            longest_streak=stats.longest_streak,
            mascot_mood=stats.mascot_mood,
            badges=badges,
        ),
        new_badges=[
            BadgeOut(
                code=b.code,
                name=b.name,
                description=b.description,
                earned_at=datetime.datetime.now(datetime.timezone.utc),
            )
            for b in new_badges
        ],
    )


@router.get("/stats", response_model=GamificationStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stats = await _get_or_create_stats(db, user.id)
    await db.commit()
    badges = await _earned_badges(db, user.id)
    return GamificationStats(
        xp_total=stats.xp_total,
        level=stats.level,
        current_streak=stats.current_streak,
        longest_streak=stats.longest_streak,
        mascot_mood=stats.mascot_mood,
        badges=badges,
    )


@router.get("/sessions", response_model=list[ReadingSessionOut])
async def list_sessions(
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReadingSession)
        .where(ReadingSession.user_id == user.id)
        .order_by(ReadingSession.session_date.desc())
        .limit(limit)
    )
    return result.scalars().all()
