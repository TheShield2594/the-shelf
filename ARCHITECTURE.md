# The Shelf - System Architecture

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 App Router (React Server Components + Client)      │
│  - Server Components: Book pages, listings (SEO-friendly)      │
│  - Client Components: Interactive features, forms, charts      │
│  - Edge Middleware: Auth, rate limiting                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI (Python 3.11+)                                         │
│  - RESTful endpoints                                            │
│  - JWT authentication                                           │
│  - Request validation (Pydantic)                                │
│  - Rate limiting                                                │
│  - CORS handling                                                │
└──┬──────────────────┬──────────────────┬───────────────────────┘
   │                  │                  │
   ▼                  ▼                  ▼
┌──────────┐   ┌──────────────┐   ┌────────────────────┐
│ Business │   │ Recommendation│   │ External Services  │
│  Logic   │   │    Engine     │   │  - Open Library    │
│  Layer   │   │ (ML/AI)       │   │  - Book APIs       │
└────┬─────┘   └──────┬───────┘   └────────────────────┘
     │                │
     ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL 15+ (Primary Database)                              │
│  - User data, books, ratings, reviews                           │
│  - pgvector extension (for embeddings)                          │
│  - Full-text search (pg_trgm, tsvector)                         │
│  - JSON columns for flexible metadata                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Decisions

### Frontend: Next.js 14 (App Router)

**Decision:** Migrate from Vite + React to Next.js 14 with App Router

**Rationale:**

1. **SEO & Performance**
   - Book detail pages should be indexable by search engines
   - Server-side rendering for initial page load
   - Automatic code splitting
   - Image optimization built-in

2. **Developer Experience**
   - File-based routing (simpler than React Router)
   - API routes co-located with frontend
   - TypeScript first-class support
   - Hot module replacement

3. **Progressive Enhancement**
   - Server Components reduce bundle size
   - Client Components only where interactivity needed
   - Streaming for faster perceived performance

4. **Migration Path**
   - Incremental adoption (can keep existing React components)
   - No breaking changes to API contracts
   - Gradual refactor, not rewrite

**Trade-offs:**
- ❌ Steeper learning curve (Server vs Client Components)
- ❌ More opinionated than vanilla React
- ✅ Better performance out of the box
- ✅ Future-proof (React is moving this direction)

---

### Backend: FastAPI + SQLAlchemy (Async)

**Decision:** Keep FastAPI + SQLAlchemy + PostgreSQL

**Rationale:**

1. **Performance**
   - Async Python (handles concurrent requests efficiently)
   - Pydantic validation (compiled with Rust, very fast)
   - Starlette ASGI foundation (production-grade)

2. **Type Safety**
   - Pydantic models for request/response validation
   - Auto-generated OpenAPI schema
   - IDE autocomplete for API contracts

3. **ML/AI Integration**
   - Python ecosystem for recommendation engine
   - Easy to integrate scikit-learn, Sentence Transformers
   - NumPy/Pandas for data analysis

4. **Maintainability**
   - Clean separation of concerns (routers, models, schemas)
   - Dependency injection built-in
   - Easy to test (pytest)

**Alternatives Considered:**
- Node.js + Express: ❌ Worse type safety, harder for ML integration
- Django: ❌ Too opinionated, slower, not async by default
- Go: ❌ Great performance but poor ML ecosystem

---

### Database: PostgreSQL 15+

**Decision:** Keep PostgreSQL with extensions

**Rationale:**

1. **Relational Integrity**
   - Books, users, ratings have clear relationships
   - Foreign keys enforce data consistency
   - ACID guarantees

2. **Advanced Features**
   - **pgvector:** Store book embeddings for similarity search
   - **Full-text search:** Fast book title/author search
   - **JSON columns:** Flexible metadata (genres, reading contexts)
   - **Triggers & functions:** Maintain aggregate tables

3. **Scalability**
   - Mature replication (read replicas)
   - Partitioning for large tables
   - Managed options (Neon, Supabase, RDS)

