"use client";
import {
  createContext, useContext, useState, useCallback,
  useMemo, useEffect, ReactNode,
} from "react";

// ── Raw Product shape from API ─────────────────────────────────────────────
export interface Product {
  "Product ID": string;
  "Product Title": string;
  "Variant Title"?: string;
  "Google Item ID"?: string;
  "Month"?: string;
  "Meta Spend": number;
  "Google Cost": number;
  "Total Spend": number;
  "Shopify Revenue": number;
  "Net Items Sold": number;
  "Landing Page Views": number;
  "Conversions": number;
  "CTR": number;
  "CPM": number;
  "ROI": number;
}

// ── Normalised, aggregated product shape ───────────────────────────────────
export interface NormProduct {
  id: string;
  title: string;
  variant: string;
  month?: string;       // undefined after aggregation
  metaSpend: number;
  googleCost: number;
  totalSpend: number;
  revenue: number;
  roi: number;
  itemsSold: number;
  lpv: number;
  conversions: number;
  ctr: number;
  cpm: number;
}

export interface MergedSummary {
  products: number;
  total_spend: number;
  total_rev: number;
  roi: number;
  meta_spend?: number;
  google_cost?: number;
  lpv?: number;
}

export interface QuadrantData {
  q1: Product[]; q2: Product[]; q3: Product[]; q4: Product[];
  all: Product[]; monthly: Product[];
  sp_cut: number; rv_cut: number; avg_sp: number; avg_rv: number;
  total_months: number;
}

interface StoredFile { file: File; name: string; size: number; }

// ── Pure helpers ───────────────────────────────────────────────────────────
function n(v: any): number { return Number(v ?? 0); }

export function normalizeOne(p: any): NormProduct {
  const metaSpend  = n(p["Meta Spend"]      ?? p.metaSpend);
  const googleCost = n(p["Google Cost"]     ?? p.googleCost);
  const totalSpend = n(p["Total Spend"]     ?? p.totalSpend ?? metaSpend + googleCost);
  const revenue    = n(p["Shopify Revenue"] ?? p.revenue);
  return {
    id:          String(p["Product ID"]        ?? p.id        ?? ""),
    title:       String(p["Product Title"]     ?? p.title     ?? ""),
    variant:     String(p["Variant Title"]     ?? p.variant   ?? ""),
    month:       p["Month"]                    ?? p.month     ?? undefined,
    metaSpend,  googleCost, totalSpend, revenue,
    roi:         totalSpend > 0 ? revenue / totalSpend : 0,
    itemsSold:   n(p["Net Items Sold"]         ?? p.itemsSold),
    lpv:         n(p["Landing Page Views"]     ?? p.lpv),
    conversions: n(p["Conversions"]            ?? p.conversions),
    ctr:         n(p["CTR"]                    ?? p.ctr),
    cpm:         n(p["CPM"]                    ?? p.cpm),
  };
}

// FIX 2: single-pass loop instead of 8 separate .reduce() calls
function aggregateGroup(rows: NormProduct[]): NormProduct {
  const first = rows[0];
  let totMeta = 0, totGoog = 0, totSpend = 0, totRev = 0;
  let totItems = 0, totLpv = 0, totConv = 0;
  let ctrAcc = 0, cpmAcc = 0;

  for (const r of rows) {
    totMeta  += r.metaSpend;
    totGoog  += r.googleCost;
    totSpend += r.totalSpend;
    totRev   += r.revenue;
    totItems += r.itemsSold;
    totLpv   += r.lpv;
    totConv  += r.conversions;
    ctrAcc   += r.ctr * r.lpv;
    cpmAcc   += r.cpm * r.metaSpend;
  }

  const lpvW  = totLpv  > 0 ? totLpv  : rows.length;
  const metaW = totMeta > 0 ? totMeta : rows.length;

  return {
    id: first.id, title: first.title, variant: first.variant,
    month: undefined,
    metaSpend: totMeta, googleCost: totGoog, totalSpend: totSpend,
    revenue: totRev,
    roi: totSpend > 0 ? totRev / totSpend : 0,
    itemsSold: totItems, lpv: totLpv, conversions: totConv,
    ctr: ctrAcc / lpvW,
    cpm: cpmAcc / metaW,
  };
}

