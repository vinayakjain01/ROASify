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

# Meta: columns we want to keep (after splitting Product ID)
META_KEEP_COLS = [
    "Product ID",
    "Product Title",
    "Month",
    "Amount spent (INR)",
    "Landing page views",
    "CTR (all)",
    "CPM (cost per 1,000 impressions)",
]

# Shopify: columns we want to keep (after renaming)
SHOPIFY_KEEP_COLS = [
    "Product ID",
    "Product Title",
    "Month",
    "Product variant title",
    "Net items sold",
    "Total sales",
]

# Google: columns we want to keep (after cleaning header + ID extraction)
GOOGLE_KEEP_COLS = [
    "Product ID",
    "Google Item ID",
    "Product Title",
    "Month",
    "Cost",
    "Conversions",
]

# Month name → zero-padded month number
MONTH_NAME_MAP = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
}


# ──────────────────────────────────────────────────────────────────────
#  SHARED UTILITIES
# ──────────────────────────────────────────────────────────────────────

def _strip_bom(df: pd.DataFrame) -> pd.DataFrame:
    """Remove BOM character from column names if present."""
    df.columns = [c.lstrip('\ufeff').strip() for c in df.columns]
    return df


def _find_col(df: pd.DataFrame, *keywords: str) -> Optional[str]:
    """Case-insensitive partial-match column finder. Returns first match."""
    for kw in keywords:
        hits = [c for c in df.columns if kw.lower() in c.lower()]
        if hits:
            return hits[0]
    return None


def _read_file(file_obj, header: int = 0) -> pd.DataFrame:
    """Read CSV or Excel from a file-like object."""
    name = getattr(file_obj, "name", "")
    if isinstance(name, str) and name.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(file_obj, header=header)
    return pd.read_csv(file_obj, header=header)


# ──────────────────────────────────────────────────────────────────────
#  META CLEANER
# ──────────────────────────────────────────────────────────────────────

