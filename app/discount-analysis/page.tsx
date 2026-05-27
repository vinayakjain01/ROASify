'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { KpiStrip } from '@/components/ui/kpi-card';
import { DiscountHero } from '@/components/discount-analysis/discount-hero';
import { ComparisonCard } from '@/components/discount-analysis/comparison-card';
import { NarrativeCard } from '@/components/discount-analysis/narrative-card';
import { DiscountTable } from '@/components/discount-analysis/discount-table';
import { DiscountPanel } from '@/components/discount-analysis/right-panel';
import { discountedStats, nonDiscountedStats } from '@/lib/data';

export default function DiscountAnalysisPage() {
  const kpiCards = [
    { label: 'DISCOUNTED',     value: discountedStats.count,    format: 'number' as const, showSparkline: false },
    { label: 'NON-DISCOUNTED', value: nonDiscountedStats.count, format: 'number' as const, showSparkline: false },
    { label: 'DISCOUNTED ROI', value: discountedStats.roi,      format: 'roi'    as const, showSparkline: false },
    { label: 'NON-DISC. ROI',  value: nonDiscountedStats.roi,   format: 'roi'    as const, showSparkline: false },
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
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">
          Discount vs Non-Discount
        </h1>
        <p className="text-sm text-[#57544E]">
          Compare the performance of discounted and non-discounted products to optimize your pricing strategy.
        </p>
      </div>

      {/* KPI Strip */}
      <KpiStrip cards={kpiCards} className="mb-6" />

      {/* Hero Card */}
      <div className="mb-5">
        <DiscountHero />
      </div>

      {/* Comparison Card */}
      <div className="mb-5">
        <ComparisonCard />
      </div>

      {/* Narrative Card */}
      <div className="mb-5">
        <NarrativeCard />
      </div>

      {/* Products Table */}
      <DiscountTable />
    </DashboardLayout>
  );
}