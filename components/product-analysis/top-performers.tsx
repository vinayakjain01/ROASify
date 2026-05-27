'use client';

import { topPerformers } from '@/lib/data';
import { formatCurrency, formatRoi } from '@/lib/formatters';

export function TopPerformers() {
  const narratives = [
    `${topPerformers[0].title} returns ${formatRoi(topPerformers[0].roi)} per rupee spent — the highest ROI in this dataset with meaningful volume.`,
    `${topPerformers[1].title} delivers exceptional efficiency at ${formatRoi(topPerformers[1].roi)} ROI while moving ${topPerformers[1].itemsSold.toLocaleString()} units.`,
    `${topPerformers[2].title} achieves ${formatRoi(topPerformers[2].roi)} ROI on premium home goods with strong unit economics.`
  ];

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-[#1A1814]">Top performers in this view</h3>
          <span className="text-xs bg-[#F2F0EA] text-[#57544E] px-2 py-1 rounded">
            26 products
          </span>
        </div>
        <div className="text-xs text-[#8B8780]">
          Highest ROI on confirmed sales · click to jump to row
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {topPerformers.map((product, index) => (
          <div
            key={product.id}
            className="flex-shrink-0 w-80 p-4 bg-[#FAFAF8] rounded-lg border border-[#EEECE5] hover:border-[#4F46E5] transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium text-[#1A1814]">
                  {product.title} — {product.variant}
                </div>
              </div>
              <div className="text-lg font-semibold text-[#10B981] tabular-nums">
                {formatRoi(product.roi)}
              </div>
            </div>
            <div className="text-sm text-[#8B8780] mb-3">
              Spend {formatCurrency(product.totalSpend)} · Revenue {formatCurrency(product.revenue)} · {product.itemsSold.toLocaleString()} units
            </div>
            <p className="text-sm text-[#57544E] line-clamp-2">
              {narratives[index]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
