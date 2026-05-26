'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { KpiStrip } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { UploadGrid } from '@/components/product-analysis/upload-cards';
import { TopPerformers } from '@/components/product-analysis/top-performers';
import { ColumnsAndFilters } from '@/components/product-analysis/columns-filters';
import { DownloadBand } from '@/components/product-analysis/download-band';
import { ProductAnalysisPanel } from '@/components/product-analysis/right-panel';
import { Button } from '@/components/ui/button';
import { 
  products, 
  totalProducts, 
  totalMetaSpend, 
  totalGoogleCost, 
  totalSpend, 
  totalRevenue, 
  overallRoi,
  runMetadata
} from '@/lib/data';
import { cn } from '@/lib/utils';

type UploadState = 'empty' | 'uploaded' | 'error';

export default function ProductAnalysisPage() {
  const [uploadState, setUploadState] = useState<UploadState>('uploaded');
  const [showPanel, setShowPanel] = useState(false);

  const kpiCards = [
    { label: 'PRODUCTS', value: totalProducts, delta: 3.7, format: 'number' as const },
    { label: 'META SPEND', value: totalMetaSpend, delta: -2.1, format: 'currency' as const },
    { label: 'GOOGLE COST', value: totalGoogleCost, delta: 4.4, format: 'currency' as const },
    { label: 'TOTAL SPEND', value: totalSpend, delta: -1.3, format: 'currency' as const },
    { label: 'REVENUE', value: totalRevenue, delta: 9.2, format: 'currency' as const },
    { label: 'OVERALL ROI', value: overallRoi, delta: 6.8, format: 'roi' as const },
  ];

  const breadcrumbs = [
    { label: 'Workspace' },
    { label: 'Product Analysis' },
    { label: 'Overall View' },
  ];

  return (
    <DashboardLayout 
        breadcrumbs={breadcrumbs}
        rightPanel={
          showPanel && uploadState === 'uploaded' ? (
            <ProductAnalysisPanel />
          ) : undefined
        }
      >
      {/* Page Header with State Toggle */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">Product Analysis</h1>
          <p className="text-[#57544E]">
            Upload your ad platform and Shopify exports to calculate product-level ROAS.
          </p>
          <div className="mt-3">
            <Button
              onClick={() => setShowPanel(!showPanel)}
              variant="outline"
            >
              {showPanel ? "Hide Details" : "Show Details"}
            </Button>
          </div>
        </div>
        
        {/* State Toggle */}
        <div className="flex items-center gap-1 bg-[#F2F0EA] rounded-lg p-1">
          {(['empty', 'uploaded', 'error'] as const).map((state) => (
            <button
              key={state}
              onClick={() => setUploadState(state)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors capitalize",
                uploadState === state
                  ? "bg-white text-[#1A1814] shadow-sm"
                  : "text-[#57544E] hover:text-[#1A1814]"
              )}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Cards */}
      <UploadGrid state={uploadState} />

      {/* Merge Bar */}
      <div className="mt-6 bg-white rounded-[10px] border border-[#EEECE5] p-4 flex items-center justify-between">
        <p className="text-sm text-[#57544E]">
          {uploadState === 'uploaded' 
            ? 'Ready to merge — 3 files, 26 unique products.'
            : uploadState === 'error'
            ? 'Please fix the errors above before merging.'
            : 'Upload Meta Ads and Shopify exports to enable merge. Google Ads is optional.'}
        </p>
        <Button 
          disabled={uploadState !== 'uploaded'}
          className={cn(
            "bg-[#4F46E5] hover:bg-[#4338CA]",
            uploadState !== 'uploaded' && "opacity-50 cursor-not-allowed"
          )}
        >
          Merge & Analyse
        </Button>
      </div>

      {/* Post-Merge Content - Only shown when uploaded */}
      {uploadState === 'uploaded' && (
        <div className="mt-8 space-y-6">
          {/* Success Banner */}
          <div className="bg-[#E7F7F0] rounded-[10px] px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#10B981] rounded-full" />
              <span className="text-sm text-[#1A1814]">
                Data merged from 3 sources · 26 products · <span className="font-mono">{runMetadata.runId}</span>
              </span>
            </div>
            <span className="text-sm text-[#57544E]">
              Period: {runMetadata.period}
            </span>
          </div>

          {/* KPI Strip */}
          <KpiStrip cards={kpiCards} />

          {/* Top Performers */}
          <TopPerformers />

          {/* Columns & Filters */}
          <ColumnsAndFilters />

          {/* Data Table */}
          <div className="bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#EEECE5]">
              <span className="text-sm text-[#57544E]">
                Showing {products.length} of {products.length} products
              </span>
              <span className="text-sm text-[#8B8780]">
                Rows per page: 50 · Page 1 of 1
              </span>
            </div>
            <DataTable products={products} />
          </div>

          {/* Download Band */}
          <DownloadBand />
        </div>
      )}
    </DashboardLayout>
  );
}
