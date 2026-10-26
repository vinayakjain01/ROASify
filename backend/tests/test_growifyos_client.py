"""
Tests for integrations/growifyos_client.py — the thin wrapper around the
GrowifyOS Live Sync API. Everything here mocks requests.get; no network calls.
"""
import os
from unittest.mock import patch, MagicMock

import pytest
import requests

from integrations import growifyos_client as gc


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("GROWIFYOS_API_KEY", "test-key-do-not-leak")
    monkeypatch.setenv("GROWIFYOS_BASE_URL", "https://example.invalid/api/v1/roasify")


def _resp(status_code=200, json_body=None, json_raises=False):
    resp = MagicMock()
    resp.status_code = status_code
    if json_raises:
        resp.json.side_effect = ValueError("not json")
    else:
        resp.json.return_value = json_body if json_body is not None else {}
    return resp


# ── Config / env guards ─────────────────────────────────────────────────

def test_missing_api_key_raises_before_any_request(monkeypatch):
    monkeypatch.delenv("GROWIFYOS_API_KEY", raising=False)
    with patch.object(gc.requests, "get") as mock_get:
        with pytest.raises(gc.GrowifyOSError, match="GROWIFYOS_API_KEY"):
            gc.get_brands()
        mock_get.assert_not_called()


def test_missing_base_url_raises_before_any_request(monkeypatch):
    monkeypatch.delenv("GROWIFYOS_BASE_URL", raising=False)
    with patch.object(gc.requests, "get") as mock_get:
        with pytest.raises(gc.GrowifyOSError, match="GROWIFYOS_BASE_URL"):
            gc.get_brands()
        mock_get.assert_not_called()


# ── /brands, /status ─────────────────────────────────────────────────────

def test_get_brands_success():
    with patch.object(gc.requests, "get", return_value=_resp(json_body={"brands": [{"brandId": "b1"}]})):
        assert gc.get_brands() == [{"brandId": "b1"}]


def test_get_brands_missing_brands_key_errors():
    with patch.object(gc.requests, "get", return_value=_resp(json_body={"scope": "all"})):
        with pytest.raises(gc.GrowifyOSError, match="missing 'brands'"):
            gc.get_brands()


def test_get_status_passes_brand_id_and_returns_raw_dict():
    status_payload = {"brandId": "ridhi-mehra", "meta": {"connected": True}}
    with patch.object(gc.requests, "get", return_value=_resp(json_body=status_payload)) as mock_get:
        result = gc.get_status("ridhi-mehra")
    assert result == status_payload
    assert mock_get.call_args.kwargs["params"] == {"brandId": "ridhi-mehra"}


# ── Error surfacing ────────────────────────────────────────────────────

def test_timeout_raises_growifyos_error():
    with patch.object(gc.requests, "get", side_effect=requests.exceptions.Timeout()):
        with pytest.raises(gc.GrowifyOSError, match="timed out"):
            gc.get_brands()


def test_connection_error_raises_growifyos_error():
    with patch.object(gc.requests, "get", side_effect=requests.exceptions.ConnectionError("boom")):
        with pytest.raises(gc.GrowifyOSError):
            gc.get_brands()


def test_non_200_surfaces_message_field_from_body():
    with patch.object(gc.requests, "get", return_value=_resp(status_code=400, json_body={"message": "missing or invalid parameter: to"})):
        with pytest.raises(gc.GrowifyOSError, match="missing or invalid parameter: to"):
            gc.get_brands()


def test_non_200_without_message_field_still_raises_cleanly():
    with patch.object(gc.requests, "get", return_value=_resp(status_code=403, json_body={})):
        with pytest.raises(gc.GrowifyOSError, match="HTTP 403"):
            gc.get_brands()


def test_non_200_with_non_json_body_does_not_crash():
    with patch.object(gc.requests, "get", return_value=_resp(status_code=500, json_raises=True)):
        with pytest.raises(gc.GrowifyOSError, match="HTTP 500"):
            gc.get_brands()


def test_non_json_200_response_raises_growifyos_error():
    with patch.object(gc.requests, "get", return_value=_resp(status_code=200, json_raises=True)):
        with pytest.raises(gc.GrowifyOSError, match="non-JSON"):
            gc.get_brands()


def test_unexpected_payload_shape_raises():
    with patch.object(gc.requests, "get", return_value=_resp(json_body=["not", "a", "dict"])):
        with pytest.raises(gc.GrowifyOSError, match="unexpected payload shape"):
            gc.get_brands()


