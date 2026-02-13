# Database Migration Guide

This guide explains how to set up and run database migrations for The Shelf using Alembic.

## Prerequisites

- PostgreSQL 15+ installed and running
- Python 3.11+ with virtualenv
- Backend dependencies installed

## Initial Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `alembic` - Database migration tool
- `pgvector` - PostgreSQL extension for vector similarity search
- `sentence-transformers` - For generating book embeddings
- `scikit-learn` - For recommendation algorithms
- Other required packages

### 2. Initialize Alembic (First Time Only)

If this is the first time setting up the project:

```bash
cd backend
alembic init alembic
```

### 3. Configure Alembic

**Edit `backend/alembic.ini`:**

```ini
# Change this line:
sqlalchemy.url = driver://user:pass@localhost/dbname

# To use your database URL from environment:
# sqlalchemy.url = postgresql+asyncpg://user:pass@localhost/the_shelf
```

**Edit `backend/alembic/env.py`:**

```python
# Add at the top (after imports):
from app.config import settings
from app.database import Base
from app.models import *  # Import all models

# Update the target_metadata:
target_metadata = Base.metadata

# Update the get_url() function:
def get_url():
    return settings.database_url
```

### 4. Enable pgvector Extension

Before running migrations, enable the pgvector extension in PostgreSQL:

```bash
# Connect to your database
psql -U your_user -d the_shelf

# Enable extension
CREATE EXTENSION IF NOT EXISTS vector;
```

Or via SQL migration (Alembic will handle this):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Creating Migrations

### Auto-generate Migration from Model Changes

When you modify models (add/remove columns, tables, etc.):

```bash
cd backend
alembic revision --autogenerate -m "Descriptive message"
```

Example:
```bash
alembic revision --autogenerate -m "Add multi-dimensional ratings"
```

This creates a new file in `backend/alembic/versions/`.

### Manual Migration (for complex changes)

```bash
alembic revision -m "Your message"
```

Then edit the generated file to add custom SQL.

## Running Migrations

### Apply All Pending Migrations

```bash
cd backend
alembic upgrade head
```

### Apply Specific Migration

```bash
# Upgrade to specific revision
alembic upgrade <revision_id>

# Downgrade one revision
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade <revision_id>

# Downgrade all
alembic downgrade base
```

### Check Current Migration Status

```bash
# Show current revision
alembic current

# Show migration history
alembic history --verbose
```

## Migration for Multi-Dimensional Ratings

The first major migration adds:
1. `multi_dimensional_ratings` table (7-axis rating system)
2. `book_fingerprints` table (aggregated ratings)
3. pgvector extension for similarity search
4. Relationships between existing tables

**To create this migration:**

```bash
cd backend
alembic revision --autogenerate -m "Add multi-dimensional ratings and fingerprints"
```

**Review the generated migration file** in `backend/alembic/versions/` to ensure:
- pgvector extension is created
- All CHECK constraints are present
- Foreign key relationships are correct
- Indexes are created (especially for vector columns)

**Apply the migration:**

```bash
alembic upgrade head
```

## Migration Checklist

Before running migrations in production:

- [ ] Backup your database
- [ ] Review the generated SQL (`alembic upgrade head --sql > migration.sql`)
- [ ] Test migration on a copy of production data
- [ ] Verify all constraints and indexes are created
- [ ] Check that relationships work correctly
- [ ] Test rollback (`alembic downgrade -1`)

## Rollback Plan

If a migration fails:

```bash
# Rollback last migration
alembic downgrade -1

# Check what went wrong
alembic current
alembic history

# Fix the migration file
# Re-run
alembic upgrade head
```

## Common Issues

### Issue: "pgvector extension not found"

**Solution:**
```bash
# Install pgvector on your system
# Ubuntu/Debian:
sudo apt install postgresql-15-pgvector

# Or compile from source:
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

### Issue: "target database is not up to date"

**Solution:**
```bash
# Check current version
alembic current

# Compare with latest
alembic history

