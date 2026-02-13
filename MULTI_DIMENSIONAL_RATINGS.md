# Multi-Dimensional Rating System

## Overview

The Shelf replaces traditional 5-star ratings with a **multi-dimensional rating system** that captures the nuanced complexity of reading experiences.

Instead of reducing a book to a single number, we track **7 dimensions**:

1. **Pace** - How fast or slow the book reads (1 = Very Slow, 5 = Very Fast)
2. **Emotional Impact** - How emotionally affecting the book is (1 = Low, 5 = Devastating)
3. **Complexity** - Intellectual density and difficulty (1 = Simple, 5 = Dense)
4. **Character Development** - Quality of characterization (1 = Weak, 5 = Exceptional)
5. **Plot Quality** - Story structure and pacing (1 = Poor, 5 = Excellent)
6. **Prose Style** - Writing quality and beauty (1 = Weak, 5 = Beautiful)
7. **Originality** - Novelty and creativity (1 = Derivative, 5 = Groundbreaking)

---

## Why Multi-Dimensional Ratings?

### The Problem with 5-Star Ratings

**5-star ratings fail to capture reading complexity:**

- ❌ **Reductive:** Can't express "great prose, weak plot"
- ❌ **Unstable:** Changes with mood, time, context
- ❌ **Incomparable:** Your 3-star ≠ my 3-star
- ❌ **Meaningless precision:** What's the difference between 3.7 and 3.8 stars?
- ❌ **Lacks context:** Why did you rate it 4 stars?

### How Multi-Dimensional Ratings Solve This

✅ **Nuanced expression:** "High emotion, lower complexity" is now possible
✅ **Smart recommendations:** Find books with similar "fingerprints"
✅ **Visual clarity:** Radar charts show at a glance what a book is like
✅ **Optional dimensions:** Rate only what matters to you
✅ **Better discovery:** "Books like X but faster-paced" queries work

---

## How It Works

### 1. User Rates a Book (7 Dimensions)

```json
POST /api/ratings
{
  "book_id": 42,
  "pace": 4,
  "emotional_impact": 5,
  "complexity": 3,
  "character_development": 5,
  "plot_quality": 4,
  "prose_style": 4,
  "originality": 3
}
```

**All dimensions are optional.** You can rate only what you care about.

### 2. System Creates Book "Fingerprint"

When users rate a book, the system automatically calculates aggregate ratings across all users.

**Example: The Night Circus**
```json
{
  "avg_pace": 3.2,
  "avg_emotional_impact": 4.5,
  "avg_complexity": 3.0,
  "avg_character_development": 4.1,
  "avg_plot_quality": 3.8,
  "avg_prose_style": 4.7,
  "avg_originality": 4.3,
  "star_equivalent": 3.9,
  "total_ratings": 234
}
```

### 3. Fingerprint Powers Recommendations

**Vector similarity in 7-dimensional space:**
- Books are points in 7D space
- Similar books are "close" to each other
- Enables queries like "High emotion + Low complexity"

**Example query:**
> "Find me books like The Night Circus but faster-paced"

```
Target: [pace: 3.2, emotion: 4.5, ...]
Filter: pace >= 4.0
→ Similar books with pace >= 4.0
```

---

## API Reference

### Create/Update Rating

```http
POST /api/ratings
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "book_id": 123,
  "pace": 4,
  "emotional_impact": 5,
  "complexity": 2,
  "character_development": 4,
  "plot_quality": 5,
  "prose_style": 3,
  "originality": 4
}
```

**Response:**
```json
{
  "id": 456,
  "user_id": 789,
  "book_id": 123,
  "pace": 4,
  "emotional_impact": 5,
  "complexity": 2,
  "character_development": 4,
  "plot_quality": 5,
  "prose_style": 3,
  "originality": 4,
  "star_equivalent": 3.86,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": null
}
```

### Get Your Rating

```http
GET /api/ratings/{book_id}
Authorization: Bearer <jwt_token>
```

**Response:** Same as create

### Delete Rating

```http
DELETE /api/ratings/{book_id}
Authorization: Bearer <jwt_token>
```

**Response:** `204 No Content`

### Get Book Fingerprint

```http
GET /api/ratings/{book_id}/fingerprint
```

**Response:**
```json
{
  "book_id": 123,
  "avg_pace": 3.8,
  "avg_emotional_impact": 4.2,
  "avg_complexity": 3.1,
  "avg_character_development": 4.5,
  "avg_plot_quality": 4.0,
  "avg_prose_style": 3.9,
  "avg_originality": 4.1,
  "star_equivalent": 3.94,
  "total_ratings": 42,
  "has_ratings": true,
  "updated_at": "2025-01-15T12:00:00Z"
}
```

