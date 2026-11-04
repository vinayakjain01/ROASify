import { supabase } from "./supabase";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Attaches the current Supabase session token, if any, so the backend can
// identify who's calling (required for /api/brands, /api/live-status,
// /api/analyse-live — the other endpoints don't check it yet, but sending it
// everywhere is harmless).
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ProductRow {
  id?: string;
  title?: string;
  variant?: string;

  metaSpend?: number;
  googleCost?: number;
  totalSpend?: number;
  revenue?: number;
  roi?: number;

  itemsSold?: number;
  ctr?: number;
  cpm?: number;

  category?: string;
  quadrant?: string;
  discounted?: boolean;

  [key: string]:
    | string
    | number
    | boolean
    | undefined;
}

export interface AnalyseResponse {
  products: ProductRow[];
  summary: any;
}

async function post(path: string, body: FormData | object) {
  const isForm = body instanceof FormData;
  const auth = await authHeaders();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: isForm ? auth : { "Content-Type": "application/json", ...auth },
    body: isForm ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

async function get(path: string) {
  const auth = await authHeaders();
  const res = await fetch(`${BASE}${path}`, { headers: auth });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.detail === "string") message = parsed.detail;
    } catch {
      // Not JSON — fall back to the raw text as-is.
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Product Analysis ──────────────────────────────────────────────────
export async function mergeFiles(
  meta: File,
  shopify: File,
  google?: File | null
) {
  const fd = new FormData();

  fd.append("meta_file", meta);
  fd.append("shopify_file", shopify);

  if (google) {
    fd.append("google_file", google);
  }

  return post("/api/analyse", fd);
}

// ── Quadrant View ─────────────────────────────────────────────────────
export async function runQuadrant(
  meta: File,
  shopify: File,
  spendPct = 100,
  revPct   = 100
) {
  const fd = new FormData();
  fd.append("meta", meta);
  fd.append("shopify", shopify);
  fd.append("spend_pct", String(spendPct));
  fd.append("rev_pct",   String(revPct));
  return post("/api/quadrant", fd);
}

export async function recalcQuadrant(
  products: unknown[],
  spCut: number,
  rvCut: number
) {
  return post("/api/quadrant/recalc", { products, sp_cut: spCut, rv_cut: rvCut });
}

export async function getAiInsights(payload: object) {
  return post("/api/ai-insights", payload);
}

// ── Live Sync ────────────────────────────────────────────────────────
export interface Brand {
  brandId: string;
  name: string;
  shopify?: string;
  meta?: string;
}

export async function fetchBrands(): Promise<Brand[]> {
  const result = await get("/api/brands");
  return result.brands ?? [];
}

export async function fetchLiveStatus(brandId: string): Promise<any | null> {
  const result = await get(`/api/live-status?brandId=${encodeURIComponent(brandId)}`);
  return result.status ?? null;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: 'admin' | 'member';
  teamId: string | null;
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return get('/api/auth/me');
}

export async function analyseLive(
  brandId: string,
  from: string,
  to: string,
  discountFile?: File | null,
  currency = "INR",
  spendPct = 100,
  revPct   = 100
) {
  const fd = new FormData();
  fd.append("brandId", brandId);
  fd.append("from", from);
  fd.append("to", to);
  if (discountFile) fd.append("discount_file", discountFile);
  fd.append("currency", currency);
  fd.append("spend_pct_thresh", String(spendPct));
  fd.append("rev_pct_thresh", String(revPct));
  return post("/api/analyse-live", fd);
}

// ── Discount Analysis ─────────────────────────────────────────────────
export async function runDiscount(
  meta:      File,
  shopify:   File,
  discount:  File,
  spendPct = 100,
  revPct   = 100
) {
  const fd = new FormData();
  fd.append("meta",      meta);
  fd.append("shopify",   shopify);
  fd.append("discount",  discount);
  fd.append("spend_pct", String(spendPct));
  fd.append("rev_pct",   String(revPct));
  return post("/api/discount", fd);
}

// ── Admin — teams, users, brand access ──────────────────────────────────
async function adminRequest(method: string, path: string, body?: object) {
  const auth = await authHeaders();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...auth },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.detail === "string") message = parsed.detail;
    } catch {
      // Not JSON — fall back to the raw text as-is.
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface AdminTeam {
  id: string;
  name: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'member';
  teamId: string | null;
  teamName: string | null;
}

export interface AdminBrandName {
  id: string;
  brandName: string;
  teamId: string;
  teamName: string;
}

export interface AdminBrandAssignment {
  brandId: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
}

export async function fetchAdminTeams(): Promise<AdminTeam[]> {
  const r = await adminRequest("GET", "/api/admin/teams");
  return r.teams ?? [];
}

export async function createAdminTeam(name: string): Promise<AdminTeam> {
  const r = await adminRequest("POST", "/api/admin/teams", { name });
  return r.team;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const r = await adminRequest("GET", "/api/admin/users");
  return r.users ?? [];
}

// Creates the login in Supabase Auth and emails them a link to set their own
// password. Their profile (role='member', no team) appears automatically —
// assign role/team afterward via updateAdminUser.
export async function inviteAdminUser(email: string): Promise<void> {
  await adminRequest("POST", "/api/admin/users", { email });
}

export async function updateAdminUser(
  userId: string,
  patch: { role?: string; teamId?: string | null }
): Promise<AdminUser> {
  const r = await adminRequest("PATCH", `/api/admin/users/${encodeURIComponent(userId)}`, patch);
  return r.user;
}

export async function fetchAdminBrandNames(): Promise<AdminBrandName[]> {
  const r = await adminRequest("GET", "/api/admin/brand-names");
  return r.brandNames ?? [];
}

export async function createAdminBrandName(brandName: string, teamId: string): Promise<AdminBrandName> {
  const r = await adminRequest("POST", "/api/admin/brand-names", { brandName, teamId });
  return r.entry;
}

export async function deleteAdminBrandName(id: string): Promise<void> {
  await adminRequest("DELETE", `/api/admin/brand-names/${encodeURIComponent(id)}`);
}

export async function fetchAdminBrandAssignments(): Promise<AdminBrandAssignment[]> {
  const r = await adminRequest("GET", "/api/admin/brand-assignments");
  return r.brands ?? [];
}

export async function setAdminBrandAssignment(brandId: string, teamId: string | null): Promise<void> {
  await adminRequest("PUT", `/api/admin/brand-assignments/${encodeURIComponent(brandId)}`, { teamId });
}