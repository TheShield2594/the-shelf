from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

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
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
