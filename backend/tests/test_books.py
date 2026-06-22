from sqlalchemy import select

from app.models.user import User
from tests.test_auth import login, register


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
