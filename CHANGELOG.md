# Changelog

All notable changes to The Shelf will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Strategic Foundation (2025-02-13)

#### Product Vision & Strategy
- **PRODUCT_VISION.md** - Comprehensive product vision document
  - Competitive analysis of Goodreads' failures
  - Opinionated philosophy (quality over quantity, privacy-first)
  - Multi-dimensional rating system design (7-axis)
  - Unique differentiators (mood tracking, intelligent discovery)
  - Monetization strategy (free for 2 years)
  - Core feature set and roadmap

- **ARCHITECTURE.md** - Complete system architecture
  - Tech stack decisions (Next.js 14, FastAPI, PostgreSQL + pgvector)
  - Detailed data model for multi-dimensional ratings
  - Recommendation engine architecture
  - Security & privacy design
  - Deployment strategy
  - Migration plan from POC to full vision

- **IMPLEMENTATION_ROADMAP.md** - 6-9 week implementation plan
  - Phase 1: Database schema migration
  - Phase 2: Next.js frontend migration
  - Phase 3: Multi-dimensional rating UI
  - Phase 4: Recommendation engine
  - Phase 5: UI/UX polish
  - Phase 6: Testing & deployment

- **DATABASE_MIGRATION_GUIDE.md** - Alembic setup guide
  - Step-by-step migration instructions
  - pgvector extension setup
  - Data migration strategies
  - Rollback procedures
  - Production deployment best practices

#### Backend - Multi-Dimensional Rating System

**New Models:**
- `MultiDimensionalRating` - 7-axis rating model
  - Dimensions: pace, emotional_impact, complexity, character_development, plot_quality, prose_style, originality
  - All dimensions optional (1-5 scale)
  - Database constraints for validation
  - Computed `star_equivalent` property
  - Fingerprint vector for similarity calculations

- `BookFingerprint` - Aggregated rating model
  - Average ratings across all users per dimension
  - Pre-computed for performance
  - Total rating count for reliability
  - Automatically updated on rating changes

**New API Endpoints:**
- `POST /api/ratings` - Create/update multi-dimensional rating
- `GET /api/ratings/{book_id}` - Get user's rating for a book
- `DELETE /api/ratings/{book_id}` - Delete rating
- `GET /api/ratings/{book_id}/fingerprint` - Get book's aggregate fingerprint
- `GET /api/ratings/{book_id}/chart-data` - Get radar chart data (frontend-ready)

**New Services:**
- `app/services/embeddings.py` - Sentence Transformers integration
  - 384-dimensional semantic embeddings for books
  - LRU cache (1000 entries) for performance
  - Lazy model loading
  - Cosine similarity calculations

- `app/services/recommendations.py` - Recommendation engine
  - Content-based filtering (embedding similarity)
  - Collaborative filtering (fingerprint similarity)
  - Mood-based recommendations ("comfort", "challenge", "escape", "contemplative")
  - Personalized recommendations combining multiple signals

**Updated Schemas:**
- `BookOut` and `BookSummary` now include optional `fingerprint` field
- Added `BookFingerprintResponse` schema
- Added `RadarChartData` schema for frontend integration

**Updated Models:**
- `Book` model - relationships to multi_dimensional_ratings and fingerprint
- `User` model - relationship to multi_dimensional_ratings

**New Dependencies:**
- `pgvector==0.3.6` - Vector similarity search
- `sentence-transformers==3.3.1` - Embeddings generation
- `scikit-learn==1.5.2` - Collaborative filtering
- `numpy==2.0.2` - Numerical operations

#### Documentation

- **MULTI_DIMENSIONAL_RATINGS.md** - Complete feature documentation
  - Why multi-dimensional ratings solve 5-star problems
  - How the system works
  - Complete API reference with examples
  - Frontend integration guide
  - Database schema documentation
  - Recommendation engine explanation
  - Migration guide from 5-star ratings
  - Best practices
  - Troubleshooting

### Changed

- Main FastAPI app now includes multi-dimensional ratings router
- Book endpoints can now return fingerprint data

### Technical Details

**Performance:**
- Pre-computed fingerprints (no real-time aggregation)
- LRU caching for embeddings
- Async/await throughout
- Ready for pgvector indexing (O(log N) similarity search)

**Type Safety:**
- Pydantic validation on all endpoints
- SQLAlchemy 2.0 type hints
- Full IDE autocomplete support

**Scalability:**
- Fingerprints scale to millions of ratings
- In-memory similarity for <10K books
- pgvector recommended for production

**Backwards Compatibility:**
- Zero breaking changes
- 5-star ratings coexist with multi-dimensional
- Gradual migration path

---

## Version History

### [0.2.0] - 2025-02-13 (In Progress)
- Multi-dimensional rating system
- Recommendation engine foundation
- Strategic documentation
- Service layer architecture

### [0.1.0] - Previous (POC)
- Basic book tracking
- 5-star ratings
- Review system
- Content ratings (community-driven)
- Open Library import
- User authentication

---

## Upcoming

### Next Release (0.3.0)
- [ ] Alembic database migrations
- [ ] pgvector extension setup
- [ ] Unit tests for rating endpoints
- [ ] Integration tests for recommendation engine
- [ ] API documentation (OpenAPI/Swagger)

### Future Releases
- [ ] Next.js 14 frontend migration
- [ ] Radar chart UI components
- [ ] Multi-dimensional rating form
- [ ] Reading analytics dashboard
- [ ] Dark mode
- [ ] Mobile responsive design improvements

---

## Links

- [Product Vision](PRODUCT_VISION.md)
- [Architecture](ARCHITECTURE.md)
- [Implementation Roadmap](IMPLEMENTATION_ROADMAP.md)
- [Database Migration Guide](DATABASE_MIGRATION_GUIDE.md)
- [Multi-Dimensional Ratings](MULTI_DIMENSIONAL_RATINGS.md)
- [Modernization Plan](MODERNIZATION_PLAN.md)
- [Content Ratings](CONTENT_RATINGS.md)
