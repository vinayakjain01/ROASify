'use client';
import { useState, useCallback } from 'react';
import { analyseFiles, AnalyseResponse, ProductRow } from '@/lib/api';
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
  const [metaFile,    setMetaFile]    = useState<File | null>(null);
  const [shopifyFile, setShopifyFile] = useState<File | null>(null);
  const [googleFile,  setGoogleFile]  = useState<File | null>(null);
  const [result,      setResult]      = useState<AnalyseResponse | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const uploadState = metaFile && shopifyFile
    ? (result ? 'uploaded' : 'ready')
    : 'empty';

  const handleMerge = useCallback(async () => {
    if (!metaFile || !shopifyFile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await analyseFiles(metaFile, shopifyFile, googleFile);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [metaFile, shopifyFile, googleFile]);

  // Build KPI cards from real data
  const kpiCards = result ? [
    { label: 'PRODUCTS',    value: result.kpis.totalProducts,   format: 'number'   as const },
    { label: 'META SPEND',  value: result.kpis.totalMetaSpend,  format: 'currency' as const },
    { label: 'GOOGLE COST', value: result.kpis.totalGoogleCost, format: 'currency' as const },
    { label: 'TOTAL SPEND', value: result.kpis.totalSpend,      format: 'currency' as const },
    { label: 'REVENUE',     value: result.kpis.totalRevenue,    format: 'currency' as const },
    { label: 'OVERALL ROI', value: result.kpis.overallRoi,      format: 'roi'      as const },
  ] : [];

  const breadcrumbs = [
    { label: 'Workspace' },
    { label: 'Product Analysis' },
    { label: 'Overall View' },
  ];


  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      {/* Upload section — connect file inputs here */}
      <UploadGrid
        onMetaFile={setMetaFile}
        onShopifyFile={setShopifyFile}
        onGoogleFile={setGoogleFile}
      />

      {/* Merge Bar */}
      <div className="mt-6 bg-white rounded-[10px] border border-[#EEECE5] p-4 flex items-center justify-between">
        <p className="text-sm text-[#57544E]">
          {result
            ? `Merged — ${result.kpis.totalProducts} products`
            : 'Upload Meta Ads and Shopify exports to enable merge.'}
        </p>
        <Button
          disabled={!metaFile || !shopifyFile || loading}
          onClick={handleMerge}
          className="bg-[#4F46E5] hover:bg-[#4338CA]"
        >
          {loading ? 'Processing…' : 'Merge & Analyse'}
        </Button>
      </div>

      {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}

      {/* Post-merge content */}
      {result && (
        <div className="mt-8 space-y-6">
          <KpiStrip cards={kpiCards} />
          <DataTable products={result.products as ProductRow[]} />
        </div>
      )}
    </DashboardLayout>
  );
}