### Get Radar Chart Data

```http
GET /api/ratings/{book_id}/chart-data
Authorization: Bearer <jwt_token> (optional)
```

**Response:**
```json
{
  "dimensions": [
    { "dimension": "Pace", "value": 4 },
    { "dimension": "Emotion", "value": 5 },
    { "dimension": "Complexity", "value": 2 },
    { "dimension": "Character", "value": 4 },
    { "dimension": "Plot", "value": 5 },
    { "dimension": "Prose", "value": 3 },
    { "dimension": "Originality", "value": 4 }
  ]
}
```

If authenticated and user has rated the book, returns user's rating.
Otherwise, returns the book's aggregate fingerprint.

---

## Frontend Integration

### Display Radar Chart

Use the `/chart-data` endpoint to get formatted data for Recharts:

```tsx
import { Radar, RadarChart, PolarGrid, PolarAngleAxis } from 'recharts';

async function BookFingerprint({ bookId }: { bookId: number }) {
  const response = await fetch(`/api/ratings/${bookId}/chart-data`);
  const { dimensions } = await response.json();

  return (
    <RadarChart width={400} height={400} data={dimensions}>
      <PolarGrid />
      <PolarAngleAxis dataKey="dimension" />
      <Radar dataKey="value" stroke="#8B4513" fill="#8B4513" fillOpacity={0.6} />
    </RadarChart>
  );
}
```

### Rating Form with Sliders

```tsx
function MultiDimensionalRatingForm({ bookId }: Props) {
  const [rating, setRating] = useState({
    pace: 3,
    emotional_impact: 3,
    complexity: 3,
    character_development: 3,
    plot_quality: 3,
    prose_style: 3,
    originality: 3,
  });

  const handleSubmit = async () => {
    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: bookId, ...rating }),
    });
  };

  return (
    <form>
      {Object.entries(rating).map(([dimension, value]) => (
        <Slider
          key={dimension}
          label={dimension}
          min={1}
          max={5}
          value={value}
          onChange={(v) => setRating({ ...rating, [dimension]: v })}
        />
      ))}
      <button onClick={handleSubmit}>Save Rating</button>
    </form>
  );
}
```

---

## Database Schema

### `multi_dimensional_ratings` Table

```sql
CREATE TABLE multi_dimensional_ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,

    -- Dimensions (1-5 scale, all nullable)
    pace SMALLINT CHECK (pace IS NULL OR (pace >= 1 AND pace <= 5)),
    emotional_impact SMALLINT CHECK (emotional_impact IS NULL OR (emotional_impact >= 1 AND emotional_impact <= 5)),
    complexity SMALLINT CHECK (complexity IS NULL OR (complexity >= 1 AND complexity <= 5)),
    character_development SMALLINT CHECK (character_development IS NULL OR (character_development >= 1 AND character_development <= 5)),
    plot_quality SMALLINT CHECK (plot_quality IS NULL OR (plot_quality >= 1 AND plot_quality <= 5)),
    prose_style SMALLINT CHECK (prose_style IS NULL OR (prose_style >= 1 AND prose_style <= 5)),
    originality SMALLINT CHECK (originality IS NULL OR (originality >= 1 AND originality <= 5)),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(user_id, book_id)
);
```

### `book_fingerprints` Table

```sql
CREATE TABLE book_fingerprints (
    book_id INTEGER PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,

    -- Average ratings
    avg_pace FLOAT,
    avg_emotional_impact FLOAT,
    avg_complexity FLOAT,
    avg_character_development FLOAT,
    avg_plot_quality FLOAT,
    avg_prose_style FLOAT,
    avg_originality FLOAT,

    -- Overall
    star_equivalent FLOAT,
    total_ratings INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Recommendation Engine

Multi-dimensional ratings power intelligent recommendations.

### Similarity-Based Recommendations

**Find books with similar fingerprints:**

```python
from app.services.recommendations import get_similar_books_by_fingerprint

similar_books = await get_similar_books_by_fingerprint(
    db,
    book_id=42,
    limit=10,
    exclude_book_ids=[1, 2, 3]  # Already read
)
```

**How it works:**
1. Get target book's fingerprint vector: `[3.2, 4.5, 3.0, 4.1, 3.8, 4.7, 4.3]`
2. Compare to all other books using cosine similarity
3. Return top N most similar books

### Mood-Based Recommendations

```python
from app.services.recommendations import get_books_by_mood

# "I want a comforting read"
comfort_books = await get_books_by_mood(db, mood="comfort", limit=10)
# → High emotional impact + Lower complexity

# "I want to be challenged"
challenge_books = await get_books_by_mood(db, mood="challenge", limit=10)
# → High complexity + High originality

