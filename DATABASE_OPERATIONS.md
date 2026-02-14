# Database Operations Guide

Complete guide for database setup, migrations, and maintenance.

---

## Quick Start

### Option 1: Automatic Setup (Recommended)

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/dbname"

# Initialize database (creates tables, triggers, extensions)
cd backend
python scripts/init_db.py

# Seed demo data
python scripts/seed_demo_data.py

# Start backend
uvicorn app.main:app --reload
```

**That's it! Database is ready.**

### Option 2: Manual Setup with Alembic

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/dbname"

# Enable pgvector manually
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run migrations
cd backend
alembic upgrade head

# Seed data
python scripts/seed_demo_data.py
```

---

## Database Setup Methods

### Local Development (Docker)

**Easiest:** Uses Docker to run PostgreSQL with pgvector.

```bash
# Start PostgreSQL with pgvector
docker run -d \
  --name the-shelf-db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=the_shelf \
  ankane/pgvector

# Set DATABASE_URL
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/the_shelf"

# Initialize
cd backend
python scripts/init_db.py
```

**Test connection:**
```bash
psql postgresql://postgres:postgres@localhost:5432/the_shelf -c "SELECT version();"
```

### Supabase Cloud

**Best for production:** Managed PostgreSQL with pgvector built-in.

```bash
# 1. Create project at supabase.com
# 2. Get connection string (Session mode - port 6543)
#    Example: postgresql://postgres:password@db.project.supabase.co:6543/postgres

# 3. Set DATABASE_URL
export DATABASE_URL="postgresql+asyncpg://postgres:password@db.project.supabase.co:6543/postgres?sslmode=require"

# 4. Enable pgvector (in Supabase SQL Editor)
# CREATE EXTENSION IF NOT EXISTS vector;

# 5. Initialize
cd backend
python scripts/init_db.py
```

### Local Supabase (Self-Hosted)

**Full control:** Run Supabase locally.

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
cd the-shelf
supabase start

# Get connection string
supabase status
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres

# Set DATABASE_URL
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:54322/postgres"

# Initialize
cd backend
python scripts/init_db.py
```

### Neon (Alternative Cloud)

```bash
# 1. Create project at neon.tech
# 2. Get connection string
# 3. Enable pgvector in SQL editor:
#    CREATE EXTENSION IF NOT EXISTS vector;

# 4. Set DATABASE_URL
export DATABASE_URL="postgresql+asyncpg://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# 5. Initialize
cd backend
python scripts/init_db.py
```

---

## Database Scripts

### 1. init_db.py - Complete Setup

**What it does:**
- ✅ Enables pgvector extension
- ✅ Creates all tables
- ✅ Creates triggers and functions
- ✅ Verifies setup

**Usage:**
```bash
cd backend
python scripts/init_db.py
```

**Output:**
```
🔧 Initializing database...
📦 Enabling pgvector extension...
✅ pgvector 0.5.1 enabled
📊 Creating tables...
✅ Tables created

📋 Created 12 tables:
   - users
   - books
   - genres
   - book_genres
   - multi_dimensional_ratings
   - book_fingerprints
   - user_books
   - reviews
   - content_ratings
   ...

🔨 Creating triggers and functions...
✅ Triggers created

🎉 Database initialization complete!
```

### 2. seed_demo_data.py - Demo Books & Ratings

**What it does:**
- ✅ Creates 3 demo users
- ✅ Creates 7 genres
- ✅ Creates 6 books with diverse fingerprints
- ✅ Adds 3 ratings per book (different users)
- ✅ Automatically generates book fingerprints

**Usage:**
```bash
cd backend
python scripts/seed_demo_data.py
```

**Demo Books:**
1. **The Night Circus** - Slow pace, beautiful prose, high emotion
2. **The Martian** - Fast pace, high plot, moderate emotion
3. **All the Light We Cannot See** - Slow, very high emotion, beautiful prose
4. **Recursion** - Very fast, high complexity, strong plot
5. **The Book Thief** - Devastating emotion, unique prose
6. **Project Hail Mary** - Fast, fun, high plot quality

**Demo Credentials:**
```
Username: demo
Password: demo1234
```

---

## Alembic Migrations

### Generate Migration

After changing models:

```bash
cd backend

# Generate migration
alembic revision --autogenerate -m "Add new field to books"

# Review generated file
cat alembic/versions/<timestamp>_add_new_field_to_books.py

# Apply migration
alembic upgrade head
```

### Common Migrations

#### Add Column

```bash
alembic revision -m "Add subtitle to books"
```

Edit generated file:
```python
def upgrade():
    op.add_column('books', sa.Column('subtitle', sa.String(500), nullable=True))