4. **Cost-Effective**
   - Free tier on most platforms
   - Open source (no licensing)
   - Good performance on modest hardware

**Schema Design Principles:**
- Normalize where it makes sense (users, books, reviews)
- Denormalize for performance (aggregate ratings in separate table)
- Use JSON sparingly (only for truly variable data)

---

### Recommendation Engine: Python ML Stack

**Decision:** In-process recommendation engine using:
- **Sentence Transformers:** Book embeddings
- **scikit-learn:** Collaborative filtering
- **NumPy/Pandas:** Data processing

**Rationale:**

1. **Book Embeddings**
   - Convert book descriptions to vectors
   - Find similar books via cosine similarity
   - More nuanced than keyword matching

2. **Collaborative Filtering**
   - "Users who rated X highly also liked Y"
   - Matrix factorization for sparse data
   - Handles cold start problem

3. **Multi-Dimensional Ratings**
   - Books as vectors in 7D space (pace, emotion, complexity, etc.)
   - Find books with similar "fingerprints"
   - Enable queries like "high emotion but lower complexity"

**Architecture:**
```
Recommendation Request
    ↓
FastAPI endpoint (/api/recommendations)
    ↓
Load user's reading history + ratings
    ↓
Embedding Model (cached in memory)
    ↓
Vector similarity search (pgvector)
    ↓
Collaborative filtering (scikit-learn)
    ↓
Merge results (weighted by confidence)
    ↓
Return ranked list with explanations
```

**Performance:**
- Pre-compute embeddings on book creation (background task)
- Cache user vectors in memory (LRU cache)
- Use pgvector for fast similarity search (no N^2 comparisons)
- Target: <200ms for recommendation request

---

## Data Model (Detailed)

### User Management

```python
# models/user.py
from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=True)  # Can be pseudonym
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Privacy settings (JSONB for flexibility)
    privacy_settings = Column(JSON, default={
        "profile_visible": False,
        "reading_list_visible": False,
        "reviews_visible": True,
        "allow_recommendations": True
    })

    # User preferences
    preferences = Column(JSON, default={
        "default_review_privacy": "public",
        "algorithm_weights": {
            "pace": 1.0,
            "emotional_impact": 1.0,
            "complexity": 1.0,
            "character_development": 1.0,
            "plot_quality": 1.0,
            "prose_style": 1.0,
            "originality": 1.0
        },
        "notification_settings": {
            "email_new_releases": False,
            "email_friend_reviews": False
        }
    })

    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
```

### Book Data

```python
# models/book.py
from sqlalchemy import Column, String, Integer, Date, Text, JSON, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector

class Book(Base):
    __tablename__ = "books"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    isbn = Column(String, unique=True, nullable=True, index=True)  # ISBN-13
    isbn_10 = Column(String, nullable=True)
    title = Column(String, nullable=False, index=True)
    author = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    cover_url = Column(String, nullable=True)
    publication_date = Column(Date, nullable=True)
    page_count = Column(Integer, nullable=True)
    language = Column(String, default="en")

    # External IDs for linking
    open_library_id = Column(String, nullable=True, index=True)
    goodreads_id = Column(String, nullable=True)
    google_books_id = Column(String, nullable=True)

    # Genre tags (array for simple querying)
    genres = Column(ARRAY(String), default=list)

    # Flexible metadata (JSONB)
    metadata = Column(JSON, default={})
    # Example metadata:
    # {
    #   "series_name": "The Hunger Games",
    #   "series_position": 1,
    #   "original_title": "Los juegos del hambre",
    #   "original_language": "es",
    #   "audiobook_narrator": "Carolyn McCormick",
    #   "publisher": "Scholastic",
    #   "awards": ["Hugo Award 2009"]
    # }

    # Embeddings for similarity search (384-dim for all-MiniLM-L6-v2)
    description_embedding = Column(Vector(384), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Full-text search vector (auto-updated by trigger)
    search_vector = Column(TSVector, nullable=True)

    __table_args__ = (
        Index('idx_book_search', 'search_vector', postgresql_using='gin'),
        Index('idx_book_embedding', 'description_embedding', postgresql_using='ivfflat'),
    )
```

