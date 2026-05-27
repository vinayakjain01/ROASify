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