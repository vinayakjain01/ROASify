'use client';

import { inr, roi, getQuadrantColor } from '@/lib/formatters';
import { PanelSection, PanelRow } from '@/components/layout/right-panel';
import { Slider } from '@/components/ui/slider';
import { useApp } from '@/lib/context';
import type { NormProduct } from '@/lib/context';

type QuadrantKey = 'champions' | 'contenders' | 'cruisers' | 'casualties';

function classify(p: NormProduct, spendT: number, revT: number): QuadrantKey {
  const hr = p.revenue    >= revT;
  const hs = p.totalSpend >= spendT;
  if  (hr && !hs) return 'champions';
  if  (hr &&  hs) return 'contenders';
  if (!hr && !hs) return 'cruisers';
  return 'casualties';
}

interface QuadrantPanelProps {
  spendThreshold:   number;
  revenueThreshold: number;
  spendPct:         number;   // 0–300, 100 = avg
  revPct:           number;
  avgSpend:         number;
  avgRevenue:       number;
  onSpendPctChange: (v: number) => void;
  onRevPctChange:   (v: number) => void;
  onReset:          () => void;
}

export function QuadrantPanel({
  spendThreshold, revenueThreshold,
  spendPct, revPct,
  avgSpend, avgRevenue,
  onSpendPctChange, onRevPctChange, onReset,
}: QuadrantPanelProps) {
  const { aggregatedProducts, allMonths, selectedMonths } = useApp();

  const quadrants = ['champions', 'contenders', 'cruisers', 'casualties'] as const;

  const quadrantStats = quadrants.map(q => {
    const qp      = aggregatedProducts.filter(p => classify(p, spendThreshold, revenueThreshold) === q);
    const spend   = qp.reduce((s, p) => s + p.totalSpend, 0);
    const revenue = qp.reduce((s, p) => s + p.revenue,    0);
    return { key: q, count: qp.length, roi: spend > 0 ? revenue / spend : 0 };
  });

  const monthLabel = allMonths.length > 0
    ? (selectedMonths.size === allMonths.length
        ? `All ${allMonths.length} months`
        : `${selectedMonths.size} of ${allMonths.length} months`)
    : null;

  return (
    <div className="p-5 space-y-6">
      {/* ── Axis thresholds info card ──────────────────────────────── */}
      <div className="bg-[#F8F7F4] rounded-lg border border-[#EEECE5] p-4">
        <div className="text-[10px] font-semibold text-[#8B8780] uppercase tracking-widest mb-3">
          Quadrant axis thresholds
        </div>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <div className="text-[10px] font-medium text-[#8B8780] uppercase tracking-wider mb-1">
              X-Axis — Total Spend
            </div>
            <div className="text-xs text-[#57544E] mb-0.5">
              Low &lt; {inr(spendThreshold)}
            </div>
            <div className="text-xs font-semibold text-[#4F46E5]">
              High ≥ {inr(spendThreshold)}
            </div>
            <div className="text-[11px] text-[#8B8780] mt-1">Avg: {inr(avgSpend)}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-[#8B8780] uppercase tracking-wider mb-1">
              Y-Axis — Revenue
            </div>
            <div className="text-xs text-[#57544E] mb-0.5">
              Low &lt; {inr(revenueThreshold)}
            </div>
            <div className="text-xs font-semibold text-[#4F46E5]">
              High ≥ {inr(revenueThreshold)}
            </div>
            <div className="text-[11px] text-[#8B8780] mt-1">Avg: {inr(avgRevenue)}</div>
          </div>
        </div>
        {monthLabel && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[#EEECE5]">
            <span className="text-[10px] text-[#8B8780] uppercase tracking-wider">Months</span>
            <span className="text-xs font-semibold text-[#4F46E5] ml-2">{monthLabel}</span>
          </div>
        )}
      </div>

      {/* ── Sliders ────────────────────────────────────────────────── */}
      <PanelSection title="Adjust thresholds">
        <p className="text-xs text-[#8B8780] mb-4">
          100% = average of selected data. Range: 0–300%. Updates live.
        </p>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#57544E]">Spend cut-off</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-[#1A1814]">{inr(spendThreshold)}</span>
                <span className="text-xs text-[#8B8780] ml-1">({spendPct}%)</span>
              </div>
            </div>
            <Slider value={[spendPct]} onValueChange={([v]) => onSpendPctChange(v)} min={0} max={300} step={5} className="w-full" />
            <div className="flex justify-between mt-1">
              {[0, 100, 200, 300].map(t => (
                <span key={t} className={`text-[10px] ${spendPct === t ? 'text-[#4F46E5] font-semibold' : 'text-[#8B8780]'}`}>
                  {t === 100 ? 'Avg' : `${t}%`}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#57544E]">Revenue cut-off</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-[#1A1814]">{inr(revenueThreshold)}</span>
                <span className="text-xs text-[#8B8780] ml-1">({revPct}%)</span>
              </div>
            </div>
            <Slider value={[revPct]} onValueChange={([v]) => onRevPctChange(v)} min={0} max={300} step={5} className="w-full" />
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

      {/* ── Quadrant counts ────────────────────────────────────────── */}
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
          Products classified by spend vs revenue relative to the average of selected months.
          100% = average. Adjust sliders to find the right cut-offs for your catalogue.
        </p>
      </PanelSection>
    </div>
  );
}