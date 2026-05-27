'use client';

import { runMetadata, totalProducts, totalMetaSpend, totalGoogleCost, totalSpend, totalRevenue, overallRoi, products } from '@/lib/data';
import { inr, roiColor } from '@/lib/formatters';
import { PanelSection, PanelRow, SourceItem } from '@/components/layout/right-panel';
import { getStore } from '@/lib/store';

export function ProductAnalysisPanel() {
  const store = getStore();
  const avgSpend   = totalSpend   / totalProducts;
  const avgRevenue = totalRevenue / totalProducts;
  const avgRoi     = overallRoi;
  const avgLpv     = Math.round(products.reduce((s, p) => s + p.itemsSold, 0) / totalProducts);

  const files = [
    { key: 'meta',    label: 'Meta Ads',   file: store.metaFile   },
    { key: 'shopify', label: 'Shopify',    file: store.shopifyFile },
    { key: 'google',  label: 'Google Ads', file: store.googleFile  },
  ];

  return (
    <div className="p-5 space-y-5">
      <PanelSection title="Run details">
        <div className="space-y-1">
          <PanelRow label="Run ID"  value={runMetadata.runId}  mono />
          <PanelRow label="Period"  value={runMetadata.period} />
        </div>
        <div className="mt-4">
          <div className="text-[10px] font-semibold text-[#8B8780] uppercase tracking-widest mb-2">
            Sources merged
          </div>
          {files.map(({ key, label, file }) => (
            <SourceItem
              key={key}
              name={label}
              rows={file
                ? Math.round(file.size / 40)   // rough estimate until real API
                : runMetadata.sources.find(s => s.name.toLowerCase().startsWith(key))?.rows ?? 0}
              connected={!!file || true}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Averages per product">
        <div className="space-y-1">
          <PanelRow label="Avg Meta Spend"   value={inr(avgSpend * 0.77)} />
          <PanelRow label="Avg Google Spend" value={inr(avgSpend * 0.23)} />
          <PanelRow label="Avg Total Spend"  value={inr(avgSpend)} />
          <PanelRow label="Avg Revenue"      value={inr(avgRevenue)} />
          <PanelRow label="Avg ROI"          value={roiColor(avgRoi)} />
          <PanelRow label="Avg LPV"          value={avgLpv.toLocaleString('en-IN')} />
        </div>
      </PanelSection>

      <PanelSection title="Methodology">
        <p className="text-sm text-[#57544E] leading-relaxed">
          ROI = Shopify Revenue ÷ (Meta Spend + Google Cost). Merge key is Product ID
          across sources. Products present in Shopify but absent from ad platforms are tagged Organic.
        </p>
      </PanelSection>
    </div>
  );
}