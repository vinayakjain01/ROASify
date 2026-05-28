'use client';

import { useState } from 'react';
import { ArrowRight, Star, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';
import { inr, roi, roiColor } from '@/lib/formatters';

function n(v: any): number { return Number(v ?? 0); }
function getSpend(p: Product): number     { return n(p['Total Spend']    ?? (p as any).totalSpend);  }
function getRevenue(p: Product): number   { return n(p['Shopify Revenue'] ?? (p as any).revenue);    }
function getItemsSold(p: Product): number { return n(p['Net Items Sold']  ?? (p as any).itemsSold);  }
function getTitle(p: Product): string     { return String(p['Product Title'] ?? (p as any).title ?? 'Unknown'); }
function getRoi(p: Product): number {
  const sp = getSpend(p); return sp > 0 ? getRevenue(p) / sp : 0;
}

interface Props { spendThreshold: number; revenueThreshold: number; }

export function ChampionsHero({ spendThreshold, revenueThreshold }: Props) {
  const { mergedData } = useApp();
  const [planOpen, setPlanOpen] = useState(false);

  const products = mergedData ?? [];

  const champions = products
    .filter(p => getRevenue(p) >= revenueThreshold && getSpend(p) < spendThreshold)
    .sort((a, b) => getRoi(b) - getRoi(a))
    .slice(0, 3);

  if (champions.length === 0) {
    return (
      <div className="bg-[#F2F0EA] rounded-[10px] border border-[#EEECE5] p-6 text-center text-[#8B8780] text-sm">
        No Champions at current thresholds (spend &lt; {inr(spendThreshold)}, revenue ≥ {inr(revenueThreshold)}). Try adjusting the sliders.
      </div>
    );
  }

  const champSpend   = champions.reduce((s, p) => s + getSpend(p), 0);
  const champRevenue = champions.reduce((s, p) => s + getRevenue(p), 0);
  const champRoi     = champSpend > 0 ? champRevenue / champSpend : 0;
  const estAdditional = champSpend * 0.5 * champRoi;

  const scalePlans = champions.map(p => {
    const currentSpend    = getSpend(p);
    const suggestedBudget = Math.round(currentSpend * 1.5);
    const productRoi      = getRoi(p);
    const roiAtScale      = productRoi * 0.85;
    const expectedRevenue = Math.round(suggestedBudget * roiAtScale);
    return { product: getTitle(p), currentSpend, suggestedBudget, expectedRevenue, roiAtScale };
  });

  const downloadScalePlan = () => {
    const rows: string[][] = [
      ['ROASify — Scale-Spend Plan for Champions'],
      ['Generated', new Date().toLocaleString('en-IN')],
      [],
      ['Product', 'Current Spend (₹)', 'Suggested Budget (+50%)', 'Expected Revenue', 'Conservative ROI'],
      ...scalePlans.map(p => [
        p.product,
        String(p.currentSpend),
        String(p.suggestedBudget),
        String(p.expectedRevenue),
        roi(p.roiAtScale),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'roasify_scale_plan.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gradient-to-b from-[#E7F7F0] to-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-[#10B981]" />
          <span className="text-xs font-medium text-[#10B981] uppercase tracking-wider">WHERE TO ACT FIRST</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#E7F7F0] text-[#10B981] border border-[#10B981]/20">SCALE</span>
        </div>

        <h2 className="text-[22px] font-medium text-[#1A1814] leading-snug mb-6">
          <span className="text-[#10B981]">{champions.length} Champion{champions.length > 1 ? 's' : ''}</span> together return{' '}
          <span className="text-[#10B981]">{roi(champRoi)}</span> on {inr(champSpend)} spend.
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {champions.map((product, index) => {
            const r = getRoi(product);
            return (
              <div key={product['Product ID'] ?? index} className="p-4 bg-white rounded-lg border border-[#EEECE5]">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-[#1A1814] text-sm leading-snug flex-1 pr-2">{getTitle(product)}</div>
                  <div className={`text-lg font-semibold tabular-nums flex-shrink-0 ${roiColor(r)}`}>{roi(r)}</div>
                </div>
                <div className="text-xs text-[#8B8780] mb-2">
                  Spend {inr(getSpend(product))} · Rev {inr(getRevenue(product))} · {getItemsSold(product)} units
                </div>
                <p className="text-xs text-[#57544E] line-clamp-2">
                  Returns {roi(r)} per ₹1 spent — scale spend while creative performs.
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between p-4 bg-[#FAFAF8] rounded-lg border border-[#EEECE5]">
          <p className="text-sm text-[#57544E]">
            Estimated additional revenue at +50% spend:{' '}
            <span className="font-medium text-[#1A1814]">{inr(estAdditional)}</span>
          </p>
          <Button className="bg-[#4F46E5] hover:bg-[#4338CA]" onClick={() => setPlanOpen(true)}>
            Create scale-spend plan <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Scale Plan Modal */}
      {planOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPlanOpen(false)}>
          <div className="bg-white rounded-xl border border-[#EEECE5] shadow-xl w-full max-w-2xl mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEECE5]">
              <div>
                <h3 className="font-semibold text-[#1A1814]">Scale-Spend Plan — Champions</h3>
                <p className="text-xs text-[#8B8780] mt-0.5">+50% budget · 15% conservative ROI decay</p>
              </div>
              <button onClick={() => setPlanOpen(false)} className="p-1 rounded hover:bg-[#F2F0EA] text-[#8B8780]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-[#8B8780] uppercase tracking-wider border-b border-[#EEECE5]">
                    <th className="text-left pb-2 font-medium">Product</th>
                    <th className="text-right pb-2 font-medium">Current Spend</th>
                    <th className="text-right pb-2 font-medium">Suggested Budget</th>
                    <th className="text-right pb-2 font-medium">Expected Revenue</th>
                    <th className="text-right pb-2 font-medium">Est. ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEECE5]">
                  {scalePlans.map((p, i) => (
                    <tr key={i}>
                      <td className="py-3 font-medium text-[#1A1814]">{p.product}</td>
                      <td className="py-3 text-right tabular-nums text-[#57544E]">{inr(p.currentSpend)}</td>
                      <td className="py-3 text-right tabular-nums font-semibold text-[#1A1814]">{inr(p.suggestedBudget)}</td>
                      <td className="py-3 text-right tabular-nums text-[#10B981]">{inr(p.expectedRevenue)}</td>
                      <td className="py-3 text-right tabular-nums text-[#10B981]">{roi(p.roiAtScale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-[#8B8780] mt-4">
                * Conservative estimate assumes 15% ROI decay at 1.5× spend. Actual results may vary.
              </p>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPlanOpen(false)}>Close</Button>
              <Button className="bg-[#4F46E5] hover:bg-[#4338CA]" onClick={downloadScalePlan}>
                <Download className="w-4 h-4 mr-2" />
                Download Plan CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}