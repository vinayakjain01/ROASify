'use client';

import { runMetadata, totalProducts, totalMetaSpend, totalGoogleCost, totalSpend, totalRevenue, overallRoi } from '@/lib/data';
import { formatCurrency, formatRoi } from '@/lib/formatters';
import { PanelSection, PanelRow, SourceItem } from '@/components/layout/right-panel';

export function ProductAnalysisPanel() {
  const avgSpend = totalSpend / totalProducts;
  const avgRevenue = totalRevenue / totalProducts;

  return (
    <div className="p-5 space-y-6">
      <PanelSection title="Run details">
        <div className="space-y-2">
          <PanelRow label="Run ID" value={runMetadata.runId} mono />
          <PanelRow label="Period" value={runMetadata.period} />
        </div>
        <div className="mt-4">
          <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-2">
            Sources merged
          </div>
          {runMetadata.sources.map((source) => (
            <SourceItem key={source.name} name={source.name} rows={source.rows} />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Averages per product">
        <div className="space-y-2">
          <PanelRow label="Spend" value={formatCurrency(avgSpend)} />
          <PanelRow label="Revenue" value={formatCurrency(avgRevenue)} />
          <PanelRow label="ROI" value={formatRoi(overallRoi)} />
          <PanelRow label="Items" value="418" />
        </div>
      </PanelSection>

      <PanelSection title="Methodology">
        <p className="text-sm text-[#57544E] leading-relaxed">
          Product-level spend is calculated by matching Meta Ads campaigns and Google Ads 
          campaigns to Shopify line items via product titles and SKUs. Revenue represents 
          confirmed orders only (excludes cancellations and returns). ROI = Revenue ÷ Spend.
        </p>
      </PanelSection>
    </div>
  );
}