# "I need an escape"
escape_books = await get_books_by_mood(db, mood="escape", limit=10)
# → Fast pace + High plot quality
```

**Supported moods:**
- `comfort` - High emotion, lower complexity
- `challenge` - High complexity, high originality
- `escape` - Fast pace, strong plot
- `contemplative` - Slow pace, beautiful prose

---

## Migration from 5-Star Ratings

If you have existing 5-star ratings:

```sql
-- Convert old ratings to multi-dimensional
INSERT INTO multi_dimensional_ratings (
    user_id, book_id,
    pace, emotional_impact, complexity,
    character_development, plot_quality,
    prose_style, originality,
    created_at
)
SELECT
    user_id,
    book_id,
    rating,  -- Use 5-star value for all dimensions
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
```

Then recalculate fingerprints (see DATABASE_MIGRATION_GUIDE.md).

---

## Best Practices

### For Users

**You don't need to rate every dimension:**
```json
// This is valid - only rate what matters
{
  "book_id": 123,
  "emotional_impact": 5,
  "prose_style": 5
}
```

**Rate honestly, not strategically:**
- Don't inflate ratings to "help" a book
- Your honest ratings improve recommendations for everyone

**Revisit ratings over time:**
- Books age differently
- Your perspective changes
- Update your rating if it no longer reflects your view

### For Developers

**Always show the fingerprint on book pages:**
```tsx
<BookFingerprint bookId={book.id} />
```

**Explain what dimensions mean:**
- Use tooltips: "Pace: 1 (Very Slow) to 5 (Very Fast)"
- Show examples: "The Great Gatsby: Slow pace, beautiful prose"

**Handle missing fingerprints gracefully:**
```tsx
{fingerprint.total_ratings === 0 ? (
  <p>No ratings yet. Be the first to rate this book!</p>
) : (
  <RadarChart data={fingerprint} />
)}
```

**Update fingerprints automatically:**
- Happens on create/update/delete rating
- No manual intervention needed
- Cached for performance

---

## Performance Considerations

### Caching

Fingerprints are pre-computed and cached:
- Updated only when ratings change
- No real-time aggregation on book page loads
- Scales to millions of ratings

### Embeddings

Book embeddings are generated once and stored:
- 384-dimensional vectors (~1.5KB per book)
- LRU cache for 1000 most recent embeddings
- Lazy loading (model loaded on first use)

### Vector Similarity Search

**Without pgvector (current):**
- In-memory cosine similarity (fine for <10K books)
- O(N) comparison for each query

**With pgvector (recommended for production):**
```sql
-- Create index
CREATE INDEX ON book_fingerprints USING ivfflat (fingerprint_vector);

-- Fast similarity search
SELECT * FROM books
ORDER BY description_embedding <-> $target_embedding
LIMIT 10;
```

Reduces similarity search from O(N) to O(log N).

---

## Future Enhancements

### Planned Features

1. **Personalized dimension weights**
   - "I care more about prose than plot"
   - Adjust recommendation algorithm accordingly

2. **Time-based analysis**
   - "My taste has evolved: I used to prefer fast-paced books"
   - Show taste evolution over time

3. **Reading context tracking**
   - "I rated this 5 stars because I read it at a difficult time in my life"
   - Add context tags to ratings

4. **Collaborative dimension suggestions**
   - "Users who rated pace as 4 also tend to rate originality as 3"
   - Help users calibrate their ratings

5. **Visualization improvements**
   - Comparison radar charts (your rating vs. community)
   - Distribution histograms (how spread out are ratings?)
   - Dimension correlation heatmaps

---

## Troubleshooting

### "Fingerprint not updating after rating"

**Cause:** Database trigger not firing
**Solution:** Fingerprints update automatically via `update_book_fingerprint()` service

### "Recommendations are all the same genre"

**Cause:** Using genre-only similarity
**Solution:** Multi-dimensional fingerprints work across genres (mystery + beautiful prose = literary mystery)

### "Sentence transformers model won't load"

**Cause:** Missing dependency or insufficient memory
**Solution:**
```bash
pip install sentence-transformers
# Model requires ~500MB RAM
```

### "pgvector extension not found"

**Cause:** PostgreSQL extension not installed
**Solution:** See DATABASE_MIGRATION_GUIDE.md for installation instructions

---

## Summary

Multi-dimensional ratings are **the core innovation** of The Shelf:

✅ **Nuanced** - Captures reading complexity
✅ **Visual** - Radar charts show book personality
✅ **Smart** - Powers intelligent recommendations
✅ **Flexible** - Rate only what matters
✅ **Better discovery** - Find books by feel, not just genre

**This is not Goodreads with a fresh coat of paint.**
**This is a fundamental rethinking of how we express and discover books.** 📚
