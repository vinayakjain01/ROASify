export function inr(n: number | null | undefined, compact = false): string {
  if (n == null || isNaN(n)) return "—";
  const v = Math.round(n);
  if (compact) {
    const abs = Math.abs(v);
    if (abs >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1).replace(/\.0$/, "")}Cr`;
    if (abs >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1).replace(/\.0$/, "")}L`;
    if (abs >= 1_000)       return `₹${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `₹${v}`;
  }
  return "₹" + v.toLocaleString("en-IN");
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

export function roiColor(r: number): string {
  if (r >= 8)  return "text-emerald-600 font-semibold";
  if (r < 3)   return "text-red-600 font-semibold";
  return "text-gray-800";
}