# The Shelf - Implementation Roadmap

This document provides a step-by-step guide for implementing The Shelf from the current POC to the full vision outlined in [PRODUCT_VISION.md](PRODUCT_VISION.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Current State Assessment

### What We Have (POC)
✅ FastAPI + SQLAlchemy backend
✅ React 18 + TypeScript + Tailwind frontend
✅ User authentication (JWT)
✅ Basic book tracking (Want to Read, Currently Reading, Finished, DNF)
✅ 5-star rating system
✅ Review system (create, edit, delete)
✅ Content ratings (community-driven, 0-4 scale)
✅ Open Library import
✅ PostgreSQL database
✅ Docker Compose setup
✅ Vercel deployment configuration

### What Needs to Change

#### Backend
- ❌ 5-star ratings → Multi-dimensional ratings (7-axis system)
- ❌ Simple book model → Enhanced with embeddings
- ❌ Missing privacy controls
- ❌ No recommendation engine
- ❌ No reading analytics
- ❌ No reading mood tracking

#### Frontend
- ❌ Vite + React → Next.js 14 (App Router)
- ❌ Generic UI → Opinionated design system
- ❌ Star rating UI → Radar chart + sliders
- ❌ Basic search → Intelligent discovery
- ❌ No analytics dashboard

#### Infrastructure
- ❌ No vector database extension (pgvector)
- ❌ No embeddings generation
- ❌ No background jobs system

---

## Implementation Phases

## Phase 1: Foundation & Data Model (Week 1-2)

### Goal
Upgrade the database schema and backend models to support the new vision without breaking existing functionality.

### Tasks

#### 1.1 Database Migration

**File:** `backend/app/alembic/versions/002_multi_dimensional_ratings.py`

```python
"""Add multi-dimensional ratings and enhanced book model

Revision ID: 002
Revises: 001
Create Date: 2025-01-XX
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector

def upgrade():
    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # Add new columns to books table
    op.add_column('books', sa.Column('description_embedding', Vector(384), nullable=True))
    op.add_column('books', sa.Column('metadata', JSONB, server_default='{}'))

    # Create multi_dimensional_ratings table
    op.create_table(
        'multi_dimensional_ratings',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE')),
        sa.Column('book_id', UUID(as_uuid=True), sa.ForeignKey('books.id', ondelete='CASCADE')),
        sa.Column('pace', sa.Integer, nullable=True),
        sa.Column('emotional_impact', sa.Integer, nullable=True),
        sa.Column('complexity', sa.Integer, nullable=True),
        sa.Column('character_development', sa.Integer, nullable=True),
        sa.Column('plot_quality', sa.Integer, nullable=True),
        sa.Column('prose_style', sa.Integer, nullable=True),
        sa.Column('originality', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, onupdate=sa.func.now()),
        sa.UniqueConstraint('user_id', 'book_id', name='uq_user_book_rating'),
        sa.CheckConstraint('pace >= 1 AND pace <= 5', name='check_pace'),
        sa.CheckConstraint('emotional_impact >= 1 AND emotional_impact <= 5', name='check_emotion'),
        sa.CheckConstraint('complexity >= 1 AND complexity <= 5', name='check_complexity'),
        sa.CheckConstraint('character_development >= 1 AND character_development <= 5', name='check_character'),
        sa.CheckConstraint('plot_quality >= 1 AND plot_quality <= 5', name='check_plot'),
        sa.CheckConstraint('prose_style >= 1 AND prose_style <= 5', name='check_prose'),
        sa.CheckConstraint('originality >= 1 AND originality <= 5', name='check_originality'),
    )

    # Create book_fingerprints table (aggregated ratings)
    op.create_table(
        'book_fingerprints',
        sa.Column('book_id', UUID(as_uuid=True), sa.ForeignKey('books.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('avg_pace', sa.Float, nullable=True),
        sa.Column('avg_emotional_impact', sa.Float, nullable=True),
        sa.Column('avg_complexity', sa.Float, nullable=True),
        sa.Column('avg_character_development', sa.Float, nullable=True),
        sa.Column('avg_plot_quality', sa.Float, nullable=True),
        sa.Column('avg_prose_style', sa.Float, nullable=True),
        sa.Column('avg_originality', sa.Float, nullable=True),
        sa.Column('star_equivalent', sa.Float, nullable=True),
        sa.Column('total_ratings', sa.Integer, default=0),
        sa.Column('fingerprint_vector', Vector(7), nullable=True),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Add privacy settings to users table
    op.add_column('users', sa.Column('privacy_settings', JSONB, server_default='{"profile_visible": false, "reading_list_visible": false, "reviews_visible": true}'))
    op.add_column('users', sa.Column('preferences', JSONB, server_default='{}'))

    # Enhance reviews table
    op.add_column('reviews', sa.Column('spoiler_level', sa.Enum('none', 'minor', 'major', name='spoiler_level'), server_default='none'))
    op.add_column('reviews', sa.Column('review_style', sa.Enum('analysis', 'personal', 'quick_take', name='review_style'), nullable=True))
    op.add_column('reviews', sa.Column('is_verified_reader', sa.Boolean, server_default='false'))
    op.add_column('reviews', sa.Column('helpful_count', sa.Integer, server_default='0'))
    op.add_column('reviews', sa.Column('not_helpful_count', sa.Integer, server_default='0'))
    op.add_column('reviews', sa.Column('visibility', sa.Enum('private', 'friends', 'public', name='review_visibility'), server_default='public'))

    # Enhance user_books table
    op.add_column('user_books', sa.Column('reading_sessions', JSONB, server_default='[]'))
    op.add_column('user_books', sa.Column('is_reread', sa.Boolean, server_default='false'))
    op.add_column('user_books', sa.Column('reread_count', sa.Integer, server_default='0'))
    op.add_column('user_books', sa.Column('is_private', sa.Boolean, server_default='false'))

    # Create indexes for performance
    op.create_index('idx_book_embedding', 'books', ['description_embedding'], postgresql_using='ivfflat')
    op.create_index('idx_fingerprint_vector', 'book_fingerprints', ['fingerprint_vector'], postgresql_using='ivfflat')

def downgrade():
    # Reverse all changes
    op.drop_index('idx_fingerprint_vector', table_name='book_fingerprints')
    op.drop_index('idx_book_embedding', table_name='books')
    op.drop_table('book_fingerprints')
    op.drop_table('multi_dimensional_ratings')
    op.drop_column('user_books', 'is_private')
    op.drop_column('user_books', 'reread_count')
    op.drop_column('user_books', 'is_reread')
    op.drop_column('user_books', 'reading_sessions')
    op.drop_column('reviews', 'visibility')
    op.drop_column('reviews', 'not_helpful_count')
    op.drop_column('reviews', 'helpful_count')
    op.drop_column('reviews', 'is_verified_reader')
    op.drop_column('reviews', 'review_style')
    op.drop_column('reviews', 'spoiler_level')
    op.drop_column('users', 'preferences')
    op.drop_column('users', 'privacy_settings')
    op.drop_column('books', 'metadata')
    op.drop_column('books', 'description_embedding')
```

**Execute:**
```bash
cd backend
alembic upgrade head
```

#### 1.2 Update Backend Models

**Files to modify:**
- `backend/app/models/user.py` - Add privacy_settings, preferences
- `backend/app/models/book.py` - Add description_embedding, metadata
- `backend/app/models/user_book.py` - Add reading_sessions, reread tracking
- `backend/app/models/review.py` - Add spoiler_level, review_style, etc.

**New files to create:**
- `backend/app/models/multi_dimensional_rating.py`
- `backend/app/models/book_fingerprint.py`

#### 1.3 Update Pydantic Schemas

**Files to modify:**
- `backend/app/schemas/user.py` - Add privacy settings
- `backend/app/schemas/book.py` - Add metadata, fingerprint
- `backend/app/schemas/review.py` - Add new fields

**New files:**
- `backend/app/schemas/multi_dimensional_rating.py`

```python
# Example: backend/app/schemas/multi_dimensional_rating.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class MultiDimensionalRatingBase(BaseModel):
    pace: Optional[int] = Field(None, ge=1, le=5, description="Reading pace (1=Very Slow, 5=Very Fast)")
    emotional_impact: Optional[int] = Field(None, ge=1, le=5)
    complexity: Optional[int] = Field(None, ge=1, le=5)
    character_development: Optional[int] = Field(None, ge=1, le=5)
    plot_quality: Optional[int] = Field(None, ge=1, le=5)
    prose_style: Optional[int] = Field(None, ge=1, le=5)
    originality: Optional[int] = Field(None, ge=1, le=5)

class MultiDimensionalRatingCreate(MultiDimensionalRatingBase):
    book_id: UUID

class MultiDimensionalRatingResponse(MultiDimensionalRatingBase):
    id: UUID
    user_id: UUID
    book_id: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class BookFingerprint(BaseModel):
    """Aggregated multi-dimensional ratings for a book"""
    avg_pace: Optional[float]
    avg_emotional_impact: Optional[float]
    avg_complexity: Optional[float]
    avg_character_development: Optional[float]
    avg_plot_quality: Optional[float]
    avg_prose_style: Optional[float]
    avg_originality: Optional[float]
    star_equivalent: Optional[float]
    total_ratings: int

    class Config:
        from_attributes = True
```

#### 1.4 Create New API Endpoints

**New file:** `backend/app/routers/multi_dimensional_ratings.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.multi_dimensional_rating import MultiDimensionalRating
from app.schemas.multi_dimensional_rating import MultiDimensionalRatingCreate, MultiDimensionalRatingResponse

router = APIRouter(prefix="/ratings", tags=["multi-dimensional-ratings"])

@router.post("/", response_model=MultiDimensionalRatingResponse)
async def create_or_update_rating(
    rating: MultiDimensionalRatingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or update multi-dimensional rating for a book"""
    # Check if rating exists
    existing = await db.execute(
        select(MultiDimensionalRating).where(
            MultiDimensionalRating.user_id == current_user.id,
            MultiDimensionalRating.book_id == rating.book_id
        )
    )
    existing_rating = existing.scalar_one_or_none()

    if existing_rating:
        # Update existing rating
        for key, value in rating.dict(exclude_unset=True).items():
            if key != 'book_id':
                setattr(existing_rating, key, value)
        existing_rating.updated_at = func.now()
    else:
        # Create new rating
        new_rating = MultiDimensionalRating(
            user_id=current_user.id,
            **rating.dict()
        )
        db.add(new_rating)

    await db.commit()

    # Update book fingerprint (aggregate)
    await update_book_fingerprint(db, rating.book_id)

    return existing_rating or new_rating

@router.get("/{book_id}", response_model=MultiDimensionalRatingResponse)
async def get_user_rating(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's rating for a book"""
    result = await db.execute(
        select(MultiDimensionalRating).where(
            MultiDimensionalRating.user_id == current_user.id,
            MultiDimensionalRating.book_id == book_id
        )
    )
    rating = result.scalar_one_or_none()
    if not rating:
        raise HTTPException(404, "Rating not found")
    return rating

@router.delete("/{book_id}")
async def delete_rating(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user's rating for a book"""
    result = await db.execute(
        select(MultiDimensionalRating).where(
            MultiDimensionalRating.user_id == current_user.id,
            MultiDimensionalRating.book_id == book_id
        )
    )
    rating = result.scalar_one_or_none()
    if not rating:
        raise HTTPException(404, "Rating not found")

    await db.delete(rating)
    await db.commit()

    # Update book fingerprint
    await update_book_fingerprint(db, book_id)

    return {"message": "Rating deleted"}

async def update_book_fingerprint(db: AsyncSession, book_id: UUID):
    """Recalculate aggregate ratings for a book"""
    # Calculate averages
    result = await db.execute(
        select(
            func.avg(MultiDimensionalRating.pace).label('avg_pace'),
            func.avg(MultiDimensionalRating.emotional_impact).label('avg_emotional_impact'),
            func.avg(MultiDimensionalRating.complexity).label('avg_complexity'),
            func.avg(MultiDimensionalRating.character_development).label('avg_character_development'),
            func.avg(MultiDimensionalRating.plot_quality).label('avg_plot_quality'),
            func.avg(MultiDimensionalRating.prose_style).label('avg_prose_style'),
            func.avg(MultiDimensionalRating.originality).label('avg_originality'),
            func.count().label('total_ratings')
        ).where(MultiDimensionalRating.book_id == book_id)
    )
    stats = result.one()

    # Calculate star equivalent (average of all dimensions)
    dimensions = [
        stats.avg_pace, stats.avg_emotional_impact, stats.avg_complexity,
        stats.avg_character_development, stats.avg_plot_quality,
        stats.avg_prose_style, stats.avg_originality
    ]
    star_equivalent = sum(d for d in dimensions if d is not None) / len([d for d in dimensions if d is not None])

    # Upsert book fingerprint
    # ... (implementation details)
```

**Register router in `backend/app/main.py`:**
```python
from app.routers import multi_dimensional_ratings

app.include_router(multi_dimensional_ratings.router, prefix="/api")
```

#### 1.5 Install Dependencies

**Add to `backend/requirements.txt`:**
```
pgvector==0.2.4
sentence-transformers==2.2.2
scikit-learn==1.3.2
numpy==1.24.3
```

**Install:**
```bash
cd backend
pip install -r requirements.txt
```

---

## Phase 2: Frontend Migration (Next.js) (Week 2-3)

### Goal
Migrate from Vite + React to Next.js 14 (App Router) while preserving all existing functionality.

### Tasks

#### 2.1 Initialize Next.js

**Execute:**
```bash
cd frontend
npx create-next-app@latest next-app --typescript --tailwind --app --src-dir --import-alias "@/*"
```

**Move existing code:**
```bash
# Copy components
cp -r src/components next-app/src/components

# Copy types
cp src/types/index.ts next-app/src/types/index.ts

# Copy services
cp -r src/services next-app/src/lib/

# Copy styles
cp src/index.css next-app/src/app/globals.css
```

#### 2.2 Convert Pages to App Router

**File structure:**
```
next-app/src/app/
├── layout.tsx                  # Root layout (replaces App.tsx)
├── page.tsx                    # Home page (was HomePage.tsx)
├── books/
│   ├── [id]/
│   │   └── page.tsx           # Book detail (was BookDetailPage.tsx)
│   └── page.tsx               # Books list
├── library/
│   └── page.tsx               # Library (was LibraryPage.tsx)
├── login/
│   └── page.tsx               # Login (was LoginPage.tsx)
└── api/
    └── auth/
        └── [...nextauth]/
            └── route.ts        # Optional: NextAuth.js
```

**Example: `next-app/src/app/books/[id]/page.tsx`**
```tsx
// Server Component (default in App Router)
import { notFound } from 'next/navigation';
import { BookDetailClient } from '@/components/BookDetailClient';

async function getBook(id: string) {
  const res = await fetch(`${process.env.API_URL}/api/books/${id}`, {
    cache: 'no-store' // or { next: { revalidate: 60 } }
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function BookDetailPage({ params }: { params: { id: string } }) {
  const book = await getBook(params.id);

  if (!book) {
    notFound();
  }

  return <BookDetailClient book={book} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: { id: string } }) {
  const book = await getBook(params.id);

  return {
    title: `${book.title} by ${book.author} - The Shelf`,
    description: book.description?.substring(0, 160),
    openGraph: {
      title: book.title,
      description: book.description,
      images: [book.cover_url],
    },
  };
}
```

#### 2.3 Create Client Components

**File:** `next-app/src/components/BookDetailClient.tsx`
```tsx
'use client'  // Mark as Client Component

import { useState } from 'react';
import { MultiDimensionalRatingForm } from './MultiDimensionalRatingForm';
import { ReviewList } from './ReviewList';

export function BookDetailClient({ book }: { book: Book }) {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <div>
      {/* Interactive UI here */}
      <Tabs activeTab={activeTab} onTabChange={setActiveTab}>
        {/* ... */}
      </Tabs>
    </div>
  );
}
```

#### 2.4 Update API Client for Server/Client

**File:** `next-app/src/lib/api.ts`
```typescript
// Works in both Server and Client Components

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Include cookies
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

// Server-side only functions (use in Server Components)
export async function getBooks(params?: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return fetchAPI(`/api/books${query ? `?${query}` : ''}`);
}

// Client-side functions (use in Client Components)
export async function createRating(rating: MultiDimensionalRatingCreate) {
  return fetchAPI('/api/ratings', {
    method: 'POST',
    body: JSON.stringify(rating),
  });
}
```

#### 2.5 Run in Parallel with Vite

**Update package.json:**
```json
{
  "scripts": {
    "dev:old": "vite",
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

**Test both:**
```bash
# Terminal 1: Old Vite app
npm run dev:old  # Port 5173

# Terminal 2: New Next.js app
cd next-app
npm run dev  # Port 3000
```

---

## Phase 3: Multi-Dimensional Rating UI (Week 3-4)

### Goal
Replace 5-star ratings with an intuitive multi-dimensional rating system using radar charts and sliders.

### Tasks

#### 3.1 Install Chart Library

**Choose:** Recharts (React-friendly, small bundle, good for radar charts)

```bash
cd next-app
npm install recharts
```

#### 3.2 Create Rating Components

**File:** `next-app/src/components/MultiDimensionalRatingForm.tsx`
```tsx
'use client'

import { useState } from 'react';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { RadarChart } from '@/components/RadarChart';

interface RatingDimensions {
  pace?: number;
  emotional_impact?: number;
  complexity?: number;
  character_development?: number;
  plot_quality?: number;
  prose_style?: number;
  originality?: number;
}

export function MultiDimensionalRatingForm({ bookId, initialRating }: Props) {
  const [rating, setRating] = useState<RatingDimensions>(initialRating || {});
  const [saving, setSaving] = useState(false);

  const dimensions = [
    { key: 'pace', label: 'Pace', description: '1 = Very Slow, 5 = Very Fast' },
    { key: 'emotional_impact', label: 'Emotional Impact', description: '1 = Low, 5 = Devastating' },
    { key: 'complexity', label: 'Complexity', description: '1 = Simple, 5 = Dense' },
    { key: 'character_development', label: 'Character Development', description: '1 = Weak, 5 = Exceptional' },
    { key: 'plot_quality', label: 'Plot Quality', description: '1 = Poor, 5 = Excellent' },
    { key: 'prose_style', label: 'Prose Style', description: '1 = Weak, 5 = Beautiful' },
    { key: 'originality', label: 'Originality', description: '1 = Derivative, 5 = Groundbreaking' },
  ];

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await createRating({ book_id: bookId, ...rating });
      // Show success toast
    } catch (error) {
      // Show error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Radar Chart Preview */}
      <div className="flex justify-center">
        <RadarChart data={rating} />
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        {dimensions.map(dim => (
          <div key={dim.key}>
            <label className="block text-sm font-medium mb-1">
              {dim.label}
              <span className="text-gray-500 text-xs ml-2">{dim.description}</span>
            </label>
            <Slider
              min={1}
              max={5}
              step={1}
              value={rating[dim.key] || 3}
              onChange={(val) => setRating({ ...rating, [dim.key]: val })}
              marks={[1, 2, 3, 4, 5]}
            />
          </div>
        ))}
      </div>

      {/* Submit */}
      <Button onClick={handleSubmit} loading={saving} variant="primary" size="lg" fullWidth>
        Save Rating
      </Button>

      {/* Optional: Show star equivalent */}
      <p className="text-center text-sm text-gray-500">
        Star equivalent: {calculateStarEquivalent(rating).toFixed(1)} / 5.0
      </p>
    </div>
  );
}

