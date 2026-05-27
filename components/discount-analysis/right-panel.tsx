'use client';

import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';
import { roi } from '@/lib/formatters';
import { PanelSection } from '@/components/layout/right-panel';

function getSpend(p: Product): number { return p['Total Spend']    ?? (p as any).totalSpend ?? 0; }
function getRevenue(p: Product): number { return p['Shopify Revenue'] ?? (p as any).revenue ?? 0; }
function isDiscounted(p: Product): boolean { return !!(p as any).discounted; }

export function DiscountPanel() {
  const { mergedData } = useApp();
  const products = mergedData ?? [];
  const discounted    = products.filter(isDiscounted);
  const nonDiscounted = products.filter(p => !isDiscounted(p));

  const calcRoi = (ps: Product[]) => {
    const sp = ps.reduce((s, p) => s + getSpend(p), 0);
    const rv = ps.reduce((s, p) => s + getRevenue(p), 0);
    return sp > 0 ? rv / sp : 0;
  };

  const dRoi  = calcRoi(discounted);
  const ndRoi = calcRoi(nonDiscounted);
  const advantage = dRoi > 0 ? ndRoi / dRoi : 0;

  return (
    <div className="p-5 space-y-6">
      <PanelSection title="Product split">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F59E0B] rounded-full" />
              <span className="text-sm text-[#1A1814]">Discounted</span>
            </div>
            <span className="text-sm text-[#1A1814] tabular-nums">{discounted.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#4F46E5] rounded-full" />
              <span className="text-sm text-[#1A1814]">Non-discounted</span>
            </div>
            <span className="text-sm text-[#1A1814] tabular-nums">{nonDiscounted.length}</span>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="ROI comparison">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#57544E]">Discounted ROI</span>
            <span className="text-sm font-medium text-[#B45309] tabular-nums">{roi(dRoi)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#57544E]">Non-disc. ROI</span>
            <span className="text-sm font-medium text-[#4F46E5] tabular-nums">{roi(ndRoi)}</span>
          </div>
          {advantage > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-[#EEECE5]">
              <span className="text-sm text-[#57544E]">Advantage</span>
              <span className="text-sm font-medium text-[#10B981] tabular-nums">{advantage.toFixed(2)}x</span>
            </div>
          )}
        </div>
      </PanelSection>

      <PanelSection title="Methodology">
        <p className="text-sm text-[#57544E] leading-relaxed">
          Products are classified as discounted if they had any promotional pricing during the analysis period. Revenue and spend are aggregated across all transactions.
        </p>
      </PanelSection>
    </div>
  );
}