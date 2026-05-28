'use client';

import { useApp } from '@/lib/context';
import { inr, roi, roiColor } from '@/lib/formatters';

interface TopPerformersProps {
  tableRef?: React.RefObject<HTMLDivElement>;
}

export function TopPerformers({ tableRef }: TopPerformersProps) {
  const { aggregatedProducts, selectedMonths, allMonths } = useApp();

  if (!aggregatedProducts || aggregatedProducts.length === 0) return null;

  // Filter: totalSpend > 1 (confirmed ad-spend products — excludes organic/zero-spend)
  const withSpend = aggregatedProducts.filter(p => p.totalSpend > 1);

  // Sort by ROI descending, take top 3
  const top3 = [...withSpend].sort((a, b) => b.roi - a.roi).slice(0, 3);

  if (top3.length === 0) return null;

  const handleClick = (pid: string) => {
    if (!tableRef?.current) return;
    const row = tableRef.current.querySelector(`[data-product-id="${CSS.escape(pid)}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (row as HTMLElement).classList.add('!bg-indigo-50');
      setTimeout(() => (row as HTMLElement).classList.remove('!bg-indigo-50'), 2000);
    } else {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const monthBadge = allMonths.length > 0
    ? (selectedMonths.size === allMonths.length ? 'all months' : `${selectedMonths.size} month${selectedMonths.size !== 1 ? 's' : ''}`)
    : null;

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-[#1A1814]">Top performers in this view</h3>
          <span className="text-xs bg-[#F2F0EA] text-[#57544E] px-2 py-1 rounded">
            {aggregatedProducts.length} products
          </span>
          {monthBadge && (
            <span className="text-xs bg-[#EEF2FF] text-[#4F46E5] px-2 py-1 rounded">
              {monthBadge}
            </span>
          )}
        </div>
        <div className="text-xs text-[#8B8780]">
          Highest ROI · Total spend &gt; 1 · click to jump to row
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {top3.map((p, index) => (
          <div
            key={p.id}
            onClick={() => handleClick(p.id)}
            className="w-full min-w-0 p-4 bg-[#FAFAF8] rounded-lg border border-[#EEECE5] hover:border-[#4F46E5] transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="font-medium text-[#1A1814] text-sm leading-snug flex-1 pr-2">
                {p.title}{p.variant ? ` — ${p.variant}` : ''}
              </div>
              <div className={`text-lg font-semibold tabular-nums flex-shrink-0 ${roiColor(p.roi)}`}>
                {roi(p.roi)}
              </div>
            </div>
            <div className="text-sm text-[#8B8780] mb-1">
              Meta Spend {inr(p.metaSpend)} · Total Spend {inr(p.totalSpend)}
            </div>
            <div className="text-sm text-[#8B8780] mb-3">
              Revenue {inr(p.revenue)} · {p.itemsSold.toLocaleString()} units
            </div>
            <p className="text-sm text-[#57544E] line-clamp-2">
              {index === 0
                ? `Returns ${roi(p.roi)} per ₹1 spent — highest ROI with confirmed ad spend.`
                : index === 1
                ? `Delivers ${roi(p.roi)} ROI, moving ${p.itemsSold.toLocaleString()} units efficiently.`
                : `Achieves ${roi(p.roi)} ROI with strong unit economics.`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}