def downgrade():
    op.drop_column('books', 'subtitle')
```

```bash
alembic upgrade head
```

#### Create Index

```bash
alembic revision -m "Add index on book ratings"
```

```python
def upgrade():
    op.create_index('idx_books_rating_count', 'books', ['rating_count'])

def downgrade():
    op.drop_index('idx_books_rating_count')
```

### Rollback Migration

```bash
# Rollback one migration
alembic downgrade -1

# Rollback to specific version
alembic downgrade <revision_id>

# Rollback all
alembic downgrade base
```

### View Migration History

```bash
# Current version
alembic current

# Migration history
alembic history

# Show SQL without executing
alembic upgrade head --sql
```

---

## Database Maintenance

### Backups

#### PostgreSQL pg_dump

```bash
# Full backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz

# Schema only
pg_dump --schema-only $DATABASE_URL > schema-$(date +%Y%m%d).sql

# Data only
pg_dump --data-only $DATABASE_URL > data-$(date +%Y%m%d).sql
```

#### Restore Backup

```bash
# From SQL file
psql $DATABASE_URL < backup-20260214.sql

# From compressed
gunzip -c backup-20260214.sql.gz | psql $DATABASE_URL
```

#### Supabase Backups

```bash
# Automatic daily backups (7 day retention on free tier)
# Download from Supabase Dashboard → Database → Backups

# Or via CLI
supabase db dump --db-url $DATABASE_URL > backup.sql
```

### Performance Optimization

#### Analyze Tables

```sql
-- Update statistics for query planner
ANALYZE;

-- Specific table
ANALYZE books;

-- Verbose output
ANALYZE VERBOSE multi_dimensional_ratings;
```

#### Vacuum

```sql
-- Reclaim storage
VACUUM;

-- Full vacuum (locks tables)
VACUUM FULL;

-- Analyze after vacuum
VACUUM ANALYZE;
```

#### Reindex

```sql
-- Rebuild all indexes
REINDEX DATABASE the_shelf;

-- Specific table
REINDEX TABLE books;

-- Specific index
REINDEX INDEX idx_books_title;

-- Vector index (important for performance)
REINDEX INDEX idx_fingerprints_vector;
```

### Monitor Performance

#### Check Table Sizes

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Check Index Usage

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;
```

#### Slow Queries

```sql
-- Enable query logging (PostgreSQL config)
ALTER DATABASE the_shelf SET log_min_duration_statement = 1000;  -- Log queries > 1s

-- View slow queries
SELECT
    query,
    calls,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## Common Operations

### Reset Database (CAUTION)

```bash
# Drop all tables
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Reinitialize
python scripts/init_db.py
python scripts/seed_demo_data.py
```

### Check Current State

```bash
# List tables
psql $DATABASE_URL -c "\dt"

# Count records
psql $DATABASE_URL -c "
SELECT
    'books' AS table, COUNT(*) FROM books
    UNION ALL
    SELECT 'users', COUNT(*) FROM users
    UNION ALL
    SELECT 'ratings', COUNT(*) FROM multi_dimensional_ratings
    UNION ALL
    SELECT 'fingerprints', COUNT(*) FROM book_fingerprints;
"

# Check pgvector
psql $DATABASE_URL -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
```

### Test Fingerprint Trigger

```bash
# Add a rating (should auto-update fingerprint)
psql $DATABASE_URL <<EOF
INSERT INTO multi_dimensional_ratings (user_id, book_id, pace, emotional_impact, complexity, character_development, plot_quality, prose_style, originality)
VALUES (1, 1, 4, 5, 3, 4, 4, 5, 4);

-- Check fingerprint was created/updated
SELECT * FROM book_fingerprints WHERE book_id = 1;
EOF
```

---

## Troubleshooting

### Connection Errors

**Error:** `connection refused`

```bash
# Check PostgreSQL is running
docker ps  # For Docker
pg_isready -h localhost -p 5432  # For local PostgreSQL

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### pgvector Not Found

**Error:** `extension "vector" does not exist`

```bash
# Install pgvector
# Docker: use ankane/pgvector image
docker run -d --name db -p 5432:5432 ankane/pgvector

# macOS
brew install pgvector

# Ubuntu/Debian
sudo apt install postgresql-15-pgvector

# Then enable
psql $DATABASE_URL -c "CREATE EXTENSION vector;"
```

### Migration Conflicts

**Error:** `revision not found`

```bash
# Check current version
alembic current

# View history
alembic history

# Stamp to specific version (if needed)
alembic stamp head
```

