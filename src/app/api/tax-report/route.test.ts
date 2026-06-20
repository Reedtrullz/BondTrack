import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { OPTIONS, POST } from './route';
import { exportToCSV, generateTaxReportWithWarnings, parseTaxDateRange } from '@/lib/utils/tax-export';
import { checkRateLimit } from '@/lib/api/rate-limit';

vi.mock('@/lib/utils/tax-export', () => ({
  generateTaxReportWithWarnings: vi.fn(),
  exportToCSV: vi.fn(),
  parseTaxDateRange: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

const address = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';
const testnetAddress = 'tthor1qyqszqgpqyqszqgpqyqszqgpqyqszqgpsrf4px';
const invalidChecksumAddress = 'thor1qyqszqgpqyqszqgpqyqszqgpqyqszqgp55c9cx';

function post(body: unknown): NextRequest {
  return rawPost(JSON.stringify(body));
}

function rawPost(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/tax-report', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers },
    body,
  });
}

describe('/api/tax-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateTaxReportWithWarnings).mockResolvedValue({ rows: [], warnings: [] });
    vi.mocked(exportToCSV).mockReturnValue('csv-data');
  });

  it('returns CSV for a valid POST with POST-aware CORS and no-store headers', async () => {
    const response = await POST(post({ address: address.toUpperCase(), startDate: '2024-01-01', endDate: '2024-12-31' }));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('csv-data');
    expect(parseTaxDateRange).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
    expect(generateTaxReportWithWarnings).toHaveBeenCalledWith(address, '2024-01-01', '2024-12-31');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    expect(response.headers.get('X-Heimdall-Tax-Warnings')).toBe('[]');
    expect(response.headers.get('Content-Disposition')).toBe(
      `attachment; filename="tax-worksheet-${address.slice(0, 8)}-2024-01-01-to-2024-12-31.csv"`
    );
    expect(response.headers.get('Content-Disposition')).not.toContain('tax-report');
  });

  it('surfaces incomplete-history warnings in response headers without changing CSV content', async () => {
    vi.mocked(generateTaxReportWithWarnings).mockResolvedValue({
      rows: [],
      warnings: [{ code: 'incomplete_action_history', message: 'Older history may be incomplete.' }],
    });

    const response = await POST(post({ address, startDate: '2024-01-01', endDate: '2024-12-31' }));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('csv-data');
    expect(response.headers.get('X-Heimdall-Tax-Warnings')).toContain('incomplete_action_history');
  });

  it('preflights POST with route-aware CORS methods', async () => {
    const response = await OPTIONS(new NextRequest('http://localhost/api/tax-report', { method: 'OPTIONS', headers: { origin: 'http://localhost:3000' } }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
  });

  it('rate limits before parsing the JSON body', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });

    const response = await POST(rawPost('{not-json'));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'Rate limit exceeded' });
    expect(parseTaxDateRange).not.toHaveBeenCalled();
    expect(generateTaxReportWithWarnings).not.toHaveBeenCalled();
  });

  it('requires an application/json content type after rate limiting', async () => {
    const response = await POST(rawPost('address=thor1', { 'content-type': 'application/x-www-form-urlencoded' }));

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({ error: 'Content-Type must be application/json' });
    expect(checkRateLimit).toHaveBeenCalled();
    expect(parseTaxDateRange).not.toHaveBeenCalled();
    expect(generateTaxReportWithWarnings).not.toHaveBeenCalled();
  });

  it('rejects oversized request bodies before JSON parsing', async () => {
    const response = await POST(rawPost('{}', { 'content-length': '2049' }));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'Tax report request body is too large' });
    expect(checkRateLimit).toHaveBeenCalled();
    expect(parseTaxDateRange).not.toHaveBeenCalled();
    expect(generateTaxReportWithWarnings).not.toHaveBeenCalled();
  });

  it('returns a 400 for malformed JSON bodies', async () => {
    const response = await POST(rawPost('{not-json'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Malformed JSON body' });
    expect(checkRateLimit).toHaveBeenCalled();
    expect(parseTaxDateRange).not.toHaveBeenCalled();
    expect(generateTaxReportWithWarnings).not.toHaveBeenCalled();
  });

  it('surfaces known date validation failures without generating a report', async () => {
    vi.mocked(parseTaxDateRange).mockImplementationOnce(() => {
      throw new Error('Tax worksheet range cannot exceed 366 days');
    });

    const response = await POST(post({ address, startDate: '2023-01-01', endDate: '2024-12-31' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Tax worksheet range cannot exceed 366 days' });
    expect(checkRateLimit).toHaveBeenCalled();
    expect(generateTaxReportWithWarnings).not.toHaveBeenCalled();
  });

  it('rejects regex-shaped addresses with invalid checksums after rate limiting', async () => {
    const response = await POST(post({ address: invalidChecksumAddress, startDate: '2024-01-01', endDate: '2024-12-31' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A valid THORChain mainnet address is required' });
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    expect(checkRateLimit).toHaveBeenCalled();
    expect(generateTaxReportWithWarnings).not.toHaveBeenCalled();
  });

  it('rejects testnet THORChain addresses for mainnet tax reports', async () => {
    const response = await POST(post({ address: testnetAddress, startDate: '2024-01-01', endDate: '2024-12-31' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A valid THORChain mainnet address is required' });
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    expect(checkRateLimit).toHaveBeenCalled();
    expect(generateTaxReportWithWarnings).not.toHaveBeenCalled();
  });
});
