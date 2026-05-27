"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { mergeFiles } from "@/lib/api";
import { inr, roi, pct, num, fileSize, roiColor } from "@/lib/formatters";

// ── Types ─────────────────────────────────────────────────────────────
type Operator = ">" | "<" | "=" | ">=" | "<=" | "between" | null;

interface MetricFilter {
  id:      string;
  col:     string;
  op:      Operator;
  val:     number;
  val2:    number;
}

const METRIC_COLS = [
  { key: "Meta Spend",         label: "Meta Spend (₹)",  fmt: "currency" },
  { key: "Google Cost",        label: "Google Cost (₹)", fmt: "currency" },
  { key: "Total Spend",        label: "Total Spend (₹)", fmt: "currency" },
  { key: "Shopify Revenue",    label: "Revenue (₹)",     fmt: "currency" },
  { key: "ROI",                label: "ROI",             fmt: "roi"      },
  { key: "Net Items Sold",     label: "Items Sold",      fmt: "int"      },
  { key: "Landing Page Views", label: "LPV",             fmt: "int"      },
  { key: "CTR",                label: "CTR",             fmt: "pct"      },
  { key: "CPM",                label: "CPM (₹)",         fmt: "currency" },
];

const ALL_COLS = [
  { key: "Meta Spend",         label: "Meta Spend (₹)",  source: "Meta"    },
  { key: "Google Cost",        label: "Google Cost (₹)", source: "Google"  },
  { key: "Total Spend",        label: "Total Spend (₹)", source: "Derived" },
  { key: "Shopify Revenue",    label: "Revenue (₹)",     source: "Shopify" },
  { key: "ROI",                label: "ROI",             source: "Derived" },
  { key: "Net Items Sold",     label: "Items Sold",      source: "Shopify" },
  { key: "Landing Page Views", label: "LPV",             source: "Meta"    },
  { key: "CTR",                label: "CTR",             source: "Meta"    },
  { key: "CPM",                label: "CPM (₹)",         source: "Meta"    },
  { key: "Variant Title",      label: "Variant Title",   source: "Shopify" },
];

const DEFAULT_COLS = [
  "Meta Spend","Total Spend","Shopify Revenue","ROI",
  "Net Items Sold","CTR","CPM","Variant Title"
];

const OPS: { label: string; val: Operator }[] = [
  { label: "—",         val: null      },
  { label: "> Greater", val: ">"       },
  { label: "< Less",    val: "<"       },
  { label: "= Equal",   val: "="       },
  { label: ">= ≥",      val: ">="      },
  { label: "<= ≤",      val: "<="      },
  { label: "↔ Between", val: "between" },
];

