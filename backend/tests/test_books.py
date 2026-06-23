from sqlalchemy import select

from app.config import settings
from app.models.book import Book
from app.models.user import User
from tests.test_auth import login, register

NYT_OVERVIEW_FIXTURE = {
    "results": {
        "lists": [
            {
                "list_name_encoded": "combined-print-and-e-book-fiction",
                "books": [
                    {
                        "rank": 1,
                        "weeks_on_list": 3,
                        "title": "Some Novel",
                        "author": "A Writer",
                        "primary_isbn13": "9780000000001",
                        "book_image": "https://example.com/cover.jpg",
                        "description": "A novel.",
                        "amazon_product_url": "https://amazon.com/some-novel",
                    },
                    {
                        "rank": 2,
                        "weeks_on_list": 1,
                        "title": "Dune",
                        "author": "Frank Herbert",
                        "primary_isbn13": "9780441013593",
                        "book_image": "",
                        "description": None,
                        "amazon_product_url": None,
                    },
                ],
            },
            {
                "list_name_encoded": "combined-print-and-e-book-nonfiction",
                "books": [
                    {
                        "rank": 1,
                        "weeks_on_list": 5,
                        "title": "Some Memoir",
                        "author": "Another Writer",
                        "primary_isbn13": "9780000000002",
                        "book_image": "https://example.com/cover2.jpg",
                    },
                ],
            },
            {
                "list_name_encoded": "young-adult-hardcover",
                "books": [{"rank": 1, "weeks_on_list": 1, "title": "Ignored", "author": "N/A"}],
            },
        ]
    }
}


async def make_admin(db_session, username="alice"):
    result = await db_session.execute(select(User).where(User.username == username))
    user = result.scalar_one()
    user.role = "admin"
    await db_session.commit()


async def test_create_book_requires_admin(client, db_session):
    await register(client)
    await login(client)

    response = await client.post(
        "/api/books",
        json={"title": "Dune", "author": "Frank Herbert"},
    )
    assert response.status_code == 403


async def test_create_book_allowed_for_admin(client, db_session):
    await register(client)
    await login(client)
    await make_admin(db_session)

    response = await client.post(
        "/api/books",
        json={"title": "Dune", "author": "Frank Herbert"},
    )
    assert response.status_code == 201


async def test_delete_book_requires_admin(client, db_session):
    await register(client)
    await login(client)
    await make_admin(db_session)
    create_resp = await client.post(
        "/api/books",
        json={"title": "Dune", "author": "Frank Herbert"},
    )
    book_id = create_resp.json()["id"]

    # demote back to a regular user before attempting delete
    result = await db_session.execute(select(User).where(User.username == "alice"))
    user = result.scalar_one()
    user.role = "user"
    await db_session.commit()

    response = await client.delete(f"/api/books/{book_id}")
    assert response.status_code == 403


async def test_trending_disabled_without_api_key(client, monkeypatch):
    monkeypatch.setattr(settings, "nyt_books_api_key", None)
    response = await client.get("/api/books/trending")
    assert response.status_code == 200
    assert response.json() == {"enabled": False, "lists": []}


async def test_trending_returns_curated_lists_and_matches_local_books(
    client, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "nyt_books_api_key", "test-key")

    async def fake_overview():
        return NYT_OVERVIEW_FIXTURE

    monkeypatch.setattr("app.routers.books._fetch_nyt_overview", fake_overview)

    db_session.add(Book(title="Dune", author="Frank Herbert", isbn="9780441013593"))
    await db_session.commit()

    response = await client.get("/api/books/trending")
    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is True

    list_names = [lst["list_name"] for lst in body["lists"]]
    assert list_names == [
        "combined-print-and-e-book-fiction",
        "combined-print-and-e-book-nonfiction",
    ]

    fiction = body["lists"][0]
    assert fiction["display_name"] == "Fiction"
    assert len(fiction["books"]) == 2
    assert fiction["books"][0]["book_id"] is None
    dune = fiction["books"][1]
    assert dune["title"] == "Dune"
    assert dune["book_id"] is not None
    assert dune["cover_url"] is None  # empty string from NYT normalized to None
