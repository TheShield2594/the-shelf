# The Shelf - A Modern Book Tracking App

A Goodreads alternative POC for tracking books, writing reviews, and rating content.

## Features

- **Book Management** — Add books with title, author, ISBN, description, cover image, publication date, and multiple genres
- **User Library** — Track reading status: Want to Read, Currently Reading, Finished, DNF
- **5-Star Rating System** — Rate books and see community averages
- **Reviews** — Write, edit, and delete reviews for books
- **Content Ratings** — Community-driven content ratings for violence, language, sexual content, and substance use (0-4 scale)
- **Content Filters** — Filter book searches by maximum content levels
- **Related Books** — Manual book relationship linking
- **Open Library Import** — Import books by ISBN or title search
- **User Profiles** — Reading stats dashboard

## Tech Stack

- **Backend:** Python FastAPI + SQLAlchemy (async) + PostgreSQL
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
- **Deployment:** Vercel (serverless Python + static frontend)

## Deploy to Vercel

### Prerequisites

- A [Vercel](https://vercel.com) account
- A managed PostgreSQL database (e.g., [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres))

### Steps

1. Push this repo to GitHub
2. Import the project in the [Vercel Dashboard](https://vercel.com/new)
3. Set the following environment variables in Vercel project settings:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql+asyncpg://<user>:<pass>@<host>/<db>` |
| `SECRET_KEY` | A random secret string for JWT signing |
| `CORS_ORIGINS` | Your Vercel deployment URL (e.g., `https://the-shelf.vercel.app`) |

4. Deploy — Vercel will automatically build the frontend and set up the API serverless function.

### Seeding the database

After deploying, you can seed the database by running the seed script locally against your managed database:

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://<user>:<pass>@<host>/<db>" python -m app.seed
```

## Local Development

### With Docker Compose

```bash
git clone <repo-url> && cd the-shelf
cp .env.example .env
docker compose up --build

# Seed the database (in a separate terminal)
docker compose exec backend python -m app.seed
```

### Without Docker

```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install && npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

**Demo account:** `demo` / `demo1234`

## Project Structure

```
the-shelf/
├── vercel.json                    # Vercel deployment config
├── pyproject.toml                 # Python deps + version for Vercel runtime
├── api/
│   └── index.py                   # Serverless entry point
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI app + lifespan
│       ├── config.py            # Settings from env vars
│       ├── database.py          # Async SQLAlchemy engine
│       ├── auth.py              # JWT auth + password hashing
│       ├── seed.py              # Sample data seeder
│       ├── models/              # SQLAlchemy models
│       │   ├── user.py
│       │   ├── book.py          # Book + book_genres M2M
│       │   ├── genre.py
│       │   ├── user_book.py     # Library entries with status
│       │   ├── review.py
│       │   ├── related_book.py
│       │   └── content_rating.py
│       ├── schemas/             # Pydantic request/response models
│       │   ├── user.py
│       │   ├── book.py
│       │   ├── library.py
│       │   ├── review.py
│       │   └── content_rating.py
│       └── routers/             # API endpoint handlers
│           ├── auth.py          # Register, login, profile
│           ├── books.py         # CRUD, search, import, related
│           ├── genres.py        # Genre management
│           ├── library.py       # User library operations
│           ├── reviews.py       # Review CRUD
│           └── content_ratings.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.tsx              # Router + auth provider
        ├── types/index.ts       # TypeScript interfaces
        ├── services/api.ts      # API client
        ├── context/AuthContext.tsx
        ├── components/
        │   ├── Navbar.tsx
        │   ├── BookCard.tsx
        │   ├── StarRating.tsx
        │   ├── ContentRatingDisplay.tsx
        │   └── ContentRatingForm.tsx
        └── pages/
            ├── HomePage.tsx     # Browse + search + filters
            ├── BookDetailPage.tsx
            ├── LibraryPage.tsx  # My Books with status tabs
            ├── ProfilePage.tsx  # Reading stats
            └── LoginPage.tsx    # Login + register
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/auth/profile` | User reading stats |
| GET | `/api/books` | List/search books (supports `q`, `genre`, content filters) |
| GET | `/api/books/{id}` | Book detail with reviews + related |
| POST | `/api/books` | Create book |
| PUT | `/api/books/{id}` | Update book |
| DELETE | `/api/books/{id}` | Delete book |
| POST | `/api/books/import` | Import from Open Library |
| POST | `/api/books/{id}/related/{rid}` | Link related books |
| GET | `/api/genres` | List genres |
| POST | `/api/genres` | Create genre |
| GET | `/api/library` | User's library (optional `status` filter) |
| POST | `/api/library` | Add book to library |
| PUT | `/api/library/{book_id}` | Update status/rating |
| DELETE | `/api/library/{book_id}` | Remove from library |
| POST | `/api/reviews` | Create review |
| PUT | `/api/reviews/{id}` | Edit review |
| DELETE | `/api/reviews/{id}` | Delete review |
| GET | `/api/content-ratings/book/{id}` | Book content ratings |
| POST | `/api/content-ratings` | Submit content rating |
| PUT | `/api/content-ratings/{id}` | Update content rating |

## Content Rating Scale

| Level | Label | Description |
|-------|-------|-------------|
| 0 | None | No content of this type |
| 1 | Mild | Brief or infrequent |
| 2 | Moderate | Present but not pervasive |
| 3 | Strong | Frequent or intense |
| 4 | Graphic | Explicit and detailed |

## Environment Variables

See `.env.example` for all configurable values. Key settings:

- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key (change in production)
- `CORS_ORIGINS` — Allowed frontend origins
- `VITE_API_URL` — Backend URL for frontend

## Seed Data

The seeder (`python -m app.seed`) creates:
- 15 genres
- 25 books across various genres
- 12 related book pairs
- 1 demo user with library entries, reviews, and content ratings
