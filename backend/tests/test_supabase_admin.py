"""
Tests for supabase_admin.py — inviting new users via Supabase Auth's REST
API. All requests.post calls are mocked; no network calls happen here.
"""
from unittest.mock import patch, MagicMock

import pytest
import requests

import supabase_admin as sa


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.invalid")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret-do-not-leak")


def _resp(status_code=200, json_body=None, json_raises=False):
    resp = MagicMock()
    resp.status_code = status_code
    if json_raises:
        resp.json.side_effect = ValueError("not json")
    else:
        resp.json.return_value = json_body if json_body is not None else {}
    return resp


def test_missing_url_raises_before_any_request(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    with patch.object(sa.requests, "post") as mock_post:
        with pytest.raises(sa.SupabaseAdminError, match="SUPABASE_URL"):
            sa.invite_user("a@example.com")
        mock_post.assert_not_called()


def test_missing_secret_key_raises_before_any_request(monkeypatch):
    monkeypatch.delenv("SUPABASE_SECRET_KEY", raising=False)
    with patch.object(sa.requests, "post") as mock_post:
        with pytest.raises(sa.SupabaseAdminError, match="SUPABASE_SECRET_KEY"):
            sa.invite_user("a@example.com")
        mock_post.assert_not_called()


def test_successful_invite_returns_response_body():
    with patch.object(sa.requests, "post", return_value=_resp(200, {"id": "u1", "email": "a@example.com"})):
        result = sa.invite_user("a@example.com")
    assert result == {"id": "u1", "email": "a@example.com"}


def test_invite_sends_correct_url_headers_and_body():
    with patch.object(sa.requests, "post", return_value=_resp(200, {})) as mock_post:
        sa.invite_user("a@example.com")
    args, kwargs = mock_post.call_args
    assert args[0] == "https://example.invalid/auth/v1/invite"
    assert kwargs["headers"]["apikey"] == "test-secret-do-not-leak"
    assert kwargs["headers"]["Authorization"] == "Bearer test-secret-do-not-leak"
    assert kwargs["json"] == {"email": "a@example.com"}
    assert kwargs["timeout"] == sa.DEFAULT_TIMEOUT


def test_already_registered_surfaces_message():
    with patch.object(sa.requests, "post", return_value=_resp(422, {"msg": "User already registered"})):
        with pytest.raises(sa.SupabaseAdminError, match="User already registered"):
            sa.invite_user("a@example.com")


def test_error_without_message_field_still_raises_cleanly():
    with patch.object(sa.requests, "post", return_value=_resp(500, {})):
        with pytest.raises(sa.SupabaseAdminError, match="HTTP 500"):
            sa.invite_user("a@example.com")


def test_timeout_raises_supabase_admin_error():
    with patch.object(sa.requests, "post", side_effect=requests.exceptions.Timeout()):
        with pytest.raises(sa.SupabaseAdminError, match="timed out"):
            sa.invite_user("a@example.com")


def test_connection_error_raises_supabase_admin_error():
    with patch.object(sa.requests, "post", side_effect=requests.exceptions.ConnectionError("boom")):
        with pytest.raises(sa.SupabaseAdminError):
            sa.invite_user("a@example.com")


def test_non_json_success_response_raises_cleanly():
    with patch.object(sa.requests, "post", return_value=_resp(200, json_raises=True)):
        with pytest.raises(sa.SupabaseAdminError, match="non-JSON"):
            sa.invite_user("a@example.com")


def test_non_json_error_response_does_not_crash():
    with patch.object(sa.requests, "post", return_value=_resp(400, json_raises=True)):
        with pytest.raises(sa.SupabaseAdminError, match="HTTP 400"):
            sa.invite_user("a@example.com")


def test_secret_key_never_appears_in_any_raised_error_text():
    with patch.object(sa.requests, "post", return_value=_resp(401, {"msg": "bad key"})):
        with pytest.raises(sa.SupabaseAdminError) as excinfo:
            sa.invite_user("a@example.com")
    assert "test-secret-do-not-leak" not in str(excinfo.value)
