"""
Tests for GET /api/teams and POST /api/auth/choose-team — the first-time,
self-service team picker any logged-in user (not just admins) can use
exactly once. teams_admin.* functions are mocked; covered directly in
test_teams.py.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import main
from auth import get_current_user, CurrentUser

client = TestClient(main.app)

MEMBER_NO_TEAM = CurrentUser(id="u1", email="member@growify.in", role="member", team_id=None)
MEMBER_WITH_TEAM = CurrentUser(id="u2", email="other@growify.in", role="member", team_id="t1")


@pytest.fixture(autouse=True)
def default_user():
    main.app.dependency_overrides[get_current_user] = lambda: MEMBER_NO_TEAM
    yield
    main.app.dependency_overrides.pop(get_current_user, None)


def test_api_teams_requires_login_not_admin():
    main.app.dependency_overrides.pop(get_current_user, None)
    resp = client.get("/api/teams")
    assert resp.status_code == 401


def test_api_teams_returns_list_for_any_logged_in_user():
    with patch.object(main.teams_admin, "list_teams", return_value=[{"id": "t1", "name": "Team 1"}]):
        resp = client.get("/api/teams")
    assert resp.status_code == 200
    assert resp.json()["teams"] == [{"id": "t1", "name": "Team 1"}]


def test_choose_team_requires_team_id():
    resp = client.post("/api/auth/choose-team", json={})
    assert resp.status_code == 422


def test_choose_team_success():
    with patch.object(main.teams_admin, "set_own_team_if_unset", return_value={"id": "u1", "teamId": "t1"}) as mock_set:
        resp = client.post("/api/auth/choose-team", json={"teamId": "t1"})
    assert resp.status_code == 200
    mock_set.assert_called_once_with("u1", "t1")


def test_choose_team_already_set_rejected():
    main.app.dependency_overrides[get_current_user] = lambda: MEMBER_WITH_TEAM
    with patch.object(main.teams_admin, "set_own_team_if_unset", side_effect=ValueError("Your team is already set — ask an admin to change it.")):
        resp = client.post("/api/auth/choose-team", json={"teamId": "t2"})
    assert resp.status_code == 422
    assert "already set" in resp.text.lower()


def test_choose_team_invalid_team_id_rejected():
    with patch.object(main.teams_admin, "set_own_team_if_unset", side_effect=ValueError("That team doesn't exist.")):
        resp = client.post("/api/auth/choose-team", json={"teamId": "not-real"})
    assert resp.status_code == 422
