"""
Feeds growifyos_mapper.py output straight into the REAL, unmodified
analytics.py engine (run_overall_view / run_product_analysis /
run_discount_analysis). This is the deterministic, offline version of the
same-instant groupBy=product vs. no-groupBy comparison done manually against
the live API during development — it locks in, going forward, that
variant-level Shopify rows collapse to identical product-level totals and
never double-count spend/revenue.

If this file ever needs editing alongside analytics.py, that's a signal the
"zero changes to the existing engine" contract for Live Sync has been broken.
"""
from analytics import run_overall_view, run_product_analysis, run_discount_analysis
from integrations.growifyos_mapper import map_meta_products, map_shopify_variants


def _meta_row(product_id, title, month_label, spend):
    return {
        "productId": product_id,
        "metaProductId": f"{product_id}, {title}",
        "monthLabel": month_label,
        "amountSpent": spend,
        "landingPageViews": 0,
        "ctr": 0,
        "cpm": 0,
    }


def _shopify_row(product_id, title, variant_title, month_label, net_sales, net_items=1):
    return {
        "productId": product_id,
        "productVariantId": f"{product_id}-{variant_title}",
        "customLine": False,
        "productTitle": title,
        "variantTitle": variant_title,
        "sku": "",
        "monthLabel": month_label,
        "totalSales": net_sales,
        "itemsSold": net_items,
        "itemsReturned": 0,
        "netItemsSold": net_items,
        "netSales": net_sales,
    }


MONTH = "2026-04-01 - 2026-04-30"


def test_multi_variant_rows_collapse_to_same_product_level_totals_as_single_row():
    """The core guarantee: whether Shopify gives us 1 row per product or N
    rows per variant, the merged product-level totals must be identical."""
    meta_rows = [_meta_row("1001", "Dress", MONTH, 1000)]

    # Scenario A: pretend the old groupBy=product shape — one row, no variant.
    single_row_shopify = map_shopify_variants([_shopify_row("1001", "Dress", "", MONTH, 5000, 3)])

    # Scenario B: real current shape — three separate variant rows for the
    # same product, same month, summing to the same total.
    variant_rows_shopify = map_shopify_variants([
        _shopify_row("1001", "Dress", "S", MONTH, 2000, 1),
        _shopify_row("1001", "Dress", "M", MONTH, 2000, 1),
        _shopify_row("1001", "Dress", "L", MONTH, 1000, 1),
    ])

    meta_df = map_meta_products(meta_rows)
    merged_single, hm_single = run_overall_view(meta_df, single_row_shopify, None)
    merged_variant, hm_variant = run_overall_view(meta_df, variant_rows_shopify, None)

    assert hm_single == hm_variant is True
    assert merged_single["Product ID"].nunique() == merged_variant["Product ID"].nunique() == 1
    assert merged_single["Total Spend"].sum() == merged_variant["Total Spend"].sum() == 1000
    assert merged_single["Shopify Revenue"].sum() == merged_variant["Shopify Revenue"].sum() == 5000
    assert merged_single["Net Items Sold"].sum() == merged_variant["Net Items Sold"].sum() == 3


def test_outer_join_keeps_products_present_on_only_one_side():
    # Product 2001 has Shopify sales but no Meta spend in this range, and
    # product 1001 has Meta spend but no sales yet — both are real,
    # already-correct outer-join behavior that must keep working unchanged.
    meta_df = map_meta_products([_meta_row("1001", "Dress", MONTH, 500)])
    shopify_df = map_shopify_variants([_shopify_row("2001", "Scarf", "One Size", MONTH, 3000)])

    merged, _ = run_overall_view(meta_df, shopify_df, None)

    assert set(merged["Product ID"]) == {"1001", "2001"}
    row_1001 = merged[merged["Product ID"] == "1001"].iloc[0]
    row_2001 = merged[merged["Product ID"] == "2001"].iloc[0]
    assert row_1001["Total Spend"] == 500 and row_1001["Shopify Revenue"] == 0
    assert row_2001["Total Spend"] == 0 and row_2001["Shopify Revenue"] == 3000


def test_variant_title_surfaces_the_most_common_variant_per_product():
    # Two "S" rows across different months vs one "L" row — mode should pick "S".
    meta_df = map_meta_products([
        _meta_row("1001", "Dress", MONTH, 100),
        _meta_row("1001", "Dress", "2026-05-01 - 2026-05-31", 100),
    ])
    shopify_df = map_shopify_variants([
        _shopify_row("1001", "Dress", "S", MONTH, 1000),
        _shopify_row("1001", "Dress", "S", "2026-05-01 - 2026-05-31", 1000),
        _shopify_row("1001", "Dress", "L", MONTH, 500),
    ])
    merged, _ = run_overall_view(meta_df, shopify_df, None)
    assert merged.iloc[0]["Variant Title"] == "S"


def test_run_product_analysis_quadrants_sum_to_total_products_with_variant_rows():
    meta_df = map_meta_products([
        _meta_row("1001", "A", MONTH, 1000),
        _meta_row("1002", "B", MONTH, 1),
    ])
    shopify_df = map_shopify_variants([
        _shopify_row("1001", "A", "S", MONTH, 500),
        _shopify_row("1001", "A", "M", MONTH, 500),
        _shopify_row("1002", "B", "", MONTH, 1),
    ])
    result = run_product_analysis(meta_df, shopify_df, spend_pct_thresh=100, rev_pct_thresh=100)
    total_in_quadrants = sum(len(result[q]) for q in ("q1", "q2", "q3", "q4"))
    assert total_in_quadrants == 2


def test_run_discount_analysis_still_works_with_variant_level_shopify_rows():
    import pandas as pd

    meta_df = map_meta_products([_meta_row("1001", "A", MONTH, 1000)])
    shopify_df = map_shopify_variants([
        _shopify_row("1001", "A", "S", MONTH, 500),
        _shopify_row("1001", "A", "M", MONTH, 500),
    ])
    discount_df = pd.DataFrame({"Product ID": ["1001"]})

    results_df, months_ordered, merged, insights, overall_insights, title_map = run_discount_analysis(
        meta_df, shopify_df, discount=discount_df, spend_pct_thresh=100, rev_pct_thresh=100,
    )
    discounted_row = results_df[results_df["Category"] == "Discounted"].iloc[0]
    assert discounted_row["Spend"] == 1000
    assert discounted_row["Revenue"] == 1000