# Upgrade to latest
alembic upgrade head
```

### Issue: Alembic can't find models

**Solution:**

Make sure `backend/alembic/env.py` imports all models:
```python
from app.models import *
```

## Data Migration (After Schema Migration)

After running schema migrations, you may need to migrate existing data.

### Migrate 5-Star Ratings to Multi-Dimensional

If you have existing 5-star ratings in `user_books.rating`:

```sql
-- Create multi-dimensional ratings from old star ratings
INSERT INTO multi_dimensional_ratings (user_id, book_id, pace, emotional_impact, complexity, character_development, plot_quality, prose_style, originality, created_at)
SELECT
    user_id,
    book_id,
    rating,  -- Use star rating for all dimensions
    rating,
    rating,
    rating,
    rating,
    rating,
    rating,
    date_added
FROM user_books
WHERE rating IS NOT NULL
ON CONFLICT (user_id, book_id) DO NOTHING;

-- Optionally, keep the old rating for backwards compatibility
-- Or set it to NULL after migration
UPDATE user_books SET rating = NULL WHERE rating IS NOT NULL;
```

### Recalculate Book Fingerprints

After migrating ratings:

```python
# Run this Python script to recalculate fingerprints
from app.database import async_session
from app.models import Book, MultiDimensionalRating, BookFingerprint
from sqlalchemy import select, func

async def recalculate_fingerprints():
    async with async_session() as db:
        books = await db.execute(select(Book.id))
        for book_id in books.scalars():
            # Calculate averages
            stats = await db.execute(
                select(
                    func.avg(MultiDimensionalRating.pace),
                    func.avg(MultiDimensionalRating.emotional_impact),
                    func.avg(MultiDimensionalRating.complexity),
                    func.avg(MultiDimensionalRating.character_development),
                    func.avg(MultiDimensionalRating.plot_quality),
                    func.avg(MultiDimensionalRating.prose_style),
                    func.avg(MultiDimensionalRating.originality),
                    func.count()
                ).where(MultiDimensionalRating.book_id == book_id)
            )
            row = stats.one()

            if row[7] > 0:  # total_ratings
                fingerprint = BookFingerprint(
                    book_id=book_id,
                    avg_pace=row[0],
                    avg_emotional_impact=row[1],
                    avg_complexity=row[2],
                    avg_character_development=row[3],
                    avg_plot_quality=row[4],
                    avg_prose_style=row[5],
                    avg_originality=row[6],
                    star_equivalent=sum(r for r in row[:7] if r) / len([r for r in row[:7] if r]),
                    total_ratings=row[7]
                )
                db.add(fingerprint)

        await db.commit()
```

## Development Workflow

1. **Make model changes** in `backend/app/models/`
2. **Generate migration**: `alembic revision --autogenerate -m "message"`
3. **Review migration** file in `backend/alembic/versions/`
4. **Test migration**: `alembic upgrade head`
5. **Test rollback**: `alembic downgrade -1`
6. **Re-apply**: `alembic upgrade head`
7. **Commit** migration file to git

## Production Deployment

When deploying to production:

```bash
# 1. Backup database
pg_dump the_shelf > backup_$(date +%Y%m%d).sql

# 2. Run migrations
alembic upgrade head

# 3. Verify
alembic current

# 4. Test application
# ...

# 5. If issues, rollback
alembic downgrade -1
# Restore from backup if needed
psql the_shelf < backup_20250213.sql
```

## Vercel/Railway Deployment

For serverless deployments, run migrations as part of the build process:

**Option 1: Pre-deploy script**
```json
// package.json
{
  "scripts": {
    "predeploy": "cd backend && alembic upgrade head"
  }
}
```

**Option 2: Manual migration**
```bash
# SSH into Railway container or run locally against production DB
DATABASE_URL="postgresql+asyncpg://..." alembic upgrade head
```

**Option 3: Automated migration job**

Create a GitHub Action or Railway cron job:
```yaml
# .github/workflows/migrate.yml
name: Database Migration
on:
  push:
    branches: [main]
    paths:
      - 'backend/alembic/versions/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd backend
          pip install -r requirements.txt
          alembic upgrade head
```

## Summary

- **Initialize**: `alembic init alembic` (one time)
- **Create migration**: `alembic revision --autogenerate -m "message"`
- **Apply migrations**: `alembic upgrade head`
- **Rollback**: `alembic downgrade -1`
- **Check status**: `alembic current`

For questions or issues, refer to:
- [Alembic Documentation](https://alembic.sqlalchemy.org/en/latest/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [ARCHITECTURE.md](./ARCHITECTURE.md) for schema details
