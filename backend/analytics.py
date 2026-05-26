# ╔══════════════════════════════════════════════════════════════════════╗
# ║  analytics.py  —  Core data merging & analysis engines             ║
# ║  Sections: Overall View, Discount Analysis, Product Analysis       ║
# ╚══════════════════════════════════════════════════════════════════════╝

import pandas as pd
import numpy as np
from typing import Optional, Tuple, Dict, Any


# ──────────────────────────────────────────────────────────────────────
#  SHARED UTILITIES
# ──────────────────────────────────────────────────────────────────────

MONTH_MAP = {
    1: "January",  2: "February", 3: "March",    4: "April",
    5: "May",      6: "June",     7: "July",      8: "August",
    9: "September",10: "October",11: "November", 12: "December",
}


def parse_month_start(s: str) -> pd.Timestamp:
    """Parse first date from a range string like '2026-03-01 - 2026-03-31' or '2026-03-01'."""
    return pd.to_datetime(str(s).split(" - ")[0].strip())


def make_month_label(s: str) -> str:
    """Convert a date/range string to 'March 2026'."""
    dt = parse_month_start(s)
    return f"{MONTH_MAP[dt.month]} {dt.year}"


def clean_pid(x) -> str:
    """Normalise a Product ID to a plain string integer where possible."""
    try:
        return str(int(float(x)))
    except (ValueError, TypeError):
        return str(x).strip()


def find_col(df: pd.DataFrame, *keywords: str) -> Optional[str]:
    """Case-insensitive partial-match column finder."""
    for kw in keywords:
        hits = [c for c in df.columns if kw.lower() in c.lower()]
        if hits:
            return hits[0]
    return None


def fmt_inr(v) -> str:  return f"₹{v:,.0f}"
def fmt_roi(v) -> str:  return f"{v:.2f}x"
def fmt_pct(v) -> str:  return f"{v*100:.1f}%"


def compact_currency(v: float) -> str:
    if v >= 10_000_000: return f"₹{v/10_000_000:.1f}Cr"
    if v >= 100_000:    return f"₹{v/100_000:.1f}L"
    if v >= 1_000:      return f"₹{v/1_000:.1f}K"
    return f"₹{v:,.0f}"


# ──────────────────────────────────────────────────────────────────────
#  SECTION 0 — OVERALL VIEW ENGINE
# ──────────────────────────────────────────────────────────────────────

