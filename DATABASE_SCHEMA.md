# Database Schema Documentation

Complete database schema for The Shelf with multi-dimensional rating system.

---

## Overview

The Shelf uses **PostgreSQL 15+** with the **pgvector** extension for:
- Multi-dimensional book ratings (7 axes)
- Book fingerprints (aggregated community ratings)
- Vector embeddings for AI recommendations
- Traditional features (users, books, reviews, library)

---

## Database Requirements

### PostgreSQL Version
- **Minimum:** PostgreSQL 15
- **Recommended:** PostgreSQL 16+
- **Extensions Required:** pgvector

### Why PostgreSQL 15+?
- Native JSON improvements
- Better performance for complex queries
- Full support for pgvector extension
- Improved indexing capabilities

---

## Core Schema

### Entity Relationship Diagram

```
┌─────────┐
│  users  │
└────┬────┘
     │
     │ 1:N
     ├─────────────────┐
     │                 │
     ▼                 ▼
┌─────────────────┐  ┌──────────┐
│ user_books      │  │ reviews  │
│ (library)       │  └──────────┘
└─────────────────┘
     │
     ▼
┌─────────┐
│  books  │◄──────────────────┐
└────┬────┘                   │
     │                        │
     │ 1:N                    │ N:M
     ├────────────────┐       │
     │                │       │
     ▼                ▼       │
┌───────────────────────┐    │
│ multi_dimensional_    │    │
│ ratings               │    │
└───────────────────────┘    │
     │                       │
     ▼                       │
┌───────────────────────┐    │
│ book_fingerprints     │    │
│ (aggregate ratings)   │    │
└───────────────────────┘    │
                             │
     ┌───────────────────────┘
     │
┌────────────┐
│ book_genres│◄─────┐
└────────────┘      │
                    │ N:M
                    │
               ┌────┴────┐
               │ genres  │
               └─────────┘
```

---

## Table Definitions

### 1. users

Stores user accounts and authentication.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Optional profile fields
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(512),

    -- Privacy settings
    profile_public BOOLEAN DEFAULT true,
    ratings_public BOOLEAN DEFAULT true,

    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

**Columns:**
- `id`: Primary key
- `username`: Unique username (3-50 chars)
- `email`: Unique email address
- `hashed_password`: Bcrypt hashed password
- `created_at`: Account creation timestamp
- `profile_public`: Whether profile is visible to others
- `ratings_public`: Whether ratings are visible to others

---

### 2. books

Stores book information.

```sql
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(13),
    isbn13 VARCHAR(13),
    description TEXT,
    cover_url VARCHAR(512),
    publication_date DATE,
    publisher VARCHAR(255),
    page_count INTEGER,
    language VARCHAR(10) DEFAULT 'en',

    -- Open Library integration
    openlibrary_id VARCHAR(50),
    openlibrary_work_id VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Computed fields (updated via triggers)
    avg_rating DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,

    CONSTRAINT isbn_format CHECK (isbn IS NULL OR isbn ~* '^[0-9]{10,13}$'),
    CONSTRAINT page_count_positive CHECK (page_count IS NULL OR page_count > 0),
    CONSTRAINT avg_rating_range CHECK (avg_rating IS NULL OR (avg_rating >= 1 AND avg_rating <= 5))
);

-- Indexes
CREATE INDEX idx_books_title ON books USING gin(to_tsvector('english', title));
CREATE INDEX idx_books_author ON books USING gin(to_tsvector('english', author));
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_isbn13 ON books(isbn13);
CREATE INDEX idx_books_openlibrary_id ON books(openlibrary_id);
CREATE INDEX idx_books_avg_rating ON books(avg_rating DESC NULLS LAST);
CREATE INDEX idx_books_rating_count ON books(rating_count DESC);
CREATE INDEX idx_books_publication_date ON books(publication_date DESC NULLS LAST);
```

**Key Features:**
- Full-text search on title and author (GIN indexes)
- ISBN validation
- Integration with Open Library
- Computed avg_rating and rating_count (updated via triggers)

---

### 3. genres

Book genre categories.

```sql
CREATE TABLE genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Common genres
INSERT INTO genres (name) VALUES
    ('Fiction'), ('Non-Fiction'), ('Mystery'), ('Thriller'),
    ('Science Fiction'), ('Fantasy'), ('Romance'), ('Horror'),
    ('Biography'), ('History'), ('Self-Help'), ('Poetry'),
    ('Young Adult'), ('Children'), ('Classics');

-- Index
CREATE INDEX idx_genres_name ON genres(name);
```

---

### 4. book_genres (Junction Table)

Many-to-many relationship between books and genres.

```sql
CREATE TABLE book_genres (
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, genre_id)
);

-- Indexes
CREATE INDEX idx_book_genres_book ON book_genres(book_id);
CREATE INDEX idx_book_genres_genre ON book_genres(genre_id);
```

