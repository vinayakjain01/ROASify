'use client';

import { inr, roi } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Stats { count: number; spend: number; revenue: number; roi: number; items: number; avgCtr: number; avgCpm: number; }

interface MetricRowProps {
  label: string;
  discountedValue: number;
  nonDiscountedValue: number;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
}

function MetricRow({ label, discountedValue: dVal, nonDiscountedValue: ndVal, format, higherIsBetter = true }: MetricRowProps) {
  const discWins   = higherIsBetter ? dVal > ndVal : dVal < ndVal;
  const nonDiscWins = higherIsBetter ? ndVal > dVal : ndVal < dVal;
  const formatValue = (v: number) => format ? format(v) : String(v);
  const maxVal = Math.max(dVal, ndVal) || 1;

  return (
    <div className="grid grid-cols-[1fr_80px_1fr] gap-4 items-center py-3 border-b border-[#EEECE5] last:border-0">
      <div className="text-right">
        <div className={cn("text-lg font-semibold tabular-nums", discWins ? "text-[#B45309]" : "text-[#1A1814]")}>{formatValue(dVal)}</div>
        <div className="text-xs text-[#8B8780] uppercase tracking-wider mt-1">{label}</div>
        <div className="mt-2 h-1.5 bg-[#F2F0EA] rounded-full overflow-hidden">
          <div className="h-full bg-[#F59E0B] rounded-full transition-all" style={{ width: `${(dVal / maxVal) * 100}%`, marginLeft: 'auto' }} />
        </div>
      </div>
      <div className="flex items-center justify-center">
        <div className={cn("px-2 py-1 rounded text-xs font-medium",
          nonDiscWins ? "bg-[#EEEDFB] text-[#4F46E5]" : discWins ? "bg-[#FEF3CD] text-[#B45309]" : "bg-[#F2F0EA] text-[#8B8780]"
        )}>
          {nonDiscWins ? 'ND wins' : discWins ? 'D wins' : 'Tie'}
        </div>
      </div>
      <div>
        <div className={cn("text-lg font-semibold tabular-nums", nonDiscWins ? "text-[#4F46E5]" : "text-[#1A1814]")}>{formatValue(ndVal)}</div>
        <div className="text-xs text-[#8B8780] uppercase tracking-wider mt-1">{label}</div>
        <div className="mt-2 h-1.5 bg-[#F2F0EA] rounded-full overflow-hidden">
          <div className="h-full bg-[#4F46E5] rounded-full transition-all" style={{ width: `${(ndVal / maxVal) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

export function ComparisonCard({ discountedStats: d, nonDiscountedStats: nd }: { discountedStats: Stats; nonDiscountedStats: Stats }) {
  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_1fr] gap-4 px-6 py-4 bg-[#F2F0EA]">
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <div className="w-2 h-2 bg-[#F59E0B] rounded-full" />
            <span className="font-medium text-[#1A1814]">Discounted</span>
          </div>
          <div className="text-sm text-[#8B8780]">{d.count} products</div>
        </div>
        <div />
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#4F46E5] rounded-full" />
            <span className="font-medium text-[#1A1814]">Non-discounted</span>
          </div>
          <div className="text-sm text-[#8B8780]">{nd.count} products</div>
        </div>
      </div>
      <div className="px-6 py-2">
        <MetricRow label="Products"   discountedValue={d.count}   nonDiscountedValue={nd.count} />
        <MetricRow label="Spend"      discountedValue={d.spend}   nonDiscountedValue={nd.spend}   format={inr} higherIsBetter={false} />
        <MetricRow label="Revenue"    discountedValue={d.revenue} nonDiscountedValue={nd.revenue} format={inr} />
        <MetricRow label="ROI"        discountedValue={d.roi}     nonDiscountedValue={nd.roi}     format={roi} />
        <MetricRow label="Items Sold" discountedValue={d.items}   nonDiscountedValue={nd.items} />
        <MetricRow label="Avg. CTR"   discountedValue={d.avgCtr}  nonDiscountedValue={nd.avgCtr}  format={(v) => v.toFixed(1) + '%'} />
        <MetricRow label="Avg. CPM"   discountedValue={d.avgCpm}  nonDiscountedValue={nd.avgCpm}  format={inr} higherIsBetter={false} />
      </div>
    </div>
  );
}