'use client';

import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';
import { inr, roi } from '@/lib/formatters';

function getSpend(p: Product): number   { return p['Total Spend']    ?? (p as any).totalSpend ?? 0; }
function getRevenue(p: Product): number { return p['Shopify Revenue'] ?? (p as any).revenue    ?? 0; }
function getItemsSold(p: Product): number { return p['Net Items Sold'] ?? (p as any).itemsSold ?? 0; }
function getRoi(p: Product): number     { const sp = getSpend(p); return sp > 0 ? getRevenue(p) / sp : 0; }
function getTitle(p: Product): string   { return p['Product Title'] ?? (p as any).title ?? 'Unknown'; }

interface Props { spendThreshold: number; revenueThreshold: number; }

export function ChampionsHero({ spendThreshold, revenueThreshold }: Props) {
  const { mergedData } = useApp();

  const products = mergedData ?? [];

  // Champions: high revenue, low spend
  const champions = products
    .filter(p => getRevenue(p) >= revenueThreshold && getSpend(p) < spendThreshold)
    .sort((a, b) => getRoi(b) - getRoi(a))
    .slice(0, 3);

  if (champions.length === 0) {
    return (
      <div className="bg-[#F2F0EA] rounded-[10px] border border-[#EEECE5] p-6 text-center text-[#8B8780] text-sm">
        No Champions found at current thresholds. Try adjusting the spend/revenue sliders.
      </div>
    );
  }

  const champSpend   = champions.reduce((s, p) => s + getSpend(p), 0);
  const champRevenue = champions.reduce((s, p) => s + getRevenue(p), 0);
  const champRoi     = champSpend > 0 ? champRevenue / champSpend : 0;
  const estAdditional = champSpend * 0.5 * champRoi;

  return (
    <div className="bg-gradient-to-b from-[#E7F7F0] to-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-[#10B981]" />
          <span className="text-xs font-medium text-[#10B981] uppercase tracking-wider">WHERE TO ACT FIRST</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#E7F7F0] text-[#10B981] border border-[#10B981]/20">SCALE</span>
        </div>

        <h2 className="text-[22px] font-medium text-[#1A1814] leading-snug mb-6">
          <span className="text-[#10B981]">{champions.length} Champions</span> together return{' '}
          <span className="text-[#10B981]">{roi(champRoi)}</span> on{' '}
          {inr(champSpend)} of spend — the highest payoff on meaningful volume in this dataset.
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {champions.map((product, index) => (
            <div key={product['Product ID'] ?? index} className="p-4 bg-white rounded-lg border border-[#EEECE5]">
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium text-[#1A1814] text-sm">{getTitle(product)}</div>
                <div className="text-lg font-semibold text-[#10B981] tabular-nums">{roi(getRoi(product))}</div>
              </div>
              <div className="text-xs text-[#8B8780] mb-2">
                Spend {inr(getSpend(product))} · Revenue {inr(getRevenue(product))} · {getItemsSold(product)} units
              </div>
              <p className="text-xs text-[#57544E] line-clamp-2">
                {getTitle(product)} returns {roi(getRoi(product))} per rupee — scale aggressively while maintaining creative quality.
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between p-4 bg-[#FAFAF8] rounded-lg border border-[#EEECE5]">
          <p className="text-sm text-[#57544E]">
            Scale spend on these products. Estimated additional revenue at current ROI:{' '}
            <span className="font-medium text-[#1A1814]">{inr(estAdditional)}</span>
          </p>
          <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
            Create scale-spend plan <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}