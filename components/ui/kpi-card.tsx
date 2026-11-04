'use client';

import { inr, roi, pct } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  format?: 'currency' | 'number' | 'roi' | 'percentage' | 'raw';
  showSparkline?: boolean;
  className?: string;
  // true (default): value text scales with the card's own width and the
  // value's length (Product Analysis's 6-card strip, which gets genuinely
  // cramped when the right panel is open). false: a fixed size regardless
  // of panel state — for strips like Quadrant View's 4 cards, which never
  // need the room and should always look the same.
  fluid?: boolean;
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
  className,
  fluid = true,
}: KpiCardProps) {
  const formattedValue = (() => {
    if (typeof value === 'string') return value;
    switch (format) {
      case 'currency': return inr(value);
      case 'roi': return roi(value);
      case 'percentage': return pct(value);
      case 'number': return value.toLocaleString('en-IN');
      default: return String(value);
    }
  })();

  const trend = delta ? (delta > 0 ? 'up' : 'down') : 'flat';

  // Drives the value text's font-size (see the clamp() below): a longer
  // formatted string gets a proportionally smaller "weight" divisor, so a
  // short value (e.g. "2,775") is free to render near the 20px cap while a
  // long one (e.g. "₹2,15,74,242") scales itself down to still fit — on top
  // of the clamp's own dependence on @container width, which is what keeps
  // either case from overflowing when the right panel narrows the card.
  const kpiCharWeight = Math.max(formattedValue.length, 1) * 0.6;

  return (
    // `@container` makes the value text size respond to THIS card's own
    // rendered width — not the viewport's — so it shrinks automatically
    // whenever the right panel takes space from it (and grows back when the
    // panel closes), instead of relying on a viewport breakpoint that can't
    // tell the two layouts apart.
    <div
  className={cn(
          "bg-white rounded-[10px] border border-[#EEECE5] shadow-sm",
          "@container p-4 min-w-0 overflow-hidden",
          className
        )}
      >
      <div className="text-[10px] font-medium text-[#8B8780] uppercase tracking-wide mb-0.5 truncate">
        {label}
      </div>
      <div className="min-w-0 flex-1">
        <div>
          <div
            className={cn(
              "font-semibold text-[#1A1814] tabular-nums leading-tight",
              fluid
                ? "text-[clamp(12px,calc((100cqw_-_32px)/var(--kpi-w)),20px)]"
                : "text-[20px]",
              "truncate whitespace-nowrap overflow-hidden"
            )}
            style={fluid ? { ['--kpi-w' as any]: kpiCharWeight } : undefined}
          >
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
        {showSparkline && (
        <div className="hidden @[200px]:block flex-shrink-0">
          <Sparkline trend={trend} />
        </div>
      )}
      </div>
    </div>
  );
}

interface KpiStripProps {
  cards: KpiCardProps[];
  className?: string;
  fluid?: boolean;
}

export function KpiStrip({ cards, className, fluid = true }: KpiStripProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-6",
        className
      )}
    >
      {cards.map((card, index) => (
        <KpiCard key={index} fluid={fluid} {...card} />
      ))}
    </div>
  );
}