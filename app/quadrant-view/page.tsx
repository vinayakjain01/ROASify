'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { KpiStrip } from '@/components/ui/kpi-card';
import { ChampionsHero } from '@/components/quadrant-view/champions-hero';
import { QuadrantGrid } from '@/components/quadrant-view/quadrant-cards';
import { AIAnalysis } from '@/components/quadrant-view/ai-analysis';
import { FourCsSlideover } from '@/components/quadrant-view/four-cs-slideover';
import { QuadrantPanel } from '@/components/quadrant-view/right-panel';
import { 
  totalProducts, 
  totalSpend, 
  totalRevenue, 
  overallRoi,
  runMetadata
} from '@/lib/data';

export default function QuadrantViewPage() {
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [spendThreshold, setSpendThreshold] = useState(61000);
  const [revenueThreshold, setRevenueThreshold] = useState(330000);

  const resetThresholds = () => {
    setSpendThreshold(61000);
    setRevenueThreshold(330000);
  };

  const kpiCards = [
    { label: 'TOTAL PRODUCTS', value: totalProducts, format: 'number' as const, showSparkline: false },
    { label: 'TOTAL SPEND', value: totalSpend, format: 'currency' as const, showSparkline: false },
    { label: 'TOTAL REVENUE', value: totalRevenue, format: 'currency' as const, showSparkline: false },
    { label: 'OVERALL ROI', value: overallRoi, format: 'roi' as const, showSparkline: false },
  ];

  const breadcrumbs = [
    { label: 'Workspace' },
    { label: 'Quadrant View' },
    { label: '4C Framework' },
  ];

  return (
    <DashboardLayout 
      breadcrumbs={breadcrumbs}
      rightPanel={
        <QuadrantPanel 
          spendThreshold={spendThreshold}
          revenueThreshold={revenueThreshold}
          onSpendChange={setSpendThreshold}
          onRevenueChange={setRevenueThreshold}
          onReset={resetThresholds}
        />
      }
    >
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">
            Quadrant View — 4C Framework
          </h1>
          <p className="text-[#57544E]">
            Classify products into Champions, Contenders, Cruisers, and Casualties based on spend and revenue.
          </p>
        </div>
        <button 
          onClick={() => setSlideoverOpen(true)}
          className="text-sm text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1"
        >
          How the 4Cs work →
        </button>
      </div>

      {/* Source Banner */}
      <div className="mb-6 bg-[#F2F0EA] rounded-[10px] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#10B981] rounded-full" />
          <span className="text-sm text-[#1A1814]">
            Using data from Product Analysis — Overall View · <span className="font-mono">{runMetadata.runId}</span>
          </span>
        </div>
        <Link 
          href="/product-analysis"
          className="text-sm text-[#4F46E5] hover:text-[#4338CA]"
        >
          View source dataset →
        </Link>
      </div>

      {/* KPI Strip */}
      <KpiStrip cards={kpiCards} className="mb-8" />

      {/* Champions Hero */}
      <div className="mb-6">
        <ChampionsHero />
      </div>

      {/* Quadrant Grid */}
      <div className="mb-6">
        <QuadrantGrid spendThreshold={spendThreshold} revenueThreshold={revenueThreshold} />
      </div>

      {/* AI Analysis */}
      <AIAnalysis />

      {/* 4Cs Slideover */}
      <FourCsSlideover isOpen={slideoverOpen} onClose={() => setSlideoverOpen(false)} />
    </DashboardLayout>
  );
}
