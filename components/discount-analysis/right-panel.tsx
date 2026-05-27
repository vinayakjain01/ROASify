'use client';

import { discountedStats, nonDiscountedStats, runMetadata } from '@/lib/data';
import { roi } from '@/lib/formatters';
import { PanelSection } from '@/components/layout/right-panel';

export function DiscountPanel() {
  return (
    <div className="p-5 space-y-6">
      <PanelSection title="Product split">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F59E0B] rounded-full" />
              <span className="text-sm text-[#1A1814]">Discounted</span>
            </div>
            <span className="text-sm text-[#1A1814] tabular-nums">{discountedStats.count}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#4F46E5] rounded-full" />
              <span className="text-sm text-[#1A1814]">Non-discounted</span>
            </div>
            <span className="text-sm text-[#1A1814] tabular-nums">{nonDiscountedStats.count}</span>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="ROI comparison">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#57544E]">Discounted ROI</span>
            <span className="text-sm font-medium text-[#B45309] tabular-nums">{roi(discountedStats.roi)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#57544E]">Non-disc. ROI</span>
            <span className="text-sm font-medium text-[#4F46E5] tabular-nums">{roi(nonDiscountedStats.roi)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#EEECE5]">
            <span className="text-sm text-[#57544E]">Advantage</span>
            <span className="text-sm font-medium text-[#10B981] tabular-nums">
              {(nonDiscountedStats.roi / discountedStats.roi).toFixed(2)}x
            </span>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Period">
        <p className="text-sm text-[#1A1814]">{runMetadata.period}</p>
        <p className="text-xs text-[#8B8780] mt-1">1 month in data</p>
      </PanelSection>

      <PanelSection title="Methodology">
        <p className="text-sm text-[#57544E] leading-relaxed">
          Products are classified as discounted if they had any promotional pricing 
          during the analysis period. Revenue and spend are aggregated across all 
          transactions for each product, regardless of whether individual orders 
          included discounts.
        </p>
      </PanelSection>
    </div>
  );
}
