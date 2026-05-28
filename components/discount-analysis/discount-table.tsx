'use client';

import { useState, useMemo } from 'react';
import type { Product } from '@/lib/context';
import { inr, roi, roiColor } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

type StrategyFilter = 'all' | 'discounted' | 'non-discounted';

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100] as const;
type RowsPerPage = typeof ROWS_PER_PAGE_OPTIONS[number];

// ── Accessors ───────────────────────────────────────────────────────────────
function getSpend(p: Product): number     { return Number(p['Total Spend']    ?? (p as any).totalSpend ?? 0); }
function getRevenue(p: Product): number   { return Number(p['Shopify Revenue'] ?? (p as any).revenue    ?? 0); }
function getItemsSold(p: Product): number { return Number(p['Net Items Sold']  ?? (p as any).itemsSold  ?? 0); }
function getCtr(p: Product): number       { return Number(p['CTR']             ?? (p as any).ctr        ?? 0); }
function getCpm(p: Product): number       { return Number(p['CPM']             ?? (p as any).cpm        ?? 0); }
function getRoi(p: Product): number       { const sp = getSpend(p); return sp > 0 ? getRevenue(p) / sp : 0; }
function getTitle(p: Product): string     { return String(p['Product Title']   ?? (p as any).title      ?? '—'); }
function getId(p: Product): string        { return String(p['Product ID']      ?? (p as any).id         ?? '—'); }
function isDiscounted(p: Product): boolean { return !!(p as any).discounted; }

interface DiscountTableProps { products: Product[]; }

