from sqlalchemy import select

from app.config import settings
from app.models.book import Book
from app.models.genre import Genre
from app.models.multi_dimensional_rating import BookFingerprint, MultiDimensionalRating
from app.models.user import User
from app.models.user_book import ReadingStatus, UserBook
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


async def _get_user_id(db_session, username="alice") -> int:
    result = await db_session.execute(select(User.id).where(User.username == username))
    return result.scalar_one()


async def test_recommendations_requires_auth(client):
    response = await client.get("/api/books/recommendations")
    assert response.status_code == 401


async def test_recommendations_empty_without_highly_rated_finished_books(client, db_session):
    await register(client)
    await login(client)
    user_id = await _get_user_id(db_session)

    book = Book(title="Dune", author="Frank Herbert")
    db_session.add(book)
    await db_session.flush()
    db_session.add(UserBook(user_id=user_id, book_id=book.id, status=ReadingStatus.WANT_TO_READ))
    await db_session.commit()

    response = await client.get("/api/books/recommendations")
    assert response.status_code == 200
    assert response.json() == []


async def test_recommendations_suggests_unread_book_sharing_genre_with_loved_book(
    client, db_session
):
    await register(client)
    await login(client)
    user_id = await _get_user_id(db_session)

    scifi = Genre(name="Sci-Fi")
    db_session.add(scifi)
    await db_session.flush()

    loved = Book(title="Dune", author="Frank Herbert", genres=[scifi])
    candidate = Book(title="Hyperion", author="Dan Simmons", genres=[scifi])
    unrelated = Book(title="Romance Novel", author="Someone Else")
    db_session.add_all([loved, candidate, unrelated])
    await db_session.flush()

    db_session.add(
        UserBook(user_id=user_id, book_id=loved.id, status=ReadingStatus.FINISHED, rating=5)
    )
    await db_session.commit()

    response = await client.get("/api/books/recommendations")
    assert response.status_code == 200
    body = response.json()

    titles = [rec["book"]["title"] for rec in body]
    assert "Hyperion" in titles
    assert "Romance Novel" not in titles  # no genre overlap with the loved book
    assert "Dune" not in titles  # already in the user's library

    hyperion = next(rec for rec in body if rec["book"]["title"] == "Hyperion")
    assert hyperion["reason"] == "Because you enjoyed Dune"


async def test_recommendations_excludes_books_already_in_library(client, db_session):
    await register(client)
    await login(client)
    user_id = await _get_user_id(db_session)

    scifi = Genre(name="Sci-Fi")
    db_session.add(scifi)
    await db_session.flush()

    loved = Book(title="Dune", author="Frank Herbert", genres=[scifi])
    already_owned = Book(title="Hyperion", author="Dan Simmons", genres=[scifi])
    db_session.add_all([loved, already_owned])
    await db_session.flush()

    db_session.add_all(
        [
            UserBook(user_id=user_id, book_id=loved.id, status=ReadingStatus.FINISHED, rating=5),
            UserBook(
                user_id=user_id,
                book_id=already_owned.id,
                status=ReadingStatus.WANT_TO_READ,
            ),
        ]
    )
    await db_session.commit()

    response = await client.get("/api/books/recommendations")
    assert response.status_code == 200
    titles = [rec["book"]["title"] for rec in response.json()]
    assert "Hyperion" not in titles


async def test_recommendations_matches_on_fingerprint_similarity_without_genre_overlap(
    client, db_session
):
    await register(client)
    await login(client)
    user_id = await _get_user_id(db_session)

    loved = Book(title="Dune", author="Frank Herbert")
    candidate = Book(title="Hyperion", author="Dan Simmons")
    unrelated = Book(title="Cozy Slow Read", author="Someone Else")
    db_session.add_all([loved, candidate, unrelated])
    await db_session.flush()

    db_session.add(UserBook(user_id=user_id, book_id=loved.id, status=ReadingStatus.FINISHED))
    db_session.add(
        MultiDimensionalRating(
            user_id=user_id,
            book_id=loved.id,
            pace=5,
            emotional_impact=5,
            complexity=5,
            character_development=5,
            plot_quality=5,
            prose_style=5,
            originality=5,
        )
    )
    # Pretend other users have rated these so each has an aggregate fingerprint,
    # without using update_book_fingerprint() (that's covered by the ratings
    # router tests) — write the aggregate rows directly.
    db_session.add(
        BookFingerprint(
            book_id=candidate.id,
            avg_pace=5,
            avg_emotional_impact=5,
            avg_complexity=5,
            avg_character_development=5,
            avg_plot_quality=5,
            avg_prose_style=5,
            avg_originality=5,
            star_equivalent=5,
            total_ratings=1,
        )
    )
    db_session.add(
        BookFingerprint(
            book_id=unrelated.id,
            avg_pace=1,
            avg_emotional_impact=1,
            avg_complexity=1,
            avg_character_development=1,
            avg_plot_quality=1,
            avg_prose_style=1,
            avg_originality=1,
            star_equivalent=1,
            total_ratings=1,
        )
    )
    await db_session.commit()

    response = await client.get("/api/books/recommendations")
    assert response.status_code == 200
    titles = [rec["book"]["title"] for rec in response.json()]
    assert "Hyperion" in titles
    assert "Cozy Slow Read" not in titles
