# backend/main.py
import os, io, math, sys, traceback
from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException, Depends # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
import pandas as pd
from auth import get_current_user, CurrentUser, ensure_brand_access, user_allowed_brand_ids, require_admin
import teams as teams_admin
from supabase_admin import invite_user, SupabaseAdminError
from data_cleaner import clean_meta, clean_shopify, clean_google
from analytics import run_overall_view, run_product_analysis, run_discount_analysis
from integrations.growifyos_client import (
    GrowifyOSError,
    get_brands,
    get_status,
    get_meta_products,
    get_shopify_variants,
    get_google_products,
    get_google_totals,
)
from integrations.growifyos_mapper import (
    map_meta_products,
    map_shopify_variants,
    map_google_products,
    summarize_google_totals,
)

GOOGLE_SPEND_NOTE = (
    "Google Cost above reflects product-level (Shopping/Performance Max) spend "
    "only — it will not match your account's full Google Ads spend, same caveat "
    "as Meta spend. See Run Details for the full account total and how much of "
    "it is product-level."
)

LIVE_UNAVAILABLE_MSG = "Live data unavailable — try again or use file upload"

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


@app.get("/api/brands")
def api_brands(user: CurrentUser = Depends(get_current_user)):
    try:
        brands = get_brands()
    except GrowifyOSError as e:
        print(f"[growifyos] /api/brands failed: {e}", file=sys.stderr)
        # 500, not 502/503/504 — DigitalOcean's gateway (and many others)
        # intercepts those codes as "the platform itself is broken" and
        # replaces the body with its own generic error page, hiding this
        # message from the client entirely. 500 is passed through as-is.
        raise HTTPException(status_code=500, detail=LIVE_UNAVAILABLE_MSG)
    # Picks up any brand whose name matches a pending team_brand_names entry
    # — the moment a brand goes live on GrowifyOS, it shows up for its team
    # automatically, without any admin action.
    try:
        teams_admin.sync_team_brands_from_live_list(brands)
    except Exception as e:
        print(f"[teams] brand-name auto-resolution failed: {e}", file=sys.stderr)
    allowed = user_allowed_brand_ids(user)
    if allowed is not None:
        allowed_set = set(allowed)
        brands = [b for b in brands if b.get("brandId") in allowed_set]
    return {"ok": True, "brands": brands}


