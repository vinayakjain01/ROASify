# ╔══════════════════════════════════════════════════════════════════════╗
# ║  data_cleaner.py  —  Raw-to-clean transformation layer             ║
# ║  Handles Meta, Shopify, and Google Ads raw exports                 ║
# ╚══════════════════════════════════════════════════════════════════════╝

import pandas as pd
import numpy as np
import re
from typing import Optional, Tuple


# ──────────────────────────────────────────────────────────────────────
#  CONSTANTS
# ──────────────────────────────────────────────────────────────────────

META_KEEP_COLS = [
    "Product ID", "Product Title", "Month",
    "Amount spent (INR)", "Landing page views",
    "CTR (all)", "CPM (cost per 1,000 impressions)",
]

SHOPIFY_KEEP_COLS = [
    "Product ID", "Product Title", "Month",
    "Product variant title", "Net items sold", "Total sales",
]

GOOGLE_KEEP_COLS = [
    "Product ID", "Google Item ID", "Product Title",
    "Month", "Cost", "Conversions",
]

MONTH_NAME_MAP = {
    "january":"01","february":"02","march":"03","april":"04",
    "may":"05","june":"06","july":"07","august":"08",
    "september":"09","october":"10","november":"11","december":"12",
}


# ──────────────────────────────────────────────────────────────────────
#  SHARED UTILITIES
# ──────────────────────────────────────────────────────────────────────

def _strip_bom(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [str(c).lstrip('\ufeff').strip() for c in df.columns]
    return df


def _find_col(df: pd.DataFrame, *keywords: str) -> Optional[str]:
    for kw in keywords:
        hits = [c for c in df.columns if kw.lower() in str(c).lower()]
        if hits:
            return hits[0]
    return None


def _read_file(file_obj, header: int = 0) -> pd.DataFrame:
    name = getattr(file_obj, "name", "")
    if isinstance(name, str) and name.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(file_obj, header=header)
    # Try UTF-8 first, fall back to latin-1 for Windows-exported CSVs
    try:
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)
        return pd.read_csv(file_obj, header=header, encoding='utf-8-sig')
    except UnicodeDecodeError:
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)
        return pd.read_csv(file_obj, header=header, encoding='latin-1')


def _to_numeric_robust(series: pd.Series) -> pd.Series:
    """
    Convert a Series to numeric, handling:
    - Indian comma format:  "1,17,126"  → 117126
    - Thousand separators: "50,000"     → 50000
    - Percentage strings:  "4.3%"       → 4.3
    - Plain floats:        "50000"      → 50000
    - NaN / empty         → 0
    """
    def _parse(v):
        if pd.isna(v):
            return 0.0
        s = str(v).strip()
        if not s or s.lower() in ('nan', 'none', '-', '—', 'n/a'):
            return 0.0
        # Strip % sign
        s = s.rstrip('%')
        # Remove commas (Indian or Western format)
        s = s.replace(',', '')
        try:
            return float(s)
        except (ValueError, TypeError):
            return 0.0

    return series.apply(_parse)


# ──────────────────────────────────────────────────────────────────────
#  META CLEANER
# ──────────────────────────────────────────────────────────────────────

