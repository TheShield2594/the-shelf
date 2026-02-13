# The Shelf - A Better Way to Track Books

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://www.python.org/)

A privacy-first book tracking platform with **multi-dimensional ratings** that capture the nuanced complexity of reading experiences.

**🚀 [Try the Live Demo](https://the-shelf-demo.vercel.app/demo)**

---

## Why The Shelf?

### The Problem with Goodreads

❌ **5-star ratings are broken** - Can't express "great prose but weak plot"
❌ **UI stuck in 2009** - Cluttered, slow, overwhelming
❌ **Privacy concerns** - Amazon-owned, data used for advertising
❌ **Poor discovery** - Just "books similar to X" based on genre tags

### The Shelf's Solution

✅ **Multi-dimensional ratings** - 7-axis system (pace, emotion, complexity, character, plot, prose, originality)
✅ **Visual fingerprints** - Radar charts show book personality at a glance
✅ **Smart recommendations** - AI-powered discovery by feel, not just genre
✅ **Privacy-first** - Your data stays yours. No selling, no tracking, easy export
✅ **Modern & fast** - Built with Next.js 14, feels like 2026 not 2009

---

## Features

### 🌟 Multi-Dimensional Rating System

Instead of reducing a book to a single number, rate **7 dimensions**:

| Dimension | Scale |
|-----------|-------|
| **Pace** | 1 (Very Slow) → 5 (Very Fast) |
| **Emotional Impact** | 1 (Low) → 5 (Devastating) |
| **Complexity** | 1 (Simple) → 5 (Dense) |
| **Character Development** | 1 (Weak) → 5 (Exceptional) |
| **Plot Quality** | 1 (Poor) → 5 (Excellent) |
| **Prose Style** | 1 (Weak) → 5 (Beautiful) |
| **Originality** | 1 (Derivative) → 5 (Groundbreaking) |

**Each book gets a unique "fingerprint"** visualized as a radar chart.

### 📊 Interactive Radar Charts

See at a glance what a book is like:
- High emotion + Lower complexity = Comfort read
- Fast pace + Strong plot = Thriller
- Slow pace + Beautiful prose + High complexity = Literary fiction

### 🤖 AI-Powered Recommendations

- **Embeddings-based similarity** - Semantic understanding, not just keywords
- **Fingerprint matching** - Find books with similar feel
- **Mood-based discovery** - "I want something comforting" → High emotion, lower complexity
- **Transparent reasons** - See why books are recommended

### 🛡️ Privacy-First

- No data selling, ever
- No advertising, ever
- Easy data export (JSON)
- Self-hosting option (open source)
- Granular privacy controls

### ✨ Modern UI

- Next.js 14 with App Router
- Server-side rendering for SEO
- Mobile-first responsive design
- Smooth animations and transitions
- Dark mode ready

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts (radar charts)
- **Hosting:** Vercel

### Backend
- **Framework:** FastAPI (async Python)
- **Database:** PostgreSQL 15+ with pgvector
- **ORM:** SQLAlchemy 2.0 (async)
- **ML:** Sentence Transformers + scikit-learn
- **Hosting:** Railway / Fly.io

### AI/Recommendations
- **Embeddings:** Sentence Transformers (384-dim vectors)
- **Similarity:** pgvector (fast approximate search)
- **Collaborative Filtering:** scikit-learn

---

## Quick Start

### Option 1: Try the Demo (Instant)

```bash
git clone https://github.com/TheShield2594/the-shelf.git
cd the-shelf/frontend-next
npm install
npm run dev
```

Visit **http://localhost:3000/demo** - Uses mock data, works immediately!

### Option 2: Full Local Setup

See [QUICK_START.md](QUICK_START.md) for detailed instructions.

**TL;DR:**

```bash
# 1. Start PostgreSQL with pgvector
docker run -d --name the-shelf-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=the_shelf \
  ankane/pgvector

# 2. Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd frontend-next
npm install
npm run dev
```

---

## Project Structure

```
the-shelf/
├── backend/                        # FastAPI backend
│   ├── app/
│   │   ├── models/                # SQLAlchemy models
│   │   │   ├── multi_dimensional_rating.py  # 7-axis ratings
│   │   │   └── book.py            # Book model with fingerprint
│   │   ├── routers/               # API endpoints
│   │   │   └── multi_dimensional_ratings.py
│   │   ├── services/              # Business logic
│   │   │   ├── embeddings.py     # Sentence Transformers
│   │   │   └── recommendations.py # Discovery algorithms
│   │   └── schemas/               # Pydantic models
│   └── requirements.txt
│
├── frontend-next/                 # Next.js 14 frontend
│   ├── src/
│   │   ├── app/                  # Pages (App Router)
│   │   │   ├── page.tsx         # Home
│   │   │   ├── demo/            # Interactive demo
│   │   │   └── about/           # About page
│   │   ├── components/          # React components
│   │   │   ├── RadarChart.tsx   # Recharts radar
│   │   │   ├── MultiDimensionalRatingForm.tsx
│   │   │   └── BookFingerprint.tsx
│   │   ├── lib/                 # Utilities
│   │   │   └── api.ts          # API client
│   │   └── types/              # TypeScript types
│   └── package.json
│
└── Documentation/
    ├── QUICK_START.md               # 5-minute local setup
    ├── DEPLOYMENT_GUIDE.md          # Production deployment
    ├── PRODUCT_VISION.md            # Strategy & philosophy
    ├── ARCHITECTURE.md              # Technical architecture
    ├── IMPLEMENTATION_ROADMAP.md    # Development timeline
    └── MULTI_DIMENSIONAL_RATINGS.md # Feature deep-dive
```

---

## API Endpoints

### Multi-Dimensional Ratings

```http
POST   /api/ratings                          # Create/update rating
GET    /api/ratings/{book_id}                # Get your rating
DELETE /api/ratings/{book_id}                # Delete rating
GET    /api/ratings/{book_id}/fingerprint    # Get community aggregate
GET    /api/ratings/{book_id}/chart-data     # Radar chart data
```

### Books & Discovery

```http
GET    /api/books                     # List/search books
GET    /api/books/{id}                # Book details
POST   /api/books                     # Create book
POST   /api/books/import              # Import from Open Library
```

### Legacy Endpoints

```http
POST   /api/auth/register             # Register
POST   /api/auth/login                # Login (JWT)
GET    /api/library                   # Your library
POST   /api/reviews                   # Write review
GET    /api/content-ratings/book/{id} # Content ratings
```

**Full API docs:** http://localhost:8000/docs

---

## Example Usage

### Rate a Book

```bash
curl -X POST http://localhost:8000/api/ratings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "book_id": 1,
    "pace": 4,
    "emotional_impact": 5,
    "complexity": 3,
    "character_development": 5,
    "plot_quality": 4,
    "prose_style": 4,
    "originality": 3
  }'
```

### Get Book Fingerprint

```bash
curl http://localhost:8000/api/ratings/1/fingerprint

# Returns:
{
  "book_id": 1,
  "avg_pace": 3.8,
  "avg_emotional_impact": 4.5,
  "avg_complexity": 3.2,
  ...
  "star_equivalent": 3.9,
  "total_ratings": 42
}
```

### Frontend Integration

```tsx
import { MultiDimensionalRatingForm } from '@/components/MultiDimensionalRatingForm';

<MultiDimensionalRatingForm
  bookId={1}
  onSuccess={(rating) => console.log('Saved!', rating)}
/>
```

---

## Screenshots

### Interactive Demo
![Demo Page](docs/screenshots/demo.png)

### Radar Chart Visualization
![Radar Chart](docs/screenshots/radar-chart.png)

### Rating Form
![Rating Form](docs/screenshots/rating-form.png)

---

## Documentation

| Document | Description |
|----------|-------------|
| **[QUICK_START.md](QUICK_START.md)** | Get started in 5 minutes |
| **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** | Deploy to production (Vercel + Railway + Neon) |
| **[PRODUCT_VISION.md](PRODUCT_VISION.md)** | Why we built this, competitive analysis |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System architecture, tech decisions |
| **[MULTI_DIMENSIONAL_RATINGS.md](MULTI_DIMENSIONAL_RATINGS.md)** | Deep dive into rating system |
| **[IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)** | Development timeline |
| **[DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md)** | Alembic migrations, pgvector setup |

---

## Deployment

### Free Tier Hosting

Deploy to production for **$0-5/month**:

- **Frontend (Vercel):** Free tier
- **Backend (Railway):** $5 credit/month
- **Database (Neon):** Free 512 MB PostgreSQL + pgvector

**Step-by-step guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TheShield2594/the-shelf)

