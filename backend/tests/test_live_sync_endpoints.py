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
    # Same top-level contract as /api/analyse, plus the additive metaSpendNote.
    assert set(body.keys()) == {
        "ok", "hasMonth", "hasGoogle", "products", "kpis", "quadrants",
        "discountData", "warnings", "summary", "metaSpendNote",
    }
    assert body["ok"] is True
    assert body["hasGoogle"] is False
    assert body["kpis"]["totalProducts"] == 1
    assert body["kpis"]["totalSpend"] == 1000
    assert body["kpis"]["totalRevenue"] == 5000
    assert "catalog/product ads only" in body["metaSpendNote"]


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
