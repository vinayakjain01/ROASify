'use client';

import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { KpiStrip } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { UploadGrid } from '@/components/product-analysis/upload-cards';
import { TopPerformers } from '@/components/product-analysis/top-performers';
import { ColumnsAndFilters } from '@/components/product-analysis/columns-filters';
import { DownloadBand } from '@/components/product-analysis/download-band';
import { ProductAnalysisPanel } from '@/components/product-analysis/right-panel';
import type { ProductRow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { 
  products as mockProducts, 
  totalProducts, 
  totalMetaSpend, 
  totalGoogleCost, 
  totalSpend, 
  totalRevenue, 
  overallRoi,
  runMetadata
} from '@/lib/data';
import { getStore, hasRequiredFiles } from '@/lib/store';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function ProductAnalysisPage() {
  // File state is read from module-level store (persists across navigation)
  const store = getStore();
  const [metaFile, setMetaFile] = useState(store.metaFile);
  const [shopifyFile, setShopifyFile] = useState(store.shopifyFile);
  const [googleFile, setGoogleFile] = useState(store.googleFile);
  const [loading, setLoading] = useState(false);
  // Using mock data for now (real data comes from API in production)
  const [merged, setMerged] = useState(true); // default true for demo

  const readyToMerge = metaFile !== null && shopifyFile !== null;
  const fileCount = [metaFile, shopifyFile, googleFile].filter(Boolean).length;

  const handleMerge = useCallback(async () => {
    if (!readyToMerge) return;
    setLoading(true);
    // Simulate processing — replace with real API call
    await new Promise(r => setTimeout(r, 900));
    setMerged(true);
    setLoading(false);
  }, [readyToMerge]);

  const kpiCards = [
    { label: 'PRODUCTS',    value: totalProducts,   delta: 3.7,  format: 'number'   as const },
    { label: 'META SPEND',  value: totalMetaSpend,  delta: -2.1, format: 'currency' as const },
    { label: 'GOOGLE COST', value: totalGoogleCost, delta: 4.4,  format: 'currency' as const },
    { label: 'TOTAL SPEND', value: totalSpend,      delta: -1.3, format: 'currency' as const },
    { label: 'REVENUE',     value: totalRevenue,    delta: 9.2,  format: 'currency' as const },
    { label: 'OVERALL ROI', value: overallRoi,      delta: 6.8,  format: 'roi'      as const },
  ];

  const breadcrumbs = [
    { label: 'Workspace' },
    { label: 'Product Analysis' },
    { label: 'Overall View' },
  ];

  return (
    <DashboardLayout
      breadcrumbs={breadcrumbs}
      rightPanel={merged ? <ProductAnalysisPanel /> : undefined}
      rightPanelTitle="Run Details"
    >
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">Product Analysis</h1>
        <p className="text-[#57544E] text-sm">
          Merge Meta Ads, Shopify, and Google Ads into one product-level performance table.
        </p>
      </div>

      {/* Upload Grid — files persist in store */}
      <UploadGrid
        onFilesChange={(m, s, g) => {
          setMetaFile(m);
          setShopifyFile(s);
          setGoogleFile(g);
          // If files removed, reset merge state
          if (!m || !s) setMerged(false);
        }}
      />

      {/* Merge Bar */}
      <div className="mt-4 bg-white rounded-xl border border-[#EEECE5] px-5 py-3.5 flex items-center justify-between">
        <p className="text-sm text-[#57544E]">
          {merged
            ? <>Ready to merge — <span className="font-medium text-[#1A1814]">{fileCount} file{fileCount !== 1 ? 's' : ''}</span> loaded</>
            : readyToMerge
            ? <>Ready to merge — <span className="font-medium text-[#1A1814]">{fileCount} file{fileCount !== 1 ? 's' : ''}</span> loaded</>
            : 'Upload Meta Ads and Shopify exports to enable merge. Google Ads is optional.'}
        </p>
        <Button
          onClick={handleMerge}
          disabled={!readyToMerge || loading}
          className={cn(
            'bg-[#4F46E5] hover:bg-[#4338CA] min-w-[140px]',
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

      {/* Post-Merge Content */}
      {merged && (
        <div className="mt-6 space-y-5">
          {/* Success Banner */}
          <div className="bg-[#E7F7F0] rounded-xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-sm text-[#1A1814]">
                Data merged · <span className="font-semibold">{totalProducts} products</span> · 3 sources
              </span>
            </div>
            <span className="text-sm text-[#57544E] font-mono text-xs">
              {runMetadata.runId}
            </span>
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
                Showing <span className="font-medium text-[#1A1814]">{mockProducts.length}</span> of {mockProducts.length} products
              </span>
              <span className="text-sm text-[#8B8780]">
                Rows per page: 50 · Page 1 of 1
              </span>
            </div>
            <DataTable products={mockProducts as ProductRow[]} />
          </div>

          {/* Download Band */}
          <DownloadBand />
        </div>
      )}
    </DashboardLayout>
  );
}