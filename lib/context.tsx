"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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
  q1: Product[];
  q2: Product[];
  q3: Product[];
  q4: Product[];
  all: Product[];
  monthly: Product[];
  sp_cut: number;
  rv_cut: number;
  avg_sp: number;
  avg_rv: number;
  total_months: number;
}

interface StoredFile {
  file: File;
  name: string;
  size: number;
}

interface AppState {
  // Stored files (persist across page switches)
  metaFile:     StoredFile | null;
  shopifyFile:  StoredFile | null;
  googleFile:   StoredFile | null;
  discountFile: StoredFile | null;
  setMetaFile:     (f: File | null) => void;
  setShopifyFile:  (f: File | null) => void;
  setGoogleFile:   (f: File | null) => void;
  setDiscountFile: (f: File | null) => void;

  // Merged product analysis data
  mergedData:    Product[] | null;
  mergedSummary: MergedSummary | null;
  hasMonth:      boolean;
  hasGoogle:     boolean;
  warnings:      string[];
  setMergedResult: (
    data: Product[],
    summary: MergedSummary,
    hm: boolean,
    hg: boolean,
    warns: string[]
  ) => void;
  clearMergedData: () => void;

  // Quadrant data
  quadrantData: QuadrantData | null;
  setQuadrantData: (d: QuadrantData) => void;
  clearQuadrantData: () => void;
}

const AppContext = createContext<AppState | null>(null);

function toStoredFile(f: File | null): StoredFile | null {
  if (!f) return null;
  return { file: f, name: f.name, size: f.size };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [metaFile,      setMetaFileRaw]     = useState<StoredFile | null>(null);
  const [shopifyFile,   setShopifyFileRaw]  = useState<StoredFile | null>(null);
  const [googleFile,    setGoogleFileRaw]   = useState<StoredFile | null>(null);
  const [discountFile,  setDiscountFileRaw] = useState<StoredFile | null>(null);

  const [mergedData,    setMergedData]    = useState<Product[] | null>(null);
  const [mergedSummary, setMergedSummary] = useState<MergedSummary | null>(null);
  const [hasMonth,      setHasMonth]      = useState(false);
  const [hasGoogle,     setHasGoogle]     = useState(false);
  const [warnings,      setWarnings]      = useState<string[]>([]);
  const [quadrantData,  setQuadrantDataRaw] = useState<QuadrantData | null>(null);

  const setMetaFile     = useCallback((f: File | null) => setMetaFileRaw(toStoredFile(f)), []);
  const setShopifyFile  = useCallback((f: File | null) => setShopifyFileRaw(toStoredFile(f)), []);
  const setGoogleFile   = useCallback((f: File | null) => setGoogleFileRaw(toStoredFile(f)), []);
  const setDiscountFile = useCallback((f: File | null) => setDiscountFileRaw(toStoredFile(f)), []);

  const setMergedResult = useCallback((
    data: Product[], summary: MergedSummary,
    hm: boolean, hg: boolean, warns: string[]
  ) => {
    setMergedData(data);
    setMergedSummary(summary);
    setHasMonth(hm);
    setHasGoogle(hg);
    setWarnings(warns);
  }, []);

  const clearMergedData   = useCallback(() => { setMergedData(null); setMergedSummary(null); }, []);
  const setQuadrantData   = useCallback((d: QuadrantData) => setQuadrantDataRaw(d), []);
  const clearQuadrantData = useCallback(() => setQuadrantDataRaw(null), []);

  return (
    <AppContext.Provider value={{
      metaFile, shopifyFile, googleFile, discountFile,
      setMetaFile, setShopifyFile, setGoogleFile, setDiscountFile,
      mergedData, mergedSummary, hasMonth, hasGoogle, warnings,
      setMergedResult, clearMergedData,
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