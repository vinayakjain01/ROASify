'use client';

import { inr, roi } from '@/lib/formatters';

interface Stats { count: number; spend: number; revenue: number; roi: number; }
interface Props { discountedStats: Stats; nonDiscountedStats: Stats; }

export function NarrativeCard({ discountedStats: d, nonDiscountedStats: nd }: Props) {
  const roiDiff = nd.roi - d.roi;

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] border-l-[3px] border-l-[#4F46E5] overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-medium text-[#1A1814] mb-6 flex items-center gap-2">
          <span className="text-[#4F46E5]">↗</span>
          What this means for next month
        </h3>
        <div className="space-y-6">
          <div>
            <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-2">What changed</div>
            <p className="text-sm text-[#57544E] leading-relaxed">
              Non-discounted products achieved {roi(nd.roi)} ROI compared to discounted products at {roi(d.roi)} — a difference of {roi(roiDiff)} per rupee spent.
            </p>
          </div>
          <div>
            <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-2">Why it matters</div>
            <p className="text-sm text-[#57544E] leading-relaxed">
              Discounts are eroding margin faster than they are driving volume. The {d.count} discounted products consumed {inr(d.spend)} in ad spend but generated only {inr(d.revenue)} in revenue. Meanwhile, {nd.count} non-discounted products generated {inr(nd.revenue)} on {inr(nd.spend)} spend.
            </p>
          </div>
          <div>
            <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-2">What to do next</div>
            <p className="text-sm text-[#57544E] leading-relaxed">
              Reallocate budget from low-ROI discounted products to top non-discounted performers. For contenders with active discounts, test reducing discount depth by 10% while monitoring conversion rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}