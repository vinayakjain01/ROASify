'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CalendarDays, AlertTriangle, CheckCircle2, Upload, X } from 'lucide-react';
import { useApp } from '@/lib/context';
import { fetchBrands, fetchLiveStatus, analyseLive, type Brand } from '@/lib/api';
import { cn } from '@/lib/utils';

// Data only exists from April 2026 onward — floor the picker there until a
// brand's own /status range says otherwise.
const DATA_FLOOR = '2026-04-01';

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromISODate(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export function LiveSyncPanel() {
  const {
    selectedBrand, setSelectedBrand,
    dateRange, setDateRange,
    syncStatus, setSyncStatus,
    setMergedResult, setMetaSpendNote,
  } = useApp();

  const [brands, setBrands]             = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError]   = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError]     = useState<string | null>(null);

  const [discountFile, setDiscountFile] = useState<File | null>(null);

  const [syncing, setSyncing]     = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // ── Load brands once ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setBrandsLoading(true);
    fetchBrands()
      .then(list => {
        if (cancelled) return;
        setBrands(list);
        setBrandsError(null);
        // Fall back to the first brand if nothing is selected yet, or if a
        // brand persisted from localStorage (e.g. from before a brand was
        // renamed/removed, or an API migration) no longer exists in the
        // live list — otherwise we'd keep calling the API with a brandId
        // it will just reject.
        const stillValid = !!selectedBrand && list.some(b => b.brandId === selectedBrand);
        if (!stillValid && list.length > 0) setSelectedBrand(list[0].brandId);
      })
      .catch(err => { if (!cancelled) setBrandsError(err?.message ?? 'Failed to load brands.'); })
      .finally(() => { if (!cancelled) setBrandsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load sync status + default the date range whenever brand changes ──
  useEffect(() => {
    if (!selectedBrand) return;
    let cancelled = false;
    setStatusLoading(true);
    setStatusError(null);
    fetchLiveStatus(selectedBrand)
      .then(status => {
        if (cancelled) return;
        setSyncStatus(status);
        if (!dateRange.from && !dateRange.to) {
          const oldest = fromISODate(status?.meta?.oldestDay) ?? fromISODate(DATA_FLOOR);
          const newest = fromISODate(status?.meta?.newestDay) ?? new Date();
          setDateRange({ from: oldest, to: newest });
        }
      })
      .catch(err => { if (!cancelled) setStatusError(err?.message ?? 'Failed to load sync status.'); })
      .finally(() => { if (!cancelled) setStatusLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand]);

  const selectedBrandName = brands.find(b => b.brandId === selectedBrand)?.name ?? selectedBrand ?? '';

  const handleSync = useCallback(async () => {
    if (!selectedBrand || !dateRange.from || !dateRange.to) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await analyseLive(
        selectedBrand,
        toISODate(dateRange.from),
        toISODate(dateRange.to),
        discountFile
      );
      const products: any[] = result.products ?? [];
      const summary          = result.summary  ?? {};
      const warns: string[]  = result.warnings ?? [];

      const calcTotalSpend = products.reduce((s, p) => s + Number(p['Total Spend']     ?? 0), 0);
      const calcTotalRev   = products.reduce((s, p) => s + Number(p['Shopify Revenue'] ?? 0), 0);
      const calcMetaSpend  = products.reduce((s, p) => s + Number(p['Meta Spend']      ?? 0), 0);

      setMergedResult(products, {
        products:    summary.products    ?? products.length,
        total_spend: summary.total_spend || calcTotalSpend,
        total_rev:   summary.total_rev   || calcTotalRev,
        roi:         summary.roi         || (calcTotalSpend > 0 ? calcTotalRev / calcTotalSpend : 0),
        meta_spend:  summary.meta_spend  || calcMetaSpend,
        google_cost: 0,
        lpv:         0,
      }, result.hasMonth ?? false, false, warns);

      setMetaSpendNote(result.metaSpendNote ?? null);
    } catch {
      // Never surface the raw error (which may embed backend detail meant for
      // logs) — always show the plain, actionable message.
      setSyncError('Live data unavailable — try again or use file upload.');
    } finally {
      setSyncing(false);
    }
  }, [selectedBrand, dateRange, discountFile, setMergedResult, setMetaSpendNote]);

  const metaStatus    = syncStatus?.meta;
  const shopifyStatus = syncStatus?.shopify;
  const hasNoData = !!syncStatus &&
    !(metaStatus?.connected && metaStatus?.productRows > 0) &&
    !(shopifyStatus?.connected && shopifyStatus?.orderItems > 0);

  const calendarSelected: DateRange | undefined = dateRange.from || dateRange.to
    ? { from: dateRange.from, to: dateRange.to }
    : undefined;

  return (
    <div className="bg-white rounded-xl border border-[#EEECE5] p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Brand switcher */}
        <div>
          <label className="text-xs font-medium text-[#57544E] mb-1.5 block">Brand</label>
          <Select
            value={selectedBrand ?? undefined}
            onValueChange={(v) => { setSelectedBrand(v); setDateRange({}); }}
            disabled={brandsLoading || brands.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={brandsLoading ? 'Loading brands…' : 'Select a brand'} />
            </SelectTrigger>
            <SelectContent>
              {brands.map(b => (
                <SelectItem key={b.brandId} value={b.brandId}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {brandsError && <p className="text-xs text-red-600 mt-1">{brandsError}</p>}
        </div>

        {/* Date range picker */}
        <div>
          <label className="text-xs font-medium text-[#57544E] mb-1.5 block">Date range</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                <CalendarDays className="w-4 h-4 mr-2 text-[#8B8780]" />
                {dateRange.from && dateRange.to
                  ? `${toISODate(dateRange.from)} → ${toISODate(dateRange.to)}`
                  : 'Select range'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={calendarSelected}
                onSelect={(r) => setDateRange(r ?? {})}
                defaultMonth={dateRange.from}
                disabled={{ before: fromISODate(DATA_FLOOR)!, after: new Date() }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Optional discount product list */}
        <div>
          <label className="text-xs font-medium text-[#57544E] mb-1.5 block">Discount product list (optional)</label>
          <label className="flex items-center gap-2 border border-dashed border-[#DEDBD2] rounded-lg px-3 py-2 text-sm text-[#57544E] cursor-pointer hover:border-[#4F46E5] hover:bg-[#FAFAFF] transition-colors h-9">
            <Upload className="w-4 h-4 text-[#8B8780] flex-shrink-0" />
            <span className="truncate flex-1">{discountFile ? discountFile.name : 'Upload CSV/Excel'}</span>
            {discountFile && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setDiscountFile(null); }}
                className="text-[#8B8780] hover:text-[#1A1814] flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => setDiscountFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {/* Sync status indicator */}
      <div className="bg-[#FAFAF8] rounded-lg px-4 py-3 text-sm">
        {statusLoading ? (
          <span className="flex items-center gap-2 text-[#57544E]"><Spinner className="w-3.5 h-3.5" /> Checking sync status…</span>
        ) : statusError ? (
          <span className="text-red-600">{statusError}</span>
        ) : hasNoData ? (
          <span className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            No data yet for {selectedBrandName || 'this brand'}.
          </span>
        ) : syncStatus ? (
          <span className="flex items-center gap-2 text-[#57544E] flex-wrap">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
            Meta: <span className="font-medium text-[#1A1814]">{metaStatus?.productRows ?? 0} rows</span>
            <span className="text-[#DEDBD2]">·</span>
            Shopify: <span className="font-medium text-[#1A1814]">{shopifyStatus?.orderItems ?? 0} order items</span>
            {metaStatus?.lastSyncedAt && (
              <>
                <span className="text-[#DEDBD2]">·</span>
                last synced {new Date(metaStatus.lastSyncedAt).toLocaleString()}
              </>
            )}
          </span>
        ) : (
          <span className="text-[#8B8780]">Select a brand to check sync status.</span>
        )}
      </div>

      {syncError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
          {syncError}
        </div>
      )}

      <Button
        onClick={handleSync}
        disabled={syncing || !selectedBrand || !dateRange.from || !dateRange.to}
        className={cn(
          'bg-[#4F46E5] hover:bg-[#4338CA] min-w-[160px]',
          (syncing || !selectedBrand || !dateRange.from || !dateRange.to) && 'opacity-60 cursor-not-allowed'
        )}
      >
        {syncing ? <><Spinner className="w-4 h-4 mr-2" />Syncing…</> : '⟳  Sync Live Data'}
      </Button>
    </div>
  );
}
