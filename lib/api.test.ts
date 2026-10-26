import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBrands, fetchLiveStatus, analyseLive, mergeFiles } from './api';

function mockFetchOnce(status: number, body: any, ok = status >= 200 && status < 300) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  });
}

describe('fetchBrands / fetchLiveStatus — clean error messages', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('returns the brands array on success', async () => {
    global.fetch = mockFetchOnce(200, { ok: true, brands: [{ brandId: 'b1', name: 'Brand One' }] }) as any;
    const brands = await fetchBrands();
    expect(brands).toEqual([{ brandId: 'b1', name: 'Brand One' }]);
  });

  it('extracts the clean "detail" message instead of leaking raw JSON on failure', async () => {
    global.fetch = mockFetchOnce(502, { detail: 'Live data unavailable — try again or use file upload' }) as any;
    await expect(fetchBrands()).rejects.toThrow('Live data unavailable — try again or use file upload');
  });

  it('does not throw a stringified JSON blob as the error message', async () => {
    global.fetch = mockFetchOnce(502, { detail: 'Live data unavailable — try again or use file upload' }) as any;
    try {
      await fetchBrands();
      throw new Error('expected fetchBrands to reject');
    } catch (err: any) {
      expect(err.message).not.toContain('{"detail"');
    }
  });

  it('falls back to the raw text when the error body is not JSON', async () => {
    global.fetch = mockFetchOnce(500, 'Internal Server Error (plain text)') as any;
    await expect(fetchBrands()).rejects.toThrow('Internal Server Error (plain text)');
  });

  it('fetchLiveStatus returns null when status is absent, not undefined/throw', async () => {
    global.fetch = mockFetchOnce(200, { ok: true }) as any;
    const status = await fetchLiveStatus('b1');
    expect(status).toBeNull();
  });
});

describe('analyseLive / mergeFiles — request construction', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('posts brandId/from/to as form fields and omits discount_file when not given', async () => {
    let capturedBody: FormData | undefined;
    global.fetch = vi.fn().mockImplementation((_url, init) => {
      capturedBody = init.body;
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    }) as any;

    await analyseLive('ridhi-mehra', '2026-04-01', '2026-09-24');

    expect(capturedBody).toBeInstanceOf(FormData);
    const fd = capturedBody as FormData;
    expect(fd.get('brandId')).toBe('ridhi-mehra');
    expect(fd.get('from')).toBe('2026-04-01');
    expect(fd.get('to')).toBe('2026-09-24');
    expect(fd.get('discount_file')).toBeNull();
  });

  it('includes the discount file when provided', async () => {
    let capturedBody: FormData | undefined;
    global.fetch = vi.fn().mockImplementation((_url, init) => {
      capturedBody = init.body;
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    }) as any;

    const file = new File(['Product ID\n1001'], 'discounts.csv', { type: 'text/csv' });
    await analyseLive('ridhi-mehra', '2026-04-01', '2026-09-24', file);

    const fd = capturedBody as FormData;
    expect((fd.get('discount_file') as File).name).toBe('discounts.csv');
  });

  it('mergeFiles omits the optional google_file field when not given', async () => {
    let capturedBody: FormData | undefined;
    global.fetch = vi.fn().mockImplementation((_url, init) => {
      capturedBody = init.body;
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    }) as any;

    const meta = new File(['x'], 'meta.csv');
    const shopify = new File(['x'], 'shopify.csv');
    await mergeFiles(meta, shopify);

    const fd = capturedBody as FormData;
    expect((fd.get('meta_file') as File).name).toBe('meta.csv');
    expect((fd.get('shopify_file') as File).name).toBe('shopify.csv');
    expect(fd.get('google_file')).toBeNull();
  });
});
