from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .config import settings
from .database import engine
from .rate_limit import limiter
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Close shared HTTP client to prevent socket leaks
    from .routers.books import get_http_client
    client = await get_http_client()
    await client.aclose()
    await engine.dispose()


app = FastAPI(title="The Shelf", version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

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
