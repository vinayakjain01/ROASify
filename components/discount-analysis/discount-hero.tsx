'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { discountedStats, nonDiscountedStats } from '@/lib/data';
import { formatCurrency, formatRoi } from '@/lib/formatters';

export function DiscountHero() {
  const roiAdvantage = nonDiscountedStats.roi / discountedStats.roi;
  const reallocationAmount = discountedStats.spend * 0.2;

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      <div className="p-6">
        {/* Eyebrow */}
        <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-3">
          Which strategy wins
        </div>

        {/* Content Grid */}
        <div className="flex items-start justify-between gap-8">
          {/* Headline */}
          <div className="flex-1">
            <h2 className="text-[22px] font-medium text-[#1A1814] leading-snug">
              Non-discounted products return{' '}
              <span className="text-[#4F46E5]">{roiAdvantage.toFixed(2)}x</span> more per rupee 
              than discounted ones — <span className="text-[#4F46E5]">{formatRoi(nonDiscountedStats.roi)}</span> against{' '}
              <span className="text-[#B45309]">{formatRoi(discountedStats.roi)}</span>.
            </h2>
          </div>

          {/* ROI Advantage Badge */}
          <div className="flex-shrink-0 pl-8 border-l border-[#EEECE5]">
            <div className="text-4xl font-bold text-[#4F46E5] tabular-nums">
              {roiAdvantage.toFixed(2)}x
            </div>
            <div className="text-sm text-[#8B8780] mt-1">ROI advantage</div>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="mt-6 flex items-center justify-between p-4 bg-[#FAFAF8] rounded-lg border border-[#EEECE5]">
          <p className="text-sm text-[#57544E]">
            Reallocate <span className="font-medium text-[#1A1814]">{formatCurrency(reallocationAmount)}</span> from 
            discounted spend to your top non-discounted performers.
          </p>
          <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
            Build reallocation plan
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
