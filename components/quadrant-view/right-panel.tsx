'use client';

import { inr, roi, getQuadrantColor } from '@/lib/formatters';
import { PanelSection, PanelRow } from '@/components/layout/right-panel';
import { Slider } from '@/components/ui/slider';
import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';

function getSpend(p: Product): number   { return p['Total Spend']    ?? (p as any).totalSpend ?? 0; }
function getRevenue(p: Product): number { return p['Shopify Revenue'] ?? (p as any).revenue    ?? 0; }

function classifyProduct(p: Product, spendThreshold: number, revenueThreshold: number) {
  const highRevenue = getRevenue(p) >= revenueThreshold;
  const highSpend   = getSpend(p)   >= spendThreshold;
  if  (highRevenue && !highSpend) return 'champions';
  if  (highRevenue &&  highSpend) return 'contenders';
  if (!highRevenue && !highSpend) return 'cruisers';
  return 'casualties';
}

interface QuadrantPanelProps {
  spendThreshold: number;
  revenueThreshold: number;
  spendPct: number;
  revPct: number;
  onSpendPctChange: (value: number) => void;
  onRevPctChange: (value: number) => void;
  onReset: () => void;
}

export function QuadrantPanel({ 
  spendThreshold, 
  revenueThreshold, 
  spendPct,
  revPct,
  onSpendPctChange, 
  onRevPctChange,
  onReset, 
}: QuadrantPanelProps) {
  const { mergedData } = useApp();
  const products = mergedData ?? [];

  const quadrants = ['champions', 'contenders', 'cruisers', 'casualties'] as const;

  // Compute live quadrant counts and ROI from actual data
  const quadrantStats = quadrants.map(q => {
    const qProducts = products.filter(p => classifyProduct(p, spendThreshold, revenueThreshold) === q);
    const spend   = qProducts.reduce((s, p) => s + getSpend(p), 0);
    const revenue = qProducts.reduce((s, p) => s + getRevenue(p), 0);
    return {
      key: q,
      count: qProducts.length,
      roi: spend > 0 ? revenue / spend : 0,
    };
  });

  return (
    <div className="p-5 space-y-6">
      <PanelSection title="Thresholds">
        <p className="text-xs text-[#8B8780] mb-4">
          Drag to change quadrant cut-offs. Updates live.
        </p>
        
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#57544E]">Spend cut-off (X)</span>
              <span className="text-sm font-medium text-[#1A1814] tabular-nums">
                {inr(spendThreshold)}
              </span>
            </div>
            <div className="text-xs text-[#8B8780] mb-2">{spendPct}th percentile</div>
            <Slider
              value={[spendPct]}
              onValueChange={([v]) => onSpendPctChange(v)}
              min={10}
              max={90}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#57544E]">Revenue cut-off (Y)</span>
              <span className="text-sm font-medium text-[#1A1814] tabular-nums">
                {inr(revenueThreshold)}
              </span>
            </div>
            <div className="text-xs text-[#8B8780] mb-2">{revPct}th percentile</div>
            <Slider
              value={[revPct]}
              onValueChange={([v]) => onRevPctChange(v)}
              min={10}
              max={90}
              step={1}
              className="w-full"
            />
          </div>

          <button 
            onClick={onReset}
            className="text-sm text-[#4F46E5] hover:text-[#4338CA]"
          >
            Reset to median (50th percentile)
          </button>
        </div>
      </PanelSection>

      <PanelSection title="Quadrant counts">
        <div className="space-y-2">
          {quadrantStats.map(({ key, count, roi: roiVal }) => {
            const colors = getQuadrantColor(key);
            return (
              <div key={key} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                  <span className="text-sm text-[#1A1814] capitalize">{key}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[#1A1814] tabular-nums">{count}</span>
                  <span className={`text-sm tabular-nums ${colors.text}`}>{roi(roiVal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="Methodology">
        <p className="text-sm text-[#57544E] leading-relaxed">
          Products are classified into four quadrants based on their position relative to 
          the spend and revenue thresholds. Adjust thresholds to explore different scenarios 
          and identify opportunities for optimization.
        </p>
      </PanelSection>
    </div>
  );
}