### Slow Vector Queries

**Issue:** Vector similarity search is slow

```sql
-- Rebuild vector index
REINDEX INDEX idx_fingerprints_vector;

-- Increase lists for IVFFlat index (adjust based on data size)
-- Rule of thumb: lists = sqrt(num_rows)
DROP INDEX idx_fingerprints_vector;
CREATE INDEX idx_fingerprints_vector ON book_fingerprints
    USING ivfflat (fingerprint_vector vector_cosine_ops)
    WITH (lists = 200);  -- Adjust based on data size

-- Analyze table
ANALYZE book_fingerprints;
```

### Fingerprints Not Updating

**Issue:** Book fingerprints not updating after rating

```sql
-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgrelid = 'multi_dimensional_ratings'::regclass;

-- Recreate trigger
-- (Run the CREATE TRIGGER statement from init_db.py)

-- Manually recalculate all fingerprints
TRUNCATE book_fingerprints;
INSERT INTO book_fingerprints (book_id, avg_pace, ...)
SELECT book_id, AVG(pace), ...
FROM multi_dimensional_ratings
GROUP BY book_id;
```

---

## Production Checklist

### Before Deployment

- [ ] Database URL configured
- [ ] pgvector extension enabled
- [ ] All migrations run (`alembic upgrade head`)
- [ ] Indexes created (especially vector indexes)
- [ ] Demo data seeded (optional)
- [ ] Backup system configured
- [ ] Connection pooling configured

### After Deployment

- [ ] Test health endpoint: `/api/health`
- [ ] Create test rating via API
- [ ] Verify fingerprint updates
- [ ] Check API response times
- [ ] Monitor database CPU/memory
- [ ] Set up automated backups
- [ ] Configure alerting

### Regular Maintenance

**Daily:**
- [ ] Check error logs
- [ ] Monitor database size

**Weekly:**
- [ ] Review slow queries
- [ ] Check backup success
- [ ] Monitor index usage

**Monthly:**
- [ ] VACUUM ANALYZE
- [ ] Review and optimize indexes
- [ ] Check for unused tables/columns
- [ ] Rebuild vector indexes if needed

---

## Advanced Topics

### Custom Queries

#### Find Similar Books (Vector Similarity)

```sql
-- Books similar to book ID 1
SELECT
    b.id,
    b.title,
    b.author,
    1 - (bf1.fingerprint_vector <=> bf.fingerprint_vector) AS similarity
FROM book_fingerprints bf1
CROSS JOIN book_fingerprints bf
JOIN books b ON bf.book_id = b.id
WHERE bf1.book_id = 1
    AND bf.book_id != 1
    AND bf.fingerprint_vector IS NOT NULL
ORDER BY bf1.fingerprint_vector <=> bf.fingerprint_vector
LIMIT 10;
```

#### Mood-Based Search

```sql
-- "Comforting reads" (high emotion, lower complexity)
SELECT
    b.title,
    b.author,
    bf.avg_emotional_impact,
    bf.avg_complexity,
    bf.star_equivalent
FROM books b
JOIN book_fingerprints bf ON b.id = bf.book_id
WHERE bf.avg_emotional_impact >= 4.0
    AND bf.avg_complexity <= 3.0
    AND bf.total_ratings >= 5
ORDER BY bf.star_equivalent DESC
LIMIT 20;
```

#### User Reading Patterns

```sql
-- User's reading preferences
SELECT
    u.username,
    AVG(mdr.pace) AS avg_pace_preference,
    AVG(mdr.emotional_impact) AS avg_emotion_preference,
    AVG(mdr.complexity) AS avg_complexity_preference,
    COUNT(*) AS total_ratings
FROM users u
JOIN multi_dimensional_ratings mdr ON u.id = mdr.user_id
WHERE u.id = 1
GROUP BY u.id, u.username;
```

### Database Extensions

Already included:
- ✅ **pgvector** - Vector similarity search

Optional (useful for future):
- **pg_trgm** - Fuzzy string matching
- **uuid-ossp** - UUID generation
- **pg_stat_statements** - Query performance tracking

```sql
-- Enable additional extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Fuzzy search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUIDs
```

---

## Resources

- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **pgvector Docs:** https://github.com/pgvector/pgvector
- **Alembic Docs:** https://alembic.sqlalchemy.org/
- **Supabase Docs:** https://supabase.com/docs
- **SQLAlchemy Docs:** https://docs.sqlalchemy.org/

---

**Your database is the heart of The Shelf. Keep it healthy! 💚**