def run_overall_view(
    meta_df: pd.DataFrame,
    shopify_df: pd.DataFrame,
    google_df: Optional[pd.DataFrame] = None,
) -> Tuple[pd.DataFrame, bool]:
    """
    Merge Meta + Shopify + Google on Product ID (and Month if available).

    Accepts already-cleaned DataFrames from data_cleaner.py.
    Google is optional — pass None to skip.

    Returns (merged_df, has_month)
    """
    meta    = meta_df.copy()
    shopify = shopify_df.copy()
    has_google = google_df is not None and not google_df.empty

    # ── Normalise Product IDs ────────────────────────────────────────
    for df in [meta, shopify]:
        df["_pid"] = df["Product ID"].apply(clean_pid)
    if has_google:
        google = google_df.copy()
        google["_pid"] = google["Product ID"].apply(clean_pid)

    # ── Detect columns (already cleaned, but use flexible finder) ───
    meta_spend_col = find_col(meta,    "amount spent", "spend")
    meta_lpv_col   = find_col(meta,    "landing page view", "lpv")
    meta_ctr_col   = find_col(meta,    "ctr")
    meta_cpm_col   = find_col(meta,    "cpm")
    meta_title_col = find_col(meta,    "product title", "title")
    meta_month_col = find_col(meta,    "month")

    shop_rev_col   = find_col(shopify, "total sales", "sales", "revenue")
    shop_sold_col  = find_col(shopify, "net items sold", "items sold", "sold", "quantity")
    shop_title_col = find_col(shopify, "product title", "title")
    shop_month_col = find_col(shopify, "month")
    shop_var_col   = find_col(shopify, "product variant title", "variant title")

    if not meta_spend_col:
        raise ValueError("Meta CSV: cannot detect 'Amount spent' column.")
    if not shop_rev_col:
        raise ValueError("Shopify CSV: cannot detect 'Total sales' column.")

    if has_google:
        goog_cost_col  = find_col(google, "cost", "spend")
        goog_conv_col  = find_col(google, "conversion", "conv")
        goog_title_col = find_col(google, "product title", "title")
        goog_month_col = find_col(google, "month")
        if not goog_cost_col:
            raise ValueError("Google CSV: cannot detect 'Cost' column.")

    # ── Numeric coercion ────────────────────────────────────────────
    meta["_spend"] = pd.to_numeric(meta[meta_spend_col], errors="coerce").fillna(0)
    meta["_lpv"]   = pd.to_numeric(meta[meta_lpv_col],  errors="coerce").fillna(0) if meta_lpv_col else 0
    meta["_ctr"]   = pd.to_numeric(meta[meta_ctr_col],  errors="coerce").fillna(0) if meta_ctr_col else 0
    meta["_cpm"]   = pd.to_numeric(meta[meta_cpm_col],  errors="coerce").fillna(0) if meta_cpm_col else 0

    shopify["_rev"]  = pd.to_numeric(shopify[shop_rev_col],  errors="coerce").fillna(0)
    shopify["_sold"] = pd.to_numeric(shopify[shop_sold_col], errors="coerce").fillna(0) if shop_sold_col else 0

    if has_google:
        google["_cost"] = pd.to_numeric(google[goog_cost_col],  errors="coerce").fillna(0)
        google["_conv"] = pd.to_numeric(google[goog_conv_col],  errors="coerce").fillna(0) if goog_conv_col else 0

    # ── Month labels ─────────────────────────────────────────────────
    if meta_month_col:
        meta["_month"] = meta[meta_month_col].apply(make_month_label)
    if shop_month_col:
        shopify["_month"] = shopify[shop_month_col].apply(make_month_label)
    if has_google and goog_month_col:
        google["_month"] = google[goog_month_col].apply(make_month_label)

    has_month = bool(
        meta_month_col and shop_month_col and
        (not has_google or goog_month_col)
    )

    # ── Title map (priority: shopify > meta > google) ───────────────
    title_map: Dict[str, str] = {}
    if has_google and goog_title_col:
        for _, r in google.drop_duplicates("_pid").iterrows():
            title_map[r["_pid"]] = str(r[goog_title_col])
    if meta_title_col:
        for _, r in meta.drop_duplicates("_pid").iterrows():
            title_map[r["_pid"]] = str(r[meta_title_col])
    if shop_title_col:
        for _, r in shopify.drop_duplicates("_pid").iterrows():
            title_map[r["_pid"]] = str(r[shop_title_col])

    # Variant title map (Shopify only, for display)
    variant_map: Dict[str, str] = {}
    if shop_var_col:
        # Take the most common variant title per product
        shopify["_variant"] = shopify[shop_var_col].astype(str).str.strip()
        for pid, grp in shopify.groupby("_pid"):
            _mode = grp["_variant"].mode()
            variant_map[pid] = _mode.iloc[0] if not _mode.empty else ""

    # ── Aggregate ────────────────────────────────────────────────────
    meta_agg_cols = ["_spend", "_lpv", "_ctr", "_cpm"]

    if has_month:
        meta_g    = meta.groupby(["_pid", "_month"])[meta_agg_cols].sum().reset_index()
        shopify_g = shopify.groupby(["_pid", "_month"])[["_rev", "_sold"]].sum().reset_index()

        

        if has_google:
            google_g = (
                google.groupby(["_pid", "_month"])
                .agg({
                    "_cost": "sum",
                    "_conv": "sum",
                    "Google Item ID": "first"   # ADD THIS
                })
                .reset_index()
            )
            merged = (
                meta_g
                .merge(shopify_g, on=["_pid", "_month"], how="outer")
                .merge(google_g,  on=["_pid", "_month"], how="outer")
                .fillna(0)
            )
        else:
            merged = (
                meta_g
                .merge(shopify_g, on=["_pid", "_month"], how="outer")
                .fillna(0)
            )
            merged["_cost"] = 0.0
            merged["_conv"] = 0.0

        merged.rename(columns={"_pid": "Product ID", "_month": "Month"}, inplace=True)

    else:
        meta_g    = meta.groupby("_pid")[meta_agg_cols].sum().reset_index()
        shopify_g = shopify.groupby("_pid")[["_rev", "_sold"]].sum().reset_index()

        if has_google:
            google_g = (
                google.groupby("_pid")
                .agg({
                    "_cost": "sum",
                    "_conv": "sum",
                    "Google Item ID": "first"   # ADD THIS
                })
                .reset_index()
            )
            merged = (
                meta_g
                .merge(shopify_g, on="_pid", how="outer")
                .merge(google_g,  on="_pid", how="outer")
                .fillna(0)
            )
        else:
            merged = (
                meta_g
                .merge(shopify_g, on="_pid", how="outer")
                .fillna(0)
            )
            merged["_cost"] = 0.0
            merged["_conv"] = 0.0

        merged.rename(columns={"_pid": "Product ID"}, inplace=True)

    # ── Derived metrics ──────────────────────────────────────────────
    merged["Product Title"]       = merged["Product ID"].map(title_map).fillna("Unknown")
    merged["Meta Spend"]          = merged["_spend"]
    merged["Google Cost"]         = merged["_cost"]
    merged["Total Spend"]         = merged["_spend"] + merged["_cost"]
    merged["Shopify Revenue"]     = merged["_rev"]
    merged["Net Items Sold"]      = merged["_sold"]
    merged["Landing Page Views"]  = merged["_lpv"]
    merged["Conversions"]         = merged["_conv"]
    merged["CTR"]                 = merged["_ctr"]
    merged["CPM"]                 = merged["_cpm"]

    # Preserve original Google Item ID
    if has_google and "Google Item ID" in google.columns:
        google_item_map = (
            google.drop_duplicates("_pid")
            .set_index("_pid")["Google Item ID"]
            .to_dict()
        )
    
        merged["Google Item ID"] = (
            merged["Product ID"]
            .apply(clean_pid)
            .map(google_item_map)
            .fillna("")
        )

    # Variant title (Shopify only — may not be per-month, use overall map)
    merged["Variant Title"] = merged["Product ID"].map(variant_map).fillna("")
    
    total_spend = merged["Total Spend"]
    merged["ROI"] = (
        merged["Shopify Revenue"] / total_spend.replace(0, float("nan"))
    ).fillna(0).round(4)

    # ── Final column order ───────────────────────────────────────────
    keep = ["Product ID", "Google Item ID", "Product Title", "Variant Title"]
    if has_month:
        keep.append("Month")
    keep += [
        "Meta Spend", "Google Cost", "Total Spend",
        "Shopify Revenue", "Net Items Sold",
        "Landing Page Views", "Conversions",
        "CTR", "CPM", "ROI",
    ]

    out = merged[[c for c in keep if c in merged.columns]].copy()
    out = out.sort_values("Total Spend", ascending=False).reset_index(drop=True)
    return out, has_month