### Reading Tracker

```python
# models/user_book.py
class UserBook(Base):
    __tablename__ = "user_books"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id"), nullable=False)

    # Reading status
    status = Column(Enum(
        "want_to_read",
        "currently_reading",
        "finished",
        "abandoned",
        name="reading_status"
    ), nullable=False, default="want_to_read")

    # Reading format
    format = Column(Enum(
        "physical",
        "ebook",
        "audiobook",
        name="reading_format"
    ), nullable=True)

    # Dates
    added_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    # Progress tracking
    current_page = Column(Integer, nullable=True)

    # Reading sessions (for analytics)
    reading_sessions = Column(JSON, default=list)
    # Example: [
    #   {"date": "2025-01-15", "page": 50, "duration_minutes": 30, "location": "home", "mood": "relaxed"},
    #   {"date": "2025-01-16", "page": 100, "duration_minutes": 45, "location": "commute", "mood": "tired"}
    # ]

    # Private notes (encrypted at rest)
    private_notes = Column(Text, nullable=True)

    # Re-read tracking
    is_reread = Column(Boolean, default=False)
    reread_count = Column(Integer, default=0)

    # Privacy
    is_private = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'book_id', name='uq_user_book'),
        Index('idx_user_books_status', 'user_id', 'status'),
    )
```

### Multi-Dimensional Rating

```python
# models/multi_dimensional_rating.py
class MultiDimensionalRating(Base):
    __tablename__ = "multi_dimensional_ratings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id"), nullable=False)

    # 7 dimensions (1-5 scale, nullable so users don't have to rate all)
    pace = Column(Integer, nullable=True)  # 1=Very Slow, 5=Very Fast
    emotional_impact = Column(Integer, nullable=True)  # 1=Low, 5=Devastating
    complexity = Column(Integer, nullable=True)  # 1=Simple, 5=Dense
    character_development = Column(Integer, nullable=True)  # 1=Weak, 5=Exceptional
    plot_quality = Column(Integer, nullable=True)  # 1=Poor, 5=Excellent
    prose_style = Column(Integer, nullable=True)  # 1=Weak, 5=Beautiful
    originality = Column(Integer, nullable=True)  # 1=Derivative, 5=Groundbreaking

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'book_id', name='uq_user_book_rating'),
        # Ensure ratings are 1-5
        CheckConstraint('pace >= 1 AND pace <= 5', name='check_pace'),
        CheckConstraint('emotional_impact >= 1 AND emotional_impact <= 5', name='check_emotion'),
        CheckConstraint('complexity >= 1 AND complexity <= 5', name='check_complexity'),
        CheckConstraint('character_development >= 1 AND character_development <= 5', name='check_character'),
        CheckConstraint('plot_quality >= 1 AND plot_quality <= 5', name='check_plot'),
        CheckConstraint('prose_style >= 1 AND prose_style <= 5', name='check_prose'),
        CheckConstraint('originality >= 1 AND originality <= 5', name='check_originality'),
    )
```

### Aggregate Tables (For Performance)

```python
# models/book_fingerprint.py
class BookFingerprint(Base):
    """Aggregated multi-dimensional ratings for a book"""
    __tablename__ = "book_fingerprints"

    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id"), primary_key=True)

    # Average ratings across all users
    avg_pace = Column(Float, nullable=True)
    avg_emotional_impact = Column(Float, nullable=True)
    avg_complexity = Column(Float, nullable=True)
    avg_character_development = Column(Float, nullable=True)
    avg_plot_quality = Column(Float, nullable=True)
    avg_prose_style = Column(Float, nullable=True)
    avg_originality = Column(Float, nullable=True)

    # Overall "star equivalent" (for users who want simple view)
    star_equivalent = Column(Float, nullable=True)  # Avg of all dimensions

    # Metadata
    total_ratings = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Vector representation (for fast similarity search)
    fingerprint_vector = Column(Vector(7), nullable=True)  # [pace, emotion, ...]
```