---

### 5. multi_dimensional_ratings ⭐ **Core Feature**

User ratings with 7 dimensions.

```sql
CREATE TABLE multi_dimensional_ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,

    -- 7 Dimensions (1-5 scale, NULL means not rated)
    pace SMALLINT CHECK (pace IS NULL OR (pace >= 1 AND pace <= 5)),
    emotional_impact SMALLINT CHECK (emotional_impact IS NULL OR (emotional_impact >= 1 AND emotional_impact <= 5)),
    complexity SMALLINT CHECK (complexity IS NULL OR (complexity >= 1 AND complexity <= 5)),
    character_development SMALLINT CHECK (character_development IS NULL OR (character_development >= 1 AND character_development <= 5)),
    plot_quality SMALLINT CHECK (plot_quality IS NULL OR (plot_quality >= 1 AND plot_quality <= 5)),
    prose_style SMALLINT CHECK (prose_style IS NULL OR (prose_style >= 1 AND prose_style <= 5)),
    originality SMALLINT CHECK (originality IS NULL OR (originality >= 1 AND originality <= 5)),

    -- Computed overall rating (average of non-null dimensions)
    star_equivalent DECIMAL(3,2) GENERATED ALWAYS AS (
        (COALESCE(pace, 0) + COALESCE(emotional_impact, 0) + COALESCE(complexity, 0) +
         COALESCE(character_development, 0) + COALESCE(plot_quality, 0) +
         COALESCE(prose_style, 0) + COALESCE(originality, 0))::DECIMAL /
        NULLIF((CASE WHEN pace IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN emotional_impact IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN complexity IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN character_development IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN plot_quality IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN prose_style IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN originality IS NOT NULL THEN 1 ELSE 0 END), 0)
    ) STORED,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- One rating per user per book
    UNIQUE(user_id, book_id),

    -- At least one dimension must be rated
    CONSTRAINT at_least_one_dimension CHECK (
        pace IS NOT NULL OR
        emotional_impact IS NOT NULL OR
        complexity IS NOT NULL OR
        character_development IS NOT NULL OR
        plot_quality IS NOT NULL OR
        prose_style IS NOT NULL OR
        originality IS NOT NULL
    )
);

-- Indexes
CREATE INDEX idx_md_ratings_user ON multi_dimensional_ratings(user_id);
CREATE INDEX idx_md_ratings_book ON multi_dimensional_ratings(book_id);
CREATE INDEX idx_md_ratings_star_equivalent ON multi_dimensional_ratings(star_equivalent DESC);
CREATE INDEX idx_md_ratings_created_at ON multi_dimensional_ratings(created_at DESC);

-- Index for each dimension (for queries like "high emotion books")
CREATE INDEX idx_md_ratings_pace ON multi_dimensional_ratings(pace) WHERE pace IS NOT NULL;
CREATE INDEX idx_md_ratings_emotional ON multi_dimensional_ratings(emotional_impact) WHERE emotional_impact IS NOT NULL;
CREATE INDEX idx_md_ratings_complexity ON multi_dimensional_ratings(complexity) WHERE complexity IS NOT NULL;
```

**Key Features:**
- 7 optional dimensions (rate only what matters)
- Generated column for overall star equivalent
- Constraint: at least one dimension required
- Unique constraint: one rating per user per book
- Partial indexes for non-null dimensions (query optimization)

---

### 6. book_fingerprints ⭐ **Core Feature**

Aggregated community ratings (updated via trigger).

