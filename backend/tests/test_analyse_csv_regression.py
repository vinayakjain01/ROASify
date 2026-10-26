"""
Regression guard for the EXISTING, untouched CSV-upload endpoint
(POST /api/analyse). None of the Live Sync work should ever change this
endpoint's behavior — this test locks in its current contract with
hand-computable numbers so any future accidental change here fails loudly.
"""
from io import BytesIO

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)

META_CSV = (
    b"Product ID,Month,Amount spent (INR),Landing page views,CTR (all),"
    b"CPM (cost per 1,000 impressions)\n"
    b'"1001, Test Product A",March 2026,1000,500,2.5,50\n'
    b'"1002, Test Product B",March 2026,2000,800,3.1,42\n'
)

SHOPIFY_CSV = (
    b"Product Variant ID,Product Title,Month,Product variant title,"
    b"Net items sold,Total sales\n"
    b"1001,Test Product A,March 2026,Default,5,5000\n"
    b"1002,Test Product B,March 2026,Default,8,9600\n"
)


def _upload(meta_csv=META_CSV, shopify_csv=SHOPIFY_CSV, **extra_files):
    files = {
        "meta_file": ("meta.csv", BytesIO(meta_csv), "text/csv"),
        "shopify_file": ("shopify.csv", BytesIO(shopify_csv), "text/csv"),
    }
    files.update(extra_files)
    return client.post("/api/analyse", files=files)


def test_analyse_success_shape_and_kpi_math():
    resp = _upload()
    assert resp.status_code == 200
    body = resp.json()

    assert set(body.keys()) == {
        "ok", "hasMonth", "hasGoogle", "products", "kpis", "quadrants",
        "discountData", "warnings", "summary",
    }
    assert body["ok"] is True
    assert body["hasGoogle"] is False
    assert len(body["products"]) == 2

    kpis = body["kpis"]
    assert kpis["totalProducts"] == 2
    assert kpis["totalMetaSpend"] == 3000
    assert kpis["totalSpend"] == 3000
    assert kpis["totalRevenue"] == 14600
    assert round(kpis["overallRoi"], 4) == round(14600 / 3000, 4)
    assert kpis["totalGoogleCost"] == 0


def test_analyse_rejects_missing_required_files():
    resp = client.post("/api/analyse", files={
        "meta_file": ("meta.csv", BytesIO(META_CSV), "text/csv"),
    })
    assert resp.status_code == 422


def test_analyse_rejects_unparseable_meta_file():
    resp = _upload(meta_csv=b"not,a,valid,meta,export\n1,2,3,4,5\n")
    assert resp.status_code == 422


def test_analyse_health_check_still_works():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_analyse_and_analyse_live_are_independent_routes():
    routes = {r.path for r in main.app.routes}
    assert "/api/analyse" in routes
    assert "/api/analyse-live" in routes
