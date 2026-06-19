from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text

from .config import settings
from .database import engine, Base
from .routers import (
    auth,
    books,
    genres,
    library,
    reviews,
    content_ratings,
    multi_dimensional_ratings,
    goodreads,
    gamification,
)

# Base.metadata.create_all only creates tables that don't exist yet — it never
# adds columns to a table that's already there. There's no migration tool
# wired up in this project, so new columns on existing models need an
# explicit, idempotent ALTER TABLE here or they silently never reach
# already-deployed databases (breaking every query against that table).
_COLUMN_MIGRATIONS = [
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS author_bio TEXT",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS external_rating FLOAT",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS external_rating_count INTEGER",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS buy_link VARCHAR(1000)",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in _COLUMN_MIGRATIONS:
            await conn.execute(text(stmt))
    yield
    # Close shared HTTP client to prevent socket leaks
    from .routers.books import get_http_client
    client = await get_http_client()
    await client.aclose()
    await engine.dispose()


app = FastAPI(title="The Shelf", version="1.0.0", lifespan=lifespan)

# Gzip compress responses > 1KB
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(genres.router)
app.include_router(library.router)
app.include_router(reviews.router)
app.include_router(content_ratings.router)
app.include_router(multi_dimensional_ratings.router)
app.include_router(goodreads.router)
app.include_router(gamification.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
