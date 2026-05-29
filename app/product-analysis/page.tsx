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
import { FilteredTotalsBar } from '@/components/product-analysis/filtered-totals-bar';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/context';
import type { NormProduct } from '@/lib/context';
import { mergeFiles } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, AlertTriangle, Search, X } from 'lucide-react';

const DEFAULT_COLUMNS = [
  'id', 'title', 'variant', 'metaSpend', 'totalSpend',
  'revenue', 'roi', 'itemsSold', 'ctr', 'cpm',
];

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

export default function ProductAnalysisPage() {
  const {
    metaFile, shopifyFile, googleFile,
    mergedData, mergedSummary, warnings,
    setMergedResult,
    // ── From context — the single source of truth ──
    aggregatedProducts,   // month-filtered + grouped by product ID
    allMonths,
    selectedMonths,
  } = useApp();

  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [runId,          setRunId]          = useState<string | null>(null);
  const [activeFilters,  setActiveFilters]  = useState<ActiveFilter[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [searchQuery,    setSearchQuery]    = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const metaF = metaFile?.file   ?? null;
  const shopF = shopifyFile?.file ?? null;
  const gooF  = googleFile?.file  ?? null;

  const readyToMerge = metaF !== null && shopF !== null;
  const fileCount    = [metaF, shopF, gooF].filter(Boolean).length;
  const isMerged     = mergedData !== null && mergedSummary !== null;

  const handleMerge = useCallback(async () => {
    if (!readyToMerge || !metaF || !shopF) return;
    setLoading(true);
    setError(null);
    setSearchQuery('');
    try {
      const result   = await mergeFiles(metaF, shopF, gooF);
      const products = result.products ?? result.data ?? [];
      const summary  = result.summary  ?? {};
      const warns    = result.warnings ?? [];

      // Compute totals from raw rows as fallback if API summary has zeros
      const calcTotalSpend = products.reduce((s: number, p: any) => s + Number(p['Total Spend']     ?? p.totalSpend  ?? 0), 0);
      const calcTotalRev   = products.reduce((s: number, p: any) => s + Number(p['Shopify Revenue'] ?? p.revenue     ?? 0), 0);
      const calcMetaSpend  = products.reduce((s: number, p: any) => s + Number(p['Meta Spend']      ?? p.metaSpend   ?? 0), 0);
      const calcGoogleCost = products.reduce((s: number, p: any) => s + Number(p['Google Cost']     ?? p.googleCost  ?? 0), 0);

      setMergedResult(products, {
        products:    summary.products    ?? products.length,
        total_spend: summary.total_spend || calcTotalSpend,
        total_rev:   summary.total_rev   || calcTotalRev,
        roi:         summary.roi         || (calcTotalSpend > 0 ? calcTotalRev / calcTotalSpend : 0),
        meta_spend:  summary.meta_spend  || calcMetaSpend,
        google_cost: summary.google_cost || calcGoogleCost,
        lpv:         summary.lpv         ?? 0,
      }, result.has_month ?? false, result.has_google ?? (gooF !== null), warns);

      const now = new Date();
      setRunId(`pa_${now.getFullYear()}_${String(now.getMonth()+1).padStart(2,'0')}_${String(now.getDate()).padStart(2,'0')}`);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to merge files.');
    } finally {
      setLoading(false);
    }
  }, [readyToMerge, metaF, shopF, gooF, setMergedResult]);

  // ── All downstream data flows from context.aggregatedProducts ───────────
  // aggregatedProducts = mergedData → filter to selectedMonths → group by product ID → sum

  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return aggregatedProducts;
    return aggregatedProducts.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.variant.toLowerCase().includes(q)
    );
  }, [aggregatedProducts, searchQuery]);

  // finalProducts is what the DataTable and the totals bar both read from —
  // it reflects every active filter + search query simultaneously.
  const finalProducts = useMemo(
    () => applyFilters(searchFiltered, activeFilters),
    [searchFiltered, activeFilters]
  );

  // KPIs derived from aggregatedProducts (always reflects selected months, ignores search/metric filters)
  const kpiCards = useMemo(() => {
    if (!aggregatedProducts.length) return [];
    let totSpend = 0, totRev = 0, totMeta = 0, totGoogle = 0;
    for (const p of aggregatedProducts) {
      totSpend  += p.totalSpend;
      totRev    += p.revenue;
      totMeta   += p.metaSpend;
      totGoogle += p.googleCost;
    }
    return [
      { label: 'PRODUCTS',    value: aggregatedProducts.length, format: 'number'   as const },
      { label: 'META SPEND',  value: totMeta,                   format: 'currency' as const },
      { label: 'GOOGLE COST', value: totGoogle,                 format: 'currency' as const },
      { label: 'TOTAL SPEND', value: totSpend,                  format: 'currency' as const },
      { label: 'REVENUE',     value: totRev,                    format: 'currency' as const },
      { label: 'OVERALL ROI', value: totSpend > 0 ? totRev / totSpend : 0, format: 'roi' as const },
    ];
  }, [aggregatedProducts]);

  const monthLabel = allMonths.length > 0
    ? (selectedMonths.size === allMonths.length
        ? `${allMonths.length} months`
        : `${selectedMonths.size} of ${allMonths.length} months`)
    : null;

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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">Product Analysis</h1>
        <p className="text-[#57544E] text-sm">
          Merge Meta Ads, Shopify, and Google Ads into one product-level performance table.
        </p>
      </div>

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
          className={cn('bg-[#4F46E5] hover:bg-[#4338CA] min-w-[160px]', (!readyToMerge || loading) && 'opacity-60 cursor-not-allowed')}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
            : '▶  Merge & Analyse'}
        </Button>
      </div>

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

      {warnings.length > 0 && isMerged && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <p className="text-xs font-medium text-amber-800 mb-1">Warnings</p>
          {warnings.map((w, i) => <p key={i} className="text-xs text-amber-700">• {w}</p>)}
        </div>
      )}

      {isMerged && mergedData && (
        <div className="mt-6 space-y-5 min-w-0">
          {/* Success banner */}
          <div className="bg-[#E7F7F0] rounded-xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-sm text-[#1A1814]">
                Data merged · <span className="font-semibold">{aggregatedProducts.length} products</span>
                {monthLabel && <> · <span className="font-semibold">{monthLabel}</span></>}
              </span>
            </div>
            {runId && <span className="font-mono text-xs text-[#57544E]">{runId}</span>}
          </div>

          {/* KPIs — live-updated from aggregatedProducts (month-sensitive, ignores search/filters) */}
          {kpiCards.length > 0 && <KpiStrip cards={kpiCards} />}

          {/* Top Performers — month-sensitive, totalSpend > 1 */}
          <TopPerformers tableRef={tableRef} />

          {/* Columns & Filters */}
          <ColumnsAndFilters
            onFiltersChange={setActiveFilters}
            onColumnsChange={setVisibleColumns}
          />

          {/* Search + row count */}
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
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8780] hover:text-[#1A1814]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="text-sm text-[#57544E] whitespace-nowrap flex-shrink-0">
              <span className="font-medium text-[#1A1814]">{finalProducts.length.toLocaleString('en-IN')}</span>
              {' '}of {aggregatedProducts.length.toLocaleString('en-IN')} products
            </div>
          </div>

          {/* ── TOTALS BAR — updates live with every search/filter change ── */}
          <FilteredTotalsBar
            products={finalProducts}
            totalCount={aggregatedProducts.length}
          />

          {/* Data Table — driven by finalProducts (reacts to search, filters, month change) */}
          <div ref={tableRef}>
            <DataTable products={finalProducts as any} columns={visibleColumns} />
          </div>

          <DownloadBand products={finalProducts} activeFilters={activeFilters} />
        </div>
      )}
    </DashboardLayout>
  );
}