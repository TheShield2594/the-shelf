from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import engine, Base
from .routers import auth, books, genres, library, reviews, content_ratings, multi_dimensional_ratings


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="The Shelf", version="0.1.0", lifespan=lifespan)

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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
