const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ProductRow{
   [key:string]:string|number|boolean
}

export interface AnalyseResponse{
   products:ProductRow[]
   summary:any
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