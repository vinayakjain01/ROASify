'use client';

import { formatCurrency, formatRoi, formatPercentage } from '@/lib/format';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  format?: 'currency' | 'number' | 'roi' | 'percentage' | 'raw';
  showSparkline?: boolean;
  className?: string;
}

// Simple decorative sparkline - no actual data, just visual
function Sparkline({ trend = 'up' }: { trend?: 'up' | 'down' | 'flat' }) {
  const paths = {
    up: 'M0,18 L10,15 L20,17 L30,12 L40,14 L50,10 L60,8 L70,6 L80,4',
    down: 'M0,4 L10,6 L20,5 L30,10 L40,8 L50,12 L60,14 L70,16 L80,18',
    flat: 'M0,12 L10,11 L20,13 L30,11 L40,12 L50,11 L60,13 L70,12 L80,11'
  };

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="ml-auto">
      <polyline
        points={paths[trend]}
        fill="none"
        stroke="#4F46E5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({ 
  label, 
  value, 
  delta, 
  format = 'raw',
  showSparkline = true,
  className 
}: KpiCardProps) {
  const formattedValue = (() => {
    if (typeof value === 'string') return value;
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'roi': return formatRoi(value);
      case 'percentage': return formatPercentage(value, false);
      case 'number': return value.toLocaleString('en-IN');
      default: return String(value);
    }
  })();

  const trend = delta ? (delta > 0 ? 'up' : 'down') : 'flat';

  return (
    <div className={cn(
      "bg-white rounded-[10px] border border-[#EEECE5] p-5 shadow-sm",
      className
    )}>
      <div className="text-[11px] font-medium text-[#8B8780] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[28px] font-semibold text-[#1A1814] tabular-nums leading-tight">
            {formattedValue}
          </div>
          {delta !== undefined && (
            <div className={cn(
              "inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-xs font-medium",
              delta > 0 ? "bg-[#E7F7F0] text-[#047857]" : "bg-[#FDECEC] text-[#B42318]"
            )}>
              {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
            </div>
          )}
        </div>
        {showSparkline && <Sparkline trend={trend} />}
      </div>
    </div>
  );
}

interface KpiStripProps {
  cards: KpiCardProps[];
  className?: string;
}

export function KpiStrip({ cards, className }: KpiStripProps) {
  return (
    <div className={cn("grid gap-4", className)} style={{ gridTemplateColumns: `repeat(${cards.length}, 1fr)` }}>
      {cards.map((card, index) => (
        <KpiCard key={index} {...card} />
      ))}
    </div>
  );
}