def clean_meta(file_obj) -> Tuple[pd.DataFrame, list]:
    warnings = []

    df = _read_file(file_obj)
    df = _strip_bom(df)

    # ── Detect Product ID column ────────────────────────────────────
    pid_col = _find_col(df, "product id", "product_id")
    if pid_col is None:
        raise ValueError(
            "Meta file: Cannot find 'Product ID' column. "
            "Expected a column containing numeric ID + product title."
        )

    # ── Split "12345, Title Text" into Product ID + Product Title ──
    def _split_pid_title(raw_val):
        s = str(raw_val).strip()
        if not s or s.lower() in ('nan', 'none', 'total', 'grand total'):
            return None, None  # will be filtered out
        try:
            m = re.match(r'^(\d+)\s*[,\-:]*\s*(.*)', s, re.DOTALL)
            if m:
                pid   = m.group(1).strip()
                title = m.group(2).strip() or "Unknown Product"
                return pid, title
        except Exception:
            pass
        return s, "Unknown Product"

    split_results          = df[pid_col].apply(_split_pid_title)
    df["Product ID"]       = split_results.apply(lambda x: x[0])
    df["Product Title"]    = split_results.apply(lambda x: x[1])

    # ── Drop Total/summary/empty rows immediately ───────────────────
    df = df[df["Product ID"].notna() & (df["Product ID"].astype(str).str.strip() != "")]
    df = df.reset_index(drop=True)

    # ── Rename standard columns ─────────────────────────────────────
    month_col = _find_col(df, "month")
    spend_col = _find_col(df, "amount spent", "amount_spent", "spend")
    lpv_col   = _find_col(df, "landing page view", "landing_page_view")
    ctr_col   = _find_col(df, "ctr")
    cpm_col   = _find_col(df, "cpm", "cost per 1,000", "cost per 1000")

    rename_map = {}
    if month_col and month_col != "Month":
        rename_map[month_col] = "Month"
    if spend_col and spend_col != "Amount spent (INR)":
        rename_map[spend_col] = "Amount spent (INR)"
    if lpv_col   and lpv_col   != "Landing page views":
        rename_map[lpv_col]   = "Landing page views"
    if ctr_col   and ctr_col   != "CTR (all)":
        rename_map[ctr_col]   = "CTR (all)"
    if cpm_col   and cpm_col   != "CPM (cost per 1,000 impressions)":
        rename_map[cpm_col]   = "CPM (cost per 1,000 impressions)"

    df = df.rename(columns=rename_map)

    if "Month" not in df.columns:
        warnings.append("Meta: 'Month' column not found — monthly analysis unavailable.")

    # ── Robust numeric conversion (handles Indian commas + % signs) ─
    for col in ["Amount spent (INR)", "Landing page views",
                "CTR (all)", "CPM (cost per 1,000 impressions)"]:
        if col in df.columns:
            df[col] = _to_numeric_robust(df[col])

    # ── Filter rows with valid Month (drop Total/empty month rows) ──
    if "Month" in df.columns:
        df = df[df["Month"].notna() & (df["Month"].astype(str).str.strip() != "")]
        df = df.reset_index(drop=True)

    # ── Keep only relevant columns ──────────────────────────────────
    available = [c for c in META_KEEP_COLS if c in df.columns]
    missing   = [c for c in META_KEEP_COLS if c not in df.columns]
    if missing:
        warnings.append(f"Meta: Missing columns (will be absent): {missing}")

    df = df[available].copy().reset_index(drop=True)
    return df, warnings


# ──────────────────────────────────────────────────────────────────────
#  SHOPIFY CLEANER
# ──────────────────────────────────────────────────────────────────────

def clean_shopify(file_obj) -> Tuple[pd.DataFrame, list]:
    warnings = []

    df = _read_file(file_obj)
    df = _strip_bom(df)

    # ── Rename Product variant ID → Product ID ─────────────────────
    pid_col = _find_col(df, "product variant id", "variant id", "product id")
    if pid_col is None:
        raise ValueError(
            "Shopify file: Cannot find 'Product variant ID' or 'Product ID' column."
        )
    if pid_col != "Product ID":
        df = df.rename(columns={pid_col: "Product ID"})

    # ── Rename other columns ────────────────────────────────────────
    title_col   = _find_col(df, "product title", "product name")
    month_col   = _find_col(df, "month")
    variant_col = _find_col(df, "product variant title", "variant title")
    sales_col   = _find_col(df, "total sales", "total_sales", "sales", "revenue")
    sold_col    = _find_col(df, "net items sold", "items sold", "units sold", "quantity sold", "sold")

    rename_map = {}
    if title_col   and title_col   != "Product Title":           rename_map[title_col]   = "Product Title"
    if month_col   and month_col   != "Month":                   rename_map[month_col]   = "Month"
    if variant_col and variant_col != "Product variant title":   rename_map[variant_col] = "Product variant title"
    if sales_col   and sales_col   != "Total sales":             rename_map[sales_col]   = "Total sales"
    if sold_col    and sold_col    != "Net items sold":          rename_map[sold_col]    = "Net items sold"
    df = df.rename(columns=rename_map)

    if "Month" not in df.columns:
        warnings.append("Shopify: 'Month' column not found.")

    # ── Robust numeric conversion ───────────────────────────────────
    for col in ["Total sales", "Net items sold"]:
        if col in df.columns:
            df[col] = _to_numeric_robust(df[col])

    # ── Drop rows where Product ID is empty/NaN ─────────────────────
    df = df[df["Product ID"].notna() & (df["Product ID"].astype(str).str.strip() != "")]

    # ── Keep only relevant columns ──────────────────────────────────
    available = [c for c in SHOPIFY_KEEP_COLS if c in df.columns]
    missing   = [c for c in SHOPIFY_KEEP_COLS if c not in df.columns]
    if missing:
        warnings.append(f"Shopify: Missing columns: {missing}")

    df = df[available].copy().reset_index(drop=True)
    return df, warnings


