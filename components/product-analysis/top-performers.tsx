'use client';

import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';
import { inr, roiColor } from '@/lib/formatters';

function getRoi(p: Product): number {
  return p.ROI ?? (p['Shopify Revenue'] && p['Total Spend'] ? p['Shopify Revenue'] / p['Total Spend'] : 0);
}

function getTitle(p: Product): string {
  return p['Product Title'] ?? (p as any).title ?? 'Unknown';
}

function getVariant(p: Product): string {
  return p['Variant Title'] ?? (p as any).variant ?? '';
}

function getRevenue(p: Product): number {
  return p['Shopify Revenue'] ?? (p as any).revenue ?? 0;
}

function getSpend(p: Product): number {
  return p['Total Spend'] ?? (p as any).totalSpend ?? 0;
}

function getItemsSold(p: Product): number {
  return p['Net Items Sold'] ?? (p as any).itemsSold ?? 0;
}

function roiNum(p: Product): number {
  return getRoi(p);
}

export function TopPerformers() {
  const { mergedData, mergedSummary } = useApp();

  if (!mergedData || mergedData.length === 0) return null;

  // Top 3 by ROI, require meaningful volume (items sold > 0)
  const sorted = [...mergedData]
    .filter(p => getItemsSold(p) > 0)
    .sort((a, b) => roiNum(b) - roiNum(a))
    .slice(0, 3);

  if (sorted.length === 0) return null;

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-[#1A1814]">Top performers in this view</h3>
          <span className="text-xs bg-[#F2F0EA] text-[#57544E] px-2 py-1 rounded">
            {mergedData.length} products
          </span>
        </div>
        <div className="text-xs text-[#8B8780]">
          Highest ROI on confirmed sales · click to jump to row
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {sorted.map((product, index) => {
          const title   = getTitle(product);
          const variant = getVariant(product);
          const spend   = getSpend(product);
          const revenue = getRevenue(product);
          const units   = getItemsSold(product);
          const r       = roiNum(product);

          return (
            <div
              key={product['Product ID'] ?? index}
              className="flex-shrink-0 w-80 p-4 bg-[#FAFAF8] rounded-lg border border-[#EEECE5] hover:border-[#4F46E5] transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium text-[#1A1814]">
                  {title}{variant ? ` — ${variant}` : ''}
                </div>
                <div className="text-lg font-semibold text-[#10B981] tabular-nums">
                  {roiColor(r)}
                </div>
              </div>
              <div className="text-sm text-[#8B8780] mb-3">
                Spend {inr(spend)} · Revenue {inr(revenue)} · {units.toLocaleString()} units
              </div>
              <p className="text-sm text-[#57544E] line-clamp-2">
                {index === 0
                  ? `${title} returns ${roiColor(r)} per rupee spent — the highest ROI in this dataset with meaningful volume.`
                  : index === 1
                  ? `${title} delivers exceptional efficiency at ${roiColor(r)} ROI while moving ${units.toLocaleString()} units.`
                  : `${title} achieves ${roiColor(r)} ROI with strong unit economics.`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}