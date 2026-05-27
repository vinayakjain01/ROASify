"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "@/lib/context";
import { runQuadrant, recalcQuadrant, getAiInsights } from "@/lib/api";
import { inr, roi, num, roiColor } from "@/lib/formatters";

// ── Quadrant config ───────────────────────────────────────────────────
const QUAD_CFG = {
  q1: { color: "#10B981", bg: "#E7F7F0", border: "#A7E1C8", icon: "★", label: "Champions",  action: "Scale",   desc: "High revenue · Low spend" },
  q2: { color: "#3B82F6", bg: "#EAF1FE", border: "#B5CCF7", icon: "◆", label: "Contenders", action: "Protect", desc: "High revenue · High spend" },
  q3: { color: "#EF4444", bg: "#FDECEC", border: "#F4B5B0", icon: "△", label: "Casualties", action: "Cut",     desc: "Low revenue · High spend" },
  q4: { color: "#78716C", bg: "#F2F0EC", border: "#D6D2C8", icon: "○", label: "Cruisers",   action: "Decide",  desc: "Low revenue · Low spend" },
} as const;

type QKey = keyof typeof QUAD_CFG;

// ── Product mini-table inside quadrant card ───────────────────────────
function ProductTable({ rows, color }: { rows: any[]; color: string }) {
  if (!rows.length) return (
    <div className="text-center py-6 text-sm text-gray-400">No products in this quadrant</div>
  );
  return (
    <div className="overflow-auto max-h-64">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "#F2F0EA" }}>
            {["Product ID","Product Title","Spend","Revenue","ROI"].map(h => (
              <th key={h} className="text-left px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-mono text-gray-400">{r["Product ID"]}</td>
              <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate">{r["Product Title"]}</td>
              <td className="px-3 py-2 tabular-nums text-gray-700">{inr(r["Spend"])}</td>
              <td className="px-3 py-2 tabular-nums text-gray-700">{inr(r["Revenue"])}</td>
              <td className={`px-3 py-2 tabular-nums ${roiColor(r["ROI"])}`}>{roi(r["ROI"])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Quadrant card ─────────────────────────────────────────────────────
function QuadrantCard({ qkey, rows }: { qkey: QKey; rows: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = QUAD_CFG[qkey];
  const spend = rows.reduce((a, r) => a + (Number(r["Spend"]) || 0), 0);
  const rev   = rows.reduce((a, r) => a + (Number(r["Revenue"]) || 0), 0);
  const roiV  = spend > 0 ? rev / spend : 0;

  return (
    <div className="bg-white rounded-xl border overflow-hidden"
      style={{ borderColor: cfg.border, borderLeftWidth: 3, borderLeftColor: cfg.color }}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" style={{ color: cfg.color }}>{cfg.icon}</span>
            <div>
              <div className="font-semibold text-gray-900">{cfg.label}</div>
              <div className="text-xs text-gray-400">{cfg.desc}</div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.action}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "PRODUCTS", val: String(rows.length) },
            { label: "SPEND",    val: inr(spend, true) },
            { label: "REVENUE",  val: inr(rev, true) },
            { label: "ROI",      val: roi(roiV) },
          ].map(m => (
            <div key={m.label}>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                {m.label}
              </div>
              <div className="text-lg font-bold tabular-nums" style={{ color: cfg.color }}>
                {m.val}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-4 text-xs font-medium flex items-center gap-1"
          style={{ color: cfg.color }}>
          {expanded ? "▲" : "▸"} View all {rows.length} products
        </button>
      </div>

      {expanded && (
        <div className="border-t px-5 pb-5 pt-3" style={{ borderColor: cfg.border }}>
          <ProductTable rows={rows} color={cfg.color} />
        </div>
      )}
    </div>
  );
}

// ── AI Insight card ───────────────────────────────────────────────────
function InsightCard({ ins }: { ins: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div>
          <div className="font-semibold text-sm text-gray-900">{ins.title ?? ins.quadrant}</div>
          {ins.subtitle && <div className="text-xs text-gray-400 mt-0.5">{ins.subtitle}</div>}
        </div>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 space-y-3 pt-3">
          {ins.what_changed && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                What changed
              </div>
              <p className="text-sm text-gray-700">{ins.what_changed}</p>
            </div>
          )}
          {ins.why_it_matters && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Why it matters
              </div>
              <p className="text-sm text-gray-700">{ins.why_it_matters}</p>
            </div>
          )}
          {ins.what_to_do && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                What to do
              </div>
              <p className="text-sm text-gray-700">{ins.what_to_do}</p>
            </div>
          )}
          {ins.body && <p className="text-sm text-gray-700">{ins.body}</p>}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function QuadrantViewPage() {
  const { metaFile, shopifyFile, quadrantData, setQuadrantData } = useApp();

  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [aiInsights,  setAiInsights]  = useState<any[] | null>(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState<string | null>(null);
  const [spCut,       setSpCut]       = useState(0);
  const [rvCut,       setRvCut]       = useState(0);
  const [spMax,       setSpMax]       = useState(500000);
  const [rvMax,       setRvMax]       = useState(2000000);
  const [recalcData,  setRecalcData]  = useState<{q1:any[];q2:any[];q3:any[];q4:any[]} | null>(null);

  // Search & filters
  const [searchText,     setSearchText]     = useState("");
  const [appliedSearch,  setAppliedSearch]  = useState("");
  const [spendOp,        setSpendOp]        = useState<string>("");
  const [spendVal,       setSpendVal]       = useState(0);
  const [revOp,          setRevOp]          = useState<string>("");
  const [revVal,         setRevVal]         = useState(0);
  const [roiOp,          setRoiOp]          = useState<string>("");
  const [roiVal,         setRoiVal]         = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<any>(null);
  const [filtersOpen,    setFiltersOpen]    = useState(false);

  // ── Load quadrant data ──────────────────────────────────────────────
  async function loadQuadrant() {
    if (!metaFile || !shopifyFile) return;
    setLoading(true); setError(null);
    try {
      const result = await runQuadrant(metaFile.file, shopifyFile.file);
      setQuadrantData(result);
      setSpCut(result.sp_cut);
      setRvCut(result.rv_cut);
      const maxSp = Math.max(...result.all.map((r: any) => r["Spend"] ?? 0)) * 1.5;
      const maxRv = Math.max(...result.all.map((r: any) => r["Revenue"] ?? 0)) * 1.5;
      setSpMax(Math.round(maxSp));
      setRvMax(Math.round(maxRv));
      setRecalcData({ q1: result.q1, q2: result.q2, q3: result.q3, q4: result.q4 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Recalc on slider change ─────────────────────────────────────────
  const recalc = useCallback(async (sp: number, rv: number) => {
    if (!quadrantData?.all) return;
    try {
      const result = await recalcQuadrant(quadrantData.all, sp, rv);
      setRecalcData(result);
    } catch {}
  }, [quadrantData]);

  useEffect(() => {
    const t = setTimeout(() => recalc(spCut, rvCut), 350);
    return () => clearTimeout(t);
  }, [spCut, rvCut, recalc]);

  // ── Apply filters ───────────────────────────────────────────────────
  function applyFilters() {
    setAppliedSearch(searchText);
    setAppliedFilters({ spendOp, spendVal, revOp, revVal, roiOp, roiVal });
    setFiltersOpen(false);
  }

  function resetFilters() {
    setSearchText(""); setAppliedSearch("");
    setSpendOp(""); setRevOp(""); setRoiOp("");
    setAppliedFilters(null);
  }

  // ── Filter quadrant rows ────────────────────────────────────────────
  function filterRows(rows: any[]): any[] {
    let r = [...rows];
    if (appliedSearch) {
      const q = appliedSearch.toLowerCase();
      r = r.filter(p =>
        String(p["Product Title"] ?? "").toLowerCase().includes(q) ||
        String(p["Product ID"] ?? "").toLowerCase().includes(q)
      );
    }
    if (appliedFilters) {
      const applyOp = (val: number, op: string, threshold: number) => {
        if (!op) return true;
        if (op === ">")  return val > threshold;
        if (op === "<")  return val < threshold;
        if (op === "=")  return val === threshold;
        if (op === ">=") return val >= threshold;
        if (op === "<=") return val <= threshold;
        return true;
      };
      r = r.filter(p =>
        applyOp(p["Spend"]   ?? 0, appliedFilters.spendOp, appliedFilters.spendVal) &&
        applyOp(p["Revenue"] ?? 0, appliedFilters.revOp,   appliedFilters.revVal)   &&
        applyOp(p["ROI"]     ?? 0, appliedFilters.roiOp,   appliedFilters.roiVal)
      );
    }
    return r;
  }

  const q1 = filterRows(recalcData?.q1 ?? []);
  const q2 = filterRows(recalcData?.q2 ?? []);
  const q3 = filterRows(recalcData?.q3 ?? []);
  const q4 = filterRows(recalcData?.q4 ?? []);
  const allRows = [...q1, ...q2, ...q3, ...q4];

  // ── Overall KPIs ────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!quadrantData?.all) return null;
    const all = quadrantData.all;
    const sum = (k: string) => all.reduce((a: number, r: any) => a + (Number(r[k]) || 0), 0);
    const sp = sum("Spend"), rv = sum("Revenue");
    return {
      products: all.length,
      spend:    sp,
      rev:      rv,
      roi:      sp > 0 ? rv / sp : 0,
    };
  }, [quadrantData]);

  // ── AI Analysis ─────────────────────────────────────────────────────
  async function generateAi() {
    if (!quadrantData) return;
    setAiLoading(true); setAiError(null);
    try {
      const result = await getAiInsights({
        q1: quadrantData.q1, q2: quadrantData.q2,
        q3: quadrantData.q3, q4: quadrantData.q4,
        monthly: quadrantData.monthly,
        all: quadrantData.all,
      });
      setAiInsights(result.insights ?? []);
      if (result.error) setAiError(result.error);
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const OPS = ["", ">", "<", "=", ">=", "<="];

  return (
    <div className="flex min-h-screen" style={{ background: "#FAFAF8" }}>

      {/* Rail */}
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
        <nav className="flex-1 p-3 space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2">Workspace</div>
          <a href="/product-analysis"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            Product Analysis
          </a>
          <a href="/quadrant-view"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              text-white border-l-2 border-indigo-500 bg-indigo-500/10">
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

        {/* Right panel — thresholds */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Thresholds</div>
          {quadrantData && (
            <>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Spend cut-off (X)</span>
                  <span className="text-violet-400 font-semibold">{inr(spCut, true)}</span>
                </div>
                <input type="range" min={0} max={spMax} step={1000} value={spCut}
                  onChange={e => setSpCut(Number(e.target.value))}
                  className="w-full accent-indigo-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Revenue cut-off (Y)</span>
                  <span className="text-emerald-400 font-semibold">{inr(rvCut, true)}</span>
                </div>
                <input type="range" min={0} max={rvMax} step={10000} value={rvCut}
                  onChange={e => setRvCut(Number(e.target.value))}
                  className="w-full accent-indigo-500" />
              </div>
              <button onClick={() => { setSpCut(quadrantData.sp_cut); setRvCut(quadrantData.rv_cut); }}
                className="text-xs text-slate-400 hover:text-white">
                Reset to median
              </button>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Quadrant Counts
                </div>
                {[
                  { k:"q1", label:"Champions",  rows: recalcData?.q1 ?? [] },
                  { k:"q2", label:"Contenders", rows: recalcData?.q2 ?? [] },
                  { k:"q4", label:"Cruisers",   rows: recalcData?.q4 ?? [] },
                  { k:"q3", label:"Casualties", rows: recalcData?.q3 ?? [] },
                ].map(({ k, label, rows }) => {
                  const cfg = QUAD_CFG[k as QKey];
                  const sp  = rows.reduce((a: number, r: any) => a + (r["Spend"] ?? 0), 0);
                  const rv  = rows.reduce((a: number, r: any) => a + (r["Revenue"] ?? 0), 0);
                  const r   = sp > 0 ? rv / sp : 0;
                  return (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                        <span className="text-slate-300">{label}</span>
                      </div>
                      <span className="text-slate-400 tabular-nums">
                        {rows.length} · {roi(r)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 flex-1 p-8">
        <div className="max-w-[1100px]">

          {/* Header */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Quadrant View — 4C Framework</h1>
          <p className="text-sm text-gray-500 mb-6">
            Every product classified by spend and revenue. Scale Champions. Protect Contenders. Decide on Cruisers. Cut Casualties.
          </p>

          {/* Load button if not loaded */}
          {!quadrantData && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-8 text-center">
              <p className="text-sm text-indigo-700 mb-4">
                {metaFile && shopifyFile
                  ? "Files ready — run the analysis to classify products into quadrants."
                  : "Upload Meta and Shopify files on the Product Analysis page first."}
              </p>
              <button onClick={loadQuadrant}
                disabled={!metaFile || !shopifyFile || loading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                  bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition">
                {loading ? "Analysing…" : "▶  Run Product Analysis"}
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {quadrantData && kpis && (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-4 gap-3 mb-8">
                {[
                  { label: "TOTAL PRODUCTS", val: String(kpis.products) },
                  { label: "TOTAL SPEND",    val: inr(kpis.spend, true) },
                  { label: "TOTAL REVENUE",  val: inr(kpis.rev,   true) },
                  { label: "OVERALL ROI",    val: roi(kpis.roi)         },
                ].map(k => (
                  <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                      {k.label}
                    </div>
                    <div className="text-xl font-bold text-gray-900 tabular-nums">{k.val}</div>
                  </div>
                ))}
              </div>

              {/* Champions hero */}
              {(recalcData?.q1 ?? []).length > 0 && (() => {
                const champions = recalcData!.q1;
                const sp = champions.reduce((a: number, r: any) => a + (r["Spend"] ?? 0), 0);
                const rv = champions.reduce((a: number, r: any) => a + (r["Revenue"] ?? 0), 0);
                const r  = sp > 0 ? rv / sp : 0;
                return (
                  <div className="bg-white border border-green-200 rounded-xl overflow-hidden mb-8">
                    <div className="px-6 py-5" style={{ background: "linear-gradient(135deg,#E7F7F0,#fff 70%)" }}>
                      <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        ★ WHERE TO ACT FIRST
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">SCALE</span>
                      </div>
                      <p className="text-lg font-medium text-gray-800 leading-snug">
                        <span className="text-green-600 font-semibold">{champions.length} Champions</span> together return{" "}
                        <span className="text-green-600 font-semibold">{roi(r)}</span> on{" "}
                        {inr(sp, true)} of spend — the highest payoff in this dataset.
                      </p>
                    </div>
                    <div className="px-6 py-4 border-t border-green-100 flex items-center justify-between gap-4
                      bg-white text-sm">
                      <span className="text-gray-600">
                        Scale spend on these products. Estimated additional revenue at current ROI:{" "}
                        <strong className="text-green-600">{inr(rv * 0.3, true)}</strong>
                      </span>
                      <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap">
                        Create scale-spend plan →
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Search & Filters */}
              <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <span className="font-semibold text-sm">Search &amp; Filters</span>
                  <button onClick={resetFilters} className="text-xs text-indigo-600 hover:underline">
                    Reset
                  </button>
                </div>
                <div className="px-5 py-4 flex gap-3">
                  <input value={searchText} onChange={e => setSearchText(e.target.value)}
                    placeholder="Search by Product ID or Title…"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5" />
                </div>

                {/* Metric filters accordion */}
                <div onClick={() => setFiltersOpen(o => !o)}
                  className="flex items-center justify-between px-5 py-3 bg-gray-50
                    border-t border-gray-100 cursor-pointer select-none">
                  <span className="text-sm text-gray-500">Metric Filters</span>
                  <span className="text-gray-400 text-xs">{filtersOpen ? "▲" : "▼"}</span>
                </div>

                {filtersOpen && (
                  <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                    {[
                      { label: "Spend",   op: spendOp, setOp: setSpendOp, val: spendVal, setVal: setSpendVal },
                      { label: "Revenue", op: revOp,   setOp: setRevOp,   val: revVal,   setVal: setRevVal   },
                      { label: "ROI",     op: roiOp,   setOp: setRoiOp,   val: roiVal,   setVal: setRoiVal   },
                    ].map(f => (
                      <div key={f.label} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500 w-16">{f.label}</span>
                        <select value={f.op} onChange={e => f.setOp(e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white">
                          {OPS.map(o => <option key={o} value={o}>{o || "— none —"}</option>)}
                        </select>
                        <input type="number" value={f.val}
                          onChange={e => f.setVal(Number(e.target.value))}
                          className="w-32 text-xs border border-gray-200 rounded px-2 py-1.5"
                          placeholder="Value" />
                      </div>
                    ))}
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button onClick={applyFilters}
                        className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700">
                        ✅ Apply Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Row count */}
              <div className="text-sm text-gray-500 mb-4">
                <span className="bg-violet-600 text-white rounded-lg px-3 py-1 text-xs font-bold mr-2">
                  {allRows.length} products
                </span>
                {allRows.length < (quadrantData.all?.length ?? 0) && (
                  <span>filtered from {quadrantData.all?.length} total</span>
                )}
              </div>

              {/* Quadrant breakdown */}
              <h2 className="text-base font-semibold text-gray-800 mb-4">All four quadrants</h2>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <QuadrantCard qkey="q1" rows={q1} />
                <QuadrantCard qkey="q2" rows={q2} />
                <QuadrantCard qkey="q4" rows={q4} />
                <QuadrantCard qkey="q3" rows={q3} />
              </div>

              {/* AI Analysis */}
              <h2 className="text-base font-semibold text-gray-800 mb-4">AI Analysis</h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-semibold text-gray-900">Per-quadrant recommendations</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Powered by Gemini · {aiInsights ? `${aiInsights.length} insights ready` : "not yet run"}
                    </div>
                  </div>
                  <button onClick={generateAi} disabled={aiLoading}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white
                      bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition">
                    {aiLoading ? "Generating…" : "✨ Generate AI Analysis"}
                  </button>
                </div>

                {aiError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                    {aiError}
                  </div>
                )}

                {!aiInsights && !aiLoading && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <p>Click <strong>Generate AI Analysis</strong> to produce specific actions for each quadrant.</p>
                    <p className="mt-1">Recommendations will reference exact product IDs and INR figures.</p>
                  </div>
                )}

                {aiLoading && (
                  <div className="space-y-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                )}

                {aiInsights && aiInsights.length > 0 && (
                  <div className="space-y-3">
                    {aiInsights.map((ins, i) => <InsightCard key={i} ins={ins} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
