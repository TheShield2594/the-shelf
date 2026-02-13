# Common Sense Media API Integration

This document explains how to integrate Common Sense Media (CSM) content ratings into The Shelf.

## Overview

Common Sense Media provides expert-reviewed content ratings for books, helping parents and readers make informed decisions about age-appropriate content.

## Why CSM?

- **Professional Reviews**: Expert evaluations of content
- **Comprehensive Ratings**: Violence, language, sexual content, substance use, and more
- **Age Recommendations**: Suggested minimum age for readers
- **Educational Value**: Learning and positive message ratings
- **Trusted Source**: Widely recognized and respected organization

## Setup Instructions

### 1. Apply for API Access

1. Visit the [Common Sense Media Developer Center](https://www.commonsensemedia.org/developers)
2. Submit an application for API access
3. Establish a partnership agreement with CSM
4. Obtain your API key

### 2. Configure the Application

⚠️ **Security**: Never expose API keys in frontend code or environment variables starting with `VITE_`.

Add your API key to the **backend** environment only:

```bash
# backend/.env
CSM_API_KEY=your_api_key_here
```

### 3. API Specifications

- **Base URL**: `https://api.commonsense.org/api/v3`
- **Authentication**: API key via `x-api-key` header
- **Rate Limit**: 100 unique requests per minute
- **Protocol**: HTTPS only
- **Method**: GET requests

### 4. Data Storage Requirement

⚠️ **Important**: CSM requires that API users pull data regularly and store it locally. On-demand requests are not supported.

**Recommended Implementation**:
1. Set up a scheduled job to fetch ratings for all books in your database
2. Store CSM ratings in the database alongside community ratings
3. Update ratings periodically (e.g., weekly or monthly)

## Usage

### Architecture: Backend Proxy

🔒 **Security First**: CSM API calls **must** go through your backend to protect the API key.

**Flow**:
1. Frontend calls backend endpoint (e.g., `/api/csm/search`)
2. Backend authenticates the request
3. Backend calls CSM API using server-side `CSM_API_KEY`
4. Backend returns CSM data to frontend

### Backend Implementation

**Create a CSM proxy endpoint** (`/backend/app/routers/csm.py`):

```python
from fastapi import APIRouter, HTTPException, Depends
import httpx
import os

router = APIRouter(prefix="/csm", tags=["csm"])
CSM_API_KEY = os.getenv("CSM_API_KEY")
CSM_BASE_URL = "https://api.commonsense.org/api/v3"

@router.get("/search")
async def search_csm_review(q: str, current_user = Depends(get_current_user)):
    """Proxy CSM review search to protect API key"""
    if not CSM_API_KEY:
        raise HTTPException(503, "CSM API not configured")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{CSM_BASE_URL}/reviews/search",
            params={"q": q, "type": "book"},
            headers={"x-api-key": CSM_API_KEY}
        )
        response.raise_for_status()
        return response.json()
```

### Frontend Integration

**Call the backend proxy** (update `/frontend/src/services/commonSenseMedia.ts`):

```typescript
// Frontend calls backend, NOT CSM directly
export async function searchCSMReview(query: string): Promise<CSMReview | null> {
  try {
    const response = await fetch(`/api/csm/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.results?.[0] || null;
  } catch (error) {
    console.error('CSM API request failed:', error);
    return null;
  }
}
```

**Fetch a book's content rating**:
```typescript
import { getBookContentRating } from '@/services/commonSenseMedia';

const rating = await getBookContentRating("The Hunger Games", "Suzanne Collins");
if (rating) {
  console.log('Violence:', rating.violence_level);
  console.log('Language:', rating.language_level);
  console.log('Age Recommendation:', rating.age_recommendation);
}
```

### Scheduled Sync (Required by CSM)

Create a scheduled job to periodically fetch and store CSM ratings:

```python
# backend/app/tasks/csm_sync.py
import httpx
import os
from app.models.book import Book
from app.models.content_rating import ContentRating
from app.database import get_db

CSM_API_KEY = os.getenv("CSM_API_KEY")
CSM_BASE_URL = "https://api.commonsense.org/api/v3"

async def sync_csm_ratings():
    """
    Periodically fetch CSM ratings for all books
    Run this as a scheduled task (e.g., weekly)
    """
    if not CSM_API_KEY:
        return

    async with httpx.AsyncClient() as client:
        async with get_db() as db:
            books = await db.execute(select(Book).limit(100))
            for book in books.scalars():
                # Fetch from CSM API
                response = await client.get(
                    f"{CSM_BASE_URL}/reviews/search",
                    params={"q": f"{book.title} {book.author}", "type": "book"},
                    headers={"x-api-key": CSM_API_KEY}
                )
                if response.status_code == 200:
                    data = response.json()
                    # Store in database
                    await store_csm_rating(db, book.id, data)
                await asyncio.sleep(0.65)  # Rate limiting
```

## Rating Scale Conversion

CSM uses a 0-5 scale, The Shelf uses 0-4:

| CSM Score | Our Score | Label |
|-----------|-----------|-------|
| 0-1 | 0 | None |
| 2 | 1 | Mild |
| 3 | 2 | Moderate |
| 4 | 3 | Strong |
| 5 | 4 | Graphic |

The conversion is handled automatically by `convertCSMRating()`.

## Features to Implement

### Phase 1: Display CSM Ratings
- [x] Create CSM service module
- [ ] Display CSM ratings on book detail pages
- [ ] Show CSM age recommendations
- [ ] Add CSM badge/link on books with professional reviews

### Phase 2: Prefill Content Rating Forms
- [ ] Auto-suggest CSM ratings when users add content ratings
- [ ] Allow users to accept or modify CSM suggestions
- [ ] Track source of ratings (community vs. CSM)

### Phase 3: Scheduled Sync
- [ ] Create backend job to periodically fetch CSM ratings
- [ ] Store CSM ratings in database
- [ ] Update stale ratings (e.g., monthly)
- [ ] Add CSM rating count to book statistics

## Alternative: Community-Only Ratings

If obtaining CSM API access is not feasible, The Shelf's community-driven content rating system is fully functional without CSM integration. The system will rely entirely on user-submitted ratings, similar to how Goodreads operates.

## Resources

- [CSM Developer Center](https://www.commonsensemedia.org/developers)
- [API Overview](https://www.commonsensemedia.org/developers/api-overview)
- [API v3 Documentation](https://www.commonsensemedia.org/developers/api/v3)
- [Implementation Guide](https://www.commonsensemedia.org/developers/api/implementation)

## Support

For API access issues, contact Common Sense Media directly through their developer portal.