export function DiscountTable({ products }: DiscountTableProps) {
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [page,           setPage]           = useState(1);
  const [rowsPerPage,    setRowsPerPage]    = useState<RowsPerPage>(25);

  // ── 1. Strategy filter ────────────────────────────────────────────────────
  const strategyFiltered = useMemo(() => {
    if (strategyFilter === 'discounted')     return products.filter(isDiscounted);
    if (strategyFilter === 'non-discounted') return products.filter(p => !isDiscounted(p));
    return products;
  }, [products, strategyFilter]);

  // ── 2. Search filter ──────────────────────────────────────────────────────
  const searched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return strategyFiltered;
    return strategyFiltered.filter(p =>
      getTitle(p).toLowerCase().includes(q) ||
      getId(p).toLowerCase().includes(q)
    );
  }, [strategyFiltered, searchQuery]);

  // ── 3. Pagination ─────────────────────────────────────────────────────────
  const totalRows  = searched.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  // Reset to page 1 whenever filters change
  const safeSetStrategyFilter = (f: StrategyFilter) => { setStrategyFilter(f); setPage(1); };
  const safeSetSearch         = (q: string)          => { setSearchQuery(q);   setPage(1); };
  const safeSetRowsPerPage    = (n: RowsPerPage)      => { setRowsPerPage(n);   setPage(1); };

  const pageRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return searched.slice(start, start + rowsPerPage);
  }, [searched, page, rowsPerPage]);

  const firstRow = totalRows === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const lastRow  = Math.min(page * rowsPerPage, totalRows);

  // Page window: show at most 5 page buttons centered around current page
  const pageWindow = useMemo(() => {
    const half  = 2;
    let start   = Math.max(1, page - half);
    let end     = Math.min(totalPages, page + half);
    if (end - start < 4) {
      if (start === 1) end   = Math.min(totalPages, start + 4);
      else             start = Math.max(1, end - 4);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden">

      {/* ── Header: strategy toggle + search ── */}
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-[#EEECE5] flex-wrap">
        {/* Strategy tabs */}
        <div className="flex items-center gap-1 bg-[#F2F0EA] rounded-lg p-1 flex-shrink-0">
          {(['all', 'discounted', 'non-discounted'] as const).map(f => (
            <button
              key={f}
              onClick={() => safeSetStrategyFilter(f)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors capitalize',
                strategyFilter === f
                  ? 'bg-white text-[#1A1814] shadow-sm'
                  : 'text-[#57544E] hover:text-[#1A1814]'
              )}
            >
              {f === 'non-discounted' ? 'Non-discounted' : f === 'all' ? 'All' : 'Discounted'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B8780]" />
          <input
            type="text"
            placeholder="Search by product title or ID…"
            value={searchQuery}
            onChange={e => safeSetSearch(e.target.value)}
            className="w-full pl-8 pr-8 h-9 text-sm bg-[#F2F0EA] border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30"
          />
          {searchQuery && (
            <button
              onClick={() => safeSetSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B8780] hover:text-[#1A1814]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row count + rows-per-page selector */}
        <div className="flex items-center gap-3 flex-shrink-0 text-sm text-[#8B8780]">
          <span>
            {totalRows === 0
              ? 'No results'
              : `${firstRow.toLocaleString('en-IN')}–${lastRow.toLocaleString('en-IN')} of ${totalRows.toLocaleString('en-IN')}`}
          </span>
          <select
            value={rowsPerPage}
            onChange={e => safeSetRowsPerPage(Number(e.target.value) as RowsPerPage)}
            className="h-8 px-2 text-sm bg-[#F2F0EA] border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 text-[#1A1814] cursor-pointer"
          >
            {ROWS_PER_PAGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n} rows</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F2F0EA]">
            <tr>
              {['Product', 'Strategy', 'Spend', 'Revenue', 'Items', 'ROI', 'CTR', 'CPM'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-[#8B8780] uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEECE5]">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#8B8780]">
                  {searchQuery ? `No products match "${searchQuery}"` : 'No products in this view'}
                </td>
              </tr>
            ) : (
              pageRows.map((product, i) => (
                <tr
                  key={getId(product) + i}
                  className="hover:bg-[#F2F0EA] transition-colors duration-75"
                >
                  <td className="px-4 py-3 max-w-[260px]">
                    <div className="font-medium text-sm text-[#1A1814] truncate" title={getTitle(product)}>
                      {getTitle(product)}
                    </div>
                    <div className="text-xs text-[#8B8780] font-mono truncate">{getId(product)}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isDiscounted(product) ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF3CD] text-[#B45309]">
                        Discounted
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#EEEDFB] text-[#4F46E5]">
                        Non-discount
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums whitespace-nowrap">
                    {inr(getSpend(product))}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums whitespace-nowrap">
                    {inr(getRevenue(product))}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums whitespace-nowrap">
                    {getItemsSold(product).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn('text-sm font-medium tabular-nums', roiColor(getRoi(product)))}>
                      {roi(getRoi(product))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums whitespace-nowrap">
                    {getCtr(product).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1A1814] tabular-nums whitespace-nowrap">
                    ₹{Math.round(getCpm(product))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination footer ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#EEECE5] bg-[#FAFAF8]">
          {/* Left: total info */}
          <span className="text-xs text-[#8B8780]">
            Page {page} of {totalPages.toLocaleString('en-IN')}
          </span>

          {/* Center: page buttons */}
          <div className="flex items-center gap-1">
            {/* First */}
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded text-[#8B8780] hover:bg-[#EEECE5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            {/* Prev */}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded text-[#8B8780] hover:bg-[#EEECE5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page number buttons */}
            {pageWindow[0] > 1 && (
              <>
                <button onClick={() => setPage(1)} className="w-7 h-7 flex items-center justify-center rounded text-sm text-[#57544E] hover:bg-[#EEECE5] transition-colors">1</button>
                {pageWindow[0] > 2 && <span className="w-7 text-center text-[#8B8780] text-sm">…</span>}
              </>
            )}
            {pageWindow.map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded text-sm transition-colors',
                  p === page
                    ? 'bg-[#4F46E5] text-white font-medium'
                    : 'text-[#57544E] hover:bg-[#EEECE5]'
                )}
              >
                {p}
              </button>
            ))}
            {pageWindow[pageWindow.length - 1] < totalPages && (
              <>
                {pageWindow[pageWindow.length - 1] < totalPages - 1 && <span className="w-7 text-center text-[#8B8780] text-sm">…</span>}
                <button onClick={() => setPage(totalPages)} className="w-7 h-7 flex items-center justify-center rounded text-sm text-[#57544E] hover:bg-[#EEECE5] transition-colors">{totalPages}</button>
              </>
            )}

            {/* Next */}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded text-[#8B8780] hover:bg-[#EEECE5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {/* Last */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded text-[#8B8780] hover:bg-[#EEECE5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: jump to page */}
          <div className="flex items-center gap-2 text-xs text-[#8B8780]">
            <span>Go to</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              defaultValue={page}
              key={page} // remount on external page change so value stays in sync
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = Number((e.target as HTMLInputElement).value);
                  if (v >= 1 && v <= totalPages) setPage(v);
                }
              }}
              onBlur={e => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= totalPages) setPage(v);
              }}
              className="w-12 h-7 px-2 text-sm text-center bg-white border border-[#DEDBD2] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]"
            />
          </div>
        </div>
      )}
    </div>
  );
}