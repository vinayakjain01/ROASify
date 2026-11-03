"""
Tests for auth.py — verifying Supabase-issued session tokens and loading the
caller's role/team from our own `profiles` table. No real network/DB calls:
JWKS verification and the DB connection are both mocked.
"""
from unittest.mock import patch, MagicMock

import pytest
from fastapi import HTTPException

import auth


def _mock_conn(row):
    """Builds a fake `with get_conn() as conn:` context manager whose
    cursor().fetchone() returns `row` (a tuple, or None for 'not found')."""
    cur = MagicMock()
    cur.fetchone.return_value = row
    conn = MagicMock()
    conn.cursor.return_value = cur
    ctx = MagicMock()
    ctx.__enter__.return_value = conn
    ctx.__exit__.return_value = False
    return ctx


# ── get_current_user: header validation ─────────────────────────────────

def test_missing_authorization_header_raises_401():
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(authorization=None)
    assert exc.value.status_code == 401


def test_non_bearer_authorization_header_raises_401():
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(authorization="Basic abc123")
    assert exc.value.status_code == 401


# ── get_current_user: token verification ────────────────────────────────

def test_invalid_token_raises_401_without_leaking_why():
    with patch.object(auth, "_get_jwk_client") as mock_jwk:
        mock_jwk.return_value.get_signing_key_from_jwt.side_effect = Exception("bad signature")
        with pytest.raises(HTTPException) as exc:
            auth.get_current_user(authorization="Bearer not-a-real-token")
    assert exc.value.status_code == 401
    assert "bad signature" not in exc.value.detail


def test_expired_token_raises_401():
    with patch.object(auth, "_get_jwk_client") as mock_jwk, \
         patch.object(auth.jwt, "decode", side_effect=auth.jwt.ExpiredSignatureError()):
        mock_jwk.return_value.get_signing_key_from_jwt.return_value = MagicMock(key="fake-key")
        with pytest.raises(HTTPException) as exc:
            auth.get_current_user(authorization="Bearer expired.token.here")
    assert exc.value.status_code == 401


# ── get_current_user: profile lookup ────────────────────────────────────

def test_valid_token_but_no_profile_row_raises_403():
    with patch.object(auth, "_get_jwk_client") as mock_jwk, \
         patch.object(auth.jwt, "decode", return_value={"sub": "user-123", "exp": 9999999999}), \
         patch.object(auth, "get_conn", return_value=_mock_conn(None)):
        mock_jwk.return_value.get_signing_key_from_jwt.return_value = MagicMock(key="fake-key")
        with pytest.raises(HTTPException) as exc:
            auth.get_current_user(authorization="Bearer valid.token.here")
    assert exc.value.status_code == 403


def test_valid_token_with_profile_returns_current_user():
    row = ("someone@example.com", "member", "team-abc")
    with patch.object(auth, "_get_jwk_client") as mock_jwk, \
         patch.object(auth.jwt, "decode", return_value={"sub": "user-123", "exp": 9999999999}), \
         patch.object(auth, "get_conn", return_value=_mock_conn(row)):
        mock_jwk.return_value.get_signing_key_from_jwt.return_value = MagicMock(key="fake-key")
        user = auth.get_current_user(authorization="Bearer valid.token.here")

    assert user.id == "user-123"
    assert user.email == "someone@example.com"
    assert user.role == "member"
    assert user.team_id == "team-abc"


def test_profile_with_null_team_id_returns_none_not_string_none():
    row = ("someone@example.com", "member", None)
    with patch.object(auth, "_get_jwk_client") as mock_jwk, \
         patch.object(auth.jwt, "decode", return_value={"sub": "user-123", "exp": 9999999999}), \
         patch.object(auth, "get_conn", return_value=_mock_conn(row)):
        mock_jwk.return_value.get_signing_key_from_jwt.return_value = MagicMock(key="fake-key")
        user = auth.get_current_user(authorization="Bearer valid.token.here")

    assert user.team_id is None


def test_jwt_decode_called_with_both_signing_algorithms_and_authenticated_audience():
    row = ("someone@example.com", "admin", "team-abc")
    with patch.object(auth, "_get_jwk_client") as mock_jwk, \
         patch.object(auth.jwt, "decode", return_value={"sub": "user-123", "exp": 9999999999}) as mock_decode, \
         patch.object(auth, "get_conn", return_value=_mock_conn(row)):
        mock_jwk.return_value.get_signing_key_from_jwt.return_value = MagicMock(key="fake-key")
        auth.get_current_user(authorization="Bearer valid.token.here")

    _, kwargs = mock_decode.call_args
    assert set(kwargs["algorithms"]) == {"RS256", "ES256"}
    assert kwargs["audience"] == "authenticated"


# ── require_admin ────────────────────────────────────────────────────────

def test_require_admin_rejects_member_role():
    member = auth.CurrentUser(id="u1", email="m@example.com", role="member", team_id="t1")
    with pytest.raises(HTTPException) as exc:
        auth.require_admin(user=member)
    assert exc.value.status_code == 403


def test_require_admin_allows_admin_role():
    admin = auth.CurrentUser(id="u1", email="a@example.com", role="admin", team_id=None)
    result = auth.require_admin(user=admin)
    assert result is admin
