import { describe, it, expect } from 'vitest';
import { normalizeOne, aggregateGroup, groupById, detectMonths } from './context';
import type { Product, NormProduct } from './context';

// These pure functions are the single shared aggregation path both the CSV
// upload flow and Live Sync feed into (via setMergedResult) — a regression
// here would silently corrupt totals for both data sources at once.

describe('normalizeOne', () => {
  it('maps the raw PascalCase API product shape into NormProduct', () => {
    const raw: Product = {
      'Product ID': '1001',
      'Product Title': 'Dress',
      'Variant Title': 'S',
      'Month': 'March 2026',
      'Meta Spend': 1000,
      'Google Cost': 0,
      'Total Spend': 1000,
      'Shopify Revenue': 5000,
      'Net Items Sold': 3,
      'Landing Page Views': 200,
      'Conversions': 2,
      'CTR': 2.5,
      'CPM': 50,
      'ROI': 5,
    };
    const result = normalizeOne(raw);
    expect(result).toEqual({
      id: '1001', title: 'Dress', variant: 'S', month: 'March 2026',
      metaSpend: 1000, googleCost: 0, totalSpend: 1000, revenue: 5000,
      roi: 5, itemsSold: 3, lpv: 200, conversions: 2, ctr: 2.5, cpm: 50,
    });
  });

  it('derives ROI from revenue/totalSpend rather than trusting a stale field', () => {
    const raw: any = { 'Product ID': '1', 'Meta Spend': 100, 'Shopify Revenue': 400 };
    expect(normalizeOne(raw).roi).toBe(4);
  });

  it('defaults totalSpend to metaSpend + googleCost when absent', () => {
    const raw: any = { 'Product ID': '1', 'Meta Spend': 100, 'Google Cost': 50, 'Shopify Revenue': 0 };
    expect(normalizeOne(raw).totalSpend).toBe(150);
  });

  it('returns 0 ROI when spend is 0 (no divide-by-zero)', () => {
    const raw: any = { 'Product ID': '1', 'Shopify Revenue': 500 };
    expect(normalizeOne(raw).roi).toBe(0);
  });

  it('also accepts an already-camelCase object (idempotent-ish input)', () => {
    const raw: any = { id: '1', title: 'X', metaSpend: 10, totalSpend: 10, revenue: 20 };
    const result = normalizeOne(raw);
    expect(result.id).toBe('1');
    expect(result.revenue).toBe(20);
  });
});

describe('groupById / aggregateGroup', () => {
  const row = (over: Partial<NormProduct>): NormProduct => ({
    id: '1', title: 'Dress', variant: '', month: 'March 2026',
    metaSpend: 0, googleCost: 0, totalSpend: 0, revenue: 0, roi: 0,
    itemsSold: 0, lpv: 0, conversions: 0, ctr: 0, cpm: 0,
    ...over,
  });

  it('sums spend/revenue across multiple variant rows for the same product id', () => {
    // This is exactly the shape Live Sync now produces (one row per variant,
    // same Product ID) and must collapse the same way multi-month CSV rows do.
    const rows = [
      row({ metaSpend: 500, totalSpend: 500, revenue: 1000, itemsSold: 1 }),
      row({ metaSpend: 500, totalSpend: 500, revenue: 2000, itemsSold: 2 }),
    ];
    const [grouped] = groupById(rows);
    expect(grouped.metaSpend).toBe(1000);
    expect(grouped.totalSpend).toBe(1000);
    expect(grouped.revenue).toBe(3000);
    expect(grouped.itemsSold).toBe(3);
  });

  it('computes ROI from the summed totals, not an average of per-row ROIs', () => {
    const rows = [
      row({ totalSpend: 100, revenue: 1000 }),  // 10x
      row({ totalSpend: 900, revenue: 900 }),   // 1x
    ];
    const [grouped] = groupById(rows);
    // Summed: 1000 spend, 1900 revenue -> 1.9x, NOT the average of 10x and 1x.
    expect(grouped.roi).toBeCloseTo(1.9);
  });

  it('weights CTR/CPM by lpv/spend rather than a plain average', () => {
    const rows = [
      row({ ctr: 10, lpv: 100, cpm: 50, metaSpend: 100 }),
      row({ ctr: 2, lpv: 900, cpm: 10, metaSpend: 900 }),
    ];
    const [grouped] = groupById(rows);
    // weighted ctr = (10*100 + 2*900) / 1000 = 2.8, not the naive average of 6
    expect(grouped.ctr).toBeCloseTo(2.8);
    expect(grouped.cpm).toBeCloseTo((50 * 100 + 10 * 900) / 1000);
  });

  it('keeps different product ids as separate groups', () => {
    const rows = [row({ id: '1' }), row({ id: '2' })];
    expect(groupById(rows)).toHaveLength(2);
  });

  it('clears month on the aggregated row (aggregation spans months)', () => {
    const rows = [row({ month: 'March 2026' }), row({ month: 'April 2026' })];
    const [grouped] = groupById(rows);
    expect(grouped.month).toBeUndefined();
  });
});

describe('detectMonths', () => {
  it('returns unique months in chronological order regardless of input order', () => {
    const rows = [
      { month: 'September 2026' }, { month: 'April 2026' }, { month: 'April 2026' },
    ] as NormProduct[];
    expect(detectMonths(rows)).toEqual(['April 2026', 'September 2026']);
  });

  it('ignores rows with no month (non-monthly data)', () => {
    const rows = [{ month: undefined }, { month: undefined }] as NormProduct[];
    expect(detectMonths(rows)).toEqual([]);
  });
});
