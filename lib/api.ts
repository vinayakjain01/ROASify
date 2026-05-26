// lib/api.ts
export interface AnalyseResponse {
  ok:           boolean;
  hasMonth:     boolean;
  hasGoogle:    boolean;
  products:     ProductRow[];
  kpis:         Kpis;
  quadrants:    Quadrants;
  discountData: DiscountData | null;
  warnings:     string[];
}

export interface ProductRow {
  "Product ID":       string;
  "Product Title"?:   string;
  "Variant Title"?:   string;
  "Meta Spend"?:      number;
  "Google Cost"?:     number;
  "Total Spend"?:     number;
  "Shopify Revenue"?: number;
  "ROI"?:             number;
  "Net Items Sold"?:  number;
  "Landing Page Views"?: number;
  "CTR"?:             number;
  "CPM"?:             number;
  "Month"?:           string;
  [key: string]:      unknown;
}

export interface Kpis {
  totalProducts:   number;
  totalMetaSpend:  number;
  totalGoogleCost: number;
  totalSpend:      number;
  totalRevenue:    number;
  overallRoi:      number;
}

export interface Quadrants {
  q1:    ProductRow[];   // Champions  (low spend, high revenue)
  q2:    ProductRow[];   // Contenders (high spend, high revenue)
  q3:    ProductRow[];   // Casualties (high spend, low revenue)
  q4:    ProductRow[];   // Cruisers   (low spend, low revenue)
  spCut: number;
  rvCut: number;
}

export interface DiscountData {
  summary:       DiscountSummaryRow[];
  monthsOrdered: string[];
}

export interface DiscountSummaryRow {
  Month:        string;
  Category:     string;
  Spend:        number;
  Revenue:      number;
  Spend_Pct:    number;
  Revenue_Pct:  number;
  ROI:          number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function analyseFiles(
  metaFile: File,
  shopifyFile: File,
  googleFile: File | null,
  spendThresh = 100,
  revThresh   = 100,
): Promise<AnalyseResponse> {
  const form = new FormData();
  form.append("meta_file",    metaFile);
  form.append("shopify_file", shopifyFile);
  if (googleFile) form.append("google_file", googleFile);
  form.append("spend_pct_thresh", String(spendThresh));
  form.append("rev_pct_thresh",   String(revThresh));

  const res = await fetch(`${API_BASE}/api/analyse`, {
    method: "POST",
    body:   form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "API error");
  }
  return res.json();
}