// ── Upload Card ───────────────────────────────────────────────────────
function UploadCard({
  label, required, sublabel, color,
  stored, onFile, onClear,
}: {
  label: string; required: boolean; sublabel: string; color: string;
  stored: { name: string; size: number } | null;
  onFile: (f: File) => void; onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (files?.[0]) onFile(files[0]);
  }

  return (
    <div
      className={`rounded-xl border bg-white p-5 flex flex-col gap-3
        ${dragging ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm" style={{ color }}>{label}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
          ${required ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
          {required ? "Required" : "Optional"}
        </span>
      </div>
      <p className="text-xs text-gray-400">{sublabel}</p>

      {/* Upload zone or stored badge */}
      {stored ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200
          rounded-lg px-3 py-2 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-green-600 text-base">✓</span>
            <div className="min-w-0">
              <div className="font-medium text-green-800 truncate text-xs">{stored.name}</div>
              <div className="text-green-600 text-xs">{fileSize(stored.size)} — stored, no re-upload needed</div>
            </div>
          </div>
          <button onClick={onClear}
            className="ml-2 text-green-400 hover:text-red-500 text-lg flex-shrink-0">×</button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 hover:border-indigo-400
            rounded-lg p-6 flex flex-col items-center gap-2 text-gray-400
            hover:bg-indigo-50 transition-colors w-full"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
          </svg>
          <span className="text-xs font-medium">Drop your CSV, or click to browse</span>
          <span className="text-xs">CSV, XLSX · max 25 MB</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls"
        className="hidden" onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}

// ── Sidebar averages ──────────────────────────────────────────────────
function SidebarAverages({ data, hasGoogle }: { data: any[]; hasGoogle: boolean }) {
  if (!data.length) return (
    <div className="text-xs text-gray-400 text-center py-4">
      Upload files and run Merge & Analyse to see averages
    </div>
  );
  const n = data.length || 1;
  const sum = (key: string) => data.reduce((a, r) => a + (Number(r[key]) || 0), 0);
  const avgMeta   = sum("Meta Spend") / n;
  const avgGoogle = sum("Google Cost") / n;
  const avgTotal  = sum("Total Spend") / n;
  const avgRev    = sum("Shopify Revenue") / n;
  const avgRoi    = sum("Total Spend") > 0 ? sum("Shopify Revenue") / sum("Total Spend") : 0;
  const avgLpv    = sum("Landing Page Views") / n;

  const rows = [
    { label: "Avg Meta Spend",   val: inr(avgMeta,   true), color: "#60A5FA" },
    hasGoogle ? { label: "Avg Google Spend", val: inr(avgGoogle, true), color: "#FBBF24" } : null,
    { label: "Avg Total Spend",  val: inr(avgTotal,  true), color: "#A78BFA" },
    { label: "Avg Revenue",      val: inr(avgRev,    true), color: "#34D399" },
    { label: "Avg ROI",          val: roi(avgRoi),          color: "#34D399" },
    { label: "Avg LPV",          val: num(avgLpv),          color: "#60A5FA" },
  ].filter(Boolean) as { label: string; val: string; color: string }[];

  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.label}
          className="rounded-lg px-3 py-2"
          style={{ background: "#1E293B", borderLeft: `3px solid ${r.color}` }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{r.label}</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: r.color }}>{r.val}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function ProductAnalysisPage() {
  const router = useRouter();
  const {
    metaFile, shopifyFile, googleFile,
    setMetaFile, setShopifyFile, setGoogleFile,
    mergedData, mergedSummary, hasGoogle, warnings,
    setMergedResult,
  } = useApp();

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<string[]>(DEFAULT_COLS);

  // Search
  const [searchField, setSearchField] = useState("Product Title");
  const [searchText,  setSearchText]  = useState("");

  // Metric filters
  const [filters,        setFilters]        = useState<MetricFilter[]>([]);
  const [filtersOpen,    setFiltersOpen]     = useState(false);
  const [appliedFilters, setAppliedFilters]  = useState<MetricFilter[]>([]);
  const [appliedSearch,  setAppliedSearch]   = useState({ field: "", text: "" });

  // Download filename
  const [filename, setFilename] = useState("roasify_product_analysis.csv");

  // ── Merge handler ───────────────────────────────────────────────────
  async function handleMerge() {
  if (!metaFile || !shopifyFile) {
    console.log("Files missing");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    console.log("Button clicked");

    console.log("Meta:", metaFile);
    console.log("Shopify:", shopifyFile);
    console.log("Google:", googleFile);

    const result = await mergeFiles(
      metaFile.file,
      shopifyFile.file,
      googleFile?.file ?? null
    );

    console.log("API RESPONSE:");
    console.log(result);

    setMergedResult(
      result.data,
      result.summary,
      result.has_month,
      result.has_google,
      result.warnings ?? []
    );

  } catch (e:any) {
    console.error("MERGE ERROR:", e);

    setError(
      e.message || "Unknown error"
    );

  } finally {
    setLoading(false);
  }
}

  // ── Add metric filter ───────────────────────────────────────────────
  function addFilter() {
    setFilters(f => [...f, {
      id: Math.random().toString(36).slice(2),
      col: METRIC_COLS[0].key, op: null, val: 0, val2: 0
    }]);
  }

  function updateFilter(id: string, patch: Partial<MetricFilter>) {
    setFilters(f => f.map(fi => fi.id === id ? { ...fi, ...patch } : fi));
  }

  function removeFilter(id: string) {
    setFilters(f => f.filter(fi => fi.id !== id));
  }

  // ── Apply filters ───────────────────────────────────────────────────
  function applyFilters() {
    setAppliedFilters(filters.filter(f => f.op !== null));
    setAppliedSearch({ field: searchField, text: searchText });
    setFiltersOpen(false);
  }

  function resetFilters() {
    setFilters([]); setAppliedFilters([]);
    setSearchText(""); setAppliedSearch({ field: "", text: "" });
  }

  // ── Filtered data ───────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!mergedData) return [];
    let rows = [...mergedData];

    // Search
    if (appliedSearch.text) {
      const q = appliedSearch.text.toLowerCase();
      rows = rows.filter(r => {
        const v = String(r[appliedSearch.field as keyof typeof r] ?? "").toLowerCase();
        return v.includes(q);
      });
    }

    // Metric filters
    for (const f of appliedFilters) {
      if (!f.op) continue;
      rows = rows.filter(r => {
        const v = Number(r[f.col as keyof typeof r] ?? 0);
        if (f.op === ">")       return v > f.val;
        if (f.op === "<")       return v < f.val;
        if (f.op === "=")       return v === f.val;
        if (f.op === ">=")      return v >= f.val;
        if (f.op === "<=")      return v <= f.val;
        if (f.op === "between") return v >= f.val && v <= f.val2;
        return true;
      });
    }
    return rows;
  }, [mergedData, appliedSearch, appliedFilters]);

  // ── Totals ──────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (!filteredData.length) return {};
    const sum = (k: string) => filteredData.reduce((a, r) => a + (Number(r[k as keyof typeof r]) || 0), 0);
    return {
      "Meta Spend":         sum("Meta Spend"),
      "Google Cost":        sum("Google Cost"),
      "Total Spend":        sum("Total Spend"),
      "Shopify Revenue":    sum("Shopify Revenue"),
      "Net Items Sold":     sum("Net Items Sold"),
      "Landing Page Views": sum("Landing Page Views"),
      "ROI": sum("Total Spend") > 0 ? sum("Shopify Revenue") / sum("Total Spend") : 0,
      "CTR": filteredData.reduce((a, r) => a + (Number(r["CTR"]) || 0), 0) / filteredData.length,
      "CPM": filteredData.reduce((a, r) => a + (Number(r["CPM"]) || 0), 0) / filteredData.length,
    };
  }, [filteredData]);

  // ── Format cell value ───────────────────────────────────────────────
  function fmtCell(val: any, colKey: string): string {
    if (val === null || val === undefined || val === "") return "—";
    const n = Number(val);
    if (colKey === "ROI")   return roi(n);
    if (colKey === "CTR")   return pct(n);
    if (colKey === "Net Items Sold" || colKey === "Landing Page Views")
      return num(n);
    if (colKey === "Variant Title") return String(val);
    return inr(n);
  }

  // ── Download CSV ────────────────────────────────────────────────────
  function downloadCSV() {
    if (!filteredData.length) return;
    const cols = ["Product ID", "Product Title", "Variant Title", ...visibleCols]
      .filter((v, i, a) => a.indexOf(v) === i);
    const header = cols.join(",");
    const rows = filteredData.map(r =>
      cols.map(c => {
        const v = r[c as keyof typeof r] ?? "";
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename.endsWith(".csv") ? filename : filename + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const canMerge = !!(metaFile && shopifyFile);
  const hasMerged = !!mergedData;

  return (
    <div className="flex min-h-screen" style={{ background: "#FAFAF8" }}>

      {/* ── Left Rail ── */}
      <aside className="fixed top-0 left-0 h-full w-60 flex flex-col z-30 border-r border-slate-800"
        style={{ background: "#17150F" }}>
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#6B63F1,#4F46E5,#3730A3)" }}>
              <span className="w-2 h-2 rounded-full bg-yellow-400 block" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">ROAS<span className="text-indigo-400">ify</span></div>
              <div className="text-slate-500 text-xs">PPM Analytics</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2">Workspace</div>
          <a href="/product-analysis"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              text-white border-l-2 border-indigo-500 bg-indigo-500/10">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            Product Analysis
          </a>
          <a href="/quadrant-view"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Quadrant View
          </a>
          <a href="/discount-analysis"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            Discount Analysis
          </a>
        </nav>

        {/* Sidebar averages */}
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            Averages per Product
          </div>
          <SidebarAverages data={mergedData ?? []} hasGoogle={hasGoogle} />
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-60 flex-1 flex flex-col">

        {/* Top bar */}
        <header className="h-14 border-b border-gray-200 bg-white flex items-center px-8 gap-4 sticky top-0 z-20">
          <div className="text-sm text-gray-400">
            Workspace <span className="mx-1">/</span>
            <span className="text-gray-800 font-medium">Product Analysis</span>
          </div>
          <div className="flex-1" />
          <button className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
            </svg>
            Export
          </button>
        </header>

        <div className="flex flex-1">
          {/* Canvas */}
          <section className="flex-1 p-8 max-w-[1100px]">

            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Product Analysis</h1>
            <p className="text-sm text-gray-500 mb-6">
              Merge Meta Ads, Shopify, and Google Ads into one product-level performance table.
            </p>

            {/* Upload band */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <UploadCard
                label="① Meta Ads" required color="#2563EB"
                sublabel="Product ID · Month · Amount Spent · Landing Page Views · CTR · CPM"
                stored={metaFile}
                onFile={f => setMetaFile(f)}
                onClear={() => setMetaFile(null)}
              />
              <UploadCard
                label="② Shopify" required color="#059669"
                sublabel="Product Variant ID · Product Title · Month · Net Sales · Net Items Sold"
                stored={shopifyFile}
                onFile={f => setShopifyFile(f)}
                onClear={() => setShopifyFile(null)}
              />
              <UploadCard
                label="③ Google Ads" required={false} color="#D97706"
                sublabel="Item ID · Product Title · Month · Cost · Conversions"
                stored={googleFile}
                onFile={f => setGoogleFile(f)}
                onClear={() => setGoogleFile(null)}
              />
            </div>

            {/* Merge bar */}
            <div className="flex items-center justify-between bg-white border border-gray-200
              rounded-xl px-5 py-4 mb-8">
              <p className="text-sm text-gray-500">
                {canMerge
                  ? `Ready to merge — ${[metaFile, shopifyFile, googleFile].filter(Boolean).length} file(s) loaded`
                  : "Upload Meta Ads and Shopify exports to enable merge. Google Ads is optional."}
              </p>
              <button
                onClick={handleMerge}
                disabled={!canMerge || loading}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition
                  disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: canMerge && !loading ? "#4F46E5" : "#6366F1" }}
              >
                {loading ? "Merging…" : "▶  Merge & Analyse"}
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}
            {warnings.length > 0 && (
              <div className="mb-4 space-y-1">
                {warnings.map((w, i) => (
                  <div key={i} className="text-xs text-yellow-700 bg-yellow-50
                    border border-yellow-200 rounded px-3 py-1">{w}</div>
                ))}
              </div>
            )}

            {/* ── Post-merge content ── */}
            {hasMerged && mergedSummary && (
              <>
                {/* Banner */}
                <div className="flex items-center gap-3 bg-green-50 border border-green-200
                  rounded-xl px-5 py-3 mb-6 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span>
                    Data merged from {hasGoogle ? "3" : "2"} sources ·{" "}
                    <strong>{mergedSummary.products} products</strong>
                  </span>
                  <span className="flex-1" />
                  <span className="text-gray-500">Period: all available months</span>
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                  {[
                    { label: "PRODUCTS",     val: String(mergedSummary.products) },
                    { label: "META SPEND",   val: inr(mergedSummary.meta_spend ?? 0, true) },
                    { label: "GOOGLE COST",  val: inr(mergedSummary.google_cost ?? 0, true) },
                    { label: "TOTAL SPEND",  val: inr(mergedSummary.total_spend, true) },
                    { label: "REVENUE",      val: inr(mergedSummary.total_rev,   true) },
                    { label: "OVERALL ROI",  val: roi(mergedSummary.roi) },
                  ].map(k => (
                    <div key={k.label} className="bg-white border border-gray-200
                      rounded-xl p-4 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                        {k.label}
                      </div>
                      <div className="text-xl font-bold text-gray-900 tabular-nums">{k.val}</div>
                    </div>
                  ))}
                </div>

                {/* Columns & Filters */}
                <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <span className="font-semibold text-sm">Columns &amp; Filters</span>
                    <button onClick={() => {
                      setVisibleCols(DEFAULT_COLS); resetFilters();
                    }} className="text-xs text-indigo-600 hover:underline">
                      Reset to default
                    </button>
                  </div>

                  {/* Column chips */}
                  <div className="px-5 py-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                      Columns shown
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_COLS.map(c => {
                        const on = visibleCols.includes(c.key);
                        return (
                          <button key={c.key}
                            onClick={() => setVisibleCols(v =>
                              on ? v.filter(x => x !== c.key) : [...v, c.key]
                            )}
                            className={`text-xs px-3 py-1 rounded-full border font-medium transition
                              ${on
                                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                                : "bg-gray-50 border-gray-200 text-gray-400"}`}
                          >
                            {c.label}
                            <span className="ml-1 opacity-60">[{c.source}]</span>
                            {on && <span className="ml-1 opacity-60">×</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search */}
                  <div className="px-5 pb-4 flex gap-3">
                    <select value={searchField} onChange={e => setSearchField(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
                      <option value="Product Title">Product Title</option>
                      <option value="Product ID">Product ID</option>
                      <option value="Variant Title">Variant Title</option>
                    </select>
                    <input
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      placeholder={`Search by ${searchField}…`}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                    />
                  </div>

                  {/* Metric filters accordion */}
                  <div
                    onClick={() => setFiltersOpen(o => !o)}
                    className="flex items-center justify-between px-5 py-3
                      bg-gray-50 border-t border-gray-100 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Metric Filters</span>
                      {appliedFilters.length > 0 && (
                        <span className="bg-indigo-600 text-white text-xs rounded-full
                          px-2 min-w-[20px] text-center">{appliedFilters.length}</span>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs">{filtersOpen ? "▲" : "▼"}</span>
                  </div>

                  {filtersOpen && (
                    <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                      {filters.map(f => (
                        <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                          <select value={f.col}
                            onChange={e => updateFilter(f.id, { col: e.target.value })}
                            className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white">
                            {METRIC_COLS.map(m => (
                              <option key={m.key} value={m.key}>{m.label}</option>
                            ))}
                          </select>
                          <select value={f.op ?? ""}
                            onChange={e => updateFilter(f.id, { op: (e.target.value || null) as Operator })}
                            className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white">
                            {OPS.map(o => (
                              <option key={o.label} value={o.val ?? ""}>{o.label}</option>
                            ))}
                          </select>
                          {f.op === "between" ? (
                            <div className="flex gap-1">
                              <input type="number" value={f.val}
                                onChange={e => updateFilter(f.id, { val: Number(e.target.value) })}
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5" placeholder="Min" />
                              <input type="number" value={f.val2}
                                onChange={e => updateFilter(f.id, { val2: Number(e.target.value) })}
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5" placeholder="Max" />
                            </div>
                          ) : (
                            <input type="number" value={f.val}
                              onChange={e => updateFilter(f.id, { val: Number(e.target.value) })}
                              className="text-xs border border-gray-200 rounded px-2 py-1.5" placeholder="Value" />
                          )}
                          <button onClick={() => removeFilter(f.id)}
                            className="text-gray-400 hover:text-red-500 text-lg px-1">×</button>
                        </div>
                      ))}
                      <button onClick={addFilter}
                        className="text-xs text-indigo-600 hover:underline">+ Add filter</button>
                      <div className="flex justify-between pt-2 border-t border-gray-100 mt-2">
                        <button onClick={resetFilters}
                          className="text-xs text-gray-500 hover:text-gray-700">Clear all</button>
                        <button onClick={applyFilters}
                          className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700">
                          ✅ Apply Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row count */}
                <div className="flex items-center gap-3 mb-3 text-sm text-gray-500">
                  <span className="bg-indigo-600 text-white rounded-lg px-3 py-1 text-xs font-bold">
                    {filteredData.length} rows
                  </span>
                  {filteredData.length < (mergedData?.length ?? 0) && (
                    <span>filtered from {mergedData?.length} total</span>
                  )}
                </div>

                {/* Totals strip */}
                {filteredData.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3
                    mb-3 flex flex-wrap gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest self-center">
                      ∑ Totals · {filteredData.length} products
                    </span>
                    {visibleCols.filter(c => c !== "Variant Title").map(c => {
                      const v = totals[c as keyof typeof totals];
                      if (v === undefined) return null;
                      const label = ALL_COLS.find(x => x.key === c)?.label ?? c;
                      return (
                        <span key={c}
                          className="text-xs font-semibold px-3 py-1 rounded-lg
                            bg-white border border-slate-200 text-slate-700">
                          {label}: {fmtCell(v, c)}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                  <div className="overflow-auto" style={{ maxHeight: 520 }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "#F2F0EA" }}>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sticky top-0 bg-[#F2F0EA]">
                            Product ID
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sticky top-0 bg-[#F2F0EA]">
                            Product Title
                          </th>
                          {visibleCols.map(c => (
                            <th key={c}
                              className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sticky top-0 bg-[#F2F0EA] whitespace-nowrap">
                              {ALL_COLS.find(x => x.key === c)?.label ?? c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((row, i) => (
                          <tr key={i}
                            className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-400 whitespace-nowrap">
                              {row["Product ID"]}
                            </td>
                            <td className="px-4 py-2.5 text-gray-800 max-w-[200px] truncate">
                              {row["Product Title"]}
                            </td>
                            {visibleCols.map(c => {
                              const val = row[c as keyof typeof row];
                              const formatted = fmtCell(val, c);
                              const isRoi = c === "ROI";
                              return (
                                <td key={c}
                                  className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap
                                    ${isRoi ? roiColor(Number(val)) : "text-gray-700"}`}>
                                  {formatted}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {filteredData.length === 0 && (
                          <tr>
                            <td colSpan={visibleCols.length + 2}
                              className="text-center py-12 text-gray-400 text-sm">
                              No products match the current filters
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Download + handoff */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="flex items-center gap-2 bg-white border border-gray-200
                    rounded-xl px-4 py-2.5">
                    <span className="text-xs text-gray-400 font-mono">filename:</span>
                    <input value={filename} onChange={e => setFilename(e.target.value)}
                      className="flex-1 text-xs font-mono bg-transparent outline-none text-gray-700" />
                  </div>
                  <button onClick={downloadCSV}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                      bg-indigo-600 hover:bg-indigo-700 transition text-center">
                    ⬇ Download CSV
                  </button>
                  <button
                    onClick={() => router.push("/quadrant-view")}
                    className="flex flex-col bg-indigo-50 border border-indigo-200
                      rounded-xl px-5 py-3 hover:bg-indigo-100 transition text-left w-full">
                    <span className="text-sm font-semibold text-indigo-800">
                      Continue to Quadrant View →
                    </span>
                    <span className="text-xs text-indigo-500 mt-0.5">
                      Classify {mergedSummary.products} products into Champions, Contenders, Cruisers, Casualties
                    </span>
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Right panel */}
          <aside className="w-72 flex-shrink-0 border-l border-gray-200 p-6 space-y-6 bg-white">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Methodology
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                ROI = Shopify Revenue ÷ (Meta Spend + Google Cost).
                Merge key is Product ID across sources.
                Products in Shopify but absent from ad platforms are included with zero spend.
              </p>
            </div>
            {mergedSummary && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Source Summary
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Meta Ads — loaded
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Shopify — loaded
                  </div>
                  {hasGoogle && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Google Ads — loaded
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}