import pytest
from sqlalchemy import select

from app.models.book import Book
from app.models.user_book import UserBook
from app.models.user import User
from tests.test_auth import login, register

CSV_HEADER = "Title,Author,ISBN,ISBN13,My Rating,Exclusive Shelf,Number of Pages,Original Publication Year\n"


def make_csv(rows: list[str]) -> bytes:
    return (CSV_HEADER + "\n".join(rows)).encode("utf-8")


async def _user_id(db_session, username="alice") -> int:
    result = await db_session.execute(select(User).where(User.username == username))
    return result.scalar_one().id


@pytest.fixture
def stub_enrichment(monkeypatch):
    """Stub out external API calls so import/resolve tests don't hit the network."""

    async def fake_google(isbn=None, title=None, author=None):
        return {}

    async def fake_author_bio(author_url=None):
        return None

    monkeypatch.setattr("app.routers.goodreads._fetch_google_books_enrichment", fake_google)
    monkeypatch.setattr("app.routers.goodreads._fetch_openlibrary_author_bio", fake_author_bio)


async def test_import_row_with_isbn_creates_book_and_library_entry(client, db_session, stub_enrichment):
    await register(client)
    await login(client)

    csv_bytes = make_csv(['"Dune","Frank Herbert","9780441013593","9780441013593","5","read","412","1965"'])
    resp = await client.post(
        "/api/goodreads/import",
        files={"file": ("library.csv", csv_bytes, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["imported"] == 1
    assert body["needs_review"] == 0
    assert body["results"][0]["status"] == "imported"

    book = (await db_session.execute(select(Book).where(Book.isbn == "9780441013593"))).scalar_one()
    assert book.title == "Dune"

    user_id = await _user_id(db_session)
    ub = (await db_session.execute(select(UserBook).where(UserBook.user_id == user_id, UserBook.book_id == book.id))).scalar_one()
    assert ub.status == "finished"
    assert ub.rating == 5


async def test_import_row_without_match_is_flagged_for_review(client, db_session, stub_enrichment, monkeypatch):
    await register(client)
    await login(client)

    async def fake_openlibrary_get(url, params):
        return {"docs": []}

    monkeypatch.setattr("app.routers.goodreads._openlibrary_get", fake_openlibrary_get)

    csv_bytes = make_csv(['"Some Obscure Book","J. Nobody","","","3","currently-reading","",""'])
    resp = await client.post(
        "/api/goodreads/import",
        files={"file": ("library.csv", csv_bytes, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["imported"] == 0
    assert body["needs_review"] == 1
    assert body["total"] == 1

    row = body["results"][0]
    assert row["status"] == "needs_review"
    assert row["pending"]["title"] == "Some Obscure Book"
    assert row["pending"]["author"] == "J. Nobody"
    assert row["pending"]["reading_status"] == "currently_reading"
    assert row["pending"]["rating"] == 3

    # No book or library entry should have been created for the unmatched row
    assert (await db_session.execute(select(Book))).scalars().first() is None


async def test_resolve_creates_book_and_library_entry(client, db_session, stub_enrichment, monkeypatch):
    await register(client)
    await login(client)

    async def fake_openlibrary_get(url, params):
        return {
            "ISBN:9780441013593": {
                "title": "Dune",
                "authors": [{"name": "Frank Herbert"}],
            }
        }

    monkeypatch.setattr("app.routers.goodreads._openlibrary_get", fake_openlibrary_get)

    resp = await client.post(
        "/api/goodreads/resolve",
        json={
            "title": "Some Obscure Book",
            "author": "J. Nobody",
            "isbn": "9780441013593",
            "reading_status": "currently_reading",
            "rating": 3,
        },
    )
    assert resp.status_code == 200
    assert resp.json() == {"title": "Dune", "status": "imported"}

    book = (await db_session.execute(select(Book).where(Book.isbn == "9780441013593"))).scalar_one()
    user_id = await _user_id(db_session)
    ub = (await db_session.execute(select(UserBook).where(UserBook.user_id == user_id, UserBook.book_id == book.id))).scalar_one()
    assert ub.status == "currently_reading"
    assert ub.rating == 3
    assert ub.date_started is not None


async def test_resolve_twice_reports_already_in_library(client, db_session, stub_enrichment, monkeypatch):
    await register(client)
    await login(client)

    async def fake_openlibrary_get(url, params):
        return {"ISBN:9780441013593": {"title": "Dune", "authors": [{"name": "Frank Herbert"}]}}

    monkeypatch.setattr("app.routers.goodreads._openlibrary_get", fake_openlibrary_get)

    payload = {
        "title": "Some Obscure Book",
        "author": "J. Nobody",
        "isbn": "9780441013593",
        "reading_status": "want_to_read",
    }
    first = await client.post("/api/goodreads/resolve", json=payload)
    assert first.status_code == 200
    assert first.json()["status"] == "imported"

    second = await client.post("/api/goodreads/resolve", json=payload)
    assert second.status_code == 200
    assert second.json()["status"] == "already_in_library"

    user_id = await _user_id(db_session)
    count = len((await db_session.execute(select(UserBook).where(UserBook.user_id == user_id))).scalars().all())
    assert count == 1


async def test_resolve_rejects_invalid_isbn(client, db_session):
    await register(client)
    await login(client)

    resp = await client.post(
        "/api/goodreads/resolve",
        json={"title": "X", "author": "Y", "isbn": "not-an-isbn"},
    )
    assert resp.status_code == 400


async def test_resolve_requires_authentication(client):
    resp = await client.post(
        "/api/goodreads/resolve",
        json={"title": "X", "author": "Y", "isbn": "9780441013593"},
    )
    assert resp.status_code == 401