### Review System

```python
# models/review.py
class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id"), nullable=False)

    content = Column(Text, nullable=False)

    # Review metadata
    spoiler_level = Column(Enum(
        "none",
        "minor",
        "major",
        name="spoiler_level"
    ), default="none")

    review_style = Column(Enum(
        "analysis",      # Critical analysis
        "personal",      # Personal reflection
        "quick_take",    # Brief thoughts
        name="review_style"
    ), nullable=True)

    # Time context
    time_since_reading_days = Column(Integer, nullable=True)  # Calculated from UserBook.finished_at

    # Verification
    is_verified_reader = Column(Boolean, default=False)  # Did they mark as "finished"?

    # Community feedback
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)

    # Privacy
    visibility = Column(Enum(
        "private",
        "friends",
        "public",
        name="review_visibility"
    ), default="public")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    __table_args__ = (
        Index('idx_reviews_book', 'book_id'),
        Index('idx_reviews_user', 'user_id'),
    )
```

### Content Ratings

```python
# models/content_rating.py
class ContentRating(Base):
    __tablename__ = "content_ratings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id"), nullable=False)

    # Content levels (0-4 scale)
    violence_level = Column(Integer, default=0)  # 0=None, 4=Graphic
    language_level = Column(Integer, default=0)
    sexual_content_level = Column(Integer, default=0)
    substance_use_level = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'book_id', name='uq_user_book_content_rating'),
        CheckConstraint('violence_level >= 0 AND violence_level <= 4', name='check_violence'),
        CheckConstraint('language_level >= 0 AND language_level <= 4', name='check_language'),
        CheckConstraint('sexual_content_level >= 0 AND sexual_content_level <= 4', name='check_sexual'),
        CheckConstraint('substance_use_level >= 0 AND substance_use_level <= 4', name='check_substance'),
    )
```

---

## API Design

### RESTful Endpoints

#### Authentication
```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login (returns JWT)
POST   /api/auth/logout            Logout
GET    /api/auth/me                Get current user
PUT    /api/auth/me                Update profile
GET    /api/auth/export            Export all user data (JSON)
DELETE /api/auth/me                Delete account
```

#### Books
```
GET    /api/books                  List/search books
       Query params:
       - q: search query
       - genre: filter by genre
       - max_violence: 0-4
       - max_language: 0-4
       - max_sexual: 0-4
       - max_substance: 0-4
       - sort: relevance|recent|rating
       - limit: 20 (default)
       - offset: 0 (default)

GET    /api/books/:id              Get book details
POST   /api/books                  Create book (manual)
PUT    /api/books/:id              Update book
DELETE /api/books/:id              Delete book (admin only)

POST   /api/books/import           Import from Open Library
       Body: { isbn: "..." } or { title: "...", author: "..." }
```

#### Library (Reading Tracker)
```
GET    /api/library                Get user's library
       Query params:
       - status: want_to_read|currently_reading|finished|abandoned
       - format: physical|ebook|audiobook
       - sort: added|started|finished|title

POST   /api/library                Add book to library
       Body: { book_id, status, format }

PUT    /api/library/:book_id       Update reading status/progress
       Body: { status, current_page, started_at, finished_at, private_notes }

DELETE /api/library/:book_id       Remove from library
```

#### Multi-Dimensional Ratings
```
POST   /api/ratings                Create/update rating
       Body: {
         book_id,
         pace: 1-5,
         emotional_impact: 1-5,
         complexity: 1-5,
         character_development: 1-5,
         plot_quality: 1-5,
         prose_style: 1-5,
         originality: 1-5
       }

GET    /api/ratings/:book_id       Get your rating for a book
DELETE /api/ratings/:book_id       Delete rating
```

