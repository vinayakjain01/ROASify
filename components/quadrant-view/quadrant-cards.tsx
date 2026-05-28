'use client';

import { useState } from 'react';
import { ChevronDown, Star, Diamond, Circle, Triangle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/context';
import type { NormProduct } from '@/lib/context';
import { inr, roi, getQuadrantColor, roiColor } from '@/lib/formatters';
import { DataTable } from '@/components/ui/data-table';

type QuadrantKey = 'champions' | 'contenders' | 'cruisers' | 'casualties';

function classify(p: NormProduct, spendT: number, revT: number): QuadrantKey {
  const hr = p.revenue    >= revT;
  const hs = p.totalSpend >= spendT;
  if  (hr && !hs) return 'champions';
  if  (hr &&  hs) return 'contenders';
  if (!hr && !hs) return 'cruisers';
  return 'casualties';
}

const CONFIG: Record<QuadrantKey, { icon: any; label: string; tag: string; desc: string }> = {
  champions:  { icon: Star,     label: 'Champions',  tag: 'Scale',   desc: 'High revenue · Low spend'  },
  contenders: { icon: Diamond,  label: 'Contenders', tag: 'Protect', desc: 'High revenue · High spend' },
  cruisers:   { icon: Circle,   label: 'Cruisers',   tag: 'Decide',  desc: 'Low revenue · Low spend'   },
  casualties: { icon: Triangle, label: 'Casualties', tag: 'Cut',     desc: 'Low revenue · High spend'  },
};

function downloadQuadrantCSV(quadrant: QuadrantKey, products: NormProduct[]) {
  const rows: string[][] = [
    [`ROASify — ${CONFIG[quadrant].label} Export`],
    ['Generated', new Date().toLocaleString('en-IN')],
    ['Products',  String(products.length)],
    [],
    ['Product ID', 'Product Title', 'Variant', 'Meta Spend', 'Total Spend', 'Revenue', 'ROI', 'Items Sold'],
    ...products.map(p => [
      p.id, p.title, p.variant,
      String(Math.round(p.metaSpend)),
      String(Math.round(p.totalSpend)),
      String(Math.round(p.revenue)),
      p.roi.toFixed(2),
      String(p.itemsSold),
    ]),
  ];
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `roasify_${quadrant}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function QuadrantCard({ quadrant, products }: { quadrant: QuadrantKey; products: NormProduct[] }) {
  const [expanded, setExpanded] = useState(false);
  const cfg    = CONFIG[quadrant];
  const colors = getQuadrantColor(quadrant);
  const Icon   = cfg.icon;

  const spend   = products.reduce((s, p) => s + p.totalSpend, 0);
  const revenue = products.reduce((s, p) => s + p.revenue,    0);
  const roiVal  = spend > 0 ? revenue / spend : 0;

  // Map NormProduct → shape expected by DataTable
  const rows = products.map(p => ({
    id:         p.id,
    title:      p.title,
    variant:    p.variant,
    metaSpend:  p.metaSpend,
    googleCost: p.googleCost,
    totalSpend: p.totalSpend,
    revenue:    p.revenue,
    roi:        p.roi,
    itemsSold:  p.itemsSold,
    ctr:        p.ctr,
    cpm:        p.cpm,
  }));

  return (
    <div className={cn('bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden border-l-[3px]', colors.border)}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon className={cn('w-5 h-5', colors.text)} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#1A1814]">{cfg.label}</span>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded', colors.bg, colors.text)}>{cfg.tag}</span>
              </div>
              <div className="text-xs text-[#8B8780] mt-0.5">{cfg.desc}</div>
            </div>
          </div>
          <button
            onClick={() => downloadQuadrantCSV(quadrant, products)}
            disabled={products.length === 0}
            title={`Download ${cfg.label} CSV`}
            className="p-1.5 rounded-md hover:bg-[#F2F0EA] text-[#8B8780] hover:text-[#1A1814] transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[#8B8780] uppercase tracking-wider">Products</div>
            <div className="text-xl font-semibold text-[#1A1814] tabular-nums">{products.length}</div>
          </div>
          <div>
            <div className="text-xs text-[#8B8780] uppercase tracking-wider">Spend</div>
            <div className="text-xl font-semibold text-[#1A1814] tabular-nums">{inr(spend)}</div>
          </div>
          <div>
            <div className="text-xs text-[#8B8780] uppercase tracking-wider">Revenue</div>
            <div className="text-xl font-semibold text-[#1A1814] tabular-nums">{inr(revenue)}</div>
          </div>
          <div>
            <div className="text-xs text-[#8B8780] uppercase tracking-wider">ROI</div>
            <div className={cn('text-xl font-semibold tabular-nums', roiColor(roiVal))}>{roi(roiVal)}</div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1 text-sm text-[#4F46E5] hover:text-[#4338CA]"
        >
          View all {products.length} products
          <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#EEECE5]">
          <DataTable products={rows as any} />
        </div>
      )}
    </div>
  );
}

interface QuadrantGridProps { spendThreshold: number; revenueThreshold: number; }

export function QuadrantGrid({ spendThreshold, revenueThreshold }: QuadrantGridProps) {
  const { aggregatedProducts } = useApp();

  const byQ: Record<QuadrantKey, NormProduct[]> = {
    champions: [], contenders: [], cruisers: [], casualties: [],
  };
  for (const p of aggregatedProducts) {
    byQ[classify(p, spendThreshold, revenueThreshold)].push(p);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {(['champions', 'contenders', 'cruisers', 'casualties'] as QuadrantKey[]).map(q => (
        <QuadrantCard key={q} quadrant={q} products={byQ[q]} />
      ))}
    </div>
  );
}