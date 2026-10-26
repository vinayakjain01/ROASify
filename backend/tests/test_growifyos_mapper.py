"""
Tests for integrations/growifyos_mapper.py — raw GrowifyOS JSON rows →
DataFrames matching data_cleaner.clean_meta()/clean_shopify()'s exact column
contract. These are pure-function tests, no network/mocking needed.
"""
from integrations.growifyos_mapper import (
    META_COLUMNS,
    SHOPIFY_COLUMNS,
    map_meta_products,
    map_shopify_variants,
)


# ── map_meta_products ────────────────────────────────────────────────────

def test_empty_rows_returns_empty_dataframe_with_correct_columns():
    df = map_meta_products([])
    assert list(df.columns) == META_COLUMNS
    assert len(df) == 0


def test_maps_fields_and_splits_title_from_meta_product_id():
    rows = [{
        "productId": "1316404150521348",
        "metaProductId": "1316404150521348, Spotted In Ridhi Mehra",
        "monthLabel": "2026-04-01 - 2026-04-30",
        "amountSpent": 4.3,
        "landingPageViews": 0,
        "ctr": 2.38,
        "cpm": 102.38,
    }]
    df = map_meta_products(rows)
    assert list(df.columns) == META_COLUMNS
    assert len(df) == 1
    row = df.iloc[0]
    assert row["Product ID"] == "1316404150521348"
    assert row["Product Title"] == "Spotted In Ridhi Mehra"
    assert row["Month"] == "2026-04-01 - 2026-04-30"
    assert row["Amount spent (INR)"] == 4.3
    assert row["CTR (all)"] == 2.38
    assert row["CPM (cost per 1,000 impressions)"] == 102.38


def test_meta_product_id_without_comma_falls_back_to_raw_string():
    rows = [{
        "productId": "99", "metaProductId": "no-comma-here",
        "monthLabel": "2026-04-01 - 2026-04-30",
        "amountSpent": 1, "landingPageViews": 0, "ctr": 0, "cpm": 0,
    }]
    df = map_meta_products(rows)
    assert df.iloc[0]["Product Title"] == "no-comma-here"


def test_missing_numeric_fields_coerce_to_zero_not_error():
    rows = [{
        "productId": "99", "metaProductId": "99, Thing",
        "monthLabel": "2026-04-01 - 2026-04-30",
        "amountSpent": None, "landingPageViews": None, "ctr": None, "cpm": None,
    }]
    df = map_meta_products(rows)
    row = df.iloc[0]
    assert row["Amount spent (INR)"] == 0
    assert row["Landing page views"] == 0
    assert row["CTR (all)"] == 0
    assert row["CPM (cost per 1,000 impressions)"] == 0


# ── map_shopify_variants ──────────────────────────────────────────────────

def test_empty_rows_returns_empty_dataframe_with_correct_columns():
    df = map_shopify_variants([])
    assert list(df.columns) == SHOPIFY_COLUMNS
    assert len(df) == 0


def _variant_row(**overrides):
    row = {
        "productId": "3935966691437",
        "productVariantId": "29443372941421",
        "customLine": False,
        "productTitle": "Anushka Sharma in High Waist Pant with Belt",
        "variantTitle": "XS",
        "sku": "RM-001",
        "monthLabel": "2026-04-01 - 2026-04-30",
        "totalSales": 17800,
        "itemsSold": 1,
        "itemsReturned": 0,
        "netItemsSold": 1,
        "netSales": 17800,
    }
    row.update(overrides)
    return row


def test_maps_basic_variant_row_correctly():
    df = map_shopify_variants([_variant_row()])
    assert list(df.columns) == SHOPIFY_COLUMNS
    row = df.iloc[0]
    assert row["Product ID"] == "3935966691437"
    assert row["Product Title"] == "Anushka Sharma in High Waist Pant with Belt"
    assert row["Product variant title"] == "XS"
    assert row["Net items sold"] == 1
    assert row["Total sales"] == 17800


def test_product_variant_id_and_sku_are_not_carried_through():
    """Explicitly dropped per decision: no variant-level join/display use,
    Meta has no per-variant spend, so these never flow downstream."""
    df = map_shopify_variants([_variant_row()])
    assert "Product Variant ID" not in df.columns
    assert "SKU" not in df.columns


def test_drops_custom_line_rows():
    rows = [
        _variant_row(),
        _variant_row(productId=None, productVariantId=None, customLine=True,
                     variantTitle=None, productTitle="Alteration charge"),
    ]
    df = map_shopify_variants(rows)
    assert len(df) == 1
    assert df.iloc[0]["Product ID"] == "3935966691437"


def test_drops_rows_with_null_product_id_even_if_custom_line_flag_missing():
    rows = [_variant_row(productId=None)]
    del rows[0]["customLine"]
    df = map_shopify_variants(rows)
    assert len(df) == 0


def test_drops_rows_with_blank_product_id():
    rows = [_variant_row(productId="  ")]
    df = map_shopify_variants(rows)
    assert len(df) == 0


def test_all_rows_dropped_returns_empty_dataframe_with_columns():
    rows = [_variant_row(productId=None, customLine=True)]
    df = map_shopify_variants(rows)
    assert list(df.columns) == SHOPIFY_COLUMNS
    assert len(df) == 0


def test_blank_variant_title_is_kept_as_valid_empty_value():
    """Single-variant products legitimately have no variant title."""
    df = map_shopify_variants([_variant_row(variantTitle="")])
    assert len(df) == 1
    assert df.iloc[0]["Product variant title"] == ""


def test_null_variant_title_normalizes_to_empty_string():
    df = map_shopify_variants([_variant_row(variantTitle=None)])
    assert df.iloc[0]["Product variant title"] == ""


def test_null_sku_does_not_error_even_though_sku_is_dropped():
    """sku:null is documented as valid on the wire; since we don't carry SKU
    at all, this must simply not crash the mapper."""
    df = map_shopify_variants([_variant_row(sku=None)])
    assert len(df) == 1


def test_net_sales_and_net_items_sold_are_already_return_adjusted():
    # netSales/netItemsSold already subtract returns upstream — the mapper
    # must pass them through as-is, not re-derive from totalSales/itemsSold.
    df = map_shopify_variants([_variant_row(
        totalSales=95100, itemsSold=1, itemsReturned=1, netItemsSold=0, netSales=0,
    )])
    row = df.iloc[0]
    assert row["Net items sold"] == 0
    assert row["Total sales"] == 0


def test_missing_numeric_fields_coerce_to_zero():
    row = _variant_row(netItemsSold=None, netSales=None)
    df = map_shopify_variants([row])
    assert df.iloc[0]["Net items sold"] == 0
    assert df.iloc[0]["Total sales"] == 0


def test_multiple_variants_of_same_product_all_kept_at_variant_grain():
    """The mapper itself must NOT collapse variants — analytics.py's existing
    groupby-by-Product-ID is what aggregates them, not this layer."""
    rows = [
        _variant_row(productVariantId="v1", variantTitle="XS", netSales=100),
        _variant_row(productVariantId="v2", variantTitle="M", netSales=200),
    ]
    df = map_shopify_variants(rows)
    assert len(df) == 2
    assert set(df["Product variant title"]) == {"XS", "M"}
    assert df["Total sales"].sum() == 300