#### Reviews
```
GET    /api/reviews                List reviews (with filters)
       Query params:
       - book_id: filter by book
       - user_id: filter by user
       - spoiler_free: true (exclude minor/major spoilers)
       - style: analysis|personal|quick_take
       - sort: helpful|recent|critical

POST   /api/reviews                Create review
PUT    /api/reviews/:id            Update review
DELETE /api/reviews/:id            Delete review

POST   /api/reviews/:id/helpful    Vote review as helpful
POST   /api/reviews/:id/not-helpful Vote review as not helpful
```

#### Recommendations
```
GET    /api/recommendations        Get personalized recommendations
       Query params:
       - count: 10 (default)
       - mood: comfort|challenge|escape (optional)
       - exclude_read: true (default)
       - algorithm: collaborative|similarity|hybrid (default: hybrid)

GET    /api/recommendations/similar/:book_id
       Get books similar to a specific book

GET    /api/recommendations/trending
       Get trending books (based on recent adds, not sales)
```

#### Analytics
```
GET    /api/analytics/stats        Personal reading stats
       Response: {
         total_books_read,
         total_pages_read,
         avg_pages_per_book,
         reading_pace_pages_per_day,
         current_year_stats: {...},
         genre_distribution: {...}
       }

GET    /api/analytics/timeline     Reading timeline (books by month/year)
GET    /api/analytics/genres       Genre breakdown over time
```

---

## Security Architecture

### Authentication Flow

```
1. User registers
   ↓
   Email + password sent to /api/auth/register
   ↓
   Password hashed with bcrypt (cost factor: 12)
   ↓
   User record created, JWT token returned
   ↓
   JWT stored in httpOnly cookie (secure, sameSite: strict)

2. User logs in
   ↓
   Email + password sent to /api/auth/login
   ↓
   Password verified with bcrypt
   ↓
   JWT token generated (expires in 7 days)
   ↓
   Token stored in httpOnly cookie

3. Authenticated requests
   ↓
   JWT sent automatically with cookie
   ↓
   Next.js middleware checks token validity
   ↓
   FastAPI verifies token and extracts user_id
   ↓
   Request proceeds with current_user dependency
```

### JWT Payload
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Security Best Practices

1. **Password Security**
   - Bcrypt with cost factor 12
   - Minimum 8 characters
   - No password strength requirements (controversial but research-backed)

2. **Token Security**
   - HttpOnly cookies (not localStorage)
   - Secure flag in production
   - SameSite: strict
   - Short expiration (7 days)
   - Refresh token rotation (future enhancement)

3. **Data Privacy**
   - Encrypt private notes at rest (AES-256)
   - Redact email in API responses (except /auth/me)
   - User controls over data visibility
   - Easy data export (GDPR compliance)

4. **API Security**
   - Rate limiting (100 req/min per IP)
   - CORS whitelist (frontend domain only)
   - SQL injection prevention (SQLAlchemy ORM)
   - XSS prevention (React auto-escaping)
   - CSRF protection (SameSite cookies)

5. **Database Security**
   - Encrypted connections (SSL)
   - Read-only replicas for recommendations
   - Row-level security policies (future)
   - Audit logs for sensitive operations

---

## Deployment Architecture

### Production Setup

```
┌────────────────────────────────────────────────────────┐
│  Vercel Edge Network (CDN)                             │
│  - Next.js static assets                               │
│  - Edge middleware (auth, rate limiting)               │
│  - Server components rendered on demand                │
└────────────┬───────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────┐
│  Vercel Serverless Functions (optional)                │
│  - /api routes (if needed for server-side logic)       │
└────────────┬───────────────────────────────────────────┘
             │
             │ HTTPS
             ▼
┌────────────────────────────────────────────────────────┐
│  Railway / Fly.io (Backend)                            │
│  - FastAPI application (Gunicorn + Uvicorn workers)    │
│  - Recommendation engine (background tasks)            │
│  - Scheduled jobs (cron)                               │
└────────────┬───────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────┐
│  Neon / Supabase (PostgreSQL)                          │
│  - Primary database                                    │
│  - Read replica for recommendations (future)           │
└────────────────────────────────────────────────────────┘
```

