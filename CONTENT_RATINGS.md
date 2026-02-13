# Content Ratings System

## Overview

The Shelf uses a **community-driven content rating system** where users can rate books on four content categories to help other readers make informed decisions.

## Why Community Ratings?

While professional rating services like Common Sense Media exist, they:
- Require paid partnerships and API agreements
- Have limited coverage of books
- May not reflect community values

**Community ratings provide**:
- Free and open system
- Broader book coverage
- Democratic, crowd-sourced perspective
- Real reader experiences

## Rating Categories

Each book can be rated on a 0-4 scale across four categories:

### 1. Violence (violence_level)
- **0 - None**: No violence
- **1 - Mild**: Brief, non-graphic violence
- **2 - Moderate**: Some violent scenes
- **3 - Strong**: Frequent or intense violence
- **4 - Graphic**: Explicit, detailed violence

### 2. Language (language_level)
- **0 - None**: No profanity
- **1 - Mild**: Infrequent mild language
- **2 - Moderate**: Some strong language
- **3 - Strong**: Frequent profanity
- **4 - Graphic**: Pervasive harsh language

### 3. Sexual Content (sexual_content_level)
- **0 - None**: No sexual content
- **1 - Mild**: Kissing, mild romance
- **2 - Moderate**: Implied sexual situations
- **3 - Strong**: Some explicit content
- **4 - Graphic**: Detailed sexual content

### 4. Substance Use (substance_use_level)
- **0 - None**: No substance use
- **1 - Mild**: Brief mentions
- **2 - Moderate**: Some depiction of use
- **3 - Strong**: Frequent substance use
- **4 - Graphic**: Glorified or detailed use

## How It Works

### 1. Users Submit Ratings
Any authenticated user can submit content ratings for books they've read.

### 2. Ratings Are Aggregated
The system calculates average ratings across all user submissions.

### 3. Readers Filter Books
Users can filter books by maximum content levels in each category.

## Free Alternatives Considered

| Service | Status | Notes |
|---------|--------|-------|
| **Common Sense Media** | ❌ Requires paid partnership | Professional reviews, but needs agreement |
| **Goodreads API** | ❌ Closed since 2020 | No longer accepting new applications |
| **Google Books API** | ❌ No content ratings | Metadata only |
| **Open Library** | ✅ Implemented | Book data, but no content ratings |
| **Community Ratings** | ✅ **Current system** | Free, scalable, democratic |

## Implementation

### Backend (Already Implemented)

**Model**: `ContentRating` in `/backend/app/models/content_rating.py`

```python
class ContentRating(Base):
    user_id: int
    book_id: int
    violence_level: int  # 0-4
    language_level: int
    sexual_content_level: int
    substance_use_level: int
```

**API Endpoints**:
- `POST /api/content-ratings` - Submit a rating (book_id in request body)
- `GET /api/content-ratings/book/{book_id}` - Get individual ContentRating records
- `GET /api/books?max_violence=2&max_language=1&max_sexual=1&max_substance=2` - Filter books by content levels

**Note**: Aggregated content rating summaries are included in the book summary objects returned by the books endpoints (e.g., `GET /api/books`), not via a separate content-ratings summary endpoint.

### Frontend Usage

**Submit a rating**:
```typescript
import { api } from '@/services/api';

await api.createContentRating({
  book_id: bookId,
  violence_level: 2,
  language_level: 1,
  sexual_content_level: 0,
  substance_use_level: 1,
});
```

**Get ratings for a book**:
```typescript
const ratings = await api.getContentRatings(bookId);
// Returns array of individual ContentRating records
```

**Filter books by content levels**:
```typescript
const books = await api.getBooks({
  max_violence: '2',
  max_language: '1',
  max_sexual: '1',
  max_substance: '2',
});
// Aggregated content ratings are included in each book summary
```

## Enhancing Community Ratings

### Current Features
- ✅ User submission system
- ✅ Average rating calculation
- ✅ Filtering by content levels
- ✅ Individual user ratings tracked

### Future Enhancements

1. **Voting System**: Allow users to upvote/downvote content ratings for accuracy
2. **Verified Ratings**: Badge for users who've marked book as "read"
3. **Rating History**: Track rating changes over time
4. **Suggested Ratings**: Use book descriptions to suggest initial ratings
5. **Rating Statistics**: Show distribution of ratings (e.g., "60% rated violence as Mild")

## Advantages Over Paid Services

✅ **Always Free**: No API costs or partnerships required
✅ **Comprehensive Coverage**: Any book can be rated
✅ **Community Perspective**: Reflects actual reader experiences
✅ **Transparent**: Users can see individual ratings and averages
✅ **Privacy Friendly**: No external data sharing required
✅ **Flexible**: Can add new categories or change scales

## For Parents and Educators

While not professionally reviewed, community ratings provide valuable insights:
- Check multiple ratings for consensus
- Read reviews alongside ratings
- Consider the number of ratings (more = more reliable)
- Use as a starting point for your own review

## Contributing Ratings

Users are encouraged to:
- Rate books honestly based on their reading experience
- Consider the target audience when rating
- Update ratings if they reconsider after time
- Explain ratings in reviews when helpful

---

**Note**: If your organization has access to Common Sense Media API, see [CSM_INTEGRATION.md](./CSM_INTEGRATION.md) for integration instructions. The community system will work alongside professional ratings.
