'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatRoi, getRoiColor } from '@/lib/format';
import type { ProductRow } from '@/lib/api';

interface DataTableProps {
  products: ProductRow[];
  columns?: string[];
  maxHeight?: string;
  className?: string;
}

export function DataTable({ 
  products, 
  columns = ['id', 'title', 'variant', 'metaSpend', 'totalSpend', 'revenue', 'roi', 'itemsSold', 'ctr', 'cpm'],
  maxHeight = '560px',
  className 
}: DataTableProps) {
  const columnLabels: Record<string, string> = {
    id: 'Product ID',
    title: 'Product Title',
    variant: 'Variant Title',
    metaSpend: 'Meta Spend',
    googleCost: 'Google Cost',
    totalSpend: 'Total Spend',
    revenue: 'Revenue',
    roi: 'ROI',
    itemsSold: 'Items Sold',
    ctr: 'CTR',
    cpm: 'CPM',
    category: 'Category',
    quadrant: 'Quadrant',
    discounted: 'Strategy'
  };

  const formatCell = (product: ProductRow, column: string): ReactNode => {
    const value = product[column as keyof ProductRow];

    switch (column) {
      case 'id':
        return (
          <span className="font-mono text-[13px] text-[#8B8780]">
            {String(value || '')}
          </span>
        );

      case 'title':
        return (
          <span className="font-medium">
            {String(value || '')}
          </span>
        );

      case 'variant':
        return String(value || '');

      case 'metaSpend':
      case 'googleCost':
      case 'totalSpend':
      case 'revenue':
        return (
          <span className="tabular-nums">
            {formatCurrency(Number(value || 0))}
          </span>
        );

      case 'roi':
        return (
          <span
            className={cn(
              "tabular-nums font-medium",
              getRoiColor(Number(value || 0))
            )}
          >
            {formatRoi(Number(value || 0))}
          </span>
        );

      case 'itemsSold':
        return (
          <span className="tabular-nums">
            {Number(value || 0).toLocaleString('en-IN')}
          </span>
        );

      case 'ctr':
        return (
          <span className="tabular-nums">
            {Number(value || 0).toFixed(1)}%
          </span>
        );

      case 'cpm':
        return (
          <span className="tabular-nums">
            ₹{Number(value || 0)}
          </span>
        );

      case 'category':
        return String(value || '');

      case 'quadrant':
        return (
          <QuadrantTag
            quadrant={String(value || 'cruisers')}
          />
        );

      case 'discounted':
        return Boolean(value) ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF3CD] text-[#B45309]">
            Discounted
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#EEEDFB] text-[#4F46E5]">
            Non-discount
          </span>
        );

      default:
        return String(value || '');
    }
  };

  return (
    <div className={cn("bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden", className)}>
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full">
          <thead className="sticky top-0 bg-[#F2F0EA] z-10">
            <tr>
              {columns.map((col) => (
                <th 
                  key={col}
                  className="px-4 py-3 text-left text-[12px] font-medium text-[#8B8780] uppercase tracking-wider whitespace-nowrap"
                >
                  {columnLabels[col] || col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEECE5]">
            {products.map((product) => (
              <tr 
                key={String(product.id || Math.random())}
                className="hover:bg-[#F2F0EA] transition-colors duration-75"
              >
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 text-sm text-[#1A1814] whitespace-nowrap">
                    {formatCell(product, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuadrantTag({ quadrant }: { quadrant: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    champions: { bg: 'bg-[#E7F7F0]', text: 'text-[#10B981]', label: 'Champion' },
    contenders: { bg: 'bg-[#EAF1FE]', text: 'text-[#3B82F6]', label: 'Contender' },
    cruisers: { bg: 'bg-[#F2F0EC]', text: 'text-[#78716C]', label: 'Cruiser' },
    casualties: { bg: 'bg-[#FDECEC]', text: 'text-[#EF4444]', label: 'Casualty' },
  };
  
  const style = styles[quadrant] || styles.cruisers;
  
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", style.bg, style.text)}>
      {style.label}
    </span>
  );
}
