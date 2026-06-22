# The Shelf

A self-hostable, privacy-first book and reading tracker. Track your books, scan barcodes, import from Goodreads, and rate books across multiple dimensions.

## Features

- **Barcode Scanning** — Scan a book's ISBN barcode with your camera to instantly look it up and add it to your library
- **Book Search** — Search books on your shelf or query OpenLibrary's database of millions of titles
- **Goodreads Import** — Migrate your entire Goodreads library via CSV export
- **Multi-Dimensional Ratings** — Rate books across 7 dimensions (pace, emotional impact, complexity, character development, plot quality, prose style, originality)
- **Reading Tracking** — Track books as want-to-read, currently reading, finished, or DNF
- **Dark Mode** — Full dark mode support with system preference detection
- **PWA** — Installable as a progressive web app with offline support
- **Self-Hosted** — Runs entirely on your infrastructure via Docker

## Quick Start (Docker Compose)

1. Clone the repository:

   ```bash
   git clone https://github.com/TheShield2594/the-shelf.git
   cd the-shelf
   ```

2. Copy the environment file and adjust values:

   ```bash
   cp .env.example .env
   # Edit .env to set your SECRET_KEY and database password
   ```

3. Start the stack:

   ```bash
   docker compose up -d
   ```

4. Open your browser to `http://localhost:3000` and create an account.

### Portainer Deployment

1. Go to **Stacks** → **Add Stack**
2. Paste the contents of `docker-compose.yml`
3. Add environment variables from `.env.example` under the **Env** tab
4. Deploy the stack

## Backups

The `db` service stores all data in the `pgdata` Docker volume. Back it up
regularly, since the volume alone is not portable across hosts and offers no
point-in-time recovery.

```bash
# Create a one-off backup (writes to ./backups/the-shelf-<timestamp>.sql.gz)
./scripts/backup.sh

# Restore from a backup (overwrites all current data)
./scripts/restore.sh backups/the-shelf-20260101T030000Z.sql.gz
```

To back up automatically, add a cron entry on the host running Docker Compose:

```cron
0 3 * * * cd /path/to/the-shelf && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Backups older than `BACKUP_RETENTION_DAYS` (default 14) are pruned
automatically. Copy the `backups/` directory off-host (e.g. to object storage)
for protection against full host loss.

## Development

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)

```bash
cd frontend-next
npm install
npm run dev
```

The frontend proxies `/api/*` requests to the backend at `http://localhost:8000` by default. Set `BACKEND_URL` to change this.

## Architecture

| Component | Technology |
|-----------|-----------|
| Frontend  | Next.js 14, TypeScript, Tailwind CSS |
| Backend   | FastAPI, SQLAlchemy, Pydantic |
| Database  | PostgreSQL 16 |
| Book Data | OpenLibrary API |
| Scanning  | html5-qrcode |
| PWA       | Service Worker, Web Manifest |

## Project Structure

```text
the-shelf/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── main.py    # App entrypoint
│   │   ├── routers/   # API routes (auth, books, library, reviews, goodreads, etc.)
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/  # Business logic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend-next/     # Next.js frontend (active)
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/# React components
│   │   ├── lib/       # API client, utilities
│   │   └── types/     # TypeScript types
│   ├── public/        # PWA assets, icons
│   ├── Dockerfile
│   └── package.json
├── scripts/           # Backup/restore helper scripts
├── docker-compose.yml
├── .env.example
└── README.md
```

> **Note:** The `frontend/` directory contains an older Vite-based frontend and is deprecated. Use `frontend-next/` for all development.

## Documentation

- [CHANGELOG.md](CHANGELOG.md) — notable changes
- [DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md) — Alembic workflow
- [CONTENT_RATINGS.md](CONTENT_RATINGS.md) — community content rating system
- [MULTI_DIMENSIONAL_RATINGS.md](MULTI_DIMENSIONAL_RATINGS.md) — the 7-axis rating system
- [docs/planning/](docs/planning/) — early product/architecture planning docs, kept for historical context; several describe features that were never built or have since changed

## License

MIT