@pytest.mark.parametrize("scenario", ["timeout", "http_error", "bad_json"])
def test_api_key_never_appears_in_any_raised_error_text(scenario):
    """The key must never leak into an exception that could end up logged or
    (via some future refactor) returned to a client."""
    if scenario == "timeout":
        side_effect = requests.exceptions.Timeout()
        kwargs = {"side_effect": side_effect}
    elif scenario == "http_error":
        kwargs = {"return_value": _resp(status_code=401, json_body={"message": "missing or wrong key"})}
    else:
        kwargs = {"return_value": _resp(json_raises=True)}

    with patch.object(gc.requests, "get", **kwargs):
        with pytest.raises(gc.GrowifyOSError) as excinfo:
            gc.get_brands()
    assert "test-key-do-not-leak" not in str(excinfo.value)


# ── Pagination ───────────────────────────────────────────────────────────

def test_pagination_single_page_returns_all_rows():
    page = {"rows": [{"id": 1}, {"id": 2}], "hasMore": False, "nextOffset": None}
    with patch.object(gc.requests, "get", return_value=_resp(json_body=page)) as mock_get:
        rows = gc.get_meta_products("brand-1", "2026-04-01", "2026-09-24")
    assert rows == [{"id": 1}, {"id": 2}]
    assert mock_get.call_count == 1
    assert mock_get.call_args.kwargs["params"]["offset"] == 0
    assert mock_get.call_args.kwargs["params"]["limit"] == gc.MAX_PAGE_LIMIT


def test_pagination_multi_page_concatenates_in_order():
    page1 = {"rows": [{"id": 1}, {"id": 2}], "hasMore": True, "nextOffset": 2}
    page2 = {"rows": [{"id": 3}], "hasMore": False, "nextOffset": None}
    with patch.object(gc.requests, "get", side_effect=[_resp(json_body=page1), _resp(json_body=page2)]) as mock_get:
        rows = gc.get_meta_products("brand-1", "2026-04-01", "2026-09-24")
    assert rows == [{"id": 1}, {"id": 2}, {"id": 3}]
    assert mock_get.call_count == 2
    offsets = [c.kwargs["params"]["offset"] for c in mock_get.call_args_list]
    assert offsets == [0, 2]


def test_pagination_failure_on_second_page_discards_first_page_rows():
    """A page-2 failure must raise, not silently return page 1's rows —
    a partial result would under-report spend/revenue downstream."""
    page1 = {"rows": [{"id": 1}], "hasMore": True, "nextOffset": 1}
    with patch.object(
        gc.requests, "get",
        side_effect=[_resp(json_body=page1), requests.exceptions.Timeout()],
    ):
        with pytest.raises(gc.GrowifyOSError):
            gc.get_meta_products("brand-1", "2026-04-01", "2026-09-24")


def test_pagination_hasmore_true_without_next_offset_raises():
    page = {"rows": [{"id": 1}], "hasMore": True, "nextOffset": None}
    with patch.object(gc.requests, "get", return_value=_resp(json_body=page)):
        with pytest.raises(gc.GrowifyOSError, match="nextOffset"):
            gc.get_meta_products("brand-1", "2026-04-01", "2026-09-24")


def test_pagination_missing_rows_key_raises():
    with patch.object(gc.requests, "get", return_value=_resp(json_body={"hasMore": False})):
        with pytest.raises(gc.GrowifyOSError, match="missing 'rows'"):
            gc.get_meta_products("brand-1", "2026-04-01", "2026-09-24")


# ── Request shape — the specific, previously-contested parameters ───────

def test_shopify_variants_never_sends_groupby_param():
    """groupBy=product was explicitly reversed — it must never be sent again."""
    page = {"rows": [], "hasMore": False, "nextOffset": None}
    with patch.object(gc.requests, "get", return_value=_resp(json_body=page)) as mock_get:
        gc.get_shopify_variants("brand-1", "2026-04-01", "2026-09-24")
    params = mock_get.call_args.kwargs["params"]
    assert "groupBy" not in params


def test_shopify_variants_sends_brand_and_date_range():
    page = {"rows": [], "hasMore": False, "nextOffset": None}
    with patch.object(gc.requests, "get", return_value=_resp(json_body=page)) as mock_get:
        gc.get_shopify_variants("brand-1", "2026-04-01", "2026-09-24")
    params = mock_get.call_args.kwargs["params"]
    assert params["brandId"] == "brand-1"
    assert params["from"] == "2026-04-01"
    assert params["to"] == "2026-09-24"


def test_meta_products_request_includes_url_and_headers():
    page = {"rows": [], "hasMore": False, "nextOffset": None}
    with patch.object(gc.requests, "get", return_value=_resp(json_body=page)) as mock_get:
        gc.get_meta_products("brand-1", "2026-04-01", "2026-09-24")
    args, kwargs = mock_get.call_args
    assert args[0] == "https://example.invalid/api/v1/roasify/meta-products"
    assert kwargs["headers"] == {"x-api-key": "test-key-do-not-leak"}
    assert kwargs["timeout"] == gc.DEFAULT_TIMEOUT