function groupById(rows: NormProduct[]): NormProduct[] {
  const map = new Map<string, NormProduct[]>();
  for (const r of rows) {
    if (!map.has(r.id)) map.set(r.id, []);
    map.get(r.id)!.push(r);
  }
  return Array.from(map.values()).map(aggregateGroup);
}

function detectMonths(rows: NormProduct[]): string[] {
  const set = new Set<string>();
  for (const r of rows) { if (r.month) set.add(r.month); }
  return Array.from(set).sort((a, b) => {
    const da = new Date(a + " 1"), db = new Date(b + " 1");
    if (!isNaN(da.getTime()) && !isNaN(db.getTime())) return da.getTime() - db.getTime();
    return a.localeCompare(b);
  });
}

// ── Context shape ──────────────────────────────────────────────────────────
interface AppState {
  metaFile: StoredFile | null; shopifyFile: StoredFile | null;
  googleFile: StoredFile | null; discountFile: StoredFile | null;
  setMetaFile: (f: File | null) => void;
  setShopifyFile: (f: File | null) => void;
  setGoogleFile: (f: File | null) => void;
  setDiscountFile: (f: File | null) => void;

  mergedData: Product[] | null;
  mergedSummary: MergedSummary | null;
  hasMonth: boolean; hasGoogle: boolean; warnings: string[];
  setMergedResult: (data: Product[], summary: MergedSummary, hm: boolean, hg: boolean, warns: string[]) => void;
  clearMergedData: () => void;

  // ── Global month selection ───────────────────────────────────────────
  allMonths: string[];
  selectedMonths: Set<string>;
  toggleMonth: (m: string) => void;
  selectAllMonths: () => void;

  // ── Computed: month-filtered + aggregated by product ID ─────────────
  // This is the SINGLE source of truth for all display components.
  aggregatedProducts: NormProduct[];

  quadrantData: QuadrantData | null;
  setQuadrantData: (d: QuadrantData) => void;
  clearQuadrantData: () => void;
}

const AppContext = createContext<AppState | null>(null);
const toStored = (f: File | null): StoredFile | null =>
  f ? { file: f, name: f.name, size: f.size } : null;

