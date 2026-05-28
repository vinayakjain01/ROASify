'use client';

import { inr, roi, getQuadrantColor } from '@/lib/formatters';
import { PanelSection, PanelRow } from '@/components/layout/right-panel';
import { Slider } from '@/components/ui/slider';
import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';

function getSpend(p: Product): number   { return Number(p['Total Spend']    ?? (p as any).totalSpend ?? 0); }
function getRevenue(p: Product): number { return Number(p['Shopify Revenue'] ?? (p as any).revenue    ?? 0); }

function classifyProduct(p: Product, spendThreshold: number, revenueThreshold: number) {
  const highRevenue = getRevenue(p) >= revenueThreshold;
  const highSpend   = getSpend(p)   >= spendThreshold;
  if  (highRevenue && !highSpend) return 'champions';
  if  (highRevenue &&  highSpend) return 'contenders';
  if (!highRevenue && !highSpend) return 'cruisers';
  return 'casualties';
}

interface QuadrantPanelProps {
  spendThreshold:   number;   // actual ₹ value
  revenueThreshold: number;   // actual ₹ value
  spendPct:         number;   // 0–300 (100 = avg)
  revPct:           number;   // 0–300 (100 = avg)
  avgSpend:         number;   // computed avg from data
  avgRevenue:       number;   // computed avg from data
  onSpendPctChange:   (v: number) => void;
  onRevPctChange:     (v: number) => void;
  onReset:            () => void;
}

export function QuadrantPanel({
  spendThreshold,
  revenueThreshold,
  spendPct,
  revPct,
  avgSpend,
  avgRevenue,
  onSpendPctChange,
  onRevPctChange,
  onReset,
}: QuadrantPanelProps) {
  const { mergedData } = useApp();
  const products = mergedData ?? [];

  const quadrants = ['champions', 'contenders', 'cruisers', 'casualties'] as const;

  const quadrantStats = quadrants.map(q => {
    const qp      = products.filter(p => classifyProduct(p, spendThreshold, revenueThreshold) === q);
    const spend   = qp.reduce((s, p) => s + getSpend(p), 0);
    const revenue = qp.reduce((s, p) => s + getRevenue(p), 0);
    return { key: q, count: qp.length, roi: spend > 0 ? revenue / spend : 0 };
  });

  // Slider tick marks at 50%, 100% (avg), 150%, 200%, 300%
  const spendTicks  = [0, 50, 100, 150, 200, 250, 300];
  const revTicks    = [0, 50, 100, 150, 200, 250, 300];

  return (
    <div className="p-5 space-y-6">

      {/* ── QUADRANT AXIS THRESHOLDS (like screenshot) ─────────────────── */}
      <div className="bg-[#F8F7F4] rounded-lg border border-[#EEECE5] p-4">
        <div className="text-[10px] font-semibold text-[#8B8780] uppercase tracking-widest mb-3">
          Quadrant axis thresholds
        </div>

        <div className="grid grid-cols-2 gap-4 mb-2">
          {/* X-axis */}
          <div>
            <div className="text-[10px] font-medium text-[#8B8780] uppercase tracking-wider mb-1">
              X-Axis — Total Spend (Ad Cost)
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-medium text-[#57544E]">
                Low Spend &lt; {inr(spendThreshold)}
              </span>
              <span className="text-[10px] text-[#8B8780]">|</span>
              <span className="text-xs font-semibold text-[#4F46E5]">
                High Spend ≥ {inr(spendThreshold)}
              </span>
            </div>
            <div className="text-[11px] text-[#8B8780]">
              Average: {inr(avgSpend)} per product
            </div>
          </div>

          {/* Y-axis */}
          <div>
            <div className="text-[10px] font-medium text-[#8B8780] uppercase tracking-wider mb-1">
              Y-Axis — Shopify Revenue
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-medium text-[#57544E]">
                Low Revenue &lt; {inr(revenueThreshold)}
              </span>
              <span className="text-[10px] text-[#8B8780]">|</span>
              <span className="text-xs font-semibold text-[#4F46E5]">
                High Revenue ≥ {inr(revenueThreshold)}
              </span>
            </div>
            <div className="text-[11px] text-[#8B8780]">
              Average: {inr(avgRevenue)} per product
            </div>
          </div>
        </div>

        {/* Months in data badge */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-[#8B8780] uppercase tracking-wider">Months in data</span>
          <span className="text-sm font-bold text-[#4F46E5] ml-2">
            {products.length > 0 ? '1' : '—'}
          </span>
        </div>
      </div>

      {/* ── SLIDERS ─────────────────────────────────────────────────────── */}
      <PanelSection title="Adjust thresholds">
        <p className="text-xs text-[#8B8780] mb-4">
          100% = average. Drag to 0–300%. Updates quadrants live.
        </p>

        <div className="space-y-6">
          {/* Spend slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#57544E]">Spend cut-off</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-[#1A1814]">{inr(spendThreshold)}</span>
                <span className="text-xs text-[#8B8780] ml-1">({spendPct}% of avg)</span>
              </div>
            </div>
            <Slider
              value={[spendPct]}
              onValueChange={([v]) => onSpendPctChange(v)}
              min={0}
              max={300}
              step={5}
              className="w-full"
            />
            {/* Tick labels */}
            <div className="flex justify-between mt-1">
              {[0, 100, 200, 300].map(t => (
                <span key={t} className={`text-[10px] ${spendPct === t ? 'text-[#4F46E5] font-semibold' : 'text-[#8B8780]'}`}>
                  {t === 100 ? 'Avg' : `${t}%`}
                </span>
              ))}
            </div>
          </div>

          {/* Revenue slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#57544E]">Revenue cut-off</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-[#1A1814]">{inr(revenueThreshold)}</span>
                <span className="text-xs text-[#8B8780] ml-1">({revPct}% of avg)</span>
              </div>
            </div>
            <Slider
              value={[revPct]}
              onValueChange={([v]) => onRevPctChange(v)}
              min={0}
              max={300}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              {[0, 100, 200, 300].map(t => (
                <span key={t} className={`text-[10px] ${revPct === t ? 'text-[#4F46E5] font-semibold' : 'text-[#8B8780]'}`}>
                  {t === 100 ? 'Avg' : `${t}%`}
                </span>
              ))}
            </div>
          </div>

          <button onClick={onReset} className="text-sm text-[#4F46E5] hover:text-[#4338CA]">
            Reset to average (100%)
          </button>
        </div>
      </PanelSection>

      {/* ── QUADRANT COUNTS ─────────────────────────────────────────────── */}
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
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#1A1814] tabular-nums font-medium">{count}</span>
                  <span className={`text-xs tabular-nums ${colors.text}`}>{roi(roiVal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="Methodology">
        <p className="text-sm text-[#57544E] leading-relaxed">
          Products classified by spend vs revenue relative to your data's average.
          100% = average spend/revenue. Adjust to find the right cut-offs for your catalogue.
        </p>
      </PanelSection>
    </div>
  );
}

export default QuadrantPanel;