```sql
CREATE TABLE book_fingerprints (
    book_id INTEGER PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,

    -- Average values for each dimension
    avg_pace DECIMAL(3,2),
    avg_emotional_impact DECIMAL(3,2),
    avg_complexity DECIMAL(3,2),
    avg_character_development DECIMAL(3,2),
    avg_plot_quality DECIMAL(3,2),
    avg_prose_style DECIMAL(3,2),
    avg_originality DECIMAL(3,2),

    -- Overall average
    star_equivalent DECIMAL(3,2),

    -- Metadata
    total_ratings INTEGER NOT NULL DEFAULT 0,
    has_ratings BOOLEAN GENERATED ALWAYS AS (total_ratings > 0) STORED,

    -- Vector representation (384 dimensions for sentence-transformers)
    fingerprint_vector vector(384),

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT total_ratings_positive CHECK (total_ratings >= 0),
    CONSTRAINT avg_values_range CHECK (
        (avg_pace IS NULL OR (avg_pace >= 1 AND avg_pace <= 5)) AND
        (avg_emotional_impact IS NULL OR (avg_emotional_impact >= 1 AND avg_emotional_impact <= 5)) AND
        (avg_complexity IS NULL OR (avg_complexity >= 1 AND avg_complexity <= 5)) AND
        (avg_character_development IS NULL OR (avg_character_development >= 1 AND avg_character_development <= 5)) AND
        (avg_plot_quality IS NULL OR (avg_plot_quality >= 1 AND avg_plot_quality <= 5)) AND
        (avg_prose_style IS NULL OR (avg_prose_style >= 1 AND avg_prose_style <= 5)) AND
        (avg_originality IS NULL OR (avg_originality >= 1 AND avg_originality <= 5)) AND
        (star_equivalent IS NULL OR (star_equivalent >= 1 AND star_equivalent <= 5))
    )
);

-- Indexes
CREATE INDEX idx_fingerprints_star_equivalent ON book_fingerprints(star_equivalent DESC NULLS LAST);
CREATE INDEX idx_fingerprints_total_ratings ON book_fingerprints(total_ratings DESC);
CREATE INDEX idx_fingerprints_has_ratings ON book_fingerprints(has_ratings) WHERE has_ratings = true;

-- Vector similarity index (IVFFlat for fast approximate search)
CREATE INDEX idx_fingerprints_vector ON book_fingerprints
    USING ivfflat (fingerprint_vector vector_cosine_ops)
    WITH (lists = 100);

-- Indexes for dimension-based queries
CREATE INDEX idx_fingerprints_pace ON book_fingerprints(avg_pace) WHERE avg_pace IS NOT NULL;
CREATE INDEX idx_fingerprints_emotional ON book_fingerprints(avg_emotional_impact) WHERE avg_emotional_impact IS NOT NULL;
CREATE INDEX idx_fingerprints_complexity ON book_fingerprints(avg_complexity) WHERE avg_complexity IS NOT NULL;
```

**Key Features:**
- Automatically updated when ratings change (via trigger)
- Vector embeddings for AI recommendations
- IVFFlat index for fast similarity search
- Generated `has_ratings` column for easy filtering

---

### 7. user_books (Library)

User's personal book library with reading status.

```sql
CREATE TABLE user_books (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,

    -- Reading status
    status VARCHAR(20) NOT NULL DEFAULT 'want_to_read',

    -- Progress tracking
    current_page INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,

    -- Quick rating (1-5 stars, legacy/simple rating)
    rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),

    -- User notes
    notes TEXT,
    is_favorite BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, book_id),

    CONSTRAINT valid_status CHECK (status IN ('want_to_read', 'currently_reading', 'finished', 'dnf')),
    CONSTRAINT current_page_positive CHECK (current_page IS NULL OR current_page > 0),
    CONSTRAINT finished_after_start CHECK (started_at IS NULL OR finished_at IS NULL OR finished_at >= started_at)
);

-- Indexes
CREATE INDEX idx_user_books_user ON user_books(user_id);
CREATE INDEX idx_user_books_book ON user_books(book_id);
CREATE INDEX idx_user_books_status ON user_books(status);
CREATE INDEX idx_user_books_is_favorite ON user_books(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_user_books_finished_at ON user_books(finished_at DESC NULLS LAST);
```

**Reading Statuses:**
- `want_to_read` - In TBR list
- `currently_reading` - Active read
- `finished` - Completed
- `dnf` - Did Not Finish

---

### 8. reviews

User reviews for books.

```sql
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,

    title VARCHAR(200),
    content TEXT NOT NULL,

    -- Spoiler flag
    contains_spoilers BOOLEAN DEFAULT false,

    -- Review helpfulness (for future feature)
    helpful_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0),
    CONSTRAINT helpful_count_positive CHECK (helpful_count >= 0)
);

-- Indexes
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_book ON reviews(book_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_helpful ON reviews(helpful_count DESC);
CREATE INDEX idx_reviews_content ON reviews USING gin(to_tsvector('english', content));
```

---

### 9. content_ratings (Legacy - Optional)

Community content warnings.

```sql
CREATE TABLE content_ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,

    -- Content dimensions (0-4 scale)
    violence SMALLINT CHECK (violence >= 0 AND violence <= 4),
    sexual_content SMALLINT CHECK (sexual_content >= 0 AND sexual_content <= 4),
    profanity SMALLINT CHECK (profanity >= 0 AND profanity <= 4),
    substance_use SMALLINT CHECK (substance_use >= 0 AND substance_use <= 4),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, book_id)
);

-- Indexes
CREATE INDEX idx_content_ratings_book ON content_ratings(book_id);
```

**Content Scale:**
- 0 = None
- 1 = Mild
- 2 = Moderate
- 3 = Strong
- 4 = Graphic

---

## Triggers & Functions

### 1. Update book_fingerprints on rating change

