'use client';

import { useState } from 'react';
import { Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ActiveFilter } from './columns-filters';

interface DownloadBandProps {
  products?: any[];
  activeFilters?: ActiveFilter[];
}

export function DownloadBand({ products = [], activeFilters = [] }: DownloadBandProps) {
  const [filename, setFilename] = useState(() => {
    const now = new Date();
    return `roasify_overall_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`;
  });

  const handleDownload = () => {
    if (products.length === 0) return;

    const rows: string[][] = [];

    // ---- Header metadata rows ----
    rows.push(['ROASify Export']);
    rows.push(['Generated', new Date().toLocaleString('en-IN')]);
    rows.push(['Total Products', String(products.length)]);

    if (activeFilters.length > 0) {
      rows.push([]);
      rows.push(['Applied Filters']);
      rows.push(['Metric', 'Operator', 'Value', 'Value2']);
      for (const f of activeFilters) {
        rows.push([
          f.metric,
          f.operator,
          String(f.value),
          f.value2 !== undefined ? String(f.value2) : '',
        ]);
      }
    }

    rows.push([]); // blank spacer

    // ---- Column headers ----
    const cols = [
      'Product ID', 'Product Title', 'Variant Title',
      'Meta Spend', 'Google Cost', 'Total Spend', 'Revenue',
      'ROI', 'Items Sold', 'CTR', 'CPM',
    ];
    rows.push(cols);

    // ---- Data rows ----
    for (const p of products) {
      rows.push([
        String(p.id        ?? p['Product ID']        ?? ''),
        String(p.title     ?? p['Product Title']     ?? ''),
        String(p.variant   ?? p['Variant Title']     ?? ''),
        String(p.metaSpend  ?? p['Meta Spend']       ?? 0),
        String(p.googleCost ?? p['Google Cost']      ?? 0),
        String(p.totalSpend ?? p['Total Spend']      ?? 0),
        String(p.revenue    ?? p['Shopify Revenue']  ?? 0),
        String(p.roi        ?? p['ROI']              ?? 0),
        String(p.itemsSold  ?? p['Net Items Sold']   ?? 0),
        String(p.ctr        ?? p['CTR']              ?? 0),
        String(p.cpm        ?? p['CPM']              ?? 0),
      ]);
    }

    // ---- Build CSV ----
    const csv = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename || 'roasify_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] p-5">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
        {/* Filename input */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#8B8780]">filename:</span>
          <input
            type="text"
            value={filename}
            onChange={e => setFilename(e.target.value)}
            className="flex-1 h-9 px-3 font-mono text-sm bg-white border border-[#DEDBD2] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          />
        </div>

        {/* Download button */}
        <Button
          className="bg-[#4F46E5] hover:bg-[#4338CA] h-9 px-6"
          onClick={handleDownload}
          disabled={products.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Download CSV
          {products.length > 0 && (
            <span className="ml-2 text-xs opacity-80">({products.length})</span>
          )}
        </Button>

        {/* Handoff card */}
        <Link href="/quadrant-view" className="block">
          <div className="p-4 bg-[#FAFAF8] rounded-lg border border-[#EEECE5] hover:border-[#4F46E5] transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-[#1A1814]">Continue to Quadrant View</span>
              <ArrowRight className="w-4 h-4 text-[#4F46E5]" />
            </div>
            <p className="text-sm text-[#8B8780]">
              Classify these {products.length || '—'} products into Champions, Contenders, Cruisers, Casualties.
            </p>
          </div>
        </Link>
      </div>

      {/* Active filters summary */}
      {activeFilters.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#EEECE5] flex flex-wrap gap-2 items-center">
          <span className="text-xs text-[#8B8780]">Active filters will appear in downloaded sheet:</span>
          {activeFilters.map((f, i) => (
            <span
              key={i}
              className="text-xs bg-[#EEEDFB] text-[#4F46E5] px-2 py-0.5 rounded font-mono"
            >
              {f.metric} {f.operator} {f.value}{f.value2 !== undefined ? ` – ${f.value2}` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}