'use client';

import { useApp } from '@/lib/context';
import type { Product } from '@/lib/context';
import { inr, roi } from '@/lib/formatters';
import { PanelSection, PanelRow, SourceItem } from '@/components/layout/right-panel';

function n(v: any): number { return Number(v ?? 0); }
function getSpend(p: Product): number    { return n(p['Total Spend']     ?? (p as any).totalSpend); }
function getRevenue(p: Product): number  { return n(p['Shopify Revenue'] ?? (p as any).revenue);    }
function getMeta(p: Product): number     { return n(p['Meta Spend']      ?? (p as any).metaSpend);  }
function getGoogle(p: Product): number   { return n(p['Google Cost']     ?? (p as any).googleCost); }
function getItems(p: Product): number    { return n(p['Net Items Sold']  ?? (p as any).itemsSold);  }

export function ProductAnalysisPanel() {
  const { metaFile, shopifyFile, googleFile, mergedData, mergedSummary } = useApp();

  const products = mergedData ?? [];
  const count    = products.length;

  // Always compute from raw products — never trust summary zeros
  const totalSpend   = count > 0 ? products.reduce((s, p) => s + getSpend(p),   0) : (mergedSummary?.total_spend ?? 0);
  const totalRevenue = count > 0 ? products.reduce((s, p) => s + getRevenue(p), 0) : (mergedSummary?.total_rev   ?? 0);
  const totalMeta    = count > 0 ? products.reduce((s, p) => s + getMeta(p),    0) : (mergedSummary?.meta_spend  ?? 0);
  const totalGoogle  = count > 0 ? products.reduce((s, p) => s + getGoogle(p),  0) : (mergedSummary?.google_cost ?? 0);
  const totalItems   = count > 0 ? products.reduce((s, p) => s + getItems(p),   0) : 0;

  const overallRoi   = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const avgSpend   = count > 0 ? totalSpend   / count : 0;
  const avgRevenue = count > 0 ? totalRevenue / count : 0;
  const avgMeta    = count > 0 ? totalMeta    / count : 0;
  const avgGoogle  = count > 0 ? totalGoogle  / count : 0;
  const avgItems   = count > 0 ? Math.round(totalItems / count) : 0;

  const runId = mergedData
    ? (() => { const n = new Date(); return `pa_${n.getFullYear()}_${String(n.getMonth()+1).padStart(2,'0')}_${String(n.getDate()).padStart(2,'0')}`; })()
    : '—';

  const files = [
    { key: 'meta',    label: 'Meta Ads',   stored: metaFile   },
    { key: 'shopify', label: 'Shopify',    stored: shopifyFile },
    { key: 'google',  label: 'Google Ads', stored: googleFile  },
  ];

  return (
    <div className="p-5 space-y-5">
      <PanelSection title="Run details">
        <div className="space-y-1">
          <PanelRow label="Run ID"   value={runId} mono />
          <PanelRow label="Products" value={String(count)} />
          <PanelRow label="Sources"  value={`${files.filter(f => f.stored).length} files`} />
        </div>
        <div className="mt-4">
          <div className="text-[10px] font-semibold text-[#8B8780] uppercase tracking-widest mb-2">
            Sources merged
          </div>
          {files.map(({ key, label, stored }) => (
            <SourceItem
              key={key}
              name={label}
              rows={stored ? Math.round(stored.size / 40) : 0}
              connected={!!stored}
            />
          ))}
        </div>
      </PanelSection>

      {count > 0 && (
        <PanelSection title="Averages per product">
          <div className="space-y-1">
            <PanelRow label="Avg Meta Spend"    value={inr(avgMeta)}    />
            <PanelRow label="Avg Google Spend"  value={inr(avgGoogle)}  />
            <PanelRow label="Avg Total Spend"   value={inr(avgSpend)}   />
            <PanelRow label="Avg Revenue"       value={inr(avgRevenue)} />
            <PanelRow label="Avg ROI"           value={roi(overallRoi)} />
            <PanelRow label="Avg Units/Product" value={avgItems.toLocaleString('en-IN')} />
          </div>
        </PanelSection>
      )}

      <PanelSection title="Methodology">
        <p className="text-sm text-[#57544E] leading-relaxed">
          ROI = Shopify Revenue ÷ (Meta Spend + Google Cost). Merge key is Product ID
          across sources. Products present in Shopify but absent from ad platforms are tagged Organic.
        </p>
      </PanelSection>
    </div>
  );
}