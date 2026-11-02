"""
Tests for the three new Live Sync endpoints in main.py (/api/brands,
/api/live-status, /api/analyse-live). main.py imports the growifyos_client
functions by name, so they're patched as `main.get_brands` etc. here, not on
the integrations module — no network calls happen in this file.
"""
from io import BytesIO
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import main
from integrations.growifyos_client import GrowifyOSError

client = TestClient(main.app)

MONTH = "2026-04-01 - 2026-04-30"


def _meta_row(product_id, title, spend):
    return {
        "productId": product_id, "metaProductId": f"{product_id}, {title}",
        "monthLabel": MONTH, "amountSpent": spend,
        "landingPageViews": 0, "ctr": 0, "cpm": 0,
    }


def _shopify_row(product_id, title, variant_title, net_sales):
    return {
        "productId": product_id, "productVariantId": f"{product_id}-{variant_title}",
        "customLine": False, "productTitle": title, "variantTitle": variant_title,
        "sku": "", "monthLabel": MONTH, "totalSales": net_sales, "itemsSold": 1,
        "itemsReturned": 0, "netItemsSold": 1, "netSales": net_sales,
    }


def _google_row(product_id, title, cost):
    return {
        "productId": product_id, "googleItemId": f"shopify_zz_{product_id}_999",
        "productTitle": title, "monthLabel": MONTH,
        "amountSpent": cost, "impressions": 10, "clicks": 1, "conversions": 0,
    }


@pytest.fixture(autouse=True)
def no_google_by_default():
    """Every /api/analyse-live test gets a default empty Google response so
    none of them depend on real env vars or make a live network call. Tests
    that care about Google override this with their own patch.object call."""
    with patch.object(main, "get_google_products", return_value=[]), \
         patch.object(main, "get_google_totals", return_value={"rows": []}):
        yield


# ── /api/brands ──────────────────────────────────────────────────────────

def test_api_brands_success():
    with patch.object(main, "get_brands", return_value=[{"brandId": "b1", "name": "Brand One"}]):
        resp = client.get("/api/brands")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["brands"] == [{"brandId": "b1", "name": "Brand One"}]


def test_api_brands_failure_returns_friendly_message_not_raw_error():
    with patch.object(main, "get_brands", side_effect=GrowifyOSError("secret internal detail")):
        resp = client.get("/api/brands")
    assert resp.status_code == 502
    assert resp.json()["detail"] == main.LIVE_UNAVAILABLE_MSG
    assert "secret internal detail" not in resp.text


# ── /api/live-status ─────────────────────────────────────────────────────

def test_api_live_status_success():
    with patch.object(main, "get_status", return_value={"brandId": "b1", "meta": {"connected": True}}) as mock_status:
        resp = client.get("/api/live-status", params={"brandId": "b1"})
    assert resp.status_code == 200
    assert resp.json() == {"ok": True, "status": {"brandId": "b1", "meta": {"connected": True}}}
    mock_status.assert_called_once_with("b1")


def test_api_live_status_requires_brand_id():
    resp = client.get("/api/live-status")
    assert resp.status_code == 422  # FastAPI's own required-query-param validation


def test_api_live_status_failure_returns_friendly_message():
    with patch.object(main, "get_status", side_effect=GrowifyOSError("brand not allowed")):
        resp = client.get("/api/live-status", params={"brandId": "nope"})
    assert resp.status_code == 502
    assert resp.json()["detail"] == main.LIVE_UNAVAILABLE_MSG


# ── /api/analyse-live ─────────────────────────────────────────────────────

def test_analyse_live_success_shape_matches_analyse_contract():
    meta_rows = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]

    with patch.object(main, "get_meta_products", return_value=meta_rows), \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows):
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })

    assert resp.status_code == 200
    body = resp.json()
    # Same top-level contract as /api/analyse, plus the additive metaSpendNote/currency.
    assert set(body.keys()) == {
        "ok", "hasMonth", "hasGoogle", "products", "kpis", "quadrants",
        "discountData", "warnings", "summary", "metaSpendNote", "currency",
        "googleTotals", "googleSpendNote",
    }
    assert body["ok"] is True
    assert body["hasGoogle"] is False
    assert body["kpis"]["totalProducts"] == 1
    assert body["kpis"]["totalSpend"] == 1000
    assert body["kpis"]["totalRevenue"] == 5000
    assert "catalog/product ads only" in body["metaSpendNote"]
    assert body["currency"] == "INR"  # default when not specified
    # No google-totals data was returned (default fixture), so these stay null.
    assert body["googleTotals"] is None
    assert body["googleSpendNote"] is None