def clean_meta(file_obj) -> Tuple[pd.DataFrame, list]:
    """
    Clean raw Meta Ads export.

    Raw format:
      - Product ID column contains: "12345678, Product Title Here"
      - Month column: "2026-03-01 - 2026-03-31"
      - Extra columns: Reporting starts, Reporting ends (dropped)

    Returns (cleaned_df, warnings_list)
    """
    warnings = []

    df = _read_file(file_obj)
    df = _strip_bom(df)

    # ── Detect the Product ID column ───────────────────────────────
    pid_col = _find_col(df, "product id", "product_id")
    if pid_col is None:
        raise ValueError(
            "Meta file: Cannot find 'Product ID' column. "
            "Expected a column containing numeric ID + product title."
        )

    # ── Split "12345, Title Text" into Product ID + Product Title ──
    def _split_pid_title(raw_val):
        s = str(raw_val).strip()
        if s == "" or s.lower() == "nan":
            return "", "Unknown Product"
        try:
            m = re.match(
                r'^(\d+)\s*[,|\-|:]*\s*(.*)',
                s,
                re.DOTALL
            )
    
            if m:
                pid = m.group(1).strip()
                title = m.group(2).strip()
    
                if title == "":
                    title = "Unknown Product"
    
                return pid, title
        except:
            pass
        return s, "Unknown Product"

    split_results = df[pid_col].apply(_split_pid_title)
    df["Product ID"]    = split_results.apply(lambda x: x[0])
    df["Product Title"] = split_results.apply(lambda x: x[1])

    # ── Detect & rename standard columns ───────────────────────────
    month_col   = _find_col(df, "month")
    spend_col   = _find_col(df, "amount spent", "amount_spent", "spend")
    lpv_col     = _find_col(df, "landing page view", "landing_page_view")
    ctr_col     = _find_col(df, "ctr")
    cpm_col     = _find_col(df, "cpm", "cost per 1,000", "cost per 1000")

    rename_map = {}
    if month_col   and month_col   != "Month":                       rename_map[month_col]   = "Month"
    if spend_col   and spend_col   != "Amount spent (INR)":          rename_map[spend_col]   = "Amount spent (INR)"
    if lpv_col     and lpv_col     != "Landing page views":          rename_map[lpv_col]     = "Landing page views"
    if ctr_col     and ctr_col     != "CTR (all)":                   rename_map[ctr_col]     = "CTR (all)"
    if cpm_col     and cpm_col     != "CPM (cost per 1,000 impressions)": rename_map[cpm_col] = "CPM (cost per 1,000 impressions)"

    df = df.rename(columns=rename_map)

    # ── Month: already in "YYYY-MM-DD - YYYY-MM-DD" format, keep as-is
    if "Month" not in df.columns:
        warnings.append("Meta: 'Month' column not found — monthly analysis will be unavailable.")

    # ── Numeric coercion ────────────────────────────────────────────
    for col in ["Amount spent (INR)", "Landing page views", "CTR (all)",
                "CPM (cost per 1,000 impressions)"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # ── Keep only relevant columns ──────────────────────────────────
    available = [c for c in META_KEEP_COLS if c in df.columns]
    missing   = [c for c in META_KEEP_COLS if c not in df.columns]
    if missing:
        warnings.append(f"Meta: These expected columns were not found and will be absent: {missing}")

    df = df[available].copy()

    # ── Drop rows where Product ID is empty/NaN ─────────────────────
    df = df[df["Product ID"].notna() & (df["Product ID"].astype(str).str.strip() != "")]
    df = df.reset_index(drop=True)

    return df, warnings


# ──────────────────────────────────────────────────────────────────────
#  SHOPIFY CLEANER
# ──────────────────────────────────────────────────────────────────────

def clean_shopify(file_obj) -> Tuple[pd.DataFrame, list]:
    """
    Clean raw Shopify export.

    Raw format:
      - "Product variant ID" → rename to "Product ID"
      - "Product title"      → rename to "Product Title"
      - Month: "2026-03-01"  (already YYYY-MM-DD, kept as-is)
      - Extra user columns are tolerated and dropped

    Returns (cleaned_df, warnings_list)
    """
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

    # ── Rename Product title → Product Title ───────────────────────
    title_col = _find_col(df, "product title", "product name")
    if title_col and title_col != "Product Title":
        df = df.rename(columns={title_col: "Product Title"})
    elif title_col is None:
        warnings.append("Shopify: 'Product Title' column not found.")

    # ── Rename Month (usually already 'Month') ─────────────────────
    month_col = _find_col(df, "month")
    if month_col and month_col != "Month":
        df = df.rename(columns={month_col: "Month"})

    # ── Shopify Month is YYYY-MM-DD — convert to "YYYY-MM-01 - YYYY-MM-DD"
    # format to match Meta's range style for downstream make_month_label()
    if "Month" in df.columns:
        def _shopify_month_to_range(val):
            s = str(val).strip()
            # Already a range format
            if " - " in s:
                return s
            # YYYY-MM-DD → keep as-is; downstream parse_month_start handles it
            return s
        df["Month"] = df["Month"].apply(_shopify_month_to_range)

    # ── Rename variant-title column ────────────────────────────────
    variant_col = _find_col(df, "product variant title", "variant title")
    if variant_col and variant_col != "Product variant title":
        df = df.rename(columns={variant_col: "Product variant title"})

    # ── Rename sales/sold columns ──────────────────────────────────
    sales_col = _find_col(df, "total sales", "total_sales", "sales", "revenue")
    sold_col  = _find_col(df, "net items sold", "items sold", "units sold", "quantity sold", "sold")

    if sales_col and sales_col != "Total sales":
        df = df.rename(columns={sales_col: "Total sales"})
    if sold_col  and sold_col  != "Net items sold":
        df = df.rename(columns={sold_col:  "Net items sold"})

    # ── Numeric coercion ────────────────────────────────────────────
    for col in ["Total sales", "Net items sold"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # ── Keep only relevant columns (flex: include any that exist) ──
    available = [c for c in SHOPIFY_KEEP_COLS if c in df.columns]
    missing   = [c for c in SHOPIFY_KEEP_COLS if c not in df.columns]
    if missing:
        warnings.append(f"Shopify: These expected columns were not found: {missing}")

    df = df[available].copy()

    # ── Drop rows where Product ID is empty/NaN ─────────────────────
    df = df[df["Product ID"].notna() & (df["Product ID"].astype(str).str.strip() != "")]
    df = df.reset_index(drop=True)

    return df, warnings


# ──────────────────────────────────────────────────────────────────────
#  GOOGLE CLEANER
# ──────────────────────────────────────────────────────────────────────

def _google_month_to_range(val: str) -> str:
    """
    Convert Google's month format to YYYY-MM-DD (start-of-month).

    Input examples:
      "April 2026"  → "2026-04-01"
      "March 2026"  → "2026-03-01"
      "2026-03-01"  → "2026-03-01"  (pass-through)
    """
    s = str(val).strip()
    # Already ISO-ish
    if re.match(r'^\d{4}-\d{2}', s):
        return s
    # "Month YYYY"
    m = re.match(r'^([A-Za-z]+)\s+(\d{4})$', s)
    if m:
        month_name = m.group(1).lower()
        year       = m.group(2)
        num        = MONTH_NAME_MAP.get(month_name)
        if num:
            return f"{year}-{num}-01"
    return s  # fallback — return as-is


def _extract_google_product_id(item_id: str) -> str:
    """
    Extract the numeric Product ID from a Google Item ID.

    Formats seen:
      "shopify_in_8411374944471_44942812283095"  → "44942812283095"
      "shopify_in_4870630408271_32897592655951"  → "32897592655951"
      "47041559429335"                            → "47041559429335"   (already numeric)
    """
    s = str(item_id).strip()
    # If it starts with "shopify_", take everything after the 3rd underscore
    if s.lower().startswith("shopify_"):
        parts = s.split("_")
        # parts: ['shopify', 'in', '<store_id>', '<variant_id>']
        if len(parts) >= 4:
            return parts[-1]   # last segment is the variant/product ID
    # Already numeric or some other format — return as-is
    return s


def clean_google(file_obj) -> Tuple[pd.DataFrame, list]:
    """
    Clean raw Google Ads / Shopping export.

    Raw format:
      - First 2 rows are report metadata ("Campaign performance", date range)
      - Actual headers start at row 3 (0-indexed: header=2)
      - Item ID contains "shopify_in_<store>_<variant_id>" or plain numeric
      - Month: "April 2026" → convert to "2026-04-01"

    Returns (cleaned_df, warnings_list)
    """
    warnings = []

    # ── Read skipping the first 2 metadata rows ─────────────────────
    # Try header=2 first
    df = _read_file(file_obj, header=2)
    df = _strip_bom(df)

    # Detect if we actually got proper headers or if metadata was different
    # A reliable signal: one of the expected column names is present
    expected = {"item id", "product title", "month", "cost", "conversions"}
    actual   = {c.lower() for c in df.columns}
    overlap  = expected & actual

    if len(overlap) < 2:
        # Fallback: try header=0 (no metadata rows, or already cleaned)
        file_obj.seek(0)
        df = _read_file(file_obj, header=0)
        df = _strip_bom(df)
        actual = {c.lower() for c in df.columns}
        overlap = expected & actual
        if len(overlap) < 2:
            raise ValueError(
                "Google file: Cannot detect header row. "
                "Expected columns: Item ID, Product Title, Month, Cost, Conversions. "
                "Make sure this is an unmodified Google Shopping/Performance export."
            )

    # ── Drop unnamed/empty columns (artefacts from extra blank cols) ─
    df = df[[c for c in df.columns if not str(c).startswith("Unnamed:")]]

    # ── Locate key columns ──────────────────────────────────────────
    item_id_col    = _find_col(df, "item id", "item_id")
    title_col      = _find_col(df, "product title", "title", "name")
    month_col      = _find_col(df, "month")
    cost_col       = _find_col(df, "cost", "spend", "amount")
    conv_col       = _find_col(df, "conversion", "conv")

    if item_id_col is None:
        raise ValueError("Google file: 'Item ID' column not found.")

    # ── Extract clean Product ID ────────────────────────────────────
    df["Google Item ID"] = df[item_id_col].astype(str)   # save original BEFORE extracting
    df["Product ID"]     = df[item_id_col].apply(_extract_google_product_id)

    # ── Rename columns ──────────────────────────────────────────────
    rename_map = {}
    if title_col and title_col != "Product Title":
        rename_map[title_col] = "Product Title"
    if month_col and month_col != "Month":
        rename_map[month_col] = "Month"
    if cost_col  and cost_col  != "Cost":
        rename_map[cost_col]  = "Cost"
    if conv_col  and conv_col  != "Conversions":
        rename_map[conv_col]  = "Conversions"

    df = df.rename(columns=rename_map)

    # ── Convert Month: "April 2026" → "2026-04-01" ─────────────────
    if "Month" in df.columns:
        df["Month"] = df["Month"].apply(_google_month_to_range)
    else:
        warnings.append("Google: 'Month' column not found — monthly analysis unavailable.")

    # ── Numeric coercion ────────────────────────────────────────────
    for col in ["Cost", "Conversions"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # ── Keep only relevant columns ──────────────────────────────────
    available = [c for c in GOOGLE_KEEP_COLS if c in df.columns]
    missing   = [c for c in GOOGLE_KEEP_COLS if c not in df.columns]
    if missing:
        warnings.append(f"Google: These expected columns were not found: {missing}")

    df = df[available].copy()

    # ── Drop rows where Product ID is empty/NaN ─────────────────────
    df = df[df["Product ID"].notna() & (df["Product ID"].astype(str).str.strip() != "")]
    df = df.reset_index(drop=True)

    return df, warnings


# ──────────────────────────────────────────────────────────────────────
#  CLEANING PREVIEW HELPER  (for the UI diff display)
# ──────────────────────────────────────────────────────────────────────

def cleaning_summary(raw_df: pd.DataFrame, clean_df: pd.DataFrame,
                     source: str) -> dict:
    """Return a dict describing what changed between raw and clean."""
    return {
        "source":          source,
        "raw_rows":        len(raw_df),
        "clean_rows":      len(clean_df),
        "raw_columns":     raw_df.columns.tolist(),
        "clean_columns":   clean_df.columns.tolist(),
        "rows_dropped":    len(raw_df) - len(clean_df),
        "cols_added":      [c for c in clean_df.columns if c not in raw_df.columns],
        "cols_removed":    [c for c in raw_df.columns  if c not in clean_df.columns],
    }