```sql
-- Function to recalculate fingerprint
CREATE OR REPLACE FUNCTION update_book_fingerprint()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update fingerprint
    INSERT INTO book_fingerprints (
        book_id,
        avg_pace,
        avg_emotional_impact,
        avg_complexity,
        avg_character_development,
        avg_plot_quality,
        avg_prose_style,
        avg_originality,
        star_equivalent,
        total_ratings,
        updated_at
    )
    SELECT
        book_id,
        AVG(pace)::DECIMAL(3,2),
        AVG(emotional_impact)::DECIMAL(3,2),
        AVG(complexity)::DECIMAL(3,2),
        AVG(character_development)::DECIMAL(3,2),
        AVG(plot_quality)::DECIMAL(3,2),
        AVG(prose_style)::DECIMAL(3,2),
        AVG(originality)::DECIMAL(3,2),
        AVG(star_equivalent)::DECIMAL(3,2),
        COUNT(*)::INTEGER,
        CURRENT_TIMESTAMP
    FROM multi_dimensional_ratings
    WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)
    GROUP BY book_id
    ON CONFLICT (book_id) DO UPDATE SET
        avg_pace = EXCLUDED.avg_pace,
        avg_emotional_impact = EXCLUDED.avg_emotional_impact,
        avg_complexity = EXCLUDED.avg_complexity,
        avg_character_development = EXCLUDED.avg_character_development,
        avg_plot_quality = EXCLUDED.avg_plot_quality,
        avg_prose_style = EXCLUDED.avg_prose_style,
        avg_originality = EXCLUDED.avg_originality,
        star_equivalent = EXCLUDED.star_equivalent,
        total_ratings = EXCLUDED.total_ratings,
        updated_at = EXCLUDED.updated_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT, UPDATE, DELETE
CREATE TRIGGER trigger_update_fingerprint_on_rating
    AFTER INSERT OR UPDATE OR DELETE ON multi_dimensional_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_book_fingerprint();
```

### 2. Update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
-- (repeat for other tables)
```

---

## Views

### 1. User reading statistics

```sql
CREATE VIEW user_reading_stats AS
SELECT
    u.id AS user_id,
    u.username,
    COUNT(DISTINCT CASE WHEN ub.status = 'finished' THEN ub.book_id END) AS books_finished,
    COUNT(DISTINCT CASE WHEN ub.status = 'currently_reading' THEN ub.book_id END) AS books_reading,
    COUNT(DISTINCT CASE WHEN ub.status = 'want_to_read' THEN ub.book_id END) AS books_want_to_read,
    COUNT(DISTINCT r.id) AS total_reviews,
    COUNT(DISTINCT mdr.id) AS total_ratings,
    AVG(mdr.star_equivalent)::DECIMAL(3,2) AS avg_rating_given
FROM users u
LEFT JOIN user_books ub ON u.id = ub.user_id
LEFT JOIN reviews r ON u.id = r.user_id
LEFT JOIN multi_dimensional_ratings mdr ON u.id = mdr.user_id
GROUP BY u.id, u.username;
```

### 2. Book details with ratings

```sql
CREATE VIEW book_details_with_ratings AS
SELECT
    b.*,
    bf.avg_pace,
    bf.avg_emotional_impact,
    bf.avg_complexity,
    bf.avg_character_development,
    bf.avg_plot_quality,
    bf.avg_prose_style,
    bf.avg_originality,
    bf.star_equivalent,
    bf.total_ratings,
    COUNT(DISTINCT r.id) AS review_count,
    ARRAY_AGG(DISTINCT g.name) AS genres
FROM books b
LEFT JOIN book_fingerprints bf ON b.id = bf.book_id
LEFT JOIN reviews r ON b.id = r.book_id
LEFT JOIN book_genres bg ON b.id = bg.book_id
LEFT JOIN genres g ON bg.genre_id = g.id
GROUP BY b.id, bf.book_id;
```

---

## Example Queries

### Find books with similar fingerprints

```sql
-- Books similar to book ID 1 using vector similarity
SELECT
    b.id,
    b.title,
    b.author,
    bf.star_equivalent,
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

### Find "high emotion, low complexity" books

```sql
SELECT
    b.title,
    b.author,
    bf.avg_emotional_impact,
    bf.avg_complexity,
    bf.star_equivalent
FROM books b
JOIN book_fingerprints bf ON b.id = bf.book_id
WHERE bf.avg_emotional_impact >= 4.0
    AND bf.avg_complexity <= 2.5
    AND bf.total_ratings >= 5
ORDER BY bf.star_equivalent DESC
LIMIT 20;
```

### User's rated books with their ratings

```sql
SELECT
    b.title,
    b.author,
    mdr.pace,
    mdr.emotional_impact,
    mdr.complexity,
    mdr.star_equivalent,
    mdr.created_at
FROM multi_dimensional_ratings mdr
JOIN books b ON mdr.book_id = b.id
WHERE mdr.user_id = 1
ORDER BY mdr.created_at DESC;
```

---

This comprehensive schema supports all features of The Shelf including the innovative multi-dimensional rating system!
