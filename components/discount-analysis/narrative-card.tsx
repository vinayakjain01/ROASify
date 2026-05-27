'use client';

import { discountedStats, nonDiscountedStats } from '@/lib/data';
import { formatCurrency, formatRoi } from '@/lib/formatters';

export function NarrativeCard() {
  const roiDiff = nonDiscountedStats.roi - discountedStats.roi;
  
  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] border-l-[3px] border-l-[#4F46E5] overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-medium text-[#1A1814] mb-6 flex items-center gap-2">
          <span className="text-[#4F46E5]">↗</span>
          What this means for next month
        </h3>

        <div className="space-y-6">
          {/* What Changed */}
          <div>
            <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-2">
              What changed
            </div>
            <p className="text-sm text-[#57544E] leading-relaxed">
              Non-discounted products achieved {formatRoi(nonDiscountedStats.roi)} ROI compared to 
              discounted products at {formatRoi(discountedStats.roi)} — a difference of {formatRoi(roiDiff)} per 
              rupee spent. This gap has widened by 0.4x compared to last period.
            </p>
          </div>

          {/* Why It Matters */}
          <div>
            <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-2">
              Why it matters
            </div>
            <p className="text-sm text-[#57544E] leading-relaxed">
              Discounts are eroding margin faster than they are driving volume. The {discountedStats.count} discounted 
              products consumed {formatCurrency(discountedStats.spend)} in ad spend but generated only{' '}
              {formatCurrency(discountedStats.revenue)} in revenue. Meanwhile, {nonDiscountedStats.count} non-discounted 
              products generated {formatCurrency(nonDiscountedStats.revenue)} on {formatCurrency(nonDiscountedStats.spend)} spend.
            </p>
          </div>

          {/* What To Do Next */}
          <div>
            <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-2">
              What to do next
            </div>
            <p className="text-sm text-[#57544E] leading-relaxed">
              Pause ad spend on Casualties-quadrant discounted products (TKR-998, AYU-302, ACC-411, HMS-505). 
              Reallocate budget to Champions like TKR-441 and AYU-007 which maintain strong ROI without discounting. 
              For Contenders with active discounts, test reducing discount depth by 10% while monitoring conversion rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
