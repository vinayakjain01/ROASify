"""
Tests for GET /api/auth/me — the thinnest possible check that the route is
wired to get_current_user correctly. Token verification itself is covered
in test_auth.py; here we just override the dependency, as FastAPI intends.
"""
from fastapi.testclient import TestClient

import main
from auth import get_current_user, CurrentUser


def test_me_without_auth_header_is_401():
    client = TestClient(main.app)
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_returns_current_user_shape():
    client = TestClient(main.app)
    main.app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id="u1", email="vinayak@growify.in", role="admin", team_id=None,
    )
    try:
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer whatever"})
    finally:
        main.app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    assert resp.json() == {
        "id": "u1", "email": "vinayak@growify.in", "role": "admin", "teamId": None,
    }
