// ── Display currency ────────────────────────────────────────────────────────
// Purely cosmetic: swaps the symbol/grouping shown next to money values.
// Underlying numbers are never converted — see lib/context.tsx for the
// persisted selection and components/layout/top-bar.tsx for the picker UI.
export type CurrencyCode = "INR" | "USD" | "CAD" | "EUR" | "GBP" | "AUD";

export interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹",   label: "Indian Rupee",     locale: "en-IN" },
  { code: "USD", symbol: "$",   label: "US Dollar",        locale: "en-US" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar",  locale: "en-CA" },
  { code: "EUR", symbol: "€",   label: "Euro",             locale: "en-IE" },
  { code: "GBP", symbol: "£",   label: "British Pound",    locale: "en-GB" },
  { code: "AUD", symbol: "A$",  label: "Australian Dollar", locale: "en-AU" },
];

let activeCurrency: CurrencyOption = CURRENCIES[0];

export function setActiveCurrency(code: CurrencyCode): void {
  activeCurrency = CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];
}

export function getActiveCurrency(): CurrencyOption {
  return activeCurrency;
}

export function currencySymbol(): string {
  return activeCurrency.symbol;
}

export function inr(n: number | null | undefined, compact = false): string {
  if (n == null || isNaN(n)) return "—";
  const { symbol, locale, code } = activeCurrency;

  // Rounding straight to whole units makes any genuine amount under ~0.5
  // display as a misleading "0" — this shows up constantly on per-product
  // averages/values once a catalog is large enough that spend or revenue
  // per item drops below one currency unit. Keep cents for small amounts;
  // large totals still render as clean whole units.
  const abs = Math.abs(n);
  const decimals = abs > 0 && abs < 10 ? 2 : 0;
  const v = decimals ? n : Math.round(n);

  if (compact) {
    const absV = Math.abs(v);
    if (code === "INR") {
      if (absV >= 1_00_00_000) return `${symbol}${(v / 1_00_00_000).toFixed(1).replace(/\.0$/, "")}Cr`;
      if (absV >= 1_00_000)    return `${symbol}${(v / 1_00_000).toFixed(1).replace(/\.0$/, "")}L`;
      if (absV >= 1_000)       return `${symbol}${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
      return `${symbol}${v.toFixed(decimals)}`;
    }
    if (absV >= 1_000_000_000) return `${symbol}${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
    if (absV >= 1_000_000)     return `${symbol}${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (absV >= 1_000)         return `${symbol}${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${symbol}${v.toFixed(decimals)}`;
  }

  return symbol + v.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function roi(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  return n.toFixed(1) + "x";
}

export function pct(n: number | null | undefined, digits = 2): string {
  if (n == null) return "—";
  return (n * 100).toFixed(digits) + "%";
}

export function num(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("en-IN");
}

export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// Returns a CSS class string for coloring ROI values
export function roiColor(r: number): string {
  if (r >= 8) return "text-emerald-600 font-semibold";
  if (r < 3)  return "text-red-600 font-semibold";
  return "text-gray-800";
}

// Returns a formatted ROI string (use this in PanelRow values)
export function roiFormatted(r: number): string {
  return roi(r);
}

export function getQuadrantColor(quadrant: string) {
  switch (quadrant?.toLowerCase()) {
    case "champions":  return { bg: "bg-green-100", text: "text-green-700",  border: "border-green-300"  };
    case "contenders": return { bg: "bg-blue-100",  text: "text-blue-700",  border: "border-blue-300"   };
    case "cruisers":   return { bg: "bg-gray-100",  text: "text-gray-700",  border: "border-gray-300"   };
    case "casualties": return { bg: "bg-red-100",   text: "text-red-700",  border: "border-red-300"    };
    default:           return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300"  };
  }
}