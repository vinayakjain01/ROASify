"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { inr, roi, pct, num, fileSize, roiColor } from "@/lib/formatters";

type Operator = ">" | "<" | "=" | ">=" | "<=" | "between" | null;
interface MetricFilter { id: string; col: string; op: Operator; val: number; val2: number; }

const METRIC_COLS = [
  { key: "Meta Spend",         label: "Meta Spend (₹)"  },
  { key: "Google Cost",        label: "Google Cost (₹)" },
  { key: "Total Spend",        label: "Total Spend (₹)" },
  { key: "Shopify Revenue",    label: "Revenue (₹)"     },
  { key: "ROI",                label: "ROI"             },
  { key: "Net Items Sold",     label: "Items Sold"      },
  { key: "Landing Page Views", label: "LPV"             },
  { key: "CTR",                label: "CTR"             },
  { key: "CPM",                label: "CPM (₹)"         },
];
const ALL_COLS = [
  { key: "Meta Spend",         label: "Meta Spend",   source: "Meta"    },
  { key: "Google Cost",        label: "Google Cost",  source: "Google"  },
  { key: "Total Spend",        label: "Total Spend",  source: "Derived" },
  { key: "Shopify Revenue",    label: "Revenue",      source: "Shopify" },
  { key: "ROI",                label: "ROI",          source: "Derived" },
  { key: "Net Items Sold",     label: "Items Sold",   source: "Shopify" },
  { key: "Landing Page Views", label: "LPV",          source: "Meta"    },
  { key: "CTR",                label: "CTR",          source: "Meta"    },
  { key: "CPM",                label: "CPM",          source: "Meta"    },
  { key: "Variant Title",      label: "Variant",      source: "Shopify" },
];
const DEFAULT_COLS = ["Meta Spend","Total Spend","Shopify Revenue","ROI","Net Items Sold","CTR","CPM","Variant Title"];
const OPS: { label: string; val: Operator }[] = [
  { label: "— None",      val: null      },
  { label: "> Greater",   val: ">"       },
  { label: "< Less",      val: "<"       },
  { label: "= Equals",    val: "="       },
  { label: ">= At least", val: ">="      },
  { label: "<= At most",  val: "<="      },
  { label: "↔ Between",   val: "between" },
];

function UploadCard({ label, required, sublabel, color, stored, onFile, onClear }: {
  label: string; required: boolean; sublabel: string; color: string;
  stored: { name: string; size: number } | null;
  onFile: (f: File) => void; onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl border bg-white p-5 flex flex-col gap-3 border-gray-200">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm" style={{ color }}>{label}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${required ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
          {required ? "Required" : "Optional"}
        </span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{sublabel}</p>
      {stored ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-green-600 flex-shrink-0">✓</span>
            <div className="min-w-0">
              <div className="font-medium text-green-800 truncate text-xs">{stored.name}</div>
              <div className="text-green-600 text-xs">{fileSize(stored.size)} — stored, no re-upload needed</div>
            </div>
          </div>
          <button onClick={onClear} className="ml-2 text-green-400 hover:text-red-500 text-xl flex-shrink-0">×</button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-lg p-6 flex flex-col items-center gap-2 text-gray-400 hover:bg-indigo-50 transition-colors w-full">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
          </svg>
          <span className="text-xs font-medium">Drop CSV / XLSX, or click to browse</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
    </div>
  );
}

function SidebarAverages({ data, hasGoogle }: { data: any[]; hasGoogle: boolean }) {
  if (!data.length) return (
    <p className="text-xs text-slate-500 text-center leading-relaxed">Upload files and run Merge & Analyse to see averages</p>
  );
  const n = data.length || 1;
  const sum = (k: string) => data.reduce((a: number, r: any) => a + (Number(r[k]) || 0), 0);
  const rows = [
    { label: "Avg Meta Spend",  val: inr(sum("Meta Spend") / n, true),          color: "#60A5FA" },
    ...(hasGoogle ? [{ label: "Avg Google Spend", val: inr(sum("Google Cost") / n, true), color: "#FBBF24" }] : []),
    { label: "Avg Total Spend", val: inr(sum("Total Spend") / n, true),          color: "#A78BFA" },
    { label: "Avg Revenue",     val: inr(sum("Shopify Revenue") / n, true),      color: "#34D399" },
    { label: "Avg ROI",         val: roi(sum("Total Spend") > 0 ? sum("Shopify Revenue") / sum("Total Spend") : 0), color: "#34D399" },
    { label: "Avg LPV",         val: num(sum("Landing Page Views") / n),         color: "#60A5FA" },
  ];
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.label} className="rounded-lg px-3 py-2" style={{ background: "#1E293B", borderLeft: `3px solid ${r.color}` }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{r.label}</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: r.color }}>{r.val}</div>
        </div>
      ))}
    </div>
  );
}

