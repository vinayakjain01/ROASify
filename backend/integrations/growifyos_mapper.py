# ╔══════════════════════════════════════════════════════════════════════╗
# ║  growifyos_mapper.py — raw GrowifyOS JSON → data_cleaner DataFrames   ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# Produces DataFrames with the exact same columns clean_meta()/clean_shopify()
# in data_cleaner.py already produce, so analytics.py needs zero changes to
# consume Live Sync data.

import pandas as pd

META_COLUMNS = [
    "Product ID", "Product Title", "Month",
    "Amount spent (INR)", "Landing page views",
    "CTR (all)", "CPM (cost per 1,000 impressions)",
]

SHOPIFY_COLUMNS = [
    "Product ID", "Product Title", "Month",
    "Product variant title", "Net items sold", "Total sales",
]


def _split_meta_title(meta_product_id) -> str:
    # Meta rows encode title as "<id>, <Title>" — same format the CSV export
    # uses, which data_cleaner.clean_meta() parses with the same convention.
    s = str(meta_product_id or "").strip()
    if ", " in s:
        title = s.split(", ", 1)[1].strip()
        return title or "Unknown Product"
    return s or "Unknown Product"


def map_meta_products(rows: list) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame(columns=META_COLUMNS)

    df = pd.DataFrame(rows)
    out = pd.DataFrame({
        "Product ID": df["productId"].astype(str),
        "Product Title": df["metaProductId"].apply(_split_meta_title),
        # monthLabel is a "YYYY-MM-DD - YYYY-MM-DD" range string — the exact
        # format analytics.parse_month_start()/make_month_label() already parse.
        "Month": df["monthLabel"],
        "Amount spent (INR)": pd.to_numeric(df["amountSpent"], errors="coerce").fillna(0),
        "Landing page views": pd.to_numeric(df["landingPageViews"], errors="coerce").fillna(0),
        "CTR (all)": pd.to_numeric(df["ctr"], errors="coerce").fillna(0),
        "CPM (cost per 1,000 impressions)": pd.to_numeric(df["cpm"], errors="coerce").fillna(0),
    })
    return out[META_COLUMNS].reset_index(drop=True)


def map_shopify_variants(rows: list) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame(columns=SHOPIFY_COLUMNS)

    df = pd.DataFrame(rows)

    # Rows come back per-variant now (no groupBy=product). Custom order lines
    # (alterations, gift wrap, etc.) are non-product charges — customLine is
    # true and productId/variantTitle are null on these. Drop them the same
    # way data_cleaner.clean_shopify() drops a blank Product ID, rather than
    # letting them through as unjoinable "nan" product rows.
    if "customLine" in df.columns:
        is_custom_line = df["customLine"].fillna(False).astype(bool)
    else:
        is_custom_line = pd.Series(False, index=df.index)
    has_product_id = df["productId"].notna() & (df["productId"].astype(str).str.strip() != "")
    df = df[has_product_id & ~is_custom_line]
    if df.empty:
        return pd.DataFrame(columns=SHOPIFY_COLUMNS)

    # variantTitle can legitimately be blank (single-variant products, which
    # Shopify doesn't name) — that's a valid empty value, not an error.
    # Product Variant ID / SKU are intentionally not carried into this
    # DataFrame: Meta's productId only ever matches Shopify's product-level
    # productId (verified against real data — Meta has no per-variant spend
    # for this account), so there's no join or display use for them here.
    variant_title = df["variantTitle"] if "variantTitle" in df.columns else pd.Series([""] * len(df), index=df.index)

    out = pd.DataFrame({
        "Product ID": df["productId"].astype(str),
        "Product Title": df["productTitle"].fillna("Unknown Product"),
        "Month": df["monthLabel"],
        "Product variant title": variant_title.fillna(""),
        # Sales/items are already net of returns (netSales/netItemsSold),
        # matching the "Total sales"/"Net items sold" contract exactly.
        # analytics.py sums these by Product ID before merging with Meta, so
        # multiple variant rows per product collapse to the same
        # product-level totals it already produced under groupBy=product.
        "Net items sold": pd.to_numeric(df["netItemsSold"], errors="coerce").fillna(0),
        "Total sales": pd.to_numeric(df["netSales"], errors="coerce").fillna(0),
    })
    return out[SHOPIFY_COLUMNS].reset_index(drop=True)
