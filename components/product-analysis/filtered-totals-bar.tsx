'use client';

import { useMemo } from 'react';
import { inr, roi } from '@/lib/formatters';
import type { NormProduct } from '@/lib/context';

interface FilteredTotalsBardProps {
  /** The fully-filtered product list — same array passed to <DataTable> */
  products: NormProduct[];
  /** Total count before filters (aggregatedProducts.length) — shown as denominator */
  totalCount: number;
}

interface MetricItem {
  label: string;
  value: string;
  subLabel?: string;
  highlight?: boolean;
}

export function FilteredTotalsBar({ products, totalCount }: FilteredTotalsBardProps) {
  const metrics = useMemo((): MetricItem[] => {
    if (!products.length) {
      return [
        { label: 'Products',    value: '0' },
        { label: 'Meta Spend',  value: '—' },
        { label: 'Google Cost', value: '—' },
        { label: 'Total Spend', value: '—' },
        { label: 'Revenue',     value: '—' },
        { label: 'ROI',         value: '—' },
        { label: 'Items Sold',  value: '—' },
        { label: 'Avg CTR',     value: '—' },
        { label: 'Avg CPM',     value: '—' },
      ];
    }

    // Single-pass accumulation — O(n) once
    let totMeta = 0, totGoogle = 0, totSpend = 0, totRev = 0;
    let totItems = 0, totLpv = 0;
    let ctrAcc = 0, cpmAcc = 0;

    for (const p of products) {
      totMeta   += p.metaSpend;
      totGoogle += p.googleCost;
      totSpend  += p.totalSpend;
      totRev    += p.revenue;
      totItems  += p.itemsSold;
      totLpv    += p.lpv;
      // Weighted averages: weight CTR by LPV, CPM by meta spend
      ctrAcc    += p.ctr * p.lpv;
      cpmAcc    += p.cpm * p.metaSpend;
    }

    const avgCtr = totLpv   > 0 ? ctrAcc / totLpv   : 0;
    const avgCpm = totMeta  > 0 ? cpmAcc / totMeta   : 0;
    const overallRoi = totSpend > 0 ? totRev / totSpend : 0;

    const isFiltered = products.length < totalCount;

    return [
      {
        label:    'Products',
        value:    products.length.toLocaleString('en-IN'),
        subLabel: isFiltered ? `of ${totalCount.toLocaleString('en-IN')}` : undefined,
      },
      {
        label: 'Meta Spend',
        value: inr(totMeta, true),
      },
      {
        label: 'Google Cost',
        value: inr(totGoogle, true),
      },
      {
        label: 'Total Spend',
        value: inr(totSpend, true),
      },
      {
        label:     'Revenue',
        value:     inr(totRev, true),
        highlight: true,
      },
      {
        label:     'ROI',
        value:     roi(overallRoi),
        highlight: overallRoi >= 3,
      },
      {
        label: 'Items Sold',
        value: totItems.toLocaleString('en-IN'),
      },
      {
        label: 'Avg CTR',
        value: `${avgCtr.toFixed(1)}%`,
      },
      {
        label: 'Avg CPM',
        value: inr(avgCpm, true),
      },
    ];
  }, [products, totalCount]);

  const isFiltered = products.length < totalCount;

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] px-5 py-3">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[#8B8780] uppercase tracking-wider">
          Totals for current view
        </span>
        {isFiltered && (
          <span className="text-xs text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded-full font-medium">
            Filtered
          </span>
        )}
      </div>

      {/* Metrics grid — 9 items in one row on large screens */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-x-4 gap-y-3">
        {metrics.map((m) => (
          <div key={m.label} className="min-w-0">
            <div className="text-[10px] font-medium text-[#8B8780] uppercase tracking-wide truncate mb-0.5">
              {m.label}
            </div>
            <div className="flex items-baseline gap-1 min-w-0">
              <span
                className={`text-[15px] font-semibold tabular-nums truncate leading-tight ${
                  m.highlight ? 'text-[#4F46E5]' : 'text-[#1A1814]'
                }`}
              >
                {m.value}
              </span>
              {m.subLabel && (
                <span className="text-[10px] text-[#8B8780] whitespace-nowrap flex-shrink-0">
                  {m.subLabel}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}