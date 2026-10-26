const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: isForm ? undefined : { "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
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

export async function analyseLive(
  brandId: string,
  from: string,
  to: string,
  discountFile?: File | null,
  spendPct = 100,
  revPct   = 100
) {
  const fd = new FormData();
  fd.append("brandId", brandId);
  fd.append("from", from);
  fd.append("to", to);
  if (discountFile) fd.append("discount_file", discountFile);
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