# ──────────────────────────────────────────────────────────────────────
#  GOOGLE CLEANER
# ──────────────────────────────────────────────────────────────────────

def _google_month_to_range(val: str) -> str:
    s = str(val).strip()
    if re.match(r'^\d{4}-\d{2}', s):
        return s
    m = re.match(r'^([A-Za-z]+)\s+(\d{4})$', s)
    if m:
        num = MONTH_NAME_MAP.get(m.group(1).lower())
        if num:
            return f"{m.group(2)}-{num}-01"
    return s


def _extract_google_product_id(item_id: str) -> str:
    s = str(item_id).strip()
    if s.lower().startswith("shopify_"):
        parts = s.split("_")
        if len(parts) >= 4:
            return parts[-1]
    return s


def clean_google(file_obj) -> Tuple[pd.DataFrame, list]:
    warnings = []

    df = _read_file(file_obj, header=2)
    df = _strip_bom(df)

    expected = {"item id", "product title", "month", "cost", "conversions"}
    actual   = {str(c).lower() for c in df.columns}
    if len(expected & actual) < 2:
        file_obj.seek(0)
        df = _read_file(file_obj, header=0)
        df = _strip_bom(df)
        actual = {str(c).lower() for c in df.columns}
        if len(expected & actual) < 2:
            raise ValueError(
                "Google file: Cannot detect header row. "
                "Expected columns: Item ID, Product Title, Month, Cost, Conversions."
            )

    df = df[[c for c in df.columns if not str(c).startswith("Unnamed:")]]

    item_id_col = _find_col(df, "item id", "item_id")
    title_col   = _find_col(df, "product title", "title", "name")
    month_col   = _find_col(df, "month")
    cost_col    = _find_col(df, "cost", "spend", "amount")
    conv_col    = _find_col(df, "conversion", "conv")

    if item_id_col is None:
        raise ValueError("Google file: 'Item ID' column not found.")

    df["Google Item ID"] = df[item_id_col].astype(str)
    df["Product ID"]     = df[item_id_col].apply(_extract_google_product_id)

    rename_map = {}
    if title_col and title_col != "Product Title": rename_map[title_col] = "Product Title"
    if month_col and month_col != "Month":         rename_map[month_col] = "Month"
    if cost_col  and cost_col  != "Cost":          rename_map[cost_col]  = "Cost"
    if conv_col  and conv_col  != "Conversions":   rename_map[conv_col]  = "Conversions"
    df = df.rename(columns=rename_map)

    if "Month" in df.columns:
        df["Month"] = df["Month"].apply(_google_month_to_range)
    else:
        warnings.append("Google: 'Month' column not found.")

    for col in ["Cost", "Conversions"]:
        if col in df.columns:
            df[col] = _to_numeric_robust(df[col])

    available = [c for c in GOOGLE_KEEP_COLS if c in df.columns]
    missing   = [c for c in GOOGLE_KEEP_COLS if c not in df.columns]
    if missing:
        warnings.append(f"Google: Missing columns: {missing}")

    df = df[available].copy()
    df = df[df["Product ID"].notna() & (df["Product ID"].astype(str).str.strip() != "")]
    df = df.reset_index(drop=True)
    return df, warnings


def cleaning_summary(raw_df: pd.DataFrame, clean_df: pd.DataFrame, source: str) -> dict:
    return {
        "source":        source,
        "raw_rows":      len(raw_df),
        "clean_rows":    len(clean_df),
        "raw_columns":   raw_df.columns.tolist(),
        "clean_columns": clean_df.columns.tolist(),
        "rows_dropped":  len(raw_df) - len(clean_df),
        "cols_added":    [c for c in clean_df.columns if c not in raw_df.columns],
        "cols_removed":  [c for c in raw_df.columns  if c not in clean_df.columns],
    }