export default function ProductAnalysisPage() {
  const router = useRouter();
  const { metaFile, shopifyFile, googleFile, setMetaFile, setShopifyFile, setGoogleFile,
          mergedData, mergedSummary, hasGoogle, warnings, setMergedResult } = useApp();

  const [loading,        setLoading]       = useState(false);
  const [error,          setError]         = useState<string | null>(null);
  const [visibleCols,    setVisibleCols]   = useState<string[]>(DEFAULT_COLS);
  const [searchField,    setSearchField]   = useState("Product Title");
  const [searchText,     setSearchText]    = useState("");
  const [filters,        setFilters]       = useState<MetricFilter[]>([]);
  const [filtersOpen,    setFiltersOpen]   = useState(false);
  const [appliedFilters, setAppliedFilters]= useState<MetricFilter[]>([]);
  const [appliedSearch,  setAppliedSearch] = useState({ field: "", text: "" });
  const [filename,       setFilename]      = useState("roasify_product_analysis.csv");

  async function handleMerge() {
    if (!metaFile || !shopifyFile) return;
    setLoading(true);
    setError(null);
    const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const fd = new FormData();
      fd.append("meta_file", metaFile.file);
      fd.append("shopify_file", shopifyFile.file);

      if (googleFile?.file)
        fd.append("google_file", googleFile.file);

      const res = await fetch(`${BASE}/api/analyse`, { method: "POST", body: fd });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend error ${res.status}: ${txt}`);
      }
      const result = await res.json();

      const data = result.products || [];

      const summary = {
        products: result.kpis?.totalProducts || data.length,

        meta_spend:
          result.kpis?.totalMetaSpend || 0,

        google_cost:
          result.kpis?.totalGoogleCost || 0,

        total_spend:
          result.kpis?.totalSpend || 0,

        total_rev:
          result.kpis?.totalRevenue || 0,

        roi:
          result.kpis?.overallRoi || 0,
      };

      setMergedResult(
        data,
        summary,
        result.hasMonth ?? false,
        result.hasGoogle ?? false,
        result.warnings ?? []
      );
    } catch (e: any) {
      setError(e.message ?? "Unknown error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function addFilter() {
    setFilters(f => [...f, { id: Math.random().toString(36).slice(2), col: METRIC_COLS[0].key, op: null, val: 0, val2: 0 }]);
  }
  function updateFilter(id: string, patch: Partial<MetricFilter>) { setFilters(f => f.map(fi => fi.id === id ? { ...fi, ...patch } : fi)); }
  function removeFilter(id: string) { setFilters(f => f.filter(fi => fi.id !== id)); }
  function applyFilters() {
    setAppliedFilters(filters.filter(f => f.op !== null));
    setAppliedSearch({ field: searchField, text: searchText });
    setFiltersOpen(false);
  }
  function resetFilters() {
    setFilters([]); setAppliedFilters([]);
    setSearchText(""); setAppliedSearch({ field: "", text: "" });
  }

  const filteredData = useMemo(() => {
    if (!mergedData) return [];
    let rows = [...mergedData];
    if (appliedSearch.text) {
      const q = appliedSearch.text.toLowerCase();
      rows = rows.filter(r => String((r as any)[appliedSearch.field] ?? "").toLowerCase().includes(q));
    }
    for (const f of appliedFilters) {
      if (!f.op) continue;
      rows = rows.filter(r => {
        const v = Number((r as any)[f.col] ?? 0);
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

  const totals = useMemo(() => {
    if (!filteredData.length) return {} as Record<string, number>;
    const sum = (k: string) => filteredData.reduce((a, r) => a + (Number((r as any)[k]) || 0), 0);
    const ts = sum("Total Spend"), tr = sum("Shopify Revenue"), n = filteredData.length;
    return {
      "Meta Spend": sum("Meta Spend"), "Google Cost": sum("Google Cost"),
      "Total Spend": ts, "Shopify Revenue": tr,
      "Net Items Sold": sum("Net Items Sold"), "Landing Page Views": sum("Landing Page Views"),
      "ROI": ts > 0 ? tr / ts : 0,
      "CTR": sum("CTR") / n, "CPM": sum("CPM") / n,
    };
  }, [filteredData]);

  function fmtCell(val: any, colKey: string): string {
    if (val === null || val === undefined || val === "") return "—";
    const n = Number(val);
    if (colKey === "ROI") return roi(n);
    if (colKey === "CTR") return pct(n);
    if (colKey === "Net Items Sold" || colKey === "Landing Page Views") return num(n);
    if (colKey === "Variant Title") return String(val);
    return inr(n);
  }

  function downloadCSV() {
    if (!filteredData.length) return;
    const cols = ["Product ID", "Product Title", ...visibleCols].filter((v, i, a) => a.indexOf(v) === i);
    const csv = [
      `APPLIED FILTERS,Rows: ${filteredData.length} of ${mergedData?.length}`,
      ``,
      cols.join(","),
      ...filteredData.map((r: any) =>
        cols.map(c => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = filename.endsWith(".csv") ? filename : filename + ".csv";
    a.click();
  }

  const canMerge = !!(metaFile && shopifyFile);
  const hasMerged = !!mergedData;

  return (
    <div className="flex min-h-screen" style={{ background: "#FAFAF8" }}>
      {/* Rail */}
      <aside className="fixed top-0 left-0 h-full w-56 flex flex-col z-30 border-r border-slate-800" style={{ background: "#17150F" }}>
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#6B63F1,#4F46E5)" }}>
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">ROAS<span className="text-indigo-400">ify</span></div>
              <div className="text-slate-500 text-xs mt-0.5">PPM Analytics</div>
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 py-1.5">Workspace</div>
          {[
            { href: "/product-analysis",  label: "Product Analysis",  active: true  },
            { href: "/quadrant-view",     label: "Quadrant View",     active: false },
            { href: "/discount-analysis", label: "Discount Analysis", active: false },
          ].map(item => (
            <a key={item.href} href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition
                ${item.active ? "text-white border-l-2 border-indigo-500 bg-indigo-500/10 font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 mt-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Averages per Product</div>
          <SidebarAverages data={mergedData ?? []} hasGoogle={hasGoogle} />
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1">
        <header className="h-12 border-b border-gray-200 bg-white flex items-center px-6 gap-2 sticky top-0 z-20">
          <span className="text-xs text-gray-400">Workspace</span>
          <span className="text-xs text-gray-300">/</span>
          <span className="text-xs font-semibold text-gray-800">Product Analysis</span>
        </header>

        <div className="p-6 max-w-[1200px]">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Product Analysis</h1>
          <p className="text-sm text-gray-500 mb-5">Merge Meta Ads, Shopify, and Google Ads into one product-level performance table.</p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <UploadCard label="① Meta Ads" required color="#2563EB"
              sublabel="Product ID · Month · Amount Spent · Landing Page Views · CTR · CPM"
              stored={metaFile} onFile={f => setMetaFile(f)} onClear={() => setMetaFile(null)} />
            <UploadCard label="② Shopify" required color="#059669"
              sublabel="Product Variant ID · Product Title · Month · Net Sales · Net Items Sold"
              stored={shopifyFile} onFile={f => setShopifyFile(f)} onClear={() => setShopifyFile(null)} />
            <UploadCard label="③ Google Ads" required={false} color="#D97706"
              sublabel="Item ID · Product Title · Month · Cost · Conversions"
              stored={googleFile} onFile={f => setGoogleFile(f)} onClear={() => setGoogleFile(null)} />
          </div>

          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3.5 mb-5">
            <p className="text-sm text-gray-500">
              {canMerge ? `Ready to merge — ${[metaFile,shopifyFile,googleFile].filter(Boolean).length} file(s) loaded` : "Upload Meta Ads and Shopify exports to enable merge."}
            </p>
            <button onClick={handleMerge} disabled={!canMerge || loading}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: "#4F46E5" }}>
              {loading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              {loading ? "Merging…" : "▶  Merge & Analyse"}
            </button>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="text-sm font-semibold text-red-700 mb-1">❌ Merge failed</div>
              <div className="text-xs text-red-600 font-mono break-all mb-2">{error}</div>
              <div className="text-xs text-red-400">
                Make sure your Python backend is running:<br/>
                <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono">cd your-backend-folder && uvicorn main:app --reload --port 8000</code><br/>
                API URL: <code className="bg-red-100 px-1 rounded">{process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}</code>
              </div>
            </div>
          )}

          {warnings.map((w, i) => (
            <div key={i} className="mb-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-1">{w}</div>
          ))}

          {hasMerged && mergedSummary && (
            <>
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-5 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span>Data merged · <strong>{mergedSummary.products} products</strong> · {hasGoogle ? "3" : "2"} sources</span>
                <span className="flex-1" />
                <span className="text-gray-400 text-xs">{filteredData.length} shown</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {[
                  { label: "PRODUCTS",    val: String(mergedSummary.products) },
                  { label: "META SPEND",  val: inr(mergedSummary.meta_spend  ?? 0, true) },
                  { label: "GOOGLE COST", val: inr(mergedSummary.google_cost ?? 0, true) },
                  { label: "TOTAL SPEND", val: inr(mergedSummary.total_spend,      true) },
                  { label: "REVENUE",     val: inr(mergedSummary.total_rev,        true) },
                  { label: "OVERALL ROI", val: roi(mergedSummary.roi) },
                ].map(k => (
                  <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{k.label}</div>
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{k.val}</div>
                  </div>
                ))}
              </div>

              {/* Columns & Filters */}
              <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <span className="font-semibold text-sm">Columns &amp; Filters</span>
                  <button onClick={() => { setVisibleCols(DEFAULT_COLS); resetFilters(); }} className="text-xs text-indigo-600 hover:underline">Reset to default</button>
                </div>
                <div className="px-5 py-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Columns shown</div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_COLS.map(c => {
                      const on = visibleCols.includes(c.key);
                      return (
                        <button key={c.key}
                          onClick={() => setVisibleCols(v => on ? v.filter(x => x !== c.key) : [...v, c.key])}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition ${on ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                          {c.label} <span className="opacity-50">[{c.source}]</span>{on && <span className="ml-1 opacity-50">×</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="px-5 pb-4 flex gap-2">
                  <select value={searchField} onChange={e => setSearchField(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
                    <option>Product Title</option>
                    <option>Product ID</option>
                    <option>Variant Title</option>
                  </select>
                  <input value={searchText} onChange={e => setSearchText(e.target.value)}
                    placeholder={`Search ${searchField}…`}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                    onKeyDown={e => e.key === "Enter" && applyFilters()} />
                  <button onClick={applyFilters} className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Search</button>
                </div>

                <button onClick={() => setFiltersOpen(o => !o)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 text-left hover:bg-gray-100 transition">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Metric Filters</span>
                    {appliedFilters.length > 0 && (
                      <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5">{appliedFilters.length}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{filtersOpen ? "▲" : "▼"}</span>
                </button>

                {filtersOpen && (
                  <div className="px-5 py-4 border-t border-gray-100 space-y-2.5">
                    {filters.map(f => (
                      <div key={f.id} className="grid grid-cols-[1.5fr_1.2fr_1.5fr_auto] gap-2 items-center">
                        <select value={f.col} onChange={e => updateFilter(f.id, { col: e.target.value })} className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white">
                          {METRIC_COLS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </select>
                        <select value={f.op ?? ""} onChange={e => updateFilter(f.id, { op: (e.target.value || null) as Operator })} className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white">
                          {OPS.map(o => <option key={String(o.val)} value={o.val ?? ""}>{o.label}</option>)}
                        </select>
                        {f.op === "between" ? (
                          <div className="flex gap-1">
                            <input type="number" value={f.val} onChange={e => updateFilter(f.id, { val: Number(e.target.value) })} className="w-full text-xs border border-gray-200 rounded px-2 py-1.5" placeholder="Min" />
                            <input type="number" value={f.val2} onChange={e => updateFilter(f.id, { val2: Number(e.target.value) })} className="w-full text-xs border border-gray-200 rounded px-2 py-1.5" placeholder="Max" />
                          </div>
                        ) : (
                          <input type="number" value={f.val} onChange={e => updateFilter(f.id, { val: Number(e.target.value) })} className="text-xs border border-gray-200 rounded px-2 py-1.5" placeholder="Value" />
                        )}
                        <button onClick={() => removeFilter(f.id)} className="text-gray-400 hover:text-red-500 text-xl px-1">×</button>
                      </div>
                    ))}
                    <button onClick={addFilter} className="text-xs text-indigo-600 hover:underline">+ Add filter</button>
                    <div className="flex justify-between pt-2 border-t border-gray-100">
                      <button onClick={resetFilters} className="text-xs text-gray-500">Clear all</button>
                      <button onClick={applyFilters} className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700">✅ Apply Filters</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-2 mb-3">
                <span className="bg-indigo-600 text-white rounded-lg px-3 py-1 text-xs font-bold">{filteredData.length} rows</span>
                {filteredData.length < (mergedData?.length ?? 0) && <span className="text-xs text-gray-500">filtered from {mergedData?.length} total</span>}
              </div>

              {filteredData.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">∑ {filteredData.length} products</span>
                  {visibleCols.filter(c => c !== "Variant Title").map(c => {
                    const v = totals[c as keyof typeof totals];
                    if (v === undefined) return null;
                    return (
                      <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                        {ALL_COLS.find(x => x.key === c)?.label ?? c}: {fmtCell(v, c)}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
                <div style={{ maxHeight: 520, overflowY: "auto" }}>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr style={{ background: "#F2F0EA" }}>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 sticky top-0 bg-[#F2F0EA] z-10 whitespace-nowrap">Product ID</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 sticky top-0 bg-[#F2F0EA] z-10">Product Title</th>
                        {visibleCols.map(c => (
                          <th key={c} className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 sticky top-0 bg-[#F2F0EA] z-10 whitespace-nowrap">
                            {ALL_COLS.find(x => x.key === c)?.label ?? c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.length === 0 ? (
                        <tr><td colSpan={visibleCols.length + 2} className="text-center py-12 text-gray-400 text-sm">No products match the current filters</td></tr>
                      ) : filteredData.map((row: any, i: number) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-400 whitespace-nowrap">{row["Product ID"]}</td>
                          <td className="px-4 py-2.5 text-gray-800 max-w-[180px] truncate">{row["Product Title"]}</td>
                          {visibleCols.map(c => (
                            <td key={c} className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${c === "ROI" ? roiColor(Number(row[c])) : "text-gray-700"}`}>
                              {fmtCell(row[c], c)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                  <span className="text-xs text-gray-400 font-mono whitespace-nowrap">filename:</span>
                  <input value={filename} onChange={e => setFilename(e.target.value)} className="flex-1 text-xs font-mono bg-transparent outline-none text-gray-700 min-w-0" />
                </div>
                <button onClick={downloadCSV} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition">
                  ⬇ Download CSV
                </button>
                <button onClick={() => router.push("/quadrant-view")}
                  className="flex flex-col bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 hover:bg-indigo-100 transition text-left w-full">
                  <span className="text-sm font-semibold text-indigo-800">Continue to Quadrant View →</span>
                  <span className="text-xs text-indigo-500 mt-0.5">Classify {mergedSummary.products} products into 4 quadrants</span>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}