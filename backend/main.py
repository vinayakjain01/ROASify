# backend/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
import io, json, math
import pandas as pd
from data_cleaner import clean_meta, clean_shopify, clean_google
from analytics import (
    run_overall_view,
    run_product_analysis,
    run_discount_analysis,
)

app = FastAPI(title="ROASify API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _safe(v):
    """Convert NaN/Inf to None for JSON serialisation."""
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def df_to_records(df: pd.DataFrame) -> list:
    """Convert DataFrame to JSON-safe list of dicts."""
    return [
        {k: _safe(v) for k, v in row.items()}
        for row in df.to_dict(orient="records")
    ]


@app.post("/api/analyse")
async def analyse(
    meta_file: UploadFile = File(...),
    shopify_file: UploadFile = File(...),
    google_file: UploadFile = File(None),
    spend_pct_thresh: float = 100,
    rev_pct_thresh: float = 100,
):
    # ── Read uploads ──────────────────────────────────────────────────
    meta_bytes    = await meta_file.read()
    shopify_bytes = await shopify_file.read()

    meta_io       = io.BytesIO(meta_bytes);    meta_io.name    = meta_file.filename
    shopify_io    = io.BytesIO(shopify_bytes); shopify_io.name = shopify_file.filename

    try:
        meta_df, meta_warns       = clean_meta(meta_io)
        shopify_df, shopify_warns = clean_shopify(shopify_io)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    google_df     = None
    google_warns  = []
    if google_file:
        google_bytes = await google_file.read()
        google_io    = io.BytesIO(google_bytes); google_io.name = google_file.filename
        try:
            google_df, google_warns = clean_google(google_io)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Google file error: {e}")

    # ── Run engines ───────────────────────────────────────────────────
    try:
        merged_df, has_month = run_overall_view(meta_df, shopify_df, google_df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Overall view error: {e}")

    try:
        product_result = run_product_analysis(
            meta_df, shopify_df,
            spend_pct_thresh=spend_pct_thresh,
            rev_pct_thresh=rev_pct_thresh,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Product analysis error: {e}")

    discount_result = None
    try:
        discount_result = run_discount_analysis(
            meta_df, shopify_df,
            spend_pct_thresh=spend_pct_thresh,
            rev_pct_thresh=rev_pct_thresh,
        )
    except Exception:
        pass  # discount analysis is optional

    # ── Build response ────────────────────────────────────────────────
    products_records = df_to_records(merged_df)

    # KPIs
    kpis = {
        "totalProducts":  int(merged_df["Product ID"].nunique()),
        "totalMetaSpend": float(merged_df["Meta Spend"].sum())    if "Meta Spend"      in merged_df.columns else 0,
        "totalGoogleCost":float(merged_df["Google Cost"].sum())   if "Google Cost"     in merged_df.columns else 0,
        "totalSpend":     float(merged_df["Total Spend"].sum())   if "Total Spend"     in merged_df.columns else 0,
        "totalRevenue":   float(merged_df["Shopify Revenue"].sum()) if "Shopify Revenue" in merged_df.columns else 0,
    }
    kpis["overallRoi"] = kpis["totalRevenue"] / kpis["totalSpend"] if kpis["totalSpend"] else 0

    # Quadrant data
    quadrants = {
        "q1": df_to_records(product_result["q1"]),  # Champions
        "q2": df_to_records(product_result["q2"]),  # Contenders
        "q3": df_to_records(product_result["q3"]),  # Casualties
        "q4": df_to_records(product_result["q4"]),  # Cruisers
        "spCut": _safe(product_result["sp_cut"]),
        "rvCut": _safe(product_result["rv_cut"]),
    }

    discount_data = None
    if discount_result:
        disc_df, months_ordered, disc_merged, insights, overall_insights, title_map = discount_result
        discount_data = {
            "summary":         df_to_records(disc_df),
            "monthsOrdered":   months_ordered,
        }

    return {
        "ok":           True,
        "hasMonth":     has_month,
        "hasGoogle":    google_df is not None,
        "products":     products_records,
        "kpis":         kpis,
        "quadrants":    quadrants,
        "discountData": discount_data,
        "warnings":     meta_warns + shopify_warns + google_warns,
    }


@app.get("/health")
def health():
    return {"status": "ok"}