// ── Provider ───────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [metaFile,     setMetaRaw]     = useState<StoredFile | null>(null);
  const [shopifyFile,  setShopifyRaw]  = useState<StoredFile | null>(null);
  const [googleFile,   setGoogleRaw]   = useState<StoredFile | null>(null);
  const [discountFile, setDiscountRaw] = useState<StoredFile | null>(null);

  const [mergedData,    setMergedDataRaw]    = useState<Product[] | null>(null);
  const [mergedSummary, setMergedSummaryRaw] = useState<MergedSummary | null>(null);
  const [hasMonth,   setHasMonth]   = useState(false);
  const [hasGoogle,  setHasGoogle]  = useState(false);
  const [warnings,   setWarnings]   = useState<string[]>([]);
  const [quadrantData, setQRaw]     = useState<QuadrantData | null>(null);

  // ── Month selection — lives here so TopBar and pages share the same state
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());

  const setMetaFile     = useCallback((f: File | null) => setMetaRaw(toStored(f)),    []);
  const setShopifyFile  = useCallback((f: File | null) => setShopifyRaw(toStored(f)), []);
  const setGoogleFile   = useCallback((f: File | null) => setGoogleRaw(toStored(f)),  []);
  const setDiscountFile = useCallback((f: File | null) => setDiscountRaw(toStored(f)),[]);

  // FIX 1: setMergedResult no longer calls normalizeOne itself.
  // Month auto-selection is handled by the useEffect below that watches
  // normalizedProducts, so we avoid a redundant map(normalizeOne) here.
  const setMergedResult = useCallback((
    data: Product[], summary: MergedSummary,
    hm: boolean, hg: boolean, warns: string[]
  ) => {
    setMergedDataRaw(data);
    setMergedSummaryRaw(summary);
    setHasMonth(hm); setHasGoogle(hg); setWarnings(warns);
    // selectedMonths will be auto-populated by the useEffect on normalizedProducts
  }, []);

  const clearMergedData = useCallback(() => {
    setMergedDataRaw(null); setMergedSummaryRaw(null);
    setSelectedMonths(new Set());
  }, []);

  const setQuadrantData   = useCallback((d: QuadrantData) => setQRaw(d), []);
  const clearQuadrantData = useCallback(() => setQRaw(null), []);

  // ── FIX 1: Normalize ONCE, only when raw data changes ─────────────────
  // Previously, normalizeOne ran 3 separate times:
  //   1. inside setMergedResult (detectMonths call)
  //   2. inside allMonths useMemo
  //   3. inside aggregatedProducts useMemo
  // Now it runs exactly once and both allMonths and aggregatedProducts
  // derive from this single normalized array.
  const normalizedProducts = useMemo((): NormProduct[] => {
    if (!mergedData || mergedData.length === 0) return [];
    return mergedData.map(normalizeOne);
  }, [mergedData]);

  // ── Auto-select all months whenever normalized data is refreshed ───────
  // Replaces the detectMonths(data.map(normalizeOne)) call inside setMergedResult.
  useEffect(() => {
    if (normalizedProducts.length > 0) {
      const months = detectMonths(normalizedProducts);
      setSelectedMonths(new Set(months));
    }
  }, [normalizedProducts]);

  // ── Derived: sorted month list — reads from normalizedProducts ─────────
  const allMonths = useMemo(() => {
    if (!normalizedProducts.length) return [];
    return detectMonths(normalizedProducts);
  }, [normalizedProducts]);

  // ── Month actions ──────────────────────────────────────────────────────
  const toggleMonth = useCallback((m: string) => {
    setSelectedMonths(prev => {
      const next = new Set(prev);
      if (next.has(m)) {
        if (next.size === 1) return prev; // always keep at least one
        next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  }, []);

  const selectAllMonths = useCallback(() => {
    setSelectedMonths(new Set(allMonths));
  }, [allMonths]);

  // ── Derived: aggregatedProducts ────────────────────────────────────────
  // Reads from normalizedProducts (already computed above) — no second
  // map(normalizeOne) call here.
  //   1. Keep only rows whose month is in selectedMonths
  //      (if no month column exists, keep all rows)
  //   2. Group by product ID and SUM numeric fields via aggregateGroup
  //      (FIX 2: aggregateGroup now uses a single-pass loop)
  // Result: one row per product with spend/revenue totalled across selected months.
  const aggregatedProducts = useMemo((): NormProduct[] => {
    if (!normalizedProducts.length) return [];
    const hasMonthCol = normalizedProducts.some(r => r.month);
    const filtered = hasMonthCol
      ? normalizedProducts.filter(r => !r.month || selectedMonths.has(r.month))
      : normalizedProducts;
    return groupById(filtered);
  }, [normalizedProducts, selectedMonths]);

  return (
    <AppContext.Provider value={{
      metaFile, shopifyFile, googleFile, discountFile,
      setMetaFile, setShopifyFile, setGoogleFile, setDiscountFile,
      mergedData, mergedSummary, hasMonth, hasGoogle, warnings,
      setMergedResult, clearMergedData,
      allMonths, selectedMonths, toggleMonth, selectAllMonths,
      aggregatedProducts,
      quadrantData, setQuadrantData, clearQuadrantData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}