### Environment Variables

**Frontend (.env.local)**
```bash
NEXT_PUBLIC_API_URL=https://api.theshelf.app
```

**Backend (.env)**
```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Auth
SECRET_KEY=<random-256-bit-key>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_DAYS=7

# CORS
CORS_ORIGINS=https://theshelf.app,http://localhost:3000

# External APIs
OPEN_LIBRARY_API=https://openlibrary.org/api

# Monitoring
SENTRY_DSN=<sentry-url>
LOG_LEVEL=INFO

# Features
ENABLE_RECOMMENDATIONS=true
ENABLE_EMBEDDINGS=true
```

### Scaling Strategy

**MVP (< 1000 users):**
- Single FastAPI instance (Railway/Fly.io)
- Shared PostgreSQL (Neon free tier)
- Vercel free tier for frontend
- **Cost:** $0-20/month

**Growth (1000-10,000 users):**
- 2-3 FastAPI instances (load balanced)
- Dedicated PostgreSQL (Neon Pro)
- Background worker for embeddings
- **Cost:** $50-150/month

**Scale (10,000+ users):**
- Auto-scaling FastAPI (5-20 instances)
- Read replicas for recommendations
- Redis cache for session data
- CDN for book covers
- **Cost:** $200-500/month

---

## Development Workflow

### Local Development

```bash
# Terminal 1: Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev  # Next.js dev server on port 3000

# Terminal 3: Database
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
# or use docker-compose up -d
```

### Database Migrations

**Alembic (SQLAlchemy migrations)**

```bash
cd backend

# Generate migration
alembic revision --autogenerate -m "Add multi-dimensional ratings"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Testing Strategy

**Backend Tests (pytest)**
```bash
cd backend
pytest tests/ -v --cov=app
```

**Frontend Tests (Jest + React Testing Library)**
```bash
cd frontend
npm test
```

**E2E Tests (Playwright)**
```bash
cd frontend
npx playwright test
```

**Test Coverage Goals:**
- Backend: >80% coverage
- Frontend: >70% coverage (UI is harder to test)
- E2E: Critical user flows (register, add book, write review)

---

## Monitoring & Observability

### Logging

**FastAPI (Structured JSON logs)**
```python
import structlog

logger = structlog.get_logger()

