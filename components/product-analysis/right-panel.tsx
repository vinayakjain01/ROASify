'use client';

import { useApp } from '@/lib/context';
import { inr, roi } from '@/lib/formatters';
import { PanelSection, PanelRow, SourceItem } from '@/components/layout/right-panel';

export function ProductAnalysisPanel() {
  const {
    metaFile, shopifyFile, googleFile,
    mergedData, aggregatedProducts, allMonths, selectedMonths,
    dataSource, syncStatus,
  } = useApp();

  // Always use aggregatedProducts — it's already month-filtered and per-product
  const products = aggregatedProducts;
  const count    = products.length;

  const totalSpend   = products.reduce((s, p) => s + p.totalSpend, 0);
  const totalRevenue = products.reduce((s, p) => s + p.revenue,    0);
  const totalMeta    = products.reduce((s, p) => s + p.metaSpend,  0);
  const totalGoogle  = products.reduce((s, p) => s + p.googleCost, 0);
  const totalItems   = products.reduce((s, p) => s + p.itemsSold,  0);

  const overallRoi = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgSpend   = count > 0 ? totalSpend   / count : 0;
  const avgRevenue = count > 0 ? totalRevenue / count : 0;
  const avgMeta    = count > 0 ? totalMeta    / count : 0;
  const avgGoogle  = count > 0 ? totalGoogle  / count : 0;
  const avgItems   = count > 0 ? Math.round(totalItems / count) : 0;

  const runId = mergedData
    ? (() => {
        const n = new Date();
        return `pa_${n.getFullYear()}_${String(n.getMonth()+1).padStart(2,'0')}_${String(n.getDate()).padStart(2,'0')}`;
      })()
    : '—';

  // Live Sync never produces File objects (it fetches JSON over HTTP), so the
  // metaFile/shopifyFile/googleFile heuristic below only applies to the
  // upload flow — for Live Sync, read real row counts from the same
  // /api/live-status payload the sync panel's own status line already uses.
  const isLive = dataSource === 'live';
  const files = isLive
    ? [
        { key: 'meta',    label: 'Meta Ads',   rows: syncStatus?.meta?.productRows ?? 0,    connected: !!syncStatus?.meta?.connected },
        { key: 'shopify', label: 'Shopify',    rows: syncStatus?.shopify?.orderItems ?? 0,  connected: !!syncStatus?.shopify?.connected },
        { key: 'google',  label: 'Google Ads', rows: syncStatus?.google?.productRows ?? 0,  connected: !!syncStatus?.google?.connected },
      ]
    : [
        { key: 'meta',    label: 'Meta Ads',   rows: metaFile    ? Math.round(metaFile.size / 40)    : 0, connected: !!metaFile    },
        { key: 'shopify', label: 'Shopify',    rows: shopifyFile ? Math.round(shopifyFile.size / 40) : 0, connected: !!shopifyFile },
        { key: 'google',  label: 'Google Ads', rows: googleFile  ? Math.round(googleFile.size / 40)  : 0, connected: !!googleFile  },
      ];
  const connectedCount = files.filter(f => f.connected).length;

  const monthLabel = allMonths.length > 0
    ? (selectedMonths.size === allMonths.length
        ? `All ${allMonths.length} months`
        : `${selectedMonths.size} of ${allMonths.length} months`)
    : null;

  return (
    <div className="p-5 space-y-5">
      <PanelSection title="Run details">
        <div className="space-y-1">
          <PanelRow label="Run ID"   value={runId} mono />
          <PanelRow label="Products" value={String(count)} />
          <PanelRow label="Sources"  value={isLive ? `${connectedCount} connected` : `${connectedCount} files`} />
          {monthLabel && <PanelRow label="Months" value={monthLabel} />}
        </div>
        <div className="mt-4">
          <div className="text-[10px] font-semibold text-[#8B8780] uppercase tracking-widest mb-2">
            Sources merged
          </div>
          {files.map(({ key, label, rows, connected }) => (
            <SourceItem key={key} name={label} rows={rows} connected={connected} />
          ))}
        </div>
      </PanelSection>

      {count > 0 && (
        <PanelSection title={`Averages per product${monthLabel ? ` · ${monthLabel}` : ''}`}>
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
          ROI = Shopify Revenue ÷ Total Spend. Averages reflect selected months only.
          Multi-month data is summed per product ID before averaging.
        </p>
      </PanelSection>
    </div>
  );
}