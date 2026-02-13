"""Pydantic schemas for multi-dimensional ratings."""

from pydantic import BaseModel, Field, computed_field
from typing import Optional
from datetime import datetime


class MultiDimensionalRatingBase(BaseModel):
    """Base schema for multi-dimensional ratings.

    All dimensions are optional - users can rate only what matters to them.
    """

    pace: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Reading pace: 1 (Very Slow) to 5 (Very Fast)",
    )
    emotional_impact: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Emotional impact: 1 (Low) to 5 (Devastating)",
    )
    complexity: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Complexity: 1 (Simple) to 5 (Dense)",
    )
    character_development: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Character development: 1 (Weak) to 5 (Exceptional)",
    )
    plot_quality: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Plot quality: 1 (Poor) to 5 (Excellent)",
    )
    prose_style: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Prose style: 1 (Weak) to 5 (Beautiful)",
    )
    originality: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Originality: 1 (Derivative) to 5 (Groundbreaking)",
    )


class MultiDimensionalRatingCreate(MultiDimensionalRatingBase):
    """Schema for creating/updating a rating."""

    book_id: int


class MultiDimensionalRatingResponse(MultiDimensionalRatingBase):
    """Schema for rating responses."""

    id: int
    user_id: int
    book_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    @computed_field
    @property
    def star_equivalent(self) -> Optional[float]:
        """Calculate 5-star equivalent for backwards compatibility."""
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

        return round(sum(non_null) / len(non_null), 2)

    model_config = {"from_attributes": True}


class BookFingerprintResponse(BaseModel):
    """Aggregated multi-dimensional ratings for a book."""

    book_id: int
    avg_pace: Optional[float] = None
    avg_emotional_impact: Optional[float] = None
    avg_complexity: Optional[float] = None
    avg_character_development: Optional[float] = None
    avg_plot_quality: Optional[float] = None
    avg_prose_style: Optional[float] = None
    avg_originality: Optional[float] = None
    star_equivalent: Optional[float] = None
    total_ratings: int
    updated_at: datetime

    @computed_field
    @property
    def has_ratings(self) -> bool:
        """Check if book has any ratings."""
        return self.total_ratings > 0

    model_config = {"from_attributes": True}


class RadarChartData(BaseModel):
    """Data formatted for radar chart display."""

    dimensions: list[dict[str, str | float]] = Field(
        description="Chart data points with dimension name and value"
    )

    @staticmethod
    def from_rating(
        rating: MultiDimensionalRatingBase | BookFingerprintResponse,
    ) -> "RadarChartData":
        """Convert a rating to radar chart format."""
        if isinstance(rating, BookFingerprintResponse):
            data = [
                {"dimension": "Pace", "value": rating.avg_pace or 0},
                {"dimension": "Emotion", "value": rating.avg_emotional_impact or 0},
                {"dimension": "Complexity", "value": rating.avg_complexity or 0},
                {"dimension": "Character", "value": rating.avg_character_development or 0},
                {"dimension": "Plot", "value": rating.avg_plot_quality or 0},
                {"dimension": "Prose", "value": rating.avg_prose_style or 0},
                {"dimension": "Originality", "value": rating.avg_originality or 0},
            ]
        else:
            data = [
                {"dimension": "Pace", "value": rating.pace or 0},
                {"dimension": "Emotion", "value": rating.emotional_impact or 0},
                {"dimension": "Complexity", "value": rating.complexity or 0},
                {"dimension": "Character", "value": rating.character_development or 0},
                {"dimension": "Plot", "value": rating.plot_quality or 0},
                {"dimension": "Prose", "value": rating.prose_style or 0},
                {"dimension": "Originality", "value": rating.originality or 0},
            ]

        return RadarChartData(dimensions=data)
