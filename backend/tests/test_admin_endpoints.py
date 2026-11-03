"""
Tests for /api/admin/* — all require role='admin'. teams_admin.* functions
are mocked here (they're covered directly in test_teams.py); these tests
are about routing, admin-gating, and request/response shape.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import main
from auth import get_current_user, require_admin, CurrentUser
from integrations.growifyos_client import GrowifyOSError

client = TestClient(main.app)

ADMIN  = CurrentUser(id="admin-1", email="admin@example.com", role="admin",  team_id=None)
MEMBER = CurrentUser(id="u1",      email="member@example.com", role="member", team_id="t1")


@pytest.fixture(autouse=True)
def default_to_admin():
    main.app.dependency_overrides[get_current_user] = lambda: ADMIN
    main.app.dependency_overrides[require_admin]    = lambda: ADMIN
    yield
    main.app.dependency_overrides.pop(get_current_user, None)
    main.app.dependency_overrides.pop(require_admin, None)


# ── Admin gating — a non-admin must be rejected by the real require_admin ──

def test_non_admin_rejected_by_real_require_admin_logic():
    # Override only get_current_user (not require_admin) so require_admin's
    # own role check actually runs, proving it's wired to every admin route.
    main.app.dependency_overrides[get_current_user] = lambda: MEMBER
    main.app.dependency_overrides.pop(require_admin, None)
    try:
        resp = client.get("/api/admin/teams")
    finally:
        main.app.dependency_overrides[get_current_user] = lambda: ADMIN
        main.app.dependency_overrides[require_admin]    = lambda: ADMIN
    assert resp.status_code == 403


@pytest.mark.parametrize("method,path", [
    ("get",    "/api/admin/teams"),
    ("post",   "/api/admin/teams"),
    ("get",    "/api/admin/users"),
    ("patch",  "/api/admin/users/u1"),
    ("get",    "/api/admin/brand-names"),
    ("post",   "/api/admin/brand-names"),
    ("delete", "/api/admin/brand-names/id-1"),
    ("get",    "/api/admin/brand-assignments"),
    ("put",    "/api/admin/brand-assignments/rozapret"),
])
def test_every_admin_route_requires_admin(method, path):
    main.app.dependency_overrides[get_current_user] = lambda: MEMBER
    main.app.dependency_overrides.pop(require_admin, None)
    kwargs = {"json": {}} if method in ("post", "patch", "put") else {}
    try:
        resp = getattr(client, method)(path, **kwargs)
    finally:
        main.app.dependency_overrides[get_current_user] = lambda: ADMIN
        main.app.dependency_overrides[require_admin]    = lambda: ADMIN
    assert resp.status_code == 403, f"{method.upper()} {path} did not require admin"


# ── Teams ────────────────────────────────────────────────────────────────

def test_list_teams():
    with patch.object(main.teams_admin, "list_teams", return_value=[{"id": "t1", "name": "Team 1"}]):
        resp = client.get("/api/admin/teams")
    assert resp.status_code == 200
    assert resp.json()["teams"] == [{"id": "t1", "name": "Team 1"}]


def test_create_team():
    with patch.object(main.teams_admin, "create_team", return_value={"id": "t5", "name": "Team 5"}) as mock_create:
        resp = client.post("/api/admin/teams", json={"name": "Team 5"})
    assert resp.status_code == 200
    mock_create.assert_called_once_with("Team 5")


def test_create_team_rejects_blank_name():
    resp = client.post("/api/admin/teams", json={"name": "   "})
    assert resp.status_code == 422


# ── Users ────────────────────────────────────────────────────────────────

def test_list_users():
    with patch.object(main.teams_admin, "list_users", return_value=[{"id": "u1", "email": "a@x.com"}]):
        resp = client.get("/api/admin/users")
    assert resp.status_code == 200
    assert resp.json()["users"] == [{"id": "u1", "email": "a@x.com"}]


def test_update_user_role():
    with patch.object(main.teams_admin, "update_user", return_value={"id": "u1", "role": "admin"}) as mock_update:
        resp = client.patch("/api/admin/users/u1", json={"role": "admin"})
    assert resp.status_code == 200
    mock_update.assert_called_once_with("u1", role="admin", team_id=None, clear_team=False)


def test_update_user_rejects_invalid_role():
    resp = client.patch("/api/admin/users/u1", json={"role": "superadmin"})
    assert resp.status_code == 422


def test_update_user_assigns_team():
    with patch.object(main.teams_admin, "update_user", return_value={"id": "u1", "teamId": "t2"}) as mock_update:
        resp = client.patch("/api/admin/users/u1", json={"teamId": "t2"})
    assert resp.status_code == 200
    mock_update.assert_called_once_with("u1", role=None, team_id="t2", clear_team=False)


def test_update_user_clears_team_with_explicit_null():
    with patch.object(main.teams_admin, "update_user", return_value={"id": "u1", "teamId": None}) as mock_update:
        resp = client.patch("/api/admin/users/u1", json={"teamId": None})
    assert resp.status_code == 200
    mock_update.assert_called_once_with("u1", role=None, team_id=None, clear_team=True)


def test_update_user_not_found_returns_422():
    with patch.object(main.teams_admin, "update_user", side_effect=ValueError("No such user.")):
        resp = client.patch("/api/admin/users/nonexistent", json={"role": "admin"})
    assert resp.status_code == 422


# ── Brand names (pending, by name) ──────────────────────────────────────

def test_list_brand_names():
    with patch.object(main.teams_admin, "list_brand_names", return_value=[]):
        resp = client.get("/api/admin/brand-names")
    assert resp.status_code == 200


def test_create_brand_name_requires_both_fields():
    resp = client.post("/api/admin/brand-names", json={"brandName": "New Brand"})
    assert resp.status_code == 422


def test_create_brand_name_success():
    with patch.object(main.teams_admin, "create_brand_name", return_value={"id": "id-1"}) as mock_create:
        resp = client.post("/api/admin/brand-names", json={"brandName": "New Brand", "teamId": "t1"})
    assert resp.status_code == 200
    mock_create.assert_called_once_with("New Brand", "t1")


def test_delete_brand_name():
    with patch.object(main.teams_admin, "delete_brand_name") as mock_delete:
        resp = client.delete("/api/admin/brand-names/id-1")
    assert resp.status_code == 200
    mock_delete.assert_called_once_with("id-1")


# ── Brand assignments ────────────────────────────────────────────────────

def test_list_brand_assignments_merges_live_list_with_current_assignments():
    live = [
        {"brandId": "ridhi-mehra", "name": "Ridhi Mehra"},
        {"brandId": "new-brand",   "name": "New Brand"},
    ]
    with patch.object(main, "get_brands", return_value=live), \
         patch.object(main.teams_admin, "sync_team_brands_from_live_list") as mock_sync, \
         patch.object(main.teams_admin, "get_team_brand_assignments", return_value={"ridhi-mehra": "t2"}), \
         patch.object(main.teams_admin, "list_teams", return_value=[{"id": "t2", "name": "Team 2"}]):
        resp = client.get("/api/admin/brand-assignments")

    assert resp.status_code == 200
    body = resp.json()["brands"]
    assert body[0] == {"brandId": "ridhi-mehra", "name": "Ridhi Mehra", "teamId": "t2", "teamName": "Team 2"}
    assert body[1] == {"brandId": "new-brand", "name": "New Brand", "teamId": None, "teamName": None}
    mock_sync.assert_called_once_with(live)


def test_list_brand_assignments_growifyos_failure_returns_friendly_message():
    with patch.object(main, "get_brands", side_effect=GrowifyOSError("boom")):
        resp = client.get("/api/admin/brand-assignments")
    assert resp.status_code == 502
    assert "boom" not in resp.text


def test_set_brand_assignment():
    with patch.object(main.teams_admin, "set_brand_team") as mock_set:
        resp = client.put("/api/admin/brand-assignments/rozapret", json={"teamId": "t2"})
    assert resp.status_code == 200
    mock_set.assert_called_once_with("rozapret", "t2")


def test_clear_brand_assignment_with_null_team():
    with patch.object(main.teams_admin, "set_brand_team") as mock_set:
        resp = client.put("/api/admin/brand-assignments/rozapret", json={"teamId": None})
    assert resp.status_code == 200
    mock_set.assert_called_once_with("rozapret", None)
