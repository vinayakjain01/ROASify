"""
Tests for teams.py — the admin data layer (teams/users/brand-names/brand-
assignments) and the name-based auto-resolution sync. No real DB: get_conn
is mocked throughout, matching the pattern in test_auth.py.
"""
from unittest.mock import patch, MagicMock

import pytest

import teams as teams_admin


def _mock_conn(cur: MagicMock):
    conn = MagicMock()
    conn.cursor.return_value = cur
    ctx = MagicMock()
    ctx.__enter__.return_value = conn
    ctx.__exit__.return_value = False
    return ctx


# ── sync_team_brands_from_live_list ─────────────────────────────────────

def test_sync_matches_live_brand_to_team_by_name_case_insensitive():
    cur = MagicMock()
    cur.fetchall.return_value = [("ridhi mehra", "team-abc")]
    live_brands = [{"brandId": "ridhi-mehra", "name": "Ridhi Mehra"}]

    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        teams_admin.sync_team_brands_from_live_list(live_brands)

    insert_calls = [c for c in cur.execute.call_args_list if "insert into team_brands" in c.args[0]]
    assert len(insert_calls) == 1
    assert insert_calls[0].args[1] == ("team-abc", "ridhi-mehra")


def test_sync_skips_live_brand_with_no_matching_name():
    cur = MagicMock()
    cur.fetchall.return_value = [("ridhi mehra", "team-abc")]
    live_brands = [{"brandId": "some-other-brand", "name": "Some Other Brand"}]

    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        teams_admin.sync_team_brands_from_live_list(live_brands)

    insert_calls = [c for c in cur.execute.call_args_list if "insert into team_brands" in c.args[0]]
    assert insert_calls == []


def test_sync_short_circuits_when_no_pending_names_at_all():
    cur = MagicMock()
    cur.fetchall.return_value = []
    live_brands = [{"brandId": "ridhi-mehra", "name": "Ridhi Mehra"}]

    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        teams_admin.sync_team_brands_from_live_list(live_brands)

    # Only the one lookup query — never iterates live_brands to insert.
    assert cur.execute.call_count == 1


def test_sync_handles_brand_with_missing_name_field_gracefully():
    cur = MagicMock()
    cur.fetchall.return_value = [("ridhi mehra", "team-abc")]
    live_brands = [{"brandId": "weird-brand"}]  # no "name" key at all

    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        teams_admin.sync_team_brands_from_live_list(live_brands)  # must not raise

    insert_calls = [c for c in cur.execute.call_args_list if "insert into team_brands" in c.args[0]]
    assert insert_calls == []


# ── Teams ────────────────────────────────────────────────────────────────

def test_list_teams_returns_id_and_name():
    cur = MagicMock()
    cur.fetchall.return_value = [("id-1", "Team 1"), ("id-2", "Team 2")]
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        result = teams_admin.list_teams()
    assert result == [{"id": "id-1", "name": "Team 1"}, {"id": "id-2", "name": "Team 2"}]


def test_create_team_returns_new_id_and_name():
    cur = MagicMock()
    cur.fetchone.return_value = ("new-id", "Team 5")
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        result = teams_admin.create_team("Team 5")
    assert result == {"id": "new-id", "name": "Team 5"}


# ── Users ────────────────────────────────────────────────────────────────

def test_list_users_includes_team_name_via_join():
    cur = MagicMock()
    cur.fetchall.return_value = [("u1", "a@example.com", "member", "t1", "Team 1")]
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        result = teams_admin.list_users()
    assert result == [{"id": "u1", "email": "a@example.com", "role": "member", "teamId": "t1", "teamName": "Team 1"}]


def test_list_users_handles_no_team_assigned():
    cur = MagicMock()
    cur.fetchall.return_value = [("u1", "a@example.com", "member", None, None)]
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        result = teams_admin.list_users()
    assert result[0]["teamId"] is None


def test_update_user_role_only():
    cur = MagicMock()
    cur.fetchone.return_value = ("u1", "a@example.com", "admin", "t1")
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        result = teams_admin.update_user("u1", role="admin", team_id=None, clear_team=False)
    assert result["role"] == "admin"
    sql = cur.execute.call_args.args[0]
    set_clause = sql.split(" where ")[0]
    assert "role = %s" in set_clause and "team_id" not in set_clause


def test_update_user_team_only():
    cur = MagicMock()
    cur.fetchone.return_value = ("u1", "a@example.com", "member", "t2")
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        result = teams_admin.update_user("u1", role=None, team_id="t2", clear_team=False)
    assert result["teamId"] == "t2"


def test_update_user_clear_team_sets_null():
    cur = MagicMock()
    cur.fetchone.return_value = ("u1", "a@example.com", "member", None)
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        result = teams_admin.update_user("u1", role=None, team_id=None, clear_team=True)
    assert result["teamId"] is None
    sql = cur.execute.call_args.args[0]
    assert "team_id = NULL" in sql


def test_update_user_raises_when_nothing_to_update():
    with pytest.raises(ValueError):
        teams_admin.update_user("u1", role=None, team_id=None, clear_team=False)


def test_update_user_raises_when_user_not_found():
    cur = MagicMock()
    cur.fetchone.return_value = None
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        with pytest.raises(ValueError):
            teams_admin.update_user("nonexistent", role="admin", team_id=None, clear_team=False)


# ── Brand names (pending, by name) ──────────────────────────────────────

def test_list_brand_names():
    cur = MagicMock()
    cur.fetchall.return_value = [("id-1", "Angad Singh Official", "t4", "Team 4")]
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        result = teams_admin.list_brand_names()
    assert result == [{"id": "id-1", "brandName": "Angad Singh Official", "teamId": "t4", "teamName": "Team 4"}]


def test_create_brand_name_returns_entry():
    cur = MagicMock()
    cur.fetchone.return_value = ("id-9", "New Brand", "t1")
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        result = teams_admin.create_brand_name("New Brand", "t1")
    assert result == {"id": "id-9", "brandName": "New Brand", "teamId": "t1"}


def test_delete_brand_name_executes_delete():
    cur = MagicMock()
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        teams_admin.delete_brand_name("id-9")
    sql = cur.execute.call_args.args[0]
    assert "delete from team_brand_names" in sql


# ── Brand assignments (direct, by brandId) ──────────────────────────────

def test_get_team_brand_assignments_returns_brandid_to_team_map():
    cur = MagicMock()
    cur.fetchall.return_value = [("ridhi-mehra", "t2"), ("safaa-world", "t1")]
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        result = teams_admin.get_team_brand_assignments()
    assert result == {"ridhi-mehra": "t2", "safaa-world": "t1"}


def test_set_brand_team_deletes_then_inserts():
    cur = MagicMock()
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        teams_admin.set_brand_team("rozapret", "t2")
    sqls = [c.args[0] for c in cur.execute.call_args_list]
    assert any("delete from team_brands" in s for s in sqls)
    assert any("insert into team_brands" in s for s in sqls)


def test_set_brand_team_none_only_deletes():
    cur = MagicMock()
    with patch.object(teams_admin, "get_conn", return_value=_mock_conn(cur)):
        teams_admin.set_brand_team("rozapret", None)
    sqls = [c.args[0] for c in cur.execute.call_args_list]
    assert any("delete from team_brands" in s for s in sqls)
    assert not any("insert into team_brands" in s for s in sqls)
