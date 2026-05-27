'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { KpiStrip } from '@/components/ui/kpi-card';
import { ChampionsHero } from '@/components/quadrant-view/champions-hero';
import { QuadrantGrid } from '@/components/quadrant-view/quadrant-cards';
import { AIAnalysis } from '@/components/quadrant-view/ai-analysis';
import { FourCsSlideover } from '@/components/quadrant-view/four-cs-slideover';
import { QuadrantPanel } from '@/components/quadrant-view/right-panel';
import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';

function getSpend(p: Product): number   { return p['Total Spend']    ?? (p as any).totalSpend ?? 0; }
function getRevenue(p: Product): number { return p['Shopify Revenue'] ?? (p as any).revenue    ?? 0; }

function pctIndex(arr: number[], pct: number): number {
  if (arr.length === 0) return 0;
  return arr[Math.max(0, Math.floor((pct / 100) * arr.length) - 1)] ?? 0;
}

export default function QuadrantViewPage() {
  const { mergedData, mergedSummary } = useApp();
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [spendPct, setSpendPct]   = useState(50);
  const [revPct,   setRevPct]     = useState(50);

  const products = mergedData ?? [];

  // Sorted arrays for percentile computation
  const sortedSpends    = useMemo(() => products.map(getSpend).sort((a, b) => a - b),   [products]);
  const sortedRevenues  = useMemo(() => products.map(getRevenue).sort((a, b) => a - b), [products]);

  const spendThreshold   = useMemo(() => sortedSpends.length   > 0 ? pctIndex(sortedSpends,   spendPct) : 61000,   [sortedSpends,   spendPct]);
  const revenueThreshold = useMemo(() => sortedRevenues.length > 0 ? pctIndex(sortedRevenues, revPct)   : 330000,  [sortedRevenues, revPct]);

  const totalSpend   = products.reduce((s, p) => s + getSpend(p), 0);
  const totalRevenue = products.reduce((s, p) => s + getRevenue(p), 0);
  const overallRoi   = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const kpiCards = [
    { label: 'TOTAL PRODUCTS', value: products.length || (mergedSummary?.products ?? 0), format: 'number'   as const, showSparkline: false },
    { label: 'TOTAL SPEND',    value: mergedSummary?.total_spend ?? totalSpend,           format: 'currency' as const, showSparkline: false },
    { label: 'TOTAL REVENUE',  value: mergedSummary?.total_rev   ?? totalRevenue,         format: 'currency' as const, showSparkline: false },
    { label: 'OVERALL ROI',    value: mergedSummary?.roi         ?? overallRoi,           format: 'roi'      as const, showSparkline: false },
  ];

  const breadcrumbs = [
    { label: 'Workspace' },
    { label: 'Quadrant View' },
    { label: '4C Framework' },
  ];

  const panel = (
    <QuadrantPanel
      spendThreshold={spendThreshold}
      revenueThreshold={revenueThreshold}
      spendPct={spendPct}
      revPct={revPct}
      onSpendPctChange={setSpendPct}
      onRevPctChange={setRevPct}
      onReset={() => { setSpendPct(50); setRevPct(50); }}
    />
  );

  return (
    <DashboardLayout
      breadcrumbs={breadcrumbs}
      rightPanel={panel}
      rightPanelTitle="Thresholds & Stats"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">
            Quadrant View — 4C Framework
          </h1>
          <p className="text-sm text-[#57544E]">
            Classify products into Champions, Contenders, Cruisers, and Casualties based on spend and revenue.
          </p>
        </div>
        <button
          onClick={() => setSlideoverOpen(true)}
          className="text-sm text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1 flex-shrink-0 mt-1"
        >
          How the 4Cs work →
        </button>
      </div>

      {/* Source Banner */}
      <div className="mb-5 bg-[#F2F0EA] rounded-xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${mergedData ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
          <span className="text-sm text-[#1A1814]">
            {mergedData
              ? <>Using live merged data · <span className="font-semibold">{products.length} products</span></>
              : 'No merged data yet — run Product Analysis first'}
          </span>
        </div>
        <Link href="/product-analysis" className="text-sm text-[#4F46E5] hover:text-[#4338CA]">
          {mergedData ? 'View source dataset →' : 'Go to Product Analysis →'}
        </Link>
      </div>

      {!mergedData && (
        <div className="py-20 text-center text-[#8B8780]">
          <p className="text-lg font-medium mb-2">No data loaded</p>
          <p className="text-sm">Upload your files and run Product Analysis to see the quadrant view.</p>
        </div>
      )}

      {mergedData && (
        <>
          <KpiStrip cards={kpiCards} className="mb-6" />

          <div className="mb-5">
            <ChampionsHero
              spendThreshold={spendThreshold}
              revenueThreshold={revenueThreshold}
            />
          </div>

          <div className="mb-5">
            <QuadrantGrid
              spendThreshold={spendThreshold}
              revenueThreshold={revenueThreshold}
            />
          </div>

          <AIAnalysis />
        </>
      )}

      <FourCsSlideover isOpen={slideoverOpen} onClose={() => setSlideoverOpen(false)} />
    </DashboardLayout>
  );
}