@app.get("/api/live-status")
def api_live_status(brandId: str = Query(...), user: CurrentUser = Depends(get_current_user)):
    ensure_brand_access(user, brandId)
    try:
        status = get_status(brandId)
    except GrowifyOSError as e:
        print(f"[growifyos] /api/live-status failed: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=LIVE_UNAVAILABLE_MSG)
    return {"ok": True, "status": status}


@app.post("/api/analyse-live")
async def analyse_live(
    brandId: str = Form(...),
    from_: str = Form(..., alias="from"),
    to: str = Form(...),
    discount_file: UploadFile = File(None),
    currency: str = Form("INR"),
    spend_pct_thresh: float = Form(100),
    rev_pct_thresh: float = Form(100),
    user: CurrentUser = Depends(get_current_user),
):
    ensure_brand_access(user, brandId)
    # ── Fetch + map live data (client raises GrowifyOSError on any failure,
    #    including a partial-page failure mid-pagination) ─────────────────
    try:
        meta_rows    = get_meta_products(brandId, from_, to, currency)
        shopify_rows = get_shopify_variants(brandId, from_, to, currency)
    except GrowifyOSError as e:
        print(f"[growifyos] /api/analyse-live failed: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=LIVE_UNAVAILABLE_MSG)

    meta_df    = map_meta_products(meta_rows)
    shopify_df = map_shopify_variants(shopify_rows)

    if len(meta_df) == 0:
        raise HTTPException(status_code=422, detail="No Meta data for this brand/date range.")
    if len(shopify_df) == 0:
        raise HTTPException(status_code=422, detail="No Shopify data for this brand/date range.")

    # ── Google (optional, best-effort) — a Google-side hiccup must never take
    #    down an otherwise-working Meta+Shopify sync, same tolerant posture as
    #    the CSV flow's optional Google file upload ──────────────────────────
    google_df    = None
    google_warns = []
    try:
        google_rows = get_google_products(brandId, from_, to, currency)
        google_df   = map_google_products(google_rows)
        if google_df.empty:
            google_df = None
    except Exception as e:
        # Deliberately broad — a Google-side failure (API error, or an
        # unexpected response shape the mapper can't parse) must never take
        # down an otherwise-working Meta+Shopify sync.
        print(f"[growifyos] /api/analyse-live google-products failed: {e}", file=sys.stderr)
        google_df    = None
        google_warns = ["Google data unavailable for this sync — showing Meta + Shopify only."]

    # ── Google account-level totals (optional, best-effort) — a separate,
    #    informational figure: total Google spend INCLUDING non-product
    #    campaigns (Search, Demand Gen), never merged into merged_df/analytics.
    #    A failure here must not affect the sync's core data at all. ─────────
    google_totals_summary = None
    try:
        google_totals_payload = get_google_totals(brandId, from_, to, currency)
        if google_totals_payload.get("rows"):
            google_totals_summary = summarize_google_totals(google_totals_payload)
    except Exception as e:
        print(f"[growifyos] /api/analyse-live google-totals failed: {e}", file=sys.stderr)
        google_totals_summary = None

    # ── Discount list (optional) — parsed inline here rather than shared
    #    with /api/analyse, so that endpoint's code path is never touched ──
    discount_df    = None
    discount_warns = []
    if discount_file:
        try:
            disc_bytes  = await discount_file.read()
            disc_io     = io.BytesIO(disc_bytes); disc_io.name = discount_file.filename
            disc_df_raw = pd.read_csv(disc_io, encoding='utf-8-sig') if disc_io.name.endswith('.csv') \
                          else pd.read_excel(disc_io)
            disc_df_raw.columns = [str(c).strip() for c in disc_df_raw.columns]
            pid_col = next((c for c in disc_df_raw.columns if 'product id' in c.lower()), None)
            if pid_col:
                discount_df = disc_df_raw.rename(columns={pid_col: "Product ID"})
            else:
                discount_warns = ["Discount file: 'Product ID' column not found."]
        except Exception as e:
            discount_warns = [f"Discount file skipped: {e}"]

    # ── Run Overall View ──────────────────────────────────────────────
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
                discount=discount_df,
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
    if google_totals_summary:
        kpis["totalGoogleSpendOverall"]    = google_totals_summary["totalSpend"]
        kpis["googleProductLevelSharePct"] = google_totals_summary["productLevelSharePct"]

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
        "warnings":     google_warns + discount_warns,
        # Account-wide Google figures (Search/Demand Gen included) — separate
        # from "Google Cost" above, which is product-level only. null when the
        # /google-totals fetch failed, same best-effort posture as google_df.
        "googleTotals":    google_totals_summary,
        "googleSpendNote": GOOGLE_SPEND_NOTE if google_totals_summary else None,
        "summary": {
            "products":    product_result["all"].to_dict(orient="records") if not product_result["all"].empty else [],
            "total_spend": kpis["totalSpend"],
            "total_rev":   kpis["totalRevenue"],
            "roi":         kpis["overallRoi"],
            "meta_spend":  kpis["totalMetaSpend"],
            "google_cost": kpis["totalGoogleCost"],
        },
        # Product-level Meta spend from meta-products only covers catalog/product
        # ads — it will never sum to the full ad account total. Same behavior as
        # the manual CSV flow; surfaced here so it isn't mistaken for a bug.
        "metaSpendNote": (
            "Meta spend reflects catalog/product ads only and will not match "
            "your full Meta ad account total — this is expected, same as file upload."
        ),
        # Echoes back the currency actually used for this fetch, so the
        # frontend can lock its display symbol to it rather than guessing.
        "currency": currency,
    }


@app.get("/api/auth/me")
def auth_me(user: CurrentUser = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "role": user.role, "teamId": user.team_id}


# ── Admin — teams, users, brand access (all require role='admin') ──────────

@app.get("/api/admin/teams")
def admin_list_teams(user: CurrentUser = Depends(require_admin)):
    return {"ok": True, "teams": teams_admin.list_teams()}


@app.post("/api/admin/teams")
def admin_create_team(payload: dict, user: CurrentUser = Depends(require_admin)):
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="Team name is required.")
    return {"ok": True, "team": teams_admin.create_team(name)}


