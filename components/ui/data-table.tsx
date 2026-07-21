'use client';

import { ReactNode, useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { inr, roi, roiColor } from '@/lib/formatters';
import type { ProductRow } from '@/lib/api';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZE = 25;

interface DataTableProps {
  products: ProductRow[];
  columns?: string[];
  className?: string;
}

export function DataTable({ 
  products, 
  columns = ['id', 'title', 'variant', 'metaSpend', 'totalSpend', 'revenue', 'roi', 'itemsSold', 'ctr', 'cpm'],
  className 
}: DataTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));

  // Reset to page 1 whenever the products array changes (new merge)
  const prevLengthRef = useRef(products.length);
  useEffect(() => {
    if (prevLengthRef.current !== products.length) {
      prevLengthRef.current = products.length;
      setPage(1);
    }
  }, [products.length]);

  const visibleRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return products.slice(start, start + PAGE_SIZE);
  }, [products, page]);

  const columnLabels: Record<string, string> = {
    id:         'Product ID',
    title:      'Product Title',
    variant:    'Variant Title',
    metaSpend:  'Meta Spend',
    googleCost: 'Google Cost',
    totalSpend: 'Total Spend',
    revenue:    'Revenue',
    roi:        'ROI',
    itemsSold:  'Items Sold',
    ctr:        'CTR',
    cpm:        'CPM',
    category:   'Category',
    quadrant:   'Quadrant',
    discounted: 'Strategy',
  };

  const formatCell = (product: ProductRow, column: string): ReactNode => {
    const value = product[column as keyof ProductRow];

    switch (column) {
      case 'id':
        return <span className="font-mono text-[13px] text-[#8B8780]">{String(value ?? '')}</span>;

      case 'title':
        return (
          <span className="font-medium text-[13px] leading-tight line-clamp-1 max-w-[220px] block">
            {String(value ?? '')}
          </span>
        );

      case 'variant':
        return String(value ?? '');

      case 'metaSpend':
      case 'googleCost':
      case 'totalSpend':
      case 'revenue':
        return <span className="tabular-nums">{inr(Number(value ?? 0))}</span>;

      case 'roi':
        return (
          <span className={cn('tabular-nums font-medium', roiColor(Number(value ?? 0)))}>
            {roi(Number(value ?? 0))}
          </span>
        );

      case 'itemsSold':
        return <span className="tabular-nums">{Number(value ?? 0).toLocaleString('en-IN')}</span>;

      case 'ctr':
        return <span className="tabular-nums">{Number(value ?? 0).toFixed(1)}%</span>;

      case 'cpm':
        return <span className="tabular-nums">{inr(Number(value ?? 0))}</span>;

      case 'category':
        return String(value ?? '');

      case 'quadrant':
        return <QuadrantTag quadrant={String(value ?? 'cruisers')} />;

      case 'discounted':
        return Boolean(value) ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF3CD] text-[#B45309]">Discounted</span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#EEEDFB] text-[#4F46E5]">Non-discount</span>
        );

      default:
        return String(value ?? '');
    }
  };

  const start = (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, products.length);

  return (
    <div className={cn('bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden', className)}>
      {/* Table — fixed height, no internal scroll; pagination replaces it */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F2F0EA]">
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
            {visibleRows.map((product, i) => (
              <tr
                key={String(product.id ?? i)}
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

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#EEECE5] bg-white">
        <span className="text-sm text-[#57544E]">
          Showing{' '}
          <span className="font-medium text-[#1A1814]">{start}–{end}</span>
          {' '}of{' '}
          <span className="font-medium text-[#1A1814]">{products.length.toLocaleString('en-IN')}</span>
          {' '}products
        </span>

        <div className="flex items-center gap-1">
          {/* First page */}
          <PagBtn onClick={() => setPage(1)} disabled={page === 1} title="First page">
            <ChevronsLeft className="w-3.5 h-3.5" />
          </PagBtn>
          {/* Prev */}
          <PagBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} title="Previous page">
            <ChevronLeft className="w-3.5 h-3.5" />
          </PagBtn>

          {/* Page number pills */}
          <PagePills page={page} totalPages={totalPages} onPage={setPage} />

          {/* Next */}
          <PagBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} title="Next page">
            <ChevronRight className="w-3.5 h-3.5" />
          </PagBtn>
          {/* Last page */}
          <PagBtn onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Last page">
            <ChevronsRight className="w-3.5 h-3.5" />
          </PagBtn>
        </div>
      </div>
    </div>
  );
}

// ── Small helper components ──────────────────────────────────────────────────

function PagBtn({ onClick, disabled, children, title }: {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded text-[#57544E] hover:bg-[#F2F0EA] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function PagePills({ page, totalPages, onPage }: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  // Show at most 5 page pills with ellipsis
  const pills: (number | '…')[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pills.push(i);
  } else {
    pills.push(1);
    if (page > 3)  pills.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pills.push(i);
    }
    if (page < totalPages - 2) pills.push('…');
    pills.push(totalPages);
  }

  return (
    <div className="flex items-center gap-0.5">
      {pills.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="w-7 text-center text-xs text-[#8B8780]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              'w-7 h-7 rounded text-sm transition-colors',
              page === p
                ? 'bg-[#4F46E5] text-white font-semibold'
                : 'text-[#57544E] hover:bg-[#F2F0EA]'
            )}
          >
            {p}
          </button>
        )
      )}
    </div>
  );
}

function QuadrantTag({ quadrant }: { quadrant: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    champions:  { bg: 'bg-[#E7F7F0]', text: 'text-[#10B981]', label: 'Champion'  },
    contenders: { bg: 'bg-[#EAF1FE]', text: 'text-[#3B82F6]', label: 'Contender' },
    cruisers:   { bg: 'bg-[#F2F0EC]', text: 'text-[#78716C]', label: 'Cruiser'   },
    casualties: { bg: 'bg-[#FDECEC]', text: 'text-[#EF4444]', label: 'Casualty'  },
  };
  const style = styles[quadrant] ?? styles.cruisers;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', style.bg, style.text)}>
      {style.label}
    </span>
  );
}