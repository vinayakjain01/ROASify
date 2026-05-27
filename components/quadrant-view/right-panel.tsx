'use client';

import { getQuadrantData, runMetadata } from '@/lib/data';
import { formatCurrency, formatRoi, getQuadrantColor } from '@/lib/formatters';
import { PanelSection, PanelRow } from '@/components/layout/right-panel';
import { Slider } from '@/components/ui/slider';

interface QuadrantPanelProps {
  spendThreshold: number;
  revenueThreshold: number;
  onSpendChange: (value: number) => void;
  onRevenueChange: (value: number) => void;
  onReset: () => void;
}

export function QuadrantPanel({ 
  spendThreshold, 
  revenueThreshold, 
  onSpendChange, 
  onRevenueChange,
  onReset 
}: QuadrantPanelProps) {
  const quadrants = ['champions', 'contenders', 'cruisers', 'casualties'] as const;

  return (
    <div className="p-5 space-y-6">
      <PanelSection title="Thresholds">
        <p className="text-xs text-[#8B8780] mb-4">
          Slide to change quadrant cut-offs. Updates live.
        </p>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#57544E]">Spend cut-off (X)</span>
              <span className="text-sm font-medium text-[#1A1814] tabular-nums">
                {formatCurrency(spendThreshold)}
              </span>
            </div>
            <Slider
              value={[spendThreshold]}
              onValueChange={([v]) => onSpendChange(v)}
              min={10000}
              max={200000}
              step={1000}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#57544E]">Revenue cut-off (Y)</span>
              <span className="text-sm font-medium text-[#1A1814] tabular-nums">
                {formatCurrency(revenueThreshold)}
              </span>
            </div>
            <Slider
              value={[revenueThreshold]}
              onValueChange={([v]) => onRevenueChange(v)}
              min={100000}
              max={2000000}
              step={10000}
              className="w-full"
            />
          </div>

          <button 
            onClick={onReset}
            className="text-sm text-[#4F46E5] hover:text-[#4338CA]"
          >
            Reset to median
          </button>
        </div>
      </PanelSection>

      <PanelSection title="Quadrant counts">
        <div className="space-y-2">
          {quadrants.map((q) => {
            const data = getQuadrantData(q);
            const colors = getQuadrantColor(q);
            return (
              <div key={q} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span className="text-sm text-[#1A1814] capitalize">{q}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[#1A1814] tabular-nums">{data.count}</span>
                  <span className={`text-sm tabular-nums ${colors.text}`}>{formatRoi(data.roi)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="Period">
        <p className="text-sm text-[#1A1814]">{runMetadata.period}</p>
        <p className="text-xs text-[#8B8780] mt-1">1 month in data</p>
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
