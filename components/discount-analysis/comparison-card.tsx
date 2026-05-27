'use client';

import { discountedStats, nonDiscountedStats } from '@/lib/data';
import { inr, roi } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface MetricRowProps {
  label: string;
  discountedValue: string | number;
  nonDiscountedValue: string | number;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
}

function MetricRow({ label, discountedValue, nonDiscountedValue, format, higherIsBetter = true }: MetricRowProps) {
  const dVal = typeof discountedValue === 'number' ? discountedValue : parseFloat(String(discountedValue));
  const ndVal = typeof nonDiscountedValue === 'number' ? nonDiscountedValue : parseFloat(String(nonDiscountedValue));
  
  const discWins = higherIsBetter ? dVal > ndVal : dVal < ndVal;
  const nonDiscWins = higherIsBetter ? ndVal > dVal : ndVal < dVal;
  
  const formatValue = (v: number) => format ? format(v) : String(v);
  
  // Calculate percentage for mini bar
  const maxVal = Math.max(dVal, ndVal);
  const discPercent = (dVal / maxVal) * 100;
  const ndPercent = (ndVal / maxVal) * 100;

  return (
    <div className="grid grid-cols-[1fr_80px_1fr] gap-4 items-center py-3 border-b border-[#EEECE5] last:border-0">
      {/* Discounted Side */}
      <div className="text-right">
        <div className={cn(
          "text-lg font-semibold tabular-nums",
          discWins ? "text-[#B45309]" : "text-[#1A1814]"
        )}>
          {formatValue(dVal)}
        </div>
        <div className="text-xs text-[#8B8780] uppercase tracking-wider mt-1">{label}</div>
        <div className="mt-2 h-1.5 bg-[#F2F0EA] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#F59E0B] rounded-full transition-all"
            style={{ width: `${discPercent}%`, marginLeft: 'auto' }}
          />
        </div>
      </div>

      {/* Delta Badge */}
      <div className="flex items-center justify-center">
        <div className={cn(
          "px-2 py-1 rounded text-xs font-medium",
          nonDiscWins ? "bg-[#EEEDFB] text-[#4F46E5]" : discWins ? "bg-[#FEF3CD] text-[#B45309]" : "bg-[#F2F0EA] text-[#8B8780]"
        )}>
          {nonDiscWins ? 'ND wins' : discWins ? 'D wins' : 'Tie'}
        </div>
      </div>

      {/* Non-Discounted Side */}
      <div>
        <div className={cn(
          "text-lg font-semibold tabular-nums",
          nonDiscWins ? "text-[#4F46E5]" : "text-[#1A1814]"
        )}>
          {formatValue(ndVal)}
        </div>
        <div className="text-xs text-[#8B8780] uppercase tracking-wider mt-1">{label}</div>
        <div className="mt-2 h-1.5 bg-[#F2F0EA] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#4F46E5] rounded-full transition-all"
            style={{ width: `${ndPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ComparisonCard() {
  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_1fr] gap-4 px-6 py-4 bg-[#F2F0EA]">
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <div className="w-2 h-2 bg-[#F59E0B] rounded-full" />
            <span className="font-medium text-[#1A1814]">Discounted</span>
          </div>
          <div className="text-sm text-[#8B8780]">{discountedStats.count} products</div>
        </div>
        <div />
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#4F46E5] rounded-full" />
            <span className="font-medium text-[#1A1814]">Non-discounted</span>
          </div>
          <div className="text-sm text-[#8B8780]">{nonDiscountedStats.count} products</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-6 py-2">
        <MetricRow 
          label="Products"
          discountedValue={discountedStats.count}
          nonDiscountedValue={nonDiscountedStats.count}
        />
        <MetricRow 
          label="Spend"
          discountedValue={discountedStats.spend}
          nonDiscountedValue={nonDiscountedStats.spend}
          format={inr}
          higherIsBetter={false}
        />
        <MetricRow 
          label="Revenue"
          discountedValue={discountedStats.revenue}
          nonDiscountedValue={nonDiscountedStats.revenue}
          format={inr}
        />
        <MetricRow 
          label="ROI"
          discountedValue={discountedStats.roi}
          nonDiscountedValue={nonDiscountedStats.roi}
          format={roi}
        />
        <MetricRow 
          label="Items Sold"
          discountedValue={discountedStats.items}
          nonDiscountedValue={nonDiscountedStats.items}
        />
        <MetricRow 
          label="Avg. CTR"
          discountedValue={discountedStats.avgCtr}
          nonDiscountedValue={nonDiscountedStats.avgCtr}
          format={(v) => v.toFixed(1) + '%'}
        />
        <MetricRow 
          label="Avg. CPM"
          discountedValue={discountedStats.avgCpm}
          nonDiscountedValue={nonDiscountedStats.avgCpm}
          format={(v) => '₹' + Math.round(v)}
          higherIsBetter={false}
        />
      </div>
    </div>
  );
}
