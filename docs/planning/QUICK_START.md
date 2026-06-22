# The Shelf - Quick Start Guide

> **Superseded.** This guide predates the current cookie-based auth and the
> removal of pgvector/embeddings, so some steps and curl examples below are
> no longer accurate. See [README.md](../../README.md) for the current
> setup instructions.

Get The Shelf running locally in 5 minutes.

---

## What You'll Get

- ✨ **Multi-dimensional rating system** (7-axis ratings)
- 📊 **Interactive radar charts** (visualize book fingerprints)
- 🎯 **Smart recommendations** (AI-powered discovery)
- 🛡️ **Privacy-first** (your data, your rules)

---

## Prerequisites

- **Node.js 18+** and npm
- **Python 3.11+** and pip
- **PostgreSQL 15+** (or Docker)
- **Git**

---

## Option 1: Quick Demo (Frontend Only)

Try the frontend without backend setup:

```bash
# Clone repository
git clone https://github.com/TheShield2594/the-shelf.git
cd the-shelf

# Go to frontend
cd frontend-next

# Install dependencies
npm install

# Run demo
npm run dev
```

Visit **http://localhost:3000/demo** to see the multi-dimensional rating system!

✅ **Works immediately** - Uses mock data
❌ **No backend** - Can't save ratings

---

## Option 2: Full Local Setup (Recommended)

### Step 1: Database

**Using Docker (Easiest):**

```bash
# Start PostgreSQL with pgvector
docker run -d \
  --name the-shelf-db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=the_shelf \
  ankane/pgvector

# Enable extension
docker exec -it the-shelf-db psql -U postgres -d the_shelf -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Or use existing PostgreSQL:**

```bash
createdb the_shelf
psql the_shelf -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Step 2: Backend

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env

# Edit .env with your database
# DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost/the_shelf

# Run database migrations
alembic upgrade head

# Seed database (optional)
python -m app.seed

# Start backend
uvicorn app.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**

Test: `curl http://localhost:8000/api/health`

### Step 3: Frontend

```bash
# Open new terminal
cd frontend-next

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start frontend
npm run dev
```

Frontend runs at **http://localhost:3000**

---

## Using The Shelf

### 1. Visit the Demo

**http://localhost:3000/demo**

- See the multi-dimensional rating system
- Try rating a book with 7 sliders
- View the radar chart fingerprint

### 2. Explore the API

**API Documentation:**
http://localhost:8000/docs

**Try creating a rating:**

```bash
# Get access token first (demo user)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo&password=demo1234"

# Use token to create rating
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

# Get book fingerprint
curl http://localhost:8000/api/ratings/1/fingerprint
```

### 3. View the Fingerprint

After rating a book, the system automatically:
1. Saves your 7-dimensional rating
2. Recalculates the book's aggregate fingerprint
3. Updates the radar chart

---

## Project Structure

```
the-shelf/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routers/         # API endpoints
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Business logic
│   └── requirements.txt
│
├── frontend-next/           # Next.js frontend
│   ├── src/
│   │   ├── app/            # Pages (App Router)
│   │   ├── components/     # React components
│   │   ├── lib/            # API client & utils
│   │   └── types/          # TypeScript types
│   └── package.json
│
└── Documentation/
    ├── PRODUCT_VISION.md        # Strategy
    ├── ARCHITECTURE.md           # Technical design
    ├── IMPLEMENTATION_ROADMAP.md # Development plan
    ├── DEPLOYMENT_GUIDE.md       # Production deploy
    └── MULTI_DIMENSIONAL_RATINGS.md  # Feature docs
```

---

## Common Issues

### Backend Won't Start

**Error:** `ModuleNotFoundError: No module named 'app'`

**Fix:**
```bash
cd backend
pip install -r requirements.txt
```

### Database Connection Error

**Error:** `could not connect to server`

**Fix:**
```bash
# Make sure PostgreSQL is running
docker ps  # Check if container is up

# Or start it
docker start the-shelf-db
```

### Frontend Can't Reach Backend

**Error:** `Failed to fetch`

**Fix:**
```bash
# Check NEXT_PUBLIC_API_URL in .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend-next/.env.local
```

### pgvector Extension Missing

**Error:** `extension "vector" does not exist`

**Fix:**
```bash
# Install pgvector
# Docker: use ankane/pgvector image (already includes it)
# macOS: brew install pgvector
# Ubuntu: apt install postgresql-15-pgvector

# Then in psql:
CREATE EXTENSION vector;
```

---

## Next Steps

### Try the Features

1. **Rate a book** - Use the demo page
2. **View fingerprints** - See aggregate ratings
3. **Test recommendations** - API endpoint `/api/recommendations`

### Explore the Docs

- **[PRODUCT_VISION.md](PRODUCT_VISION.md)** - Why we built this
- **[MULTI_DIMENSIONAL_RATINGS.md](MULTI_DIMENSIONAL_RATINGS.md)** - How it works
- **[API Documentation](http://localhost:8000/docs)** - Interactive API docs

### Deploy to Production

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Step-by-step deployment
- Uses free tier hosting (frontend host + Railway + Neon)
- Costs $0-5/month for MVP

---

## Development Workflow

### Backend Development

```bash
cd backend

# Run tests
pytest tests/ -v --cov=app

# Type checking
mypy app/

# Code formatting
black app/
```

### Frontend Development

```bash
cd frontend-next

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Database Migrations

```bash
cd backend

# Create migration after model changes
alembic revision --autogenerate -m "Add new field"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## Getting Help

- **API Docs:** http://localhost:8000/docs
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Troubleshooting:** [DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md)
- **GitHub Issues:** https://github.com/TheShield2594/the-shelf/issues

---

## What Makes This Different

### vs Goodreads

| Feature | Goodreads | The Shelf |
|---------|-----------|-----------|
| Ratings | 5-star (reductive) | 7-dimensional (nuanced) |
| UI | 2009 design | Modern Next.js |
| Privacy | Amazon-owned | Privacy-first |
| Discovery | Basic "similar to" | AI-powered fingerprints |

### vs StoryGraph

| Feature | StoryGraph | The Shelf |
|---------|------------|-----------|
| Ratings | Mood tags | 7-dimensional + fingerprints |
| Tech | Proprietary | Open source |
| Hosting | SaaS only | Self-hosting option |

---

**Ready to experience a better book platform? Start with the demo!**

```bash
cd frontend-next
npm install
npm run dev
# Visit http://localhost:3000/demo
```

📚 Happy reading!
