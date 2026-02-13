"""Multi-dimensional rating model for nuanced book ratings.

Instead of a simple 5-star rating, this model captures multiple dimensions
of a reading experience, enabling better recommendations and book discovery.
"""

import datetime
from sqlalchemy import ForeignKey, DateTime, SmallInteger, func, UniqueConstraint, CheckConstraint, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class MultiDimensionalRating(Base):
    """7-dimensional rating system for books.

    Each dimension is rated on a 1-5 scale:
    - pace: 1 (Very Slow) to 5 (Very Fast)
    - emotional_impact: 1 (Low) to 5 (Devastating)
    - complexity: 1 (Simple) to 5 (Dense)
    - character_development: 1 (Weak) to 5 (Exceptional)
    - plot_quality: 1 (Poor) to 5 (Excellent)
    - prose_style: 1 (Weak) to 5 (Beautiful)
    - originality: 1 (Derivative) to 5 (Groundbreaking)

    All dimensions are nullable, allowing users to rate only what matters to them.
    """

    __tablename__ = "multi_dimensional_ratings"
    __table_args__ = (
        UniqueConstraint("user_id", "book_id", name="uq_user_book_rating"),
        CheckConstraint("pace IS NULL OR (pace >= 1 AND pace <= 5)", name="check_pace"),
        CheckConstraint(
            "emotional_impact IS NULL OR (emotional_impact >= 1 AND emotional_impact <= 5)",
            name="check_emotional_impact",
        ),
        CheckConstraint(
            "complexity IS NULL OR (complexity >= 1 AND complexity <= 5)", name="check_complexity"
        ),
        CheckConstraint(
            "character_development IS NULL OR (character_development >= 1 AND character_development <= 5)",
            name="check_character_development",
        ),
        CheckConstraint(
            "plot_quality IS NULL OR (plot_quality >= 1 AND plot_quality <= 5)",
            name="check_plot_quality",
        ),
        CheckConstraint(
            "prose_style IS NULL OR (prose_style >= 1 AND prose_style <= 5)",
            name="check_prose_style",
        ),
        CheckConstraint(
            "originality IS NULL OR (originality >= 1 AND originality <= 5)",
            name="check_originality",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"))

    # Rating dimensions (1-5 scale, all nullable)
    pace: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    emotional_impact: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    complexity: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    character_development: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    plot_quality: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    prose_style: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    originality: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="multi_dimensional_ratings")  # noqa: F821
    book: Mapped["Book"] = relationship(back_populates="multi_dimensional_ratings")  # noqa: F821

    @property
    def star_equivalent(self) -> float | None:
        """Calculate a 5-star equivalent for backwards compatibility.

        Averages all non-null dimensions to get a single score.
        """
        dimensions = [
            self.pace,
            self.emotional_impact,
            self.complexity,
            self.character_development,
            self.plot_quality,
            self.prose_style,
            self.originality,
        ]
        non_null = [d for d in dimensions if d is not None]

        if not non_null:
            return None

        return sum(non_null) / len(non_null)

    @property
    def fingerprint_vector(self) -> list[float]:
        """Return rating as a 7-dimensional vector for similarity calculations.

        Missing dimensions are filled with 3.0 (neutral).
        """
        return [
            float(self.pace or 3.0),
            float(self.emotional_impact or 3.0),
            float(self.complexity or 3.0),
            float(self.character_development or 3.0),
            float(self.plot_quality or 3.0),
            float(self.prose_style or 3.0),
            float(self.originality or 3.0),
        ]


class BookFingerprint(Base):
    """Aggregated multi-dimensional ratings for a book.

    This table is automatically updated when ratings change.
    It stores average ratings across all users for quick retrieval.
    """

    __tablename__ = "book_fingerprints"

    book_id: Mapped[int] = mapped_column(
        ForeignKey("books.id", ondelete="CASCADE"), primary_key=True
    )

    # Average ratings across all users
    avg_pace: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_emotional_impact: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_complexity: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_character_development: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_plot_quality: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_prose_style: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_originality: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Overall "star equivalent" for simple display
    star_equivalent: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Metadata
    total_ratings: Mapped[int] = mapped_column(SmallInteger, default=0)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationship
    book: Mapped["Book"] = relationship(back_populates="fingerprint")  # noqa: F821

    @property
    def fingerprint_vector(self) -> list[float]:
        """Return fingerprint as a 7-dimensional vector for similarity search.

        Missing dimensions are filled with 3.0 (neutral average).
        """
        return [
            self.avg_pace or 3.0,
            self.avg_emotional_impact or 3.0,
            self.avg_complexity or 3.0,
            self.avg_character_development or 3.0,
            self.avg_plot_quality or 3.0,
            self.avg_prose_style or 3.0,
            self.avg_originality or 3.0,
        ]
