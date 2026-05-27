'use client';

import { useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { KpiStrip } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { UploadGrid } from '@/components/product-analysis/upload-cards';
import { TopPerformers } from '@/components/product-analysis/top-performers';
import { ColumnsAndFilters } from '@/components/product-analysis/columns-filters';
import { DownloadBand } from '@/components/product-analysis/download-band';
import { ProductAnalysisPanel } from '@/components/product-analysis/right-panel';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/context';
import { mergeFiles } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

// Normalize API-shaped product data to ProductRow for DataTable
function normalizeProducts(products: any[]): any[] {
  return products.map(p => ({
    id:         p['Product ID']      ?? p.id         ?? p.product_id        ?? '',
    title:      p['Product Title']   ?? p.title      ?? p.product_title     ?? '',
    variant:    p['Variant Title']   ?? p.variant    ?? p.variant_title     ?? '',
    metaSpend:  p['Meta Spend']      ?? p.metaSpend  ?? p.meta_spend        ?? 0,
    googleCost: p['Google Cost']     ?? p.googleCost ?? p.google_cost       ?? 0,
    totalSpend: p['Total Spend']     ?? p.totalSpend ?? p.total_spend       ?? 0,
    revenue:    p['Shopify Revenue'] ?? p.revenue    ?? p.shopify_revenue   ?? 0,
    roi:        p['ROI']             ?? p.roi        ?? ((() => { const sp = p['Total Spend'] ?? p.totalSpend ?? 0; return sp > 0 ? (p['Shopify Revenue'] ?? p.revenue ?? 0) / sp : 0; })()),
    itemsSold:  p['Net Items Sold']  ?? p.itemsSold  ?? p.net_items_sold    ?? 0,
    ctr:        p['CTR']             ?? p.ctr        ?? 0,
    cpm:        p['CPM']             ?? p.cpm        ?? 0,
  }));
}



export default function ProductAnalysisPage() {
  const {
    metaFile, shopifyFile, googleFile,
    mergedData, mergedSummary, warnings,
    setMergedResult, clearMergedData,
  } = useApp();

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [runId, setRunId]       = useState<string | null>(null);

  const metaF   = metaFile?.file   ?? null;
  const shopF   = shopifyFile?.file ?? null;
  const gooF    = googleFile?.file  ?? null;

  const readyToMerge = metaF !== null && shopF !== null;
  const fileCount    = [metaF, shopF, gooF].filter(Boolean).length;
  const isMerged     = mergedData !== null && mergedSummary !== null;

  const handleMerge = useCallback(async () => {
    if (!readyToMerge || !metaF || !shopF) return;
    setLoading(true);
    setError(null);
    try {
      const result = await mergeFiles(metaF, shopF, gooF);

      // Normalise API response into context shape
      const products  = result.products  ?? result.data ?? [];
      const summary   = result.summary   ?? {};
      const warns     = result.warnings  ?? [];
      const hasMonth  = result.has_month  ?? false;
      const hasGoogle = result.has_google ?? (gooF !== null);

      const mergedSummary = {
        products:    summary.products    ?? products.length,
        total_spend: summary.total_spend ?? summary.totalSpend ?? 0,
        total_rev:   summary.total_rev   ?? summary.totalRevenue ?? 0,
        roi:         summary.roi         ?? summary.overall_roi ?? 0,
        meta_spend:  summary.meta_spend  ?? summary.metaSpend ?? 0,
        google_cost: summary.google_cost ?? summary.googleCost ?? 0,
        lpv:         summary.lpv         ?? 0,
      };

      setMergedResult(products, mergedSummary, hasMonth, hasGoogle, warns);

      // Generate a run ID based on timestamp
      const now = new Date();
      const ts = `pa_${now.getFullYear()}_${String(now.getMonth()+1).padStart(2,'0')}_${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}_${String(now.getMinutes()).padStart(2,'0')}`;
      setRunId(ts);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to merge files. Check that your files match the expected format.');
    } finally {
      setLoading(false);
    }
  }, [readyToMerge, metaF, shopF, gooF, setMergedResult]);

  // Build KPI cards from live summary, or zeros if not merged yet
  const s = mergedSummary;
  const kpiCards = s
    ? [
        { label: 'PRODUCTS',    value: s.products,    delta: undefined, format: 'number'   as const },
        { label: 'META SPEND',  value: s.meta_spend ?? 0, delta: undefined, format: 'currency' as const },
        { label: 'GOOGLE COST', value: s.google_cost ?? 0, delta: undefined, format: 'currency' as const },
        { label: 'TOTAL SPEND', value: s.total_spend, delta: undefined, format: 'currency' as const },
        { label: 'REVENUE',     value: s.total_rev,   delta: undefined, format: 'currency' as const },
        { label: 'OVERALL ROI', value: s.roi,         delta: undefined, format: 'roi'      as const },
      ]
    : [];

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
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">Product Analysis</h1>
        <p className="text-[#57544E] text-sm">
          Merge Meta Ads, Shopify, and Google Ads into one product-level performance table.
        </p>
      </div>

      {/* Upload Grid — files stored in context (persists across navigation) */}
      <UploadGrid />

      {/* Merge Bar */}
      <div className="mt-4 bg-white rounded-xl border border-[#EEECE5] px-5 py-3.5 flex items-center justify-between">
        <p className="text-sm text-[#57544E]">
          {readyToMerge
            ? <>Ready to merge — <span className="font-medium text-[#1A1814]">{fileCount} file{fileCount !== 1 ? 's' : ''}</span> loaded</>
            : 'Upload Meta Ads and Shopify exports to enable merge. Google Ads is optional.'}
        </p>
        <Button
          onClick={handleMerge}
          disabled={!readyToMerge || loading}
          className={cn(
            'bg-[#4F46E5] hover:bg-[#4338CA] min-w-[160px]',
            (!readyToMerge || loading) && 'opacity-60 cursor-not-allowed'
          )}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
          ) : (
            '▶  Merge & Analyse'
          )}
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Merge failed</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && isMerged && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <p className="text-xs font-medium text-amber-800 mb-1">Warnings</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700">• {w}</p>
          ))}
        </div>
      )}

      {/* Post-Merge Content */}
      {isMerged && mergedData && s && (
        <div className="mt-6 space-y-5">
          {/* Success Banner */}
          <div className="bg-[#E7F7F0] rounded-xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-sm text-[#1A1814]">
                Data merged · <span className="font-semibold">{s.products} products</span> · {fileCount} sources
              </span>
            </div>
            {runId && (
              <span className="text-sm text-[#57544E] font-mono text-xs">{runId}</span>
            )}
          </div>

          {/* KPI Strip */}
          <KpiStrip cards={kpiCards} />

          {/* Top Performers */}
          <TopPerformers />

          {/* Columns & Filters */}
          <ColumnsAndFilters />

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-[#EEECE5] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#EEECE5]">
              <span className="text-sm text-[#57544E]">
                Showing <span className="font-medium text-[#1A1814]">{mergedData.length}</span> of {mergedData.length} products
              </span>
              <span className="text-sm text-[#8B8780]">
                Rows per page: 50 · Page 1 of {Math.max(1, Math.ceil(mergedData.length / 50))}
              </span>
            </div>
            <DataTable products={normalizeProducts(mergedData)} />
          </div>

          {/* Download Band */}
          <DownloadBand />
        </div>
      )}
    </DashboardLayout>
  );
}