@app.get("/api/admin/users")
def admin_list_users(user: CurrentUser = Depends(require_admin)):
    return {"ok": True, "users": teams_admin.list_users()}


@app.post("/api/admin/users")
def admin_invite_user(payload: dict, user: CurrentUser = Depends(require_admin)):
    email = str(payload.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=422, detail="Email is required.")
    try:
        invite_user(email)
    except SupabaseAdminError as e:
        print(f"[supabase] invite_user failed: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))
    return {"ok": True}


@app.patch("/api/admin/users/{user_id}")
def admin_update_user(user_id: str, payload: dict, user: CurrentUser = Depends(require_admin)):
    role = payload.get("role")
    if role is not None and role not in ("admin", "member"):
        raise HTTPException(status_code=422, detail="role must be 'admin' or 'member'.")
    clear_team = "teamId" in payload and payload.get("teamId") is None
    team_id = payload.get("teamId")
    try:
        updated = teams_admin.update_user(user_id, role=role, team_id=team_id, clear_team=clear_team)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"ok": True, "user": updated}


@app.get("/api/admin/brand-names")
def admin_list_brand_names(user: CurrentUser = Depends(require_admin)):
    return {"ok": True, "brandNames": teams_admin.list_brand_names()}


@app.post("/api/admin/brand-names")
def admin_create_brand_name(payload: dict, user: CurrentUser = Depends(require_admin)):
    brand_name = str(payload.get("brandName") or "").strip()
    team_id = payload.get("teamId")
    if not brand_name or not team_id:
        raise HTTPException(status_code=422, detail="brandName and teamId are required.")
    return {"ok": True, "entry": teams_admin.create_brand_name(brand_name, team_id)}


@app.delete("/api/admin/brand-names/{entry_id}")
def admin_delete_brand_name(entry_id: str, user: CurrentUser = Depends(require_admin)):
    teams_admin.delete_brand_name(entry_id)
    return {"ok": True}


@app.get("/api/admin/brand-assignments")
def admin_list_brand_assignments(user: CurrentUser = Depends(require_admin)):
    try:
        live_brands = get_brands()
    except GrowifyOSError as e:
        print(f"[growifyos] /api/admin/brand-assignments failed: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=LIVE_UNAVAILABLE_MSG)
    teams_admin.sync_team_brands_from_live_list(live_brands)
    assignments = teams_admin.get_team_brand_assignments()
    teams_by_id = {t["id"]: t["name"] for t in teams_admin.list_teams()}
    result = []
    for b in live_brands:
        bid = b.get("brandId")
        team_id = assignments.get(bid)
        result.append({
            "brandId": bid, "name": b.get("name"),
            "teamId": team_id, "teamName": teams_by_id.get(team_id),
        })
    return {"ok": True, "brands": result}


@app.put("/api/admin/brand-assignments/{brand_id}")
def admin_set_brand_assignment(brand_id: str, payload: dict, user: CurrentUser = Depends(require_admin)):
    teams_admin.set_brand_team(brand_id, payload.get("teamId"))
    return {"ok": True}


@app.get("/health")
def health():
    return {"status": "ok"}