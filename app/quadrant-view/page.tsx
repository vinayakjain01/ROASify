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
import type { NormProduct } from '@/lib/context';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inr, roi } from '@/lib/formatters';

function downloadAllQuadrantsCSV(products: NormProduct[], spendT: number, revT: number, months: string) {
  function classify(p: NormProduct) {
    const hr = p.revenue    >= revT;
    const hs = p.totalSpend >= spendT;
    if  (hr && !hs) return 'Champions';
    if  (hr &&  hs) return 'Contenders';
    if (!hr && !hs) return 'Cruisers';
    return 'Casualties';
  }
  const rows: string[][] = [
    ['ROASify — Quadrant View Export'],
    ['Generated',          new Date().toLocaleString('en-IN')],
    ['Months',             months],
    ['Spend Threshold',    String(Math.round(spendT))],
    ['Revenue Threshold',  String(Math.round(revT))],
    [],
    ['Product ID', 'Product Title', 'Variant', 'Quadrant', 'Meta Spend', 'Total Spend', 'Revenue', 'ROI', 'Items Sold'],
    ...products.map(p => [
      p.id, p.title, p.variant,
      classify(p),
      String(Math.round(p.metaSpend)),
      String(Math.round(p.totalSpend)),
      String(Math.round(p.revenue)),
      p.roi.toFixed(2),
      String(p.itemsSold),
    ]),
  ];
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `roasify_quadrant_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function QuadrantViewPage() {
  const { mergedData, aggregatedProducts, allMonths, selectedMonths } = useApp();
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [spendPct, setSpendPct] = useState(100);
  const [revPct,   setRevPct]   = useState(100);

  // Use aggregatedProducts — month-filtered + grouped by product ID
  const products = aggregatedProducts;

  const avgSpend   = useMemo(() =>
    products.length > 0 ? products.reduce((s, p) => s + p.totalSpend, 0) / products.length : 0,
    [products]
  );
  const avgRevenue = useMemo(() =>
    products.length > 0 ? products.reduce((s, p) => s + p.revenue,    0) / products.length : 0,
    [products]
  );

  const spendThreshold   = useMemo(() => avgSpend   * (spendPct / 100), [avgSpend,   spendPct]);
  const revenueThreshold = useMemo(() => avgRevenue * (revPct   / 100), [avgRevenue, revPct]);

  const totalSpend   = products.reduce((s, p) => s + p.totalSpend, 0);
  const totalRevenue = products.reduce((s, p) => s + p.revenue,    0);
  const overallRoi   = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const kpiCards = [
    { label: 'TOTAL PRODUCTS', value: products.length,  format: 'number'   as const, showSparkline: false },
    { label: 'TOTAL SPEND',    value: totalSpend,        format: 'currency' as const, showSparkline: false },
    { label: 'TOTAL REVENUE',  value: totalRevenue,      format: 'currency' as const, showSparkline: false },
    { label: 'OVERALL ROI',    value: overallRoi,        format: 'roi'      as const, showSparkline: false },
  ];

  const monthLabel = allMonths.length > 0
    ? (selectedMonths.size === allMonths.length
        ? `All ${allMonths.length} months`
        : `${selectedMonths.size} of ${allMonths.length} months`)
    : 'All data';

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
      avgSpend={avgSpend}
      avgRevenue={avgRevenue}
      onSpendPctChange={setSpendPct}
      onRevPctChange={setRevPct}
      onReset={() => { setSpendPct(100); setRevPct(100); }}
    />
  );

  return (
    <DashboardLayout breadcrumbs={breadcrumbs} rightPanel={panel} rightPanelTitle="Thresholds & Stats">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">Quadrant View — 4C Framework</h1>
          <p className="text-sm text-[#57544E]">
            Classify products into Champions, Contenders, Cruisers, Casualties based on spend and revenue.
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
              ? <><span className="font-semibold">{products.length} products</span> · {monthLabel} · thresholds {inr(spendThreshold)} spend / {inr(revenueThreshold)} rev</>
              : 'No merged data yet — run Product Analysis first'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {mergedData && (
            <Button
              variant="outline" size="sm"
              className="h-8 px-3 border-[#DEDBD2] text-[#57544E]"
              onClick={() => downloadAllQuadrantsCSV(products, spendThreshold, revenueThreshold, monthLabel)}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download all
            </Button>
          )}
          <Link href="/product-analysis" className="text-sm text-[#4F46E5] hover:text-[#4338CA]">
            {mergedData ? 'View source dataset →' : 'Go to Product Analysis →'}
          </Link>
        </div>
      </div>

      {!mergedData && (
        <div className="py-20 text-center text-[#8B8780]">
          <p className="text-lg font-medium mb-2">No data loaded</p>
          <p className="text-sm">Upload your files and run Product Analysis first.</p>
        </div>
      )}

      {mergedData && (
        <>
          <KpiStrip cards={kpiCards} className="mb-6" />
          <div className="mb-5">
            <ChampionsHero spendThreshold={spendThreshold} revenueThreshold={revenueThreshold} />
          </div>
          <div className="mb-5">
            <QuadrantGrid spendThreshold={spendThreshold} revenueThreshold={revenueThreshold} />
          </div>
          <AIAnalysis />
        </>
      )}

      <FourCsSlideover isOpen={slideoverOpen} onClose={() => setSlideoverOpen(false)} />
    </DashboardLayout>
  );
}