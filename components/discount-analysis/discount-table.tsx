'use client';

import { useState } from 'react';
import { products } from '@/lib/data';
import { inr, roi, roiColor } from '@/lib/formatters';
import { cn } from '@/lib/utils';

type StrategyFilter = 'all' | 'discounted' | 'non-discounted';

export function DiscountTable() {
  const [filter, setFilter] = useState<StrategyFilter>('all');

  const filteredProducts = products.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'discounted') return p.discounted;
    return !p.discounted;
  });

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      {/* Filter Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#EEECE5]">
        <div className="flex items-center gap-1 bg-[#F2F0EA] rounded-lg p-1">
          {(['all', 'discounted', 'non-discounted'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors capitalize",
                filter === f
                  ? "bg-white text-[#1A1814] shadow-sm"
                  : "text-[#57544E] hover:text-[#1A1814]"
              )}
            >
              {f === 'non-discounted' ? 'Non-discounted' : f === 'all' ? 'All' : 'Discounted'}
            </button>
          ))}
        </div>
        <span className="text-sm text-[#8B8780]">
          Showing {filteredProducts.length} of {products.length} products
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[480px]">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#F2F0EA] z-10">
            <tr>
              <th className="px-4 py-3 text-left text-[12px] font-medium text-[#8B8780] uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-left text-[12px] font-medium text-[#8B8780] uppercase tracking-wider">Strategy</th>
              <th className="px-4 py-3 text-left text-[12px] font-medium text-[#8B8780] uppercase tracking-wider">Spend</th>
              <th className="px-4 py-3 text-left text-[12px] font-medium text-[#8B8780] uppercase tracking-wider">Revenue</th>
              <th className="px-4 py-3 text-left text-[12px] font-medium text-[#8B8780] uppercase tracking-wider">Items</th>
              <th className="px-4 py-3 text-left text-[12px] font-medium text-[#8B8780] uppercase tracking-wider">ROI</th>
              <th className="px-4 py-3 text-left text-[12px] font-medium text-[#8B8780] uppercase tracking-wider">CTR</th>
              <th className="px-4 py-3 text-left text-[12px] font-medium text-[#8B8780] uppercase tracking-wider">CPM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEECE5]">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-[#F2F0EA] transition-colors duration-75">
                <td className="px-4 py-3">
                  <div className="font-medium text-sm text-[#1A1814]">{product.title}</div>
                  <div className="text-xs text-[#8B8780] font-mono">{product.id}</div>
                </td>
                <td className="px-4 py-3">
                  {product.discounted ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF3CD] text-[#B45309]">
                      Discounted
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#EEEDFB] text-[#4F46E5]">
                      Non-discount
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums">{inr(product.totalSpend)}</td>
                <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums">{inr(product.revenue)}</td>
                <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums">{product.itemsSold.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={cn("text-sm font-medium tabular-nums", roiColor(product.roi))}>
                    {roi(product.roi)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums">{product.ctr.toFixed(1)}%</td>
                <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums">₹{product.cpm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
