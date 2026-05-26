'use client';

import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getQuadrantData, topPerformers } from '@/lib/data';
import { formatCurrency, formatRoi } from '@/lib/format';

export function ChampionsHero() {
  const championsData = getQuadrantData('champions');
  const champions = championsData.products.slice(0, 3);
  const estimatedAdditionalRevenue = championsData.spend * 0.5 * championsData.roi;

  const narratives = [
    `${champions[0].title} returns ${formatRoi(champions[0].roi)} per rupee — scale aggressively while maintaining creative quality.`,
    `${champions[1].title} delivers ${formatRoi(champions[1].roi)} ROI with strong unit economics. Prime candidate for budget increase.`,
    `${champions[2].title} achieves ${formatRoi(champions[2].roi)} ROI on premium home goods. Expand audience targeting.`,
  ];

  return (
    <div className="bg-gradient-to-b from-[#E7F7F0] to-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      <div className="p-6">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-[#10B981]" />
          <span className="text-xs font-medium text-[#10B981] uppercase tracking-wider">
            WHERE TO ACT FIRST
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#E7F7F0] text-[#10B981] border border-[#10B981]/20">
            SCALE
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-[22px] font-medium text-[#1A1814] leading-snug mb-6">
          <span className="text-[#10B981]">{championsData.count} Champions</span> together return{' '}
          <span className="text-[#10B981]">{formatRoi(championsData.roi)}</span> on{' '}
          {formatCurrency(championsData.spend)} of spend — the highest payoff on meaningful volume in this dataset.
        </h2>

        {/* Winner Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {champions.map((product, index) => (
            <div
              key={product.id}
              className="p-4 bg-white rounded-lg border border-[#EEECE5]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium text-[#1A1814] text-sm">{product.title}</div>
                <div className="text-lg font-semibold text-[#10B981] tabular-nums">
                  {formatRoi(product.roi)}
                </div>
              </div>
              <div className="text-xs text-[#8B8780] mb-2">
                Spend {formatCurrency(product.totalSpend)} · Revenue {formatCurrency(product.revenue)} · {product.itemsSold} units
              </div>
              <p className="text-xs text-[#57544E] line-clamp-2">
                {narratives[index]}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Bar */}
        <div className="flex items-center justify-between p-4 bg-[#FAFAF8] rounded-lg border border-[#EEECE5]">
          <p className="text-sm text-[#57544E]">
            Scale spend on these products. Estimated additional revenue at current ROI:{' '}
            <span className="font-medium text-[#1A1814]">{formatCurrency(estimatedAdditionalRevenue)}</span>
          </p>
          <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
            Create scale-spend plan
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
