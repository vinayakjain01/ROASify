'use client';

import { useCallback, useMemo, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { KpiStrip } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { UploadGrid } from '@/components/product-analysis/upload-cards';
import { TopPerformers } from '@/components/product-analysis/top-performers';
import { ColumnsAndFilters } from '@/components/product-analysis/columns-filters';
import type { ActiveFilter } from '@/components/product-analysis/columns-filters';
import { DownloadBand } from '@/components/product-analysis/download-band';
import { ProductAnalysisPanel } from '@/components/product-analysis/right-panel';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/context';
import { mergeFiles } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, Loader2, AlertTriangle,
  X, Search,
} from 'lucide-react';

const DEFAULT_COLUMNS = [
  'id', 'title', 'variant', 'metaSpend', 'totalSpend',
  'revenue', 'roi', 'itemsSold', 'ctr', 'cpm',
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface NormProduct {
  id: string;
  title: string;
  variant: string;
  month?: string;
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

// ── Normalise one raw API row → NormProduct ───────────────────────────────────
function normalizeOne(p: any): NormProduct {
  const metaSpend  = Number(p['Meta Spend']      ?? p.metaSpend   ?? 0);
  const googleCost = Number(p['Google Cost']     ?? p.googleCost  ?? 0);
  const totalSpend = Number(p['Total Spend']      ?? p.totalSpend  ?? metaSpend + googleCost);
  const revenue    = Number(p['Shopify Revenue'] ?? p.revenue     ?? 0);
  return {
    id:          String(p['Product ID']      ?? p.id       ?? ''),
    title:       String(p['Product Title']   ?? p.title    ?? ''),
    variant:     String(p['Variant Title']   ?? p.variant  ?? ''),
    month:       p['Month']                  ?? p.month    ?? undefined,
    metaSpend,
    googleCost,
    totalSpend,
    revenue,
    roi:         totalSpend > 0 ? revenue / totalSpend : 0,
    itemsSold:   Number(p['Net Items Sold']         ?? p.itemsSold    ?? 0),
    lpv:         Number(p['Landing Page Views']     ?? p.lpv          ?? 0),
    conversions: Number(p['Conversions']            ?? p.conversions  ?? 0),
    ctr:         Number(p['CTR']                    ?? p.ctr          ?? 0),
    cpm:         Number(p['CPM']                    ?? p.cpm          ?? 0),
  };
}

// ── Aggregate a group of rows for the same Product ID ────────────────────────
// Sum:  metaSpend, googleCost, totalSpend, revenue, itemsSold, lpv, conversions
// Avg:  ctr, cpm  (weighted by metaSpend for cpm, by lpv for ctr)
function aggregateGroup(rows: NormProduct[]): NormProduct {
  const first = rows[0];
  const totMetaSpend  = rows.reduce((s, r) => s + r.metaSpend,  0);
  const totGoogle     = rows.reduce((s, r) => s + r.googleCost, 0);
  const totSpend      = rows.reduce((s, r) => s + r.totalSpend, 0);
  const totRevenue    = rows.reduce((s, r) => s + r.revenue,    0);
  const totItems      = rows.reduce((s, r) => s + r.itemsSold,  0);
  const totLpv        = rows.reduce((s, r) => s + r.lpv,        0);
  const totConv       = rows.reduce((s, r) => s + r.conversions,0);

  // Weighted-average CTR (weight = LPV); fall back to simple avg
  const totLpvWeight  = totLpv > 0 ? totLpv : rows.length;
  const avgCtr = rows.reduce((s, r) => s + r.ctr * (totLpv > 0 ? r.lpv : 1), 0) / totLpvWeight;

  // Weighted-average CPM (weight = metaSpend)
  const totSpendWeight = totMetaSpend > 0 ? totMetaSpend : rows.length;
  const avgCpm = rows.reduce((s, r) => s + r.cpm * (totMetaSpend > 0 ? r.metaSpend : 1), 0) / totSpendWeight;

  return {
    id:          first.id,
    title:       first.title,
    variant:     first.variant,
    month:       undefined,          // merged across months
    metaSpend:   totMetaSpend,
    googleCost:  totGoogle,
    totalSpend:  totSpend,
    revenue:     totRevenue,
    roi:         totSpend > 0 ? totRevenue / totSpend : 0,
    itemsSold:   totItems,
    lpv:         totLpv,
    conversions: totConv,
    ctr:         avgCtr,
    cpm:         avgCpm,
  };
}

// ── Group by Product ID and aggregate ────────────────────────────────────────
function groupByProductId(rows: NormProduct[]): NormProduct[] {
  const map = new Map<string, NormProduct[]>();
  for (const row of rows) {
    const key = row.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return Array.from(map.values()).map(aggregateGroup);
}

// ── Apply metric filters ──────────────────────────────────────────────────────
function applyFilters(products: NormProduct[], filters: ActiveFilter[]): NormProduct[] {
  if (!filters.length) return products;
  return products.filter(p =>
    filters.every(f => {
      const val = Number((p as any)[f.metric] ?? 0);
      switch (f.operator) {
        case '>':       return val >  f.value;
        case '<':       return val <  f.value;
        case '=':       return val === f.value;
        case '>=':      return val >= f.value;
        case '<=':      return val <= f.value;
        case 'between': return val >= f.value && (f.value2 === undefined || val <= f.value2);
        default:        return true;
      }
    })
  );
}

// ── Detect all months present in the dataset ─────────────────────────────────
function detectMonths(rows: NormProduct[]): string[] {
  const set = new Set<string>();
  for (const r of rows) { if (r.month) set.add(r.month); }
  // Sort chronologically — try Date parse, fallback to alpha
  return Array.from(set).sort((a, b) => {
    const da = new Date(a + ' 1'); // e.g. "Apr 2026 1"
    const db = new Date(b + ' 1');
    if (!isNaN(da.getTime()) && !isNaN(db.getTime())) return da.getTime() - db.getTime();
    return a.localeCompare(b);
  });
}

// ── Month pill bar ────────────────────────────────────────────────────────────
function MonthPills({
  months, selected, onToggle, onReset,
}: {
  months: string[];
  selected: Set<string>;
  onToggle: (m: string) => void;
  onReset: () => void;
}) {
  if (months.length === 0) return null;
  const allSelected = selected.size === months.length;

  return (
    <div className="flex items-center flex-wrap gap-2">
      <span className="text-xs font-semibold text-[#8B8780] uppercase tracking-widest mr-1">
        Months
      </span>

      {/* All pill */}
      <button
        onClick={onReset}
        className={cn(
          'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
          allSelected
            ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
            : 'bg-white text-[#57544E] border-[#DEDBD2] hover:border-[#4F46E5] hover:text-[#4F46E5]'
        )}
      >
        All months
      </button>

      {months.map(m => {
        const active = selected.has(m);
        return (
          <button
            key={m}
            onClick={() => onToggle(m)}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              active
                ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5]/40'
                : 'bg-white text-[#57544E] border-[#DEDBD2] hover:border-[#4F46E5] hover:text-[#4F46E5]'
            )}
          >
            {m}
            {active && !allSelected && (
              <X className="w-3 h-3 ml-0.5 opacity-60" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProductAnalysisPage() {
  const {
    metaFile, shopifyFile, googleFile,
    mergedData, mergedSummary, warnings,
    hasGoogle,
    setMergedResult,
  } = useApp();

  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [runId,          setRunId]          = useState<string | null>(null);
  const [activeFilters,  setActiveFilters]  = useState<ActiveFilter[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const tableRef = useRef<HTMLDivElement>(null);

  const metaF  = metaFile?.file   ?? null;
  const shopF  = shopifyFile?.file ?? null;
  const gooF   = googleFile?.file  ?? null;

  const readyToMerge = metaF !== null && shopF !== null;
  const fileCount    = [metaF, shopF, gooF].filter(Boolean).length;
  const isMerged     = mergedData !== null && mergedSummary !== null;

  // ── Merge handler ──────────────────────────────────────────────────────────
  const handleMerge = useCallback(async () => {
    if (!readyToMerge || !metaF || !shopF) return;
    setLoading(true);
    setError(null);
    setSearchQuery('');
    setSelectedMonths(new Set());
    try {
      const result  = await mergeFiles(metaF, shopF, gooF);
      const products = result.products ?? result.data ?? [];
      const summary  = result.summary  ?? {};
      const warns    = result.warnings ?? [];

      const calcTotalSpend = products.reduce((s: number, p: any) =>
        s + Number(p['Total Spend'] ?? p.totalSpend ?? 0), 0);
      const calcTotalRev   = products.reduce((s: number, p: any) =>
        s + Number(p['Shopify Revenue'] ?? p.revenue ?? 0), 0);
      const calcMetaSpend  = products.reduce((s: number, p: any) =>
        s + Number(p['Meta Spend'] ?? p.metaSpend ?? 0), 0);
      const calcGoogleCost = products.reduce((s: number, p: any) =>
        s + Number(p['Google Cost'] ?? p.googleCost ?? 0), 0);

      const mergedSummaryObj = {
        products:    summary.products    ?? products.length,
        total_spend: summary.total_spend || calcTotalSpend,
        total_rev:   summary.total_rev   || calcTotalRev,
        roi:         summary.roi         || (calcTotalSpend > 0 ? calcTotalRev / calcTotalSpend : 0),
        meta_spend:  summary.meta_spend  || calcMetaSpend,
        google_cost: summary.google_cost || calcGoogleCost,
        lpv:         summary.lpv         ?? 0,
      };

      setMergedResult(
        products, mergedSummaryObj,
        result.has_month ?? false,
        result.has_google ?? (gooF !== null),
        warns,
      );

      const n = new Date();
      setRunId(
        `pa_${n.getFullYear()}_${String(n.getMonth()+1).padStart(2,'0')}_` +
        `${String(n.getDate()).padStart(2,'0')}_${String(n.getHours()).padStart(2,'0')}` +
        `${String(n.getMinutes()).padStart(2,'0')}`
      );
    } catch (err: any) {
      setError(err?.message ?? 'Failed to merge files.');
    } finally {
      setLoading(false);
    }
  }, [readyToMerge, metaF, shopF, gooF, setMergedResult]);

  // ── Normalise raw API data once ────────────────────────────────────────────
  const normalizedAll: NormProduct[] = useMemo(
    () => (mergedData ? mergedData.map(normalizeOne) : []),
    [mergedData],
  );

  // ── Detect months from data ────────────────────────────────────────────────
  const allMonths = useMemo(() => detectMonths(normalizedAll), [normalizedAll]);

  // When data first loads, select all months
  const prevDataRef = useRef<NormProduct[]>([]);
  if (prevDataRef.current !== normalizedAll && normalizedAll.length > 0) {
    prevDataRef.current = normalizedAll;
    // Only reset if this is fresh data (selectedMonths is empty)
    if (selectedMonths.size === 0 && allMonths.length > 0) {
      setSelectedMonths(new Set(allMonths));
    }
  }

  // ── Month toggle ────────────────────────────────────────────────────────────
  const toggleMonth = useCallback((m: string) => {
    setSelectedMonths(prev => {
      const next = new Set(prev);
      if (next.has(m)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  }, []);

  const resetMonths = useCallback(() => {
    setSelectedMonths(new Set(allMonths));
  }, [allMonths]);

  // ── Filter by selected months ──────────────────────────────────────────────
  const monthFiltered: NormProduct[] = useMemo(() => {
    if (allMonths.length === 0) return normalizedAll; // no month column → show all
    return normalizedAll.filter(r => !r.month || selectedMonths.has(r.month));
  }, [normalizedAll, selectedMonths, allMonths]);

  // ── Aggregate: merge rows with same Product ID ─────────────────────────────
  const aggregated: NormProduct[] = useMemo(
    () => groupByProductId(monthFiltered),
    [monthFiltered],
  );

  // ── Search filter ──────────────────────────────────────────────────────────
  const searchFiltered: NormProduct[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return aggregated;
    return aggregated.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.variant.toLowerCase().includes(q)
    );
  }, [aggregated, searchQuery]);

  // ── Metric filters ─────────────────────────────────────────────────────────
  const finalProducts: NormProduct[] = useMemo(
    () => applyFilters(searchFiltered, activeFilters),
    [searchFiltered, activeFilters],
  );

  // ── KPI strip — recomputed from aggregated (all search/filter removed) ─────
  const s = mergedSummary;
  // Recompute from aggregated so KPIs always reflect selected months
  const aggKpis = useMemo(() => {
    if (!aggregated.length) return null;
    const totSpend = aggregated.reduce((a, p) => a + p.totalSpend, 0);
    const totRev   = aggregated.reduce((a, p) => a + p.revenue,    0);
    return {
      products:    aggregated.length,
      meta_spend:  aggregated.reduce((a, p) => a + p.metaSpend,  0),
      google_cost: aggregated.reduce((a, p) => a + p.googleCost, 0),
      total_spend: totSpend,
      total_rev:   totRev,
      roi:         totSpend > 0 ? totRev / totSpend : 0,
    };
  }, [aggregated]);

  const kpiCards = aggKpis ? [
    { label: 'PRODUCTS',    value: aggKpis.products,    format: 'number'   as const },
    { label: 'META SPEND',  value: aggKpis.meta_spend,  format: 'currency' as const },
    { label: 'GOOGLE COST', value: aggKpis.google_cost, format: 'currency' as const },
    { label: 'TOTAL SPEND', value: aggKpis.total_spend, format: 'currency' as const },
    { label: 'REVENUE',     value: aggKpis.total_rev,   format: 'currency' as const },
    { label: 'OVERALL ROI', value: aggKpis.roi,         format: 'roi'      as const },
  ] : [];

  const breadcrumbs = [
    { label: 'Workspace' },
    { label: 'Product Analysis' },
    { label: 'Overall View' },
  ];

  return (
    <DashboardLayout
      breadcrumbs={breadcrumbs}
      rightPanel={isMerged ? <ProductAnalysisPanel /> : undefined}
      rightPanelTitle="Run Details"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">Product Analysis</h1>
        <p className="text-[#57544E] text-sm">
          Merge Meta Ads, Shopify, and Google Ads into one product-level performance table.
        </p>
      </div>

      {/* Upload Grid */}
      <UploadGrid />

      {/* Merge bar */}
      <div className="mt-4 bg-white rounded-xl border border-[#EEECE5] px-5 py-3.5 flex items-center justify-between">
        <p className="text-sm text-[#57544E]">
          {readyToMerge
            ? <><span className="font-medium text-[#1A1814]">{fileCount} file{fileCount !== 1 ? 's' : ''}</span> loaded — ready to merge</>
            : 'Upload Meta Ads and Shopify exports to enable merge. Google Ads is optional.'}
        </p>
        <Button
          onClick={handleMerge}
          disabled={!readyToMerge || loading}
          className={cn(
            'bg-[#4F46E5] hover:bg-[#4338CA] min-w-[160px]',
            (!readyToMerge || loading) && 'opacity-60 cursor-not-allowed',
          )}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
            : '▶  Merge & Analyse'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Merge failed</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && isMerged && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <p className="text-xs font-medium text-amber-800 mb-1">Warnings</p>
          {warnings.map((w, i) => <p key={i} className="text-xs text-amber-700">• {w}</p>)}
        </div>
      )}

      {/* Post-merge */}
      {isMerged && mergedData && s && (
        <div className="mt-6 space-y-5">
          {/* Success banner */}
          <div className="bg-[#E7F7F0] rounded-xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-sm text-[#1A1814]">
                Data merged · <span className="font-semibold">{aggregated.length} products</span>
                {allMonths.length > 0 && (
                  <> · <span className="font-semibold">{selectedMonths.size}</span> of {allMonths.length} months selected</>
                )}
              </span>
            </div>
            {runId && <span className="font-mono text-xs text-[#57544E]">{runId}</span>}
          </div>

          {/* Month filter pills */}
          {allMonths.length > 0 && (
            <div className="bg-white rounded-xl border border-[#EEECE5] px-5 py-3.5">
              <MonthPills
                months={allMonths}
                selected={selectedMonths}
                onToggle={toggleMonth}
                onReset={resetMonths}
              />
            </div>
          )}

          {/* KPIs — update with selected months */}
          {kpiCards.length > 0 && <KpiStrip cards={kpiCards} />}

          {/* Top performers */}
          <TopPerformers tableRef={tableRef} />

          {/* Columns & Filters */}
          <ColumnsAndFilters
            onFiltersChange={setActiveFilters}
            onColumnsChange={setVisibleColumns}
          />

          {/* Search + row count bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8780]" />
              <input
                type="text"
                placeholder="Search by product ID, title, or variant…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#EEECE5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8780] hover:text-[#1A1814]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="text-sm text-[#57544E] whitespace-nowrap flex-shrink-0">
              <span className="font-medium text-[#1A1814]">{finalProducts.length.toLocaleString('en-IN')}</span>
              {' '}of {aggregated.length.toLocaleString('en-IN')} products
            </div>
          </div>

          {/* Data Table */}
          <div ref={tableRef}>
            <DataTable products={finalProducts as any} columns={visibleColumns} />
          </div>

          <DownloadBand products={finalProducts} activeFilters={activeFilters} />
        </div>
      )}
    </DashboardLayout>
  );
}