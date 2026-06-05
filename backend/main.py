# backend/main.py
import os, io, math, traceback
from fastapi import FastAPI, UploadFile, File, HTTPException # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
import pandas as pd
from data_cleaner import clean_meta, clean_shopify, clean_google
from analytics import run_overall_view, run_product_analysis, run_discount_analysis

app = FastAPI(title="ROASify API")

# ── CORS ──────────────────────────────────────────────────────────────
_raw_origins = os.getenv("CORS_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _safe(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def df_to_records(df: pd.DataFrame) -> list:
    return [
        {k: _safe(v) for k, v in row.items()}
        for row in df.to_dict(orient="records")
    ]


@app.post("/api/analyse")
async def analyse(
    meta_file:     UploadFile = File(...),
    shopify_file:  UploadFile = File(...),
    google_file:   UploadFile = File(None),
    discount_file: UploadFile = File(None),
    spend_pct_thresh: float = 100,
    rev_pct_thresh:   float = 100,
):
    # ── Read uploads ──────────────────────────────────────────────────
    meta_bytes    = await meta_file.read()
    shopify_bytes = await shopify_file.read()

    meta_io    = io.BytesIO(meta_bytes);    meta_io.name    = meta_file.filename
    shopify_io = io.BytesIO(shopify_bytes); shopify_io.name = shopify_file.filename

    # ── Clean Meta + Shopify ─────────────────────────────────────────
    try:
        meta_df,    meta_warns    = clean_meta(meta_io)
        shopify_df, shopify_warns = clean_shopify(shopify_io)
    except Exception as e:
        tb = traceback.format_exc()
        raise HTTPException(status_code=422, detail=f"File parsing error: {e}\n\n{tb}")

    if len(meta_df) == 0:
        raise HTTPException(status_code=422, detail="Meta file: no valid product rows after cleaning. Check the file format.")
    if len(shopify_df) == 0:
        raise HTTPException(status_code=422, detail="Shopify file: no valid product rows after cleaning. Check the file format.")

    # ── Clean Google (optional) ──────────────────────────────────────
    google_df    = None
    google_warns = []
    if google_file:
        try:
            google_bytes = await google_file.read()
            google_io    = io.BytesIO(google_bytes); google_io.name = google_file.filename
            google_df, google_warns = clean_google(google_io)
        except Exception as e:
            google_warns = [f"Google file skipped: {e}"]

    # ── Clean Discount list (optional) ──────────────────────────────
    discount_df    = None
    discount_warns = []
    if discount_file:
        try:
            disc_bytes   = await discount_file.read()
            disc_io      = io.BytesIO(disc_bytes); disc_io.name = discount_file.filename
            # Simple: read as CSV, expect a "Product ID" column
            disc_df_raw  = pd.read_csv(disc_io, encoding='utf-8-sig') if disc_io.name.endswith('.csv') \
                           else pd.read_excel(disc_io)
            disc_df_raw.columns = [str(c).strip() for c in disc_df_raw.columns]
            pid_col = next((c for c in disc_df_raw.columns if 'product id' in c.lower()), None)
            if pid_col:
                discount_df = disc_df_raw.rename(columns={pid_col: "Product ID"})
            else:
                discount_warns = ["Discount file: 'Product ID' column not found."]
        except Exception as e:
            discount_warns = [f"Discount file skipped: {e}"]

    # ── Run Overall View ─────────────────────────────────────────────
    try:
        merged_df, has_month = run_overall_view(meta_df, shopify_df, google_df)
    except Exception as e:
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Merge error: {e}\n\n{tb}")

    # ── Run Product Analysis ─────────────────────────────────────────
    try:
        product_result = run_product_analysis(
            meta_df, shopify_df,
            spend_pct_thresh=spend_pct_thresh,
            rev_pct_thresh=rev_pct_thresh,
        )
    except Exception as e:
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Product analysis error: {e}\n\n{tb}")

    # ── Run Discount Analysis (only if discount file provided) ───────
    discount_data = None
    if discount_df is not None:
        try:
            disc_result = run_discount_analysis(
                meta_df, shopify_df,
                discount=discount_df,          # ← correctly passed now
                spend_pct_thresh=spend_pct_thresh,
                rev_pct_thresh=rev_pct_thresh,
            )
            disc_df_out, months_ordered, disc_merged, insights, overall_insights, title_map = disc_result
            discount_data = {
                "summary":       df_to_records(disc_df_out),
                "monthsOrdered": months_ordered,
            }
        except Exception as e:
            discount_warns.append(f"Discount analysis skipped: {e}")

    # ── Build KPIs ───────────────────────────────────────────────────
    kpis = {
        "totalProducts":   int(merged_df["Product ID"].nunique()),
        "totalMetaSpend":  float(merged_df["Meta Spend"].sum())      if "Meta Spend"      in merged_df.columns else 0,
        "totalGoogleCost": float(merged_df["Google Cost"].sum())     if "Google Cost"     in merged_df.columns else 0,
        "totalSpend":      float(merged_df["Total Spend"].sum())     if "Total Spend"     in merged_df.columns else 0,
        "totalRevenue":    float(merged_df["Shopify Revenue"].sum()) if "Shopify Revenue" in merged_df.columns else 0,
    }
    kpis["overallRoi"] = kpis["totalRevenue"] / kpis["totalSpend"] if kpis["totalSpend"] else 0

    return {
        "ok":           True,
        "hasMonth":     has_month,
        "hasGoogle":    google_df is not None,
        "products":     df_to_records(merged_df),
        "kpis":         kpis,
        "quadrants": {
            "q1":    df_to_records(product_result["q1"]),
            "q2":    df_to_records(product_result["q2"]),
            "q3":    df_to_records(product_result["q3"]),
            "q4":    df_to_records(product_result["q4"]),
            "spCut": _safe(product_result["sp_cut"]),
            "rvCut": _safe(product_result["rv_cut"]),
        },
        "discountData": discount_data,
        "warnings":     meta_warns + shopify_warns + google_warns + discount_warns,
        "summary": {
            "products":    product_result["all"].to_dict(orient="records") if not product_result["all"].empty else [],
            "total_spend": kpis["totalSpend"],
            "total_rev":   kpis["totalRevenue"],
            "roi":         kpis["overallRoi"],
            "meta_spend":  kpis["totalMetaSpend"],
            "google_cost": kpis["totalGoogleCost"],
        },
    }


@app.get("/health")
def health():
    return {"status": "ok"}