'use client';

import { useState } from 'react';
import type { Product } from '@/lib/context';
import { inr, roi, roiColor } from '@/lib/formatters';
import { cn } from '@/lib/utils';

type StrategyFilter = 'all' | 'discounted' | 'non-discounted';

function getSpend(p: Product): number   { return p['Total Spend']    ?? (p as any).totalSpend ?? 0; }
function getRevenue(p: Product): number { return p['Shopify Revenue'] ?? (p as any).revenue    ?? 0; }
function getItemsSold(p: Product): number { return p['Net Items Sold'] ?? (p as any).itemsSold ?? 0; }
function getCtr(p: Product): number     { return p['CTR'] ?? (p as any).ctr ?? 0; }
function getCpm(p: Product): number     { return p['CPM'] ?? (p as any).cpm ?? 0; }
function getRoi(p: Product): number     { const sp = getSpend(p); return sp > 0 ? getRevenue(p) / sp : 0; }
function getTitle(p: Product): string   { return p['Product Title'] ?? (p as any).title ?? '—'; }
function getId(p: Product): string      { return p['Product ID']    ?? (p as any).id    ?? '—'; }
function isDiscounted(p: Product): boolean { return !!(p as any).discounted; }

interface DiscountTableProps { products: Product[]; }

export function DiscountTable({ products }: DiscountTableProps) {
  const [filter, setFilter] = useState<StrategyFilter>('all');

  const filtered = products.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'discounted') return isDiscounted(p);
    return !isDiscounted(p);
  });

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#EEECE5]">
        <div className="flex items-center gap-1 bg-[#F2F0EA] rounded-lg p-1">
          {(['all', 'discounted', 'non-discounted'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 text-sm rounded-md transition-colors capitalize",
                filter === f ? "bg-white text-[#1A1814] shadow-sm" : "text-[#57544E] hover:text-[#1A1814]"
              )}>
              {f === 'non-discounted' ? 'Non-discounted' : f === 'all' ? 'All' : 'Discounted'}
            </button>
          ))}
        </div>
        <span className="text-sm text-[#8B8780]">Showing {filtered.length} of {products.length} products</span>
      </div>

      <div className="overflow-auto max-h-[480px]">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#F2F0EA] z-10">
            <tr>
              {['Product', 'Strategy', 'Spend', 'Revenue', 'Items', 'ROI', 'CTR', 'CPM'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[12px] font-medium text-[#8B8780] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEECE5]">
            {filtered.map((product, i) => (
              <tr key={getId(product) + i} className="hover:bg-[#F2F0EA] transition-colors duration-75">
                <td className="px-4 py-3">
                  <div className="font-medium text-sm text-[#1A1814]">{getTitle(product)}</div>
                  <div className="text-xs text-[#8B8780] font-mono">{getId(product)}</div>
                </td>
                <td className="px-4 py-3">
                  {isDiscounted(product) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF3CD] text-[#B45309]">Discounted</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#EEEDFB] text-[#4F46E5]">Non-discount</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums">{inr(getSpend(product))}</td>
                <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums">{inr(getRevenue(product))}</td>
                <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums">{getItemsSold(product).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={cn("text-sm font-medium tabular-nums", roiColor(getRoi(product)))}>
                    {roi(getRoi(product))}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums">{getCtr(product).toFixed(1)}%</td>
                <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums">₹{Math.round(getCpm(product))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}