def test_analyse_live_defaults_to_inr_and_passes_currency_through_to_fetchers():
    meta_rows = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]

    with patch.object(main, "get_meta_products", return_value=meta_rows) as mock_meta, \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows) as mock_shopify, \
         patch.object(main, "get_google_products", return_value=[]) as mock_google:
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30", "currency": "USD",
        })

    assert resp.status_code == 200
    assert resp.json()["currency"] == "USD"
    mock_meta.assert_called_once_with("b1", "2026-04-01", "2026-04-30", "USD")
    mock_shopify.assert_called_once_with("b1", "2026-04-01", "2026-04-30", "USD")
    mock_google.assert_called_once_with("b1", "2026-04-01", "2026-04-30", "USD")


def test_analyse_live_omitted_currency_defaults_to_inr_in_fetcher_calls():
    meta_rows = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]

    with patch.object(main, "get_meta_products", return_value=meta_rows) as mock_meta, \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows) as mock_shopify, \
         patch.object(main, "get_google_products", return_value=[]) as mock_google:
        client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })

    mock_meta.assert_called_once_with("b1", "2026-04-01", "2026-04-30", "INR")
    mock_shopify.assert_called_once_with("b1", "2026-04-01", "2026-04-30", "INR")
    mock_google.assert_called_once_with("b1", "2026-04-01", "2026-04-30", "INR")


def test_analyse_live_fetch_failure_returns_friendly_message():
    with patch.object(main, "get_meta_products", side_effect=GrowifyOSError("403 brand not allowed")):
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })
    assert resp.status_code == 502
    assert resp.json()["detail"] == main.LIVE_UNAVAILABLE_MSG
    assert "brand not allowed" not in resp.text


def test_analyse_live_empty_meta_returns_422():
    with patch.object(main, "get_meta_products", return_value=[]), \
         patch.object(main, "get_shopify_variants", return_value=[_shopify_row("1001", "Dress", "S", 100)]):
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })
    assert resp.status_code == 422
    assert "Meta" in resp.json()["detail"]


def test_analyse_live_empty_shopify_returns_422():
    with patch.object(main, "get_meta_products", return_value=[_meta_row("1001", "Dress", 100)]), \
         patch.object(main, "get_shopify_variants", return_value=[]):
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })
    assert resp.status_code == 422
    assert "Shopify" in resp.json()["detail"]


def test_analyse_live_requires_brand_from_to():
    resp = client.post("/api/analyse-live", data={})
    assert resp.status_code == 422


def test_analyse_live_with_optional_discount_file():
    meta_rows = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]
    discount_csv = b"Product ID\n1001\n"

    with patch.object(main, "get_meta_products", return_value=meta_rows), \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows):
        resp = client.post(
            "/api/analyse-live",
            data={"brandId": "b1", "from": "2026-04-01", "to": "2026-04-30"},
            files={"discount_file": ("discounts.csv", BytesIO(discount_csv), "text/csv")},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["discountData"] is not None
    assert body["discountData"]["summary"][0]["Category"] == "Discounted"


def test_analyse_live_never_touches_the_existing_analyse_endpoint():
    """Sanity check that the two endpoints are genuinely independent handlers."""
    assert main.analyse is not main.analyse_live


# ── /api/analyse-live — Google (best-effort) ───────────────────────────────

def test_analyse_live_includes_google_data_when_available():
    meta_rows    = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]
    google_rows  = [_google_row("1001", "Dress", 200)]

    with patch.object(main, "get_meta_products", return_value=meta_rows), \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows), \
         patch.object(main, "get_google_products", return_value=google_rows):
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["hasGoogle"] is True
    assert body["kpis"]["totalGoogleCost"] == 200
    assert body["kpis"]["totalSpend"] == 1200  # Meta 1000 + Google 200
    assert body["summary"]["google_cost"] == 200
    assert body["products"][0]["Google Cost"] == 200
    assert body["warnings"] == []