logger.info("user_registered", user_id=user.id, email=user.email)
logger.error("recommendation_failed", user_id=user.id, error=str(e))
```

**Next.js (Console + Vercel Logs)**
```typescript
console.log('[API] Fetching books', { query, filters });
console.error('[API] Failed to fetch books', error);
```

### Error Tracking

**Sentry (Backend + Frontend)**
```python
# backend/app/main.py
import sentry_sdk
sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"))
```

```typescript
// frontend/lib/sentry.ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN });
```

### Performance Monitoring

**Key Metrics:**
- API response time (p50, p95, p99)
- Database query time
- Recommendation engine latency
- Frontend page load time (Core Web Vitals)
- Error rate

**Tools:**
- Vercel Analytics (frontend)
- Railway/Fly.io metrics (backend)
- Sentry Performance Monitoring
- PostgreSQL slow query log

---

## Migration Plan (From Current POC)

### Phase 1: Database Schema Migration

**Steps:**
1. Create new tables:
   - `multi_dimensional_ratings`
   - `book_fingerprints`
   - `reading_moods` (future)

2. Migrate existing data:
   - Convert 5-star ratings to multi-dimensional (set all dimensions to star value)
   - Preserve existing reviews, content ratings
   - No data loss

3. Add new columns to existing tables:
   - `users.privacy_settings` (JSON)
   - `users.preferences` (JSON)
   - `books.description_embedding` (Vector)
   - `reviews.review_style`, `spoiler_level`, `is_verified_reader`

**SQL Migration:**
```sql
-- Add multi-dimensional ratings table
CREATE TABLE multi_dimensional_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    pace INTEGER CHECK (pace >= 1 AND pace <= 5),
    emotional_impact INTEGER CHECK (emotional_impact >= 1 AND emotional_impact <= 5),
    complexity INTEGER CHECK (complexity >= 1 AND complexity <= 5),
    character_development INTEGER CHECK (character_development >= 1 AND character_development <= 5),
    plot_quality INTEGER CHECK (plot_quality >= 1 AND plot_quality <= 5),
    prose_style INTEGER CHECK (prose_style >= 1 AND prose_style <= 5),
    originality INTEGER CHECK (originality >= 1 AND originality <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- Migrate existing ratings (if any)
-- This is a one-time migration
-- Convert 5-star ratings to multi-dimensional (set all dims to star value)
```

### Phase 2: Frontend Migration (React → Next.js)

**Incremental Approach:**

1. **Install Next.js alongside Vite**
   ```bash
   cd frontend
   npx create-next-app@latest . --typescript --tailwind --app
   # Choose: Yes to all (TypeScript, Tailwind, App Router)
   ```

2. **Move components to Next.js structure**
   ```
   src/components/ → app/components/
   src/pages/ → app/ (convert to App Router)
   src/services/api.ts → lib/api.ts
   ```

3. **Convert pages to Next.js App Router**
   - `HomePage.tsx` → `app/page.tsx` (Server Component)
   - `BookDetailPage.tsx` → `app/books/[id]/page.tsx` (Server Component)
   - `LibraryPage.tsx` → `app/library/page.tsx` (Server Component with Client sections)

4. **Keep interactive components as Client Components**
   ```tsx
   'use client'  // Add to components that use hooks, events

   export function BookRatingForm() { ... }
   ```

5. **Test both versions in parallel**
   - Vite: `npm run dev` (port 3000)
   - Next.js: `npm run dev:next` (port 3001)
   - When Next.js is feature-complete, remove Vite

### Phase 3: API Updates

**Backwards-compatible changes:**

1. Add new endpoints (don't break existing):
   - `POST /api/ratings` (multi-dimensional)
   - Keep `PUT /api/library/:id` for 5-star compatibility (deprecated)

2. Extend existing endpoints:
   - `GET /api/books/:id` includes both star rating and fingerprint
   - `GET /api/reviews` includes new fields (spoiler_level, review_style)

3. Deprecation notices:
   - Return `X-Deprecated: true` header for old endpoints
   - Add deprecation warnings in API docs

### Phase 4: Recommendation Engine

**Parallel rollout:**

1. Build recommendation engine in background
2. Test against existing data
3. Feature flag: `ENABLE_NEW_RECOMMENDATIONS=true`
4. A/B test (50% users get new recommendations)
5. Monitor engagement (click-through rate on recommendations)
6. Roll out to 100% if successful

---

## Future Considerations

### GraphQL API (Year 2)
- More flexible querying for complex UIs
- Reduce over-fetching
- Better for mobile app

### Real-time Features (Year 2)
- WebSockets for reading circles (live discussions)
- Real-time reading progress updates
- Notification system

### Mobile Apps (Year 3)
- React Native (share code with web)
- Or PWA (progressive web app)
- ISBN scanner (camera integration)

### Self-Hosting (Year 1)
- Docker Compose file (already exists)
- Kubernetes config (for larger deployments)
- Helm charts (for easy deployment)
- Documentation for sysadmins

---

## Conclusion

This architecture is designed to:
- **Start simple:** Works on free tier, easy to deploy
- **Scale incrementally:** Add complexity only when needed
- **Stay maintainable:** Clear separation of concerns, typed interfaces
- **Preserve privacy:** Data ownership, encryption, no tracking
- **Enable intelligence:** ML-ready from day one (embeddings, vectors)

**Next steps:**
1. Migrate database schema
2. Set up Next.js frontend
3. Update API contracts
4. Build recommendation engine V1
5. Deploy to production

Let's build this. 📚✨