(Configure `NEXT_PUBLIC_API_URL` after deploying backend)

---

## Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run tests
pytest tests/ -v --cov=app

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend-next
npm install

# Run tests
npm test

# Type check
npm run type-check

# Start dev server
npm run dev
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "Add new feature"
alembic upgrade head
```

---

## Roadmap

### ✅ Completed (v0.2.0)
- Multi-dimensional rating system (backend + frontend)
- Radar chart visualization
- Book fingerprints (aggregated ratings)
- Interactive rating form
- AI recommendation engine (embeddings + collaborative filtering)
- Next.js 14 frontend
- Comprehensive documentation

### 🚧 In Progress (v0.3.0)
- Database migrations (Alembic)
- User authentication UI
- Book browse/search page
- User library page
- Production deployment

### 📋 Planned (v0.4.0+)
- Reading mood tracking
- Personalized recommendation dashboard
- Reading analytics (pace, patterns, trends)
- Dark mode
- Mobile app (PWA or React Native)
- Import from Goodreads

---

## Contributing

We welcome contributions! See [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) for development priorities.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Credits

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [pgvector](https://github.com/pgvector/pgvector) - Vector similarity search
- [Recharts](https://recharts.org/) - Charting library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Sentence Transformers](https://www.sbert.net/) - Embeddings

---

## Support

- **📖 Documentation:** See `/docs` folder
- **🐛 Bug Reports:** [GitHub Issues](https://github.com/TheShield2594/the-shelf/issues)
- **💬 Discussions:** [GitHub Discussions](https://github.com/TheShield2594/the-shelf/discussions)

---

**Built with ❤️ for readers who deserve better than Goodreads.**

🚀 **[Try the Demo](https://the-shelf-demo.vercel.app/demo)** | 📚 **[Read the Vision](PRODUCT_VISION.md)** | 🛠️ **[Deploy Your Own](DEPLOYMENT_GUIDE.md)**