def test_analyse_live_google_failure_does_not_block_the_sync():
    """A broken Google fetch must still return a successful Meta+Shopify sync,
    never a 502 — this is the whole point of best-effort."""
    meta_rows    = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]

    with patch.object(main, "get_meta_products", return_value=meta_rows), \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows), \
         patch.object(main, "get_google_products", side_effect=GrowifyOSError("google-products down")):
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["hasGoogle"] is False
    assert body["kpis"]["totalGoogleCost"] == 0
    assert "google-products down" not in resp.text  # internal detail never leaks
    assert any("Google" in w for w in body["warnings"])


def test_analyse_live_google_unexpected_exception_also_does_not_block_the_sync():
    """Broad by design — even a mapper crash on an unexpected response shape
    must not take down an otherwise-working Meta+Shopify sync."""
    meta_rows    = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]

    with patch.object(main, "get_meta_products", return_value=meta_rows), \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows), \
         patch.object(main, "get_google_products", return_value=[{"unexpected": "shape"}]):
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["hasGoogle"] is False
    assert any("Google" in w for w in body["warnings"])


def test_analyse_live_empty_google_rows_is_not_treated_as_available():
    meta_rows    = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]

    with patch.object(main, "get_meta_products", return_value=meta_rows), \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows), \
         patch.object(main, "get_google_products", return_value=[]):
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })

    assert resp.status_code == 200
    assert resp.json()["hasGoogle"] is False


# ── /api/analyse-live — Google account-level totals (best-effort) ─────────

_GOOGLE_TOTALS_PAYLOAD = {"rows": [{
    "amountSpent": 113833.19, "conversionValue": 682136.73,
    "productLevelSpend": 61273.02,
    "byCampaignType": {"PERFORMANCE_MAX": 45639.46, "DEMAND_GEN": 37602.82, "SEARCH": 30590.91},
}]}


def test_analyse_live_includes_google_totals_when_available():
    meta_rows    = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]

    with patch.object(main, "get_meta_products", return_value=meta_rows), \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows), \
         patch.object(main, "get_google_totals", return_value=_GOOGLE_TOTALS_PAYLOAD) as mock_totals:
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-10-01", "to": "2026-10-31",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["googleTotals"]["totalSpend"] == 113833.19
    assert body["googleTotals"]["productLevelSharePct"] == round(61273.02 / 113833.19 * 100, 2)
    assert body["googleSpendNote"] is not None
    assert "account's full Google Ads spend" in body["googleSpendNote"]
    assert body["kpis"]["totalGoogleSpendOverall"] == 113833.19
    assert body["kpis"]["googleProductLevelSharePct"] == round(61273.02 / 113833.19 * 100, 2)
    mock_totals.assert_called_once_with("b1", "2026-10-01", "2026-10-31", "INR")


def test_analyse_live_google_totals_failure_does_not_block_the_sync():
    meta_rows    = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]

    with patch.object(main, "get_meta_products", return_value=meta_rows), \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows), \
         patch.object(main, "get_google_totals", side_effect=GrowifyOSError("google-totals down")):
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["googleTotals"] is None
    assert body["googleSpendNote"] is None
    assert "totalGoogleSpendOverall" not in body["kpis"]
    assert "google-totals down" not in resp.text


def test_analyse_live_google_totals_unexpected_exception_does_not_block_the_sync():
    meta_rows    = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]

    with patch.object(main, "get_meta_products", return_value=meta_rows), \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows), \
         patch.object(main, "get_google_totals", return_value={"rows": "not-a-list"}):
        resp = client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-04-01", "to": "2026-04-30",
        })

    assert resp.status_code == 200
    assert resp.json()["googleTotals"] is None


def test_analyse_live_google_totals_currency_matches_sync_currency():
    meta_rows    = [_meta_row("1001", "Dress", 1000)]
    shopify_rows = [_shopify_row("1001", "Dress", "S", 5000)]

    with patch.object(main, "get_meta_products", return_value=meta_rows), \
         patch.object(main, "get_shopify_variants", return_value=shopify_rows), \
         patch.object(main, "get_google_totals", return_value=_GOOGLE_TOTALS_PAYLOAD) as mock_totals:
        client.post("/api/analyse-live", data={
            "brandId": "b1", "from": "2026-10-01", "to": "2026-10-31", "currency": "USD",
        })

    mock_totals.assert_called_once_with("b1", "2026-10-01", "2026-10-31", "USD")
