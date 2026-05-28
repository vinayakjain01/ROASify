'use client';

import { useRef } from 'react';
import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';
import { inr, roi, roiColor } from '@/lib/formatters';

function getRoi(p: Product): number {
  const r = p.ROI ?? p['ROI'];
  if (r != null && isFinite(Number(r))) return Number(r);
  const rev = getRevenue(p);
  const sp  = getSpend(p);
  return sp > 0 ? rev / sp : 0;
}
function getTitle(p: Product): string    { return p['Product Title']   ?? (p as any).title    ?? 'Unknown'; }
function getVariant(p: Product): string  { return p['Variant Title']   ?? (p as any).variant  ?? ''; }
function getRevenue(p: Product): number  { return Number(p['Shopify Revenue'] ?? (p as any).revenue    ?? 0); }
function getSpend(p: Product): number    { return Number(p['Total Spend']     ?? (p as any).totalSpend  ?? 0); }
function getItemsSold(p: Product): number{ return Number(p['Net Items Sold']  ?? (p as any).itemsSold   ?? 0); }

interface TopPerformersProps {
  tableRef?: React.RefObject<HTMLDivElement>;
}

export function TopPerformers({ tableRef }: TopPerformersProps) {
  const { mergedData } = useApp();

  if (!mergedData || mergedData.length === 0) return null;

  // Top 3 by ROI — allow all products (not just items > 0) to handle 0-revenue edge cases
  const sorted = [...mergedData]
    .sort((a, b) => getRoi(b) - getRoi(a))
    .slice(0, 3);

  if (sorted.length === 0) return null;

  const handleClick = (productId: string) => {
    if (!tableRef?.current) return;
    // Find the row in the table by data-product-id attribute
    const row = tableRef.current.querySelector(`[data-product-id="${CSS.escape(productId)}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (row as HTMLElement).classList.add('bg-indigo-50');
      setTimeout(() => (row as HTMLElement).classList.remove('bg-indigo-50'), 2000);
    } else {
      // Fallback: scroll table into view
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
          const r       = getRoi(product);
          const pid     = product['Product ID'] ?? (product as any).id ?? String(index);

          return (
            <div
              key={pid}
              onClick={() => handleClick(pid)}
              className="flex-shrink-0 w-80 p-4 bg-[#FAFAF8] rounded-lg border border-[#EEECE5] hover:border-[#4F46E5] transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium text-[#1A1814] text-sm leading-snug flex-1 pr-2">
                  {title}{variant ? ` — ${variant}` : ''}
                </div>
                <div className={`text-lg font-semibold tabular-nums flex-shrink-0 ${roiColor(r)}`}>
                  {roi(r)}
                </div>
              </div>
              <div className="text-sm text-[#8B8780] mb-3">
                Spend {inr(spend)} · Revenue {inr(revenue)} · {units.toLocaleString()} units
              </div>
              <p className="text-sm text-[#57544E] line-clamp-2">
                {index === 0
                  ? `${title} returns ${roi(r)} per rupee spent — the highest ROI in this dataset.`
                  : index === 1
                  ? `${title} delivers exceptional efficiency at ${roi(r)} ROI, moving ${units.toLocaleString()} units.`
                  : `${title} achieves ${roi(r)} ROI with strong unit economics.`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}