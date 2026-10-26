# ╔══════════════════════════════════════════════════════════════════════╗
# ║  growifyos_client.py — thin client for the GrowifyOS Live Sync API   ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# Wraps the 4 read-only GrowifyOS endpoints (brands / status / meta-products /
# shopify-variants). Callers never see pagination — the two data endpoints
# are paginated internally and always return the full row set for the
# requested range, or raise GrowifyOSError.

import os
import requests

DEFAULT_TIMEOUT = 30  # seconds
MAX_PAGE_LIMIT = 20000  # server-documented max for `limit`; default is 5000


class GrowifyOSError(Exception):
    """Raised when the GrowifyOS API is unreachable, misconfigured, or returns
    a response we can't use. Never include request headers (the API key) in
    this message — it must be safe to log or return to the client."""


def _base_url() -> str:
    url = os.getenv("GROWIFYOS_BASE_URL")
    if not url:
        raise GrowifyOSError("GROWIFYOS_BASE_URL is not configured on the server.")
    return url.rstrip("/")


def _headers() -> dict:
    key = os.getenv("GROWIFYOS_API_KEY")
    if not key:
        raise GrowifyOSError("GROWIFYOS_API_KEY is not configured on the server.")
    return {"x-api-key": key}


def _get(path: str, params: dict) -> dict:
    try:
        resp = requests.get(
            f"{_base_url()}{path}",
            headers=_headers(),
            params=params,
            timeout=DEFAULT_TIMEOUT,
        )
    except requests.exceptions.Timeout:
        raise GrowifyOSError(f"GrowifyOS API timed out calling {path}.")
    except requests.exceptions.RequestException as e:
        raise GrowifyOSError(f"GrowifyOS API request failed calling {path} ({e.__class__.__name__}).")

    if resp.status_code != 200:
        # 400 responses carry the specific reason in a "message" field —
        # surface it (never request headers/the key) so failures are
        # diagnosable instead of just "HTTP 400".
        reason = None
        try:
            reason = resp.json().get("message")
        except ValueError:
            pass
        detail = f" — {reason}" if reason else ""
        raise GrowifyOSError(f"GrowifyOS API returned HTTP {resp.status_code} for {path}{detail}.")

    try:
        data = resp.json()
    except ValueError:
        raise GrowifyOSError(f"GrowifyOS API returned a non-JSON response for {path}.")

    if not isinstance(data, dict):
        raise GrowifyOSError(f"GrowifyOS API returned an unexpected payload shape for {path}.")

    return data


def _get_paginated(path: str, params: dict) -> list:
    """Fetch every page of a paginated endpoint. If any page fails, the whole
    call fails — never returns rows already fetched from earlier pages, since
    a partial result would silently under-report spend/revenue downstream."""
    rows: list = []
    offset = 0
    while True:
        data = _get(path, {**params, "limit": MAX_PAGE_LIMIT, "offset": offset})
        page_rows = data.get("rows")
        if page_rows is None:
            raise GrowifyOSError(f"GrowifyOS API response for {path} is missing 'rows'.")
        rows.extend(page_rows)
        if not data.get("hasMore"):
            break
        next_offset = data.get("nextOffset")
        if next_offset is None:
            raise GrowifyOSError(f"GrowifyOS API for {path} reported hasMore=true with no nextOffset.")
        offset = next_offset
    return rows


def get_brands() -> list:
    data = _get("/brands", {})
    brands = data.get("brands")
    if brands is None:
        raise GrowifyOSError("GrowifyOS API response for /brands is missing 'brands'.")
    return brands


def get_status(brand_id: str) -> dict:
    return _get("/status", {"brandId": brand_id})


def get_meta_products(brand_id: str, date_from: str, date_to: str) -> list:
    return _get_paginated("/meta-products", {"brandId": brand_id, "from": date_from, "to": date_to})


def get_shopify_variants(brand_id: str, date_from: str, date_to: str) -> list:
    # Do NOT pass groupBy=product — per the API owner, that param rolled data
    # up to product level and blanked variant fields (variantTitle/sku were
    # unusable). Rows come back per-variant; analytics.py already groups by
    # Product ID (the sole join key against Meta) and sums before merging, so
    # variant-level rows collapse to the same product-level totals.
    return _get_paginated(
        "/shopify-variants",
        {"brandId": brand_id, "from": date_from, "to": date_to},
    )
