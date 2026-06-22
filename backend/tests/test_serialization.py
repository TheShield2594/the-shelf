from sqlalchemy import select

from app.models.user import User
from tests.test_auth import login, register
from tests.test_books import make_admin


async def create_book(client, db_session):
    await make_admin(db_session)
    resp = await client.post("/api/books", json={"title": "Dune", "author": "Frank Herbert"})
    assert resp.status_code == 201
    return resp.json()["id"]


async def test_library_add_and_list_includes_book_summary(client, db_session):
    await register(client)
    await login(client)
    book_id = await create_book(client, db_session)

    result = await db_session.execute(select(User).where(User.username == "alice"))
    user = result.scalar_one()
    user.role = "user"
    await db_session.commit()

    resp = await client.post("/api/library", json={"book_id": book_id, "status": "want_to_read"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["book"]["id"] == book_id
    assert body["book"]["title"] == "Dune"

    resp = await client.get("/api/library")
    assert resp.status_code == 200
    assert resp.json()[0]["book"]["title"] == "Dune"


async def test_review_create_and_list_includes_username(client, db_session):
    await register(client)
    await login(client)
    book_id = await create_book(client, db_session)

    resp = await client.post("/api/reviews", json={"book_id": book_id, "review_text": "Great book"})
    assert resp.status_code == 201
    assert resp.json()["username"] == "alice"

    resp = await client.get(f"/api/reviews/book/{book_id}")
    assert resp.status_code == 200
    assert resp.json()[0]["username"] == "alice"


async def test_book_detail_includes_reviews_and_genres(client, db_session):
    await register(client)
    await login(client)
    book_id = await create_book(client, db_session)
    await client.post("/api/reviews", json={"book_id": book_id, "review_text": "Great book"})

    resp = await client.get(f"/api/books/{book_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["reviews"][0]["username"] == "alice"
    assert body["genres"] == []


async def test_content_rating_create_and_list_includes_username(client, db_session):
    await register(client)
    await login(client)
    book_id = await create_book(client, db_session)

    await client.post("/api/library", json={"book_id": book_id, "status": "finished"})

    resp = await client.post(
        "/api/content-ratings",
        json={"book_id": book_id, "violence_level": 2, "other_tags": ["mild"]},
    )
    assert resp.status_code == 201
    assert resp.json()["username"] == "alice"
    assert resp.json()["other_tags"] == ["mild"]

    resp = await client.get(f"/api/content-ratings/book/{book_id}")
    assert resp.status_code == 200
    assert resp.json()[0]["username"] == "alice"
