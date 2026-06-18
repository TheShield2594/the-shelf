"""Goodreads CSV import router."""

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.user import User
from ..models.book import Book
from ..models.user_book import UserBook
from ..auth import get_current_user

router = APIRouter(prefix="/api/goodreads", tags=["goodreads"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

STATUS_MAP = {
    "read": "finished",
    "currently-reading": "currently_reading",
    "to-read": "want_to_read",
}


def clean_isbn(raw: str) -> str | None:
    if not raw:
        return None
    cleaned = raw.strip()
    if cleaned.startswith('="') and cleaned.endswith('"'):
        cleaned = cleaned[2:-1]
    cleaned = cleaned.replace("-", "").replace(" ", "").strip()
    if len(cleaned) == 13 and cleaned.isdigit():
        return cleaned
    if len(cleaned) == 10 and cleaned[:-1].isdigit() and cleaned[-1] in "0123456789X":
        return cleaned
    return None


@router.post("/import")
async def import_goodreads_csv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import books from a Goodreads CSV export."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    skipped = 0
    errors = 0
    results = []

    for row in reader:
        title = row.get("Title", "").strip()
        if not title:
            skipped += 1
            results.append({"title": "(empty)", "status": "skipped"})
            continue

        row_status = None
        try:
            async with db.begin_nested():
                author = row.get("Author", "").strip()
                isbn = clean_isbn(row.get("ISBN", "")) or clean_isbn(
                    row.get("ISBN13", "")
                )
                rating_str = row.get("My Rating", "0").strip()
                rating = (
                    int(rating_str) if rating_str and rating_str != "0" else None
                )
                if rating is not None and not (1 <= rating <= 5):
                    rating = None

                shelf = row.get("Exclusive Shelf", "to-read").strip()
                status = STATUS_MAP.get(shelf, "want_to_read")

                # Check if book exists by ISBN only
                book = None
                if isbn:
                    result = await db.execute(
                        select(Book).where(Book.isbn == isbn)
                    )
                    book = result.scalar_one_or_none()

                if not book:
                    cover_url = (
                        f"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg"
                        if isbn
                        else None
                    )
                    book = Book(
                        title=title,
                        author=author or "Unknown",
                        isbn=isbn,
                        cover_url=cover_url,
                    )
                    db.add(book)
                    await db.flush()

                # Check if already in user's library
                existing = await db.execute(
                    select(UserBook).where(
                        UserBook.user_id == user.id,
                        UserBook.book_id == book.id,
                    )
                )
                if existing.scalar_one_or_none():
                    row_status = "already_in_library"
                else:
                    now = datetime.now(timezone.utc)
                    ub = UserBook(
                        user_id=user.id,
                        book_id=book.id,
                        status=status,
                        rating=rating,
                        date_started=now if status == "currently_reading" else None,
                        date_finished=now if status == "finished" else None,
                    )
                    db.add(ub)
                    await db.flush()
                    row_status = "imported"

            # Savepoint released successfully — update counters
            if row_status == "imported":
                imported += 1
            else:
                skipped += 1
            results.append({"title": title, "status": row_status})
        except Exception as e:
            errors += 1
            results.append(
                {"title": title, "status": "error", "error": str(e)}
            )

    await db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "total": imported + skipped + errors,
        "results": results,
    }
