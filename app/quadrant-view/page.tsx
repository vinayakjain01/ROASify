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
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inr } from '@/lib/formatters';

function getSpend(p: Product): number   { return Number(p['Total Spend']    ?? (p as any).totalSpend ?? 0); }
function getRevenue(p: Product): number { return Number(p['Shopify Revenue'] ?? (p as any).revenue    ?? 0); }

function downloadAllQuadrantsCSV(products: Product[], spendT: number, revT: number) {
  function classify(p: Product) {
    const hr = getRevenue(p) >= revT;
    const hs = getSpend(p)   >= spendT;
    if  (hr && !hs) return 'Champions';
    if  (hr &&  hs) return 'Contenders';
    if (!hr && !hs) return 'Cruisers';
    return 'Casualties';
  }
  const rows: string[][] = [
    ['ROASify — Quadrant View Export'],
    ['Generated', new Date().toLocaleString('en-IN')],
    ['Spend Threshold', String(spendT)],
    ['Revenue Threshold', String(revT)],
    [],
    ['Product ID', 'Product Title', 'Variant', 'Quadrant', 'Total Spend', 'Revenue', 'ROI', 'Items Sold'],
    ...products.map(p => {
      const sp  = getSpend(p);
      const rev = getRevenue(p);
      return [
        String(p['Product ID']      ?? (p as any).id       ?? ''),
        String(p['Product Title']   ?? (p as any).title    ?? ''),
        String(p['Variant Title']   ?? (p as any).variant  ?? ''),
        classify(p),
        String(sp),
        String(rev),
        String(sp > 0 ? (rev / sp).toFixed(2) : '0'),
        String(p['Net Items Sold']  ?? (p as any).itemsSold ?? 0),
      ];
    }),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `roasify_quadrant_all_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function QuadrantViewPage() {
  const { mergedData, mergedSummary } = useApp();
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  // 100 = average, 0-300 range
  const [spendPct, setSpendPct] = useState(100);
  const [revPct,   setRevPct]   = useState(100);

  const products = mergedData ?? [];

  // Compute average spend and revenue from data
  const avgSpend   = useMemo(() =>
    products.length > 0 ? products.reduce((s, p) => s + getSpend(p), 0)   / products.length : 0,
    [products]
  );
  const avgRevenue = useMemo(() =>
    products.length > 0 ? products.reduce((s, p) => s + getRevenue(p), 0) / products.length : 0,
    [products]
  );

  // Threshold = avg * (pct / 100)
  const spendThreshold   = useMemo(() => avgSpend   * (spendPct / 100), [avgSpend,   spendPct]);
  const revenueThreshold = useMemo(() => avgRevenue * (revPct   / 100), [avgRevenue, revPct]);

  const totalSpend   = products.reduce((s, p) => s + getSpend(p),   0);
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
              ? <>Using live merged data · <span className="font-semibold">{products.length} products</span> · thresholds at {inr(spendThreshold)} spend / {inr(revenueThreshold)} revenue</>
              : 'No merged data yet — run Product Analysis first'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {mergedData && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 border-[#DEDBD2] text-[#57544E]"
              onClick={() => downloadAllQuadrantsCSV(products, spendThreshold, revenueThreshold)}
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
          <p className="text-sm">Upload your files and run Product Analysis to see the quadrant view.</p>
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