function calculateStarEquivalent(rating: RatingDimensions): number {
  const values = Object.values(rating).filter(v => v !== undefined);
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}
```

**File:** `next-app/src/components/RadarChart.tsx`
```tsx
'use client'

import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export function RadarChart({ data }: { data: Record<string, number> }) {
  const chartData = [
    { dimension: 'Pace', value: data.pace || 0, fullMark: 5 },
    { dimension: 'Emotion', value: data.emotional_impact || 0, fullMark: 5 },
    { dimension: 'Complexity', value: data.complexity || 0, fullMark: 5 },
    { dimension: 'Character', value: data.character_development || 0, fullMark: 5 },
    { dimension: 'Plot', value: data.plot_quality || 0, fullMark: 5 },
    { dimension: 'Prose', value: data.prose_style || 0, fullMark: 5 },
    { dimension: 'Originality', value: data.originality || 0, fullMark: 5 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadar data={chartData}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} />
        <Radar name="Rating" dataKey="value" stroke="#8B4513" fill="#8B4513" fillOpacity={0.6} />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
```

#### 3.3 Display Book Fingerprint

**File:** `next-app/src/components/BookFingerprint.tsx`
```tsx
export function BookFingerprint({ fingerprint }: { fingerprint: BookFingerprint }) {
  if (!fingerprint || fingerprint.total_ratings === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No ratings yet. Be the first to rate this book!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Community Fingerprint</h3>

      {/* Radar Chart */}
      <RadarChart data={{
        pace: fingerprint.avg_pace,
        emotional_impact: fingerprint.avg_emotional_impact,
        complexity: fingerprint.avg_complexity,
        character_development: fingerprint.avg_character_development,
        plot_quality: fingerprint.avg_plot_quality,
        prose_style: fingerprint.avg_prose_style,
        originality: fingerprint.avg_originality,
      }} />

      {/* Stats */}
      <div className="mt-4 text-center">
        <p className="text-2xl font-bold text-shelf-600">
          {fingerprint.star_equivalent?.toFixed(1)} / 5.0
        </p>
        <p className="text-sm text-gray-500">
          Based on {fingerprint.total_ratings} rating{fingerprint.total_ratings !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
```

---

## Phase 4: Recommendation Engine (Week 4-5)

### Goal
Build an intelligent recommendation system using embeddings and collaborative filtering.

### Tasks

#### 4.1 Create Embedding Service

**File:** `backend/app/services/embeddings.py`
```python
from sentence_transformers import SentenceTransformer
import numpy as np

# Load model once (cache in memory)
model = SentenceTransformer('all-MiniLM-L6-v2')  # 384-dim embeddings

async def generate_book_embedding(description: str) -> list[float]:
    """Generate embedding vector for book description"""
    if not description:
        return None

    embedding = model.encode(description, convert_to_numpy=True)
    return embedding.tolist()

async def find_similar_books(book_id: UUID, db: AsyncSession, limit: int = 10):
    """Find books with similar embeddings"""
    # Get target book's embedding
    result = await db.execute(
        select(Book.description_embedding).where(Book.id == book_id)
    )
    target_embedding = result.scalar_one_or_none()

    if not target_embedding:
        return []

    # Use pgvector for cosine similarity search
    similar_books = await db.execute(
        select(Book)
        .where(Book.id != book_id)
        .order_by(Book.description_embedding.cosine_distance(target_embedding))
        .limit(limit)
    )

    return similar_books.scalars().all()
```

#### 4.2 Create Background Job for Embeddings

**File:** `backend/app/tasks/generate_embeddings.py`
```python
import asyncio
from app.database import SessionLocal
from app.models.book import Book
from app.services.embeddings import generate_book_embedding
from sqlalchemy import select

async def generate_missing_embeddings():
    """Background task to generate embeddings for books without them"""
    async with SessionLocal() as db:
        result = await db.execute(
            select(Book).where(Book.description_embedding.is_(None))
        )
        books = result.scalars().all()

        for book in books:
            if book.description:
                embedding = await generate_book_embedding(book.description)
                book.description_embedding = embedding
                await db.commit()
                print(f"Generated embedding for: {book.title}")

            await asyncio.sleep(0.1)  # Rate limiting
```

**Run on startup:**
```python
# backend/app/main.py
from app.tasks.generate_embeddings import generate_missing_embeddings

@app.on_event("startup")
async def startup_event():
    # Run in background
    asyncio.create_task(generate_missing_embeddings())
```

#### 4.3 Create Recommendation Endpoint

**File:** `backend/app/routers/recommendations.py`
```python
from fastapi import APIRouter, Depends
from app.services.recommendations import get_personalized_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/")
async def get_recommendations(
    count: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get personalized book recommendations"""
    recommendations = await get_personalized_recommendations(
        user_id=current_user.id,
        db=db,
        count=count
    )

    return recommendations

@router.get("/similar/{book_id}")
async def get_similar_books(
    book_id: UUID,
    count: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get books similar to a specific book"""
    similar = await find_similar_books(book_id, db, limit=count)

    return similar
```

---

## Phase 5: UI/UX Polish (Week 5-6)

### Goal
Implement the design system from [MODERNIZATION_PLAN.md](MODERNIZATION_PLAN.md).

### Tasks

- Create UI component library (Button, Input, Card, Modal, Toast, etc.)
- Implement dark mode
- Add loading skeletons
- Improve mobile responsiveness
- Add accessibility features (ARIA labels, keyboard nav)
- Create reading analytics dashboard

*(See MODERNIZATION_PLAN.md for detailed implementation)*

---

## Phase 6: Testing & Deployment (Week 6-7)

### Goal
Ensure quality and deploy to production.

### Tasks

- Write backend unit tests (pytest)
- Write frontend component tests (Jest + React Testing Library)
- E2E tests (Playwright)
- Performance testing (Lighthouse)
- Security audit (OWASP Top 10)
- Deploy to Vercel (frontend) + Railway (backend)
- Set up monitoring (Sentry, Vercel Analytics)

---

## Migration Checklist

### Pre-Migration
- [ ] Backup current database
- [ ] Document current API contracts
- [ ] Create test user accounts
- [ ] Export sample data

### Migration
- [ ] Run database migrations (alembic)
- [ ] Verify data integrity (check row counts)
- [ ] Test new endpoints (Postman/Insomnia)
- [ ] Migrate frontend (Next.js)
- [ ] Update environment variables

### Post-Migration
- [ ] Test user flows (register, add book, rate, review)
- [ ] Check performance (no slowdowns)
- [ ] Monitor error rates (Sentry)
- [ ] Verify analytics (reading stats)
- [ ] User acceptance testing (beta users)

### Rollback Plan
If migration fails:
1. Stop application
2. Restore database from backup
3. Revert code to previous commit
4. Restart application
5. Investigate issues

---

## Success Criteria

### MVP Launch Criteria
- [ ] Users can register and login
- [ ] Users can search and add books
- [ ] Users can track reading status
- [ ] Users can rate books with 7 dimensions
- [ ] Users can write reviews with spoiler controls
- [ ] Users see personalized recommendations
- [ ] Users can view reading analytics
- [ ] Mobile responsive (90+ Lighthouse score)
- [ ] No critical bugs (P0/P1)
- [ ] <200ms API response time (p95)

### Quality Metrics
- [ ] >80% backend test coverage
- [ ] >70% frontend test coverage
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] <2% error rate
- [ ] <500ms page load time (p95)

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Foundation | 1-2 weeks | New database schema, backend models |
| 2. Frontend Migration | 1-2 weeks | Next.js app with all existing features |
| 3. Multi-Dimensional Ratings | 1 week | Radar charts, rating UI |
| 4. Recommendation Engine | 1-2 weeks | Personalized recommendations |
| 5. UI/UX Polish | 1-2 weeks | Design system, dark mode, analytics |
| 6. Testing & Deployment | 1 week | Production deployment |
| **Total** | **6-9 weeks** | **Full MVP** |

---

## Next Steps

1. **Review this roadmap** with stakeholders
2. **Set up development environment** (database, Next.js)
3. **Begin Phase 1** (database migration)
4. **Iterate based on feedback**

Let's build The Shelf. 📚
