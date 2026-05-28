'use client';

import { useState } from 'react';
import { ChevronDown, Star, Diamond, Circle, Triangle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';
import { inr, roi, getQuadrantColor, roiColor } from '@/lib/formatters';
import { DataTable } from '@/components/ui/data-table';
import type { ProductRow } from '@/lib/api';

type QuadrantKey = 'champions' | 'contenders' | 'cruisers' | 'casualties';

function n(v: any): number { return Number(v ?? 0); }
function getSpend(p: Product): number   { return n(p['Total Spend']    ?? (p as any).totalSpend); }
function getRevenue(p: Product): number { return n(p['Shopify Revenue'] ?? (p as any).revenue);   }
function getRoi(p: Product): number     { const sp = getSpend(p); return sp > 0 ? getRevenue(p) / sp : 0; }

function classifyProduct(p: Product, spendT: number, revT: number): QuadrantKey {
  const hr = getRevenue(p) >= revT;
  const hs = getSpend(p)   >= spendT;
  if  (hr && !hs) return 'champions';
  if  (hr &&  hs) return 'contenders';
  if (!hr && !hs) return 'cruisers';
  return 'casualties';
}

const quadrantConfig: Record<QuadrantKey, { icon: any; label: string; tag: string; description: string }> = {
  champions:  { icon: Star,     label: 'Champions',  tag: 'Scale',   description: 'High revenue · Low spend'  },
  contenders: { icon: Diamond,  label: 'Contenders', tag: 'Protect', description: 'High revenue · High spend' },
  cruisers:   { icon: Circle,   label: 'Cruisers',   tag: 'Decide',  description: 'Low revenue · Low spend'   },
  casualties: { icon: Triangle, label: 'Casualties', tag: 'Cut',     description: 'Low revenue · High spend'  },
};

function downloadQuadrantCSV(quadrant: QuadrantKey, products: Product[]) {
  const rows: string[][] = [
    [`ROASify — ${quadrantConfig[quadrant].label} Export`],
    ['Generated', new Date().toLocaleString('en-IN')],
    ['Products in quadrant', String(products.length)],
    [],
    ['Product ID', 'Product Title', 'Variant', 'Total Spend', 'Revenue', 'ROI', 'Items Sold', 'CTR', 'CPM'],
    ...products.map(p => {
      const sp = getSpend(p); const rev = getRevenue(p);
      return [
        String(p['Product ID']     ?? (p as any).id       ?? ''),
        String(p['Product Title']  ?? (p as any).title    ?? ''),
        String(p['Variant Title']  ?? (p as any).variant  ?? ''),
        String(sp),
        String(rev),
        String(sp > 0 ? (rev / sp).toFixed(2) : '0'),
        String(p['Net Items Sold'] ?? (p as any).itemsSold ?? 0),
        String(p['CTR']            ?? (p as any).ctr       ?? 0),
        String(p['CPM']            ?? (p as any).cpm       ?? 0),
      ];
    }),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `roasify_${quadrant}.csv`; a.click();
  URL.revokeObjectURL(url);
}

interface QuadrantCardProps {
  quadrant: QuadrantKey;
  products: Product[];
}

function QuadrantCard({ quadrant, products }: QuadrantCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = quadrantConfig[quadrant];
  const colors = getQuadrantColor(quadrant);
  const Icon   = config.icon;

  const spend   = products.reduce((s, p) => s + getSpend(p),   0);
  const revenue = products.reduce((s, p) => s + getRevenue(p), 0);
  const roiVal  = spend > 0 ? revenue / spend : 0;

  const rows: ProductRow[] = products.map(p => ({
    id:         p['Product ID']     ?? (p as any).id,
    title:      p['Product Title']  ?? (p as any).title,
    variant:    p['Variant Title']  ?? (p as any).variant,
    metaSpend:  n(p['Meta Spend']   ?? (p as any).metaSpend),
    googleCost: n(p['Google Cost']  ?? (p as any).googleCost),
    totalSpend: getSpend(p),
    revenue:    getRevenue(p),
    roi:        getRoi(p),
    itemsSold:  n(p['Net Items Sold'] ?? (p as any).itemsSold),
    ctr:        n(p['CTR']            ?? (p as any).ctr),
    cpm:        n(p['CPM']            ?? (p as any).cpm),
  }));

  return (
    <div className={cn(
      "bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden border-l-[3px]",
      colors.border
    )}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon className={cn("w-5 h-5", colors.text)} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#1A1814]">{config.label}</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded", colors.bg, colors.text)}>
                  {config.tag}
                </span>
              </div>
              <div className="text-xs text-[#8B8780] mt-0.5">{config.description}</div>
            </div>
          </div>
          {/* Per-quadrant download */}
          <button
            onClick={() => downloadQuadrantCSV(quadrant, products)}
            disabled={products.length === 0}
            title={`Download ${config.label} CSV`}
            className="p-1.5 rounded-md hover:bg-[#F2F0EA] text-[#8B8780] hover:text-[#1A1814] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            <div className={cn("text-xl font-semibold tabular-nums", roiColor(roiVal))}>{roi(roiVal)}</div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1 text-sm text-[#4F46E5] hover:text-[#4338CA]"
        >
          View all {products.length} products
          <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#EEECE5]">
          <DataTable products={rows} />
        </div>
      )}
    </div>
  );
}

interface QuadrantGridProps {
  spendThreshold: number;
  revenueThreshold: number;
}

export function QuadrantGrid({ spendThreshold, revenueThreshold }: QuadrantGridProps) {
  const { mergedData } = useApp();
  const products = mergedData ?? [];

  const byQuadrant: Record<QuadrantKey, Product[]> = {
    champions: [], contenders: [], cruisers: [], casualties: [],
  };
  for (const p of products) {
    byQuadrant[classifyProduct(p, spendThreshold, revenueThreshold)].push(p);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {(['champions', 'contenders', 'cruisers', 'casualties'] as QuadrantKey[]).map(q => (
        <QuadrantCard key={q} quadrant={q} products={byQuadrant[q]} />
      ))}
    </div>
  );
}