'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { KpiStrip } from '@/components/ui/kpi-card';
import { DiscountHero } from '@/components/discount-analysis/discount-hero';
import { ComparisonCard } from '@/components/discount-analysis/comparison-card';
import { NarrativeCard } from '@/components/discount-analysis/narrative-card';
import { DiscountTable } from '@/components/discount-analysis/discount-table';
import { DiscountPanel } from '@/components/discount-analysis/right-panel';
import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';
import Link from 'next/link';

function getSpend(p: Product): number   { return p['Total Spend']    ?? (p as any).totalSpend ?? 0; }
function getRevenue(p: Product): number { return p['Shopify Revenue'] ?? (p as any).revenue    ?? 0; }
function getItemsSold(p: Product): number { return p['Net Items Sold'] ?? (p as any).itemsSold ?? 0; }
function getCtr(p: Product): number     { return p['CTR'] ?? (p as any).ctr ?? 0; }
function getCpm(p: Product): number     { return p['CPM'] ?? (p as any).cpm ?? 0; }
function isDiscounted(p: Product): boolean { return !!(p as any).discounted; }

function computeStats(products: Product[]) {
  if (products.length === 0) return { count: 0, spend: 0, revenue: 0, roi: 0, items: 0, avgCtr: 0, avgCpm: 0 };
  const spend   = products.reduce((s, p) => s + getSpend(p), 0);
  const revenue = products.reduce((s, p) => s + getRevenue(p), 0);
  return {
    count:   products.length,
    spend,
    revenue,
    roi:     spend > 0 ? revenue / spend : 0,
    items:   products.reduce((s, p) => s + getItemsSold(p), 0),
    avgCtr:  products.reduce((s, p) => s + getCtr(p), 0) / products.length,
    avgCpm:  products.reduce((s, p) => s + getCpm(p), 0) / products.length,
  };
}

export default function DiscountAnalysisPage() {
  const { mergedData } = useApp();

  const products   = mergedData ?? [];
  const discounted    = products.filter(isDiscounted);
  const nonDiscounted = products.filter(p => !isDiscounted(p));

  const dStats  = computeStats(discounted);
  const ndStats = computeStats(nonDiscounted);

  const kpiCards = [
    { label: 'DISCOUNTED',     value: dStats.count,  format: 'number' as const, showSparkline: false },
    { label: 'NON-DISCOUNTED', value: ndStats.count, format: 'number' as const, showSparkline: false },
    { label: 'DISCOUNTED ROI', value: dStats.roi,    format: 'roi'    as const, showSparkline: false },
    { label: 'NON-DISC. ROI',  value: ndStats.roi,   format: 'roi'    as const, showSparkline: false },
  ];

  const breadcrumbs = [
    { label: 'Workspace' },
    { label: 'Discount Analysis' },
    { label: 'Overview' },
  ];

  return (
    <DashboardLayout
      breadcrumbs={breadcrumbs}
      rightPanel={<DiscountPanel />}
      rightPanelTitle="Insights"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">Discount vs Non-Discount</h1>
        <p className="text-sm text-[#57544E]">
          Compare the performance of discounted and non-discounted products to optimize your pricing strategy.
        </p>
      </div>

      {!mergedData ? (
        <div className="py-20 text-center text-[#8B8780]">
          <p className="text-lg font-medium mb-2">No data loaded</p>
          <p className="text-sm mb-4">Run Product Analysis first to see discount insights.</p>
          <Link href="/product-analysis" className="text-[#4F46E5] hover:text-[#4338CA] text-sm">
            Go to Product Analysis →
          </Link>
        </div>
      ) : (
        <>
          <KpiStrip cards={kpiCards} className="mb-6" />
          <div className="mb-5"><DiscountHero discountedStats={dStats} nonDiscountedStats={ndStats} /></div>
          <div className="mb-5"><ComparisonCard discountedStats={dStats} nonDiscountedStats={ndStats} /></div>
          <div className="mb-5"><NarrativeCard discountedStats={dStats} nonDiscountedStats={ndStats} /></div>
          <DiscountTable products={products} />
        </>
      )}
    </DashboardLayout>
  );
}