# ──────────────────────────────────────────────────────────────────────
#  SECTION 1 — DISCOUNT ANALYSIS ENGINE
# ──────────────────────────────────────────────────────────────────────

def run_discount_analysis(
    meta: pd.DataFrame,
    shopify: pd.DataFrame,
    discount: pd.DataFrame,
    spend_pct_thresh: float,
    rev_pct_thresh: float,
):
    """
    Compare discounted vs non-discounted product performance by month.
    Accepts already-cleaned DataFrames.
    """
    meta    = meta.copy()
    shopify = shopify.copy()
    discount = discount.copy()

    meta_spend_col  = find_col(meta,    "amount spent", "spend")
    shopify_rev_col = find_col(shopify, "total sales", "sales", "revenue")
    meta_title_col  = find_col(meta,    "prod----------------------------------uct title", "title")
    shop_title_col  = find_col(shopify, "product title", "title")

    if not meta_spend_col:
        raise ValueError("Cannot detect spend column in Meta CSV.")
    if not shopify_rev_col:
        raise ValueError("Cannot detect revenue column in Shopify CSV.")

    # ── Normalise PIDs ───────────────────────────────────────────────
    meta["_pid"]     = meta["Product ID"].apply(clean_pid)
    shopify["_pid"]  = shopify["Product ID"].apply(clean_pid)
    discount["_pid"] = discount["Product ID"].dropna().apply(clean_pid)

    # ── Title map ────────────────────────────────────────────────────
    title_map: Dict[str, str] = {}
    if shop_title_col:
        for _, r in shopify.drop_duplicates("_pid").iterrows():
            title_map[r["_pid"]] = str(r[shop_title_col])
    if meta_title_col:
        for _, r in meta.drop_duplicates("_pid").iterrows():
            title_map[r["_pid"]] = str(r[meta_title_col])

    # ── Google Item ID map (pid → original shopify_in_XX_YY string) ──────
    google_item_map: Dict[str, str] = {}
    if "Google Item ID" in meta.columns:
        for _, r in meta.drop_duplicates("_pid").iterrows():
            if str(r.get("Google Item ID", "")).strip():
                google_item_map[r["_pid"]] = str(r["Google Item ID"])

    # ── Numeric ──────────────────────────────────────────────────────
    meta["_spend"]    = pd.to_numeric(meta[meta_spend_col],    errors="coerce").fillna(0)
    shopify["_rev"]   = pd.to_numeric(shopify[shopify_rev_col], errors="coerce").fillna(0)

    meta["_month"]    = meta["Month"].apply(make_month_label)
    shopify["_month"] = shopify["Month"].apply(make_month_label)

    meta_g    = meta.groupby(["_pid", "_month"])["_spend"].sum().reset_index()
    shopify_g = shopify.groupby(["_pid", "_month"])["_rev"].sum().reset_index()
    merged    = pd.merge(meta_g, shopify_g, on=["_pid", "_month"], how="outer").fillna(0)
    merged.columns = ["Product ID", "Month", "Spend", "Revenue"]

    disc_ids = set(discount["_pid"].dropna())
    merged["Is_Discounted"] = merged["Product ID"].isin(disc_ids)

    months_raw     = sorted(merged["Month"].dropna().unique(), key=parse_month_start)
    merged["Month_Label"] = merged["Month"].apply(make_month_label)
    months_ordered = [make_month_label(m) for m in months_raw]

    results = []
    for month in months_ordered:
        md = merged[merged["Month_Label"] == month]
        ts, tr = md["Spend"].sum(), md["Revenue"].sum()
        for is_d, cat in [(True, "Discounted"), (False, "Non-Discounted")]:
            g = md[md["Is_Discounted"] == is_d]
            sp, rv = g["Spend"].sum(), g["Revenue"].sum()
            results.append({
                "Month": month, "Category": cat,
                "Spend": round(sp, 2), "Revenue": round(rv, 2),
                "Spend_Pct":   round(sp / ts, 4) if ts else 0,
                "Revenue_Pct": round(rv / tr, 4) if tr else 0,
                "ROI":         round(rv / sp, 4) if sp else 0,
            })

    insights: Dict[Any, dict] = {}
    for month in months_ordered:
        md = merged[(merged["Month_Label"] == month) & (merged["Spend"] > 0)].copy()
        md["ROI"] = (md["Revenue"] / md["Spend"]).round(4)
        for is_d, cat in [(True, "Discounted"), (False, "Non-Discounted")]:
            g = md[md["Is_Discounted"] == is_d].copy()
            if g.empty:
                insights[(month, cat)] = {"hslr": pd.DataFrame(), "lshr": pd.DataFrame()}
                continue
            sp_cut = g["Spend"].mean()   * spend_pct_thresh / 100
            rv_cut = g["Revenue"].mean() * rev_pct_thresh   / 100
            hslr   = g[(g["Spend"] >= sp_cut) & (g["Revenue"] <= rv_cut)].copy()
            lshr   = g[(g["Spend"] <  sp_cut) & (g["Revenue"] >  rv_cut)].copy()
            for frame in [hslr, lshr]:
                frame["Product Title"] = frame["Product ID"].map(title_map).fillna("Unknown")
            # WITH
            _extra_cols = []
            if "Google Item ID" in merged.columns and merged["Google Item ID"].astype(bool).any():
                _extra_cols.append("Google Item ID")
            cols = ["Product ID", "Product Title", "Spend", "Revenue", "ROI"] + _extra_cols
            insights[(month, cat)] = {
                "hslr": hslr.sort_values("Spend",   ascending=False)[cols].reset_index(drop=True),
                "lshr": lshr.sort_values("Revenue", ascending=False)[cols].reset_index(drop=True),
            }

    overall_insights: Dict[str, dict] = {}
    for is_d, cat in [(True, "Discounted"), (False, "Non-Discounted")]:
        g_all = merged[merged["Is_Discounted"] == is_d].copy()
        agg   = g_all.groupby("Product ID")[["Spend", "Revenue"]].sum().reset_index()
        agg["ROI"] = (agg["Revenue"] / agg["Spend"].replace(0, float("nan"))).fillna(0).round(4)
        agg["Product Title"] = agg["Product ID"].map(title_map).fillna("Unknown")
        sp_cut = agg["Spend"].mean()   * spend_pct_thresh / 100 if not agg.empty else 0
        rv_cut = agg["Revenue"].mean() * rev_pct_thresh   / 100 if not agg.empty else 0
        hslr   = agg[(agg["Spend"] >= sp_cut) & (agg["Revenue"] <= rv_cut)].sort_values("Spend",   ascending=False)
        lshr   = agg[(agg["Spend"] <  sp_cut) & (agg["Revenue"] >  rv_cut)].sort_values("Revenue", ascending=False)
        cols   = ["Product ID", "Product Title", "Spend", "Revenue", "ROI"]
        overall_insights[cat] = {
            "hslr": hslr[cols].reset_index(drop=True),
            "lshr": lshr[cols].reset_index(drop=True),
        }

    return pd.DataFrame(results), months_ordered, merged, insights, overall_insights, title_map


