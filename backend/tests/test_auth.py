from urllib.parse import parse_qs, urlparse


async def register(client, username="alice", email="alice@example.com", password="hunter2pass"):
    return await client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )


async def login(client, username="alice", password="hunter2pass"):
    return await client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )


async def test_register_creates_user(client):
    response = await register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "alice"
    assert body["email"] == "alice@example.com"
    assert "password" not in body
    assert "password_hash" not in body


async def test_register_duplicate_username_rejected(client):
    await register(client)
    response = await register(client, email="other@example.com")
    assert response.status_code == 400


async def test_register_duplicate_email_rejected(client):
    await register(client)
    response = await register(client, username="bob")
    assert response.status_code == 400


async def test_login_with_correct_credentials_sets_cookie(client):
    await register(client)
    response = await login(client)
    assert response.status_code == 200
    assert "access_token" in response.cookies


async def test_login_with_wrong_password_rejected(client):
    await register(client)
    response = await login(client, password="wrong-password")
    assert response.status_code == 401


async def test_login_with_unknown_username_rejected(client):
    response = await login(client, username="ghost")
    assert response.status_code == 401


async def test_me_requires_authentication(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


async def test_me_returns_current_user_when_authenticated(client):
    await register(client)
    await login(client)
    response = await client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["username"] == "alice"


async def test_logout_clears_session(client):
    await register(client)
    await login(client)
    await client.post("/api/auth/logout")
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


async def test_change_password_then_relogin(client):
    await register(client)
    await login(client)

    response = await client.put(
        "/api/auth/password",
        json={"current_password": "hunter2pass", "new_password": "new-pass-123"},
    )
    assert response.status_code == 204

    await client.post("/api/auth/logout")
    response = await login(client, password="hunter2pass")
    assert response.status_code == 401
    response = await login(client, password="new-pass-123")
    assert response.status_code == 200


async def test_change_password_with_wrong_current_password_rejected(client):
    await register(client)
    await login(client)

    response = await client.put(
        "/api/auth/password",
        json={"current_password": "not-it", "new_password": "new-pass-123"},
    )
    assert response.status_code == 401


async def test_change_email_to_taken_address_rejected(client):
    await register(client, username="alice", email="alice@example.com")
    await register(client, username="bob", email="bob@example.com")
    await login(client, username="alice")

    response = await client.put(
        "/api/auth/email",
        json={"new_email": "bob@example.com", "current_password": "hunter2pass"},
    )
    assert response.status_code == 400


async def test_login_rate_limited_after_repeated_attempts(client):
    await register(client)
    for _ in range(10):
        await login(client, password="wrong-password")
    response = await login(client, password="wrong-password")
    assert response.status_code == 429


async def test_forgot_password_then_reset(client, monkeypatch):
    await register(client, username="alice", email="alice@example.com")

    captured = {}

    async def fake_send(to_email, reset_link):
        captured["to_email"] = to_email
        captured["reset_link"] = reset_link

    monkeypatch.setattr("app.routers.auth.send_password_reset_email", fake_send)

    response = await client.post(
        "/api/auth/forgot-password", json={"email": "alice@example.com"}
    )
    assert response.status_code == 202
    assert captured["to_email"] == "alice@example.com"

    token = parse_qs(urlparse(captured["reset_link"]).query)["token"][0]
    response = await client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "brand-new-pass"},
    )
    assert response.status_code == 204

    response = await login(client, username="alice", password="brand-new-pass")
    assert response.status_code == 200


async def test_forgot_password_unknown_email_does_not_leak_existence(client, monkeypatch):
    called = False

    async def fake_send(to_email, reset_link):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routers.auth.send_password_reset_email", fake_send)

    response = await client.post(
        "/api/auth/forgot-password", json={"email": "ghost@example.com"}
    )
    assert response.status_code == 202
    assert called is False


async def test_reset_password_with_garbage_token_rejected(client):
    response = await client.post(
        "/api/auth/reset-password",
        json={"token": "not-a-real-token", "new_password": "whatever123"},
    )
    assert response.status_code == 400


async def test_reset_password_token_cannot_be_reused(client, monkeypatch):
    await register(client, username="alice", email="alice@example.com")

    captured = {}

    async def fake_send(to_email, reset_link):
        captured["reset_link"] = reset_link

    monkeypatch.setattr("app.routers.auth.send_password_reset_email", fake_send)

    await client.post("/api/auth/forgot-password", json={"email": "alice@example.com"})
    token = parse_qs(urlparse(captured["reset_link"]).query)["token"][0]

    response = await client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "first-new-pass"},
    )
    assert response.status_code == 204

    response = await client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "second-new-pass"},
    )
    assert response.status_code == 400