# ──────────────────────────────────────────────────────────────────────
#  SECTION 2 — PRODUCT ANALYSIS ENGINE
# ──────────────────────────────────────────────────────────────────────

def run_product_analysis(
    meta: pd.DataFrame,
    shopify: pd.DataFrame,
    spend_pct_thresh: float,
    rev_pct_thresh: float,
) -> dict:
    """
    Build 4-quadrant product breakdown.
    Accepts already-cleaned DataFrames.
    """
    meta    = meta.copy()
    shopify = shopify.copy()

    meta_spend_col  = find_col(meta,    "amount spent", "spend")
    shopify_rev_col = find_col(shopify, "total sales", "sales", "revenue")
    meta_title_col  = find_col(meta,    "product title", "title")
    shop_title_col  = find_col(shopify, "product title", "title")

    if not meta_spend_col:
        raise ValueError("Cannot detect spend column in Meta CSV.")
    if not shopify_rev_col:
        raise ValueError("Cannot detect revenue column in Shopify CSV.")

    meta["_pid"]    = meta["Product ID"].apply(clean_pid)
    shopify["_pid"] = shopify["Product ID"].apply(clean_pid)

    title_map: Dict[str, str] = {}
    if shop_title_col:
        for _, r in shopify.drop_duplicates("_pid").iterrows():
            title_map[r["_pid"]] = str(r[shop_title_col])
    if meta_title_col:
        for _, r in meta.drop_duplicates("_pid").iterrows():
            title_map[r["_pid"]] = str(r[meta_title_col])

    # ── Google Item ID map — built only if column exists in meta ─────
    google_item_map: Dict[str, str] = {}
    if "Google Item ID" in meta.columns:
        for _, r in meta.drop_duplicates("_pid").iterrows():
            val = str(r.get("Google Item ID", "")).strip()
            if val and val.lower() != "nan":
                google_item_map[r["_pid"]] = val

    meta["_spend"]    = pd.to_numeric(meta[meta_spend_col],    errors="coerce").fillna(0)
    shopify["_rev"]   = pd.to_numeric(shopify[shopify_rev_col], errors="coerce").fillna(0)

    meta["_month"]    = meta["Month"].apply(make_month_label)
    shopify["_month"] = shopify["Month"].apply(make_month_label)

    # ── Build Shopify agg dict safely ────────────────────────────────
    _shop_agg_m: Dict[str, str] = {}
    if "_rev" in shopify.columns:
        _shop_agg_m["_rev"] = "sum"
    _shop_agg = dict(_shop_agg_m)

    # ── Monthly aggregations ─────────────────────────────────────────
    meta_gm    = meta.groupby(["_pid", "_month"])["_spend"].sum().reset_index()
    shopify_gm = shopify.groupby(["_pid", "_month"]).agg(_shop_agg_m).reset_index()
    merged_m   = pd.merge(meta_gm, shopify_gm, on=["_pid", "_month"], how="outer").fillna(0)
    merged_m   = merged_m.rename(columns={
        "_pid":   "Product ID",
        "_month": "Month",
        "_spend": "Spend",
        "_rev":   "Revenue",
    })
    merged_m["Product Title"] = merged_m["Product ID"].map(title_map).fillna("Unknown")

    # ── Overall aggregations ─────────────────────────────────────────
    meta_g    = meta.groupby("_pid")["_spend"].sum().reset_index()
    shopify_g = shopify.groupby("_pid").agg(_shop_agg).reset_index()
    merged    = pd.merge(meta_g, shopify_g, on="_pid", how="outer").fillna(0)
    merged    = merged.rename(columns={
        "_pid":   "Product ID",
        "_spend": "Spend",
        "_rev":   "Revenue",
    })
    merged["Product Title"]   = merged["Product ID"].map(title_map).fillna("Unknown")
    merged["ROI"]             = (merged["Revenue"] / merged["Spend"].replace(0, float("nan"))).fillna(0).round(4)
    # Always create the column — empty string if no Google data uploaded
    merged["Google Item ID"]  = merged["Product ID"].map(google_item_map).fillna("")

    avg_sp = merged["Spend"].mean()
    avg_rv = merged["Revenue"].mean()
    sp_cut = avg_sp * spend_pct_thresh / 100
    rv_cut = avg_rv * rev_pct_thresh   / 100

    # Include Google Item ID in quadrant cols only if it has any data
    _has_gid = merged["Google Item ID"].astype(bool).any()
    cols = ["Product ID", "Google Item ID", "Product Title", "Spend", "Revenue", "ROI"] \
           if _has_gid else \
           ["Product ID", "Product Title", "Spend", "Revenue", "ROI"]

    q1 = merged[(merged["Revenue"] >= rv_cut) & (merged["Spend"] <  sp_cut)][cols].sort_values("Revenue", ascending=False).reset_index(drop=True)
    q2 = merged[(merged["Revenue"] >= rv_cut) & (merged["Spend"] >= sp_cut)][cols].sort_values("Revenue", ascending=False).reset_index(drop=True)
    q3 = merged[(merged["Revenue"] <  rv_cut) & (merged["Spend"] >= sp_cut)][cols].sort_values("Spend",   ascending=False).reset_index(drop=True)
    q4 = merged[(merged["Revenue"] <  rv_cut) & (merged["Spend"] <  sp_cut)][cols].sort_values("Revenue", ascending=False).reset_index(drop=True)

    return {
        "q1": q1, "q2": q2, "q3": q3, "q4": q4,
        "all": merged, "monthly": merged_m,
        "sp_cut": sp_cut, "rv_cut": rv_cut,
        "avg_sp": avg_sp, "avg_rv": avg_rv,
        "total_months": merged_m["Month"].nunique(),
    }