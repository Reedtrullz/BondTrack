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

const address = `thor1${'a'.repeat(38)}`;

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/tax-report', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/tax-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateTaxReportWithWarnings).mockResolvedValue({ rows: [], warnings: [] });
    vi.mocked(exportToCSV).mockReturnValue('csv-data');
  });

  it('returns CSV for a valid POST with POST-aware CORS and no-store headers', async () => {
    const response = await POST(post({ address, startDate: '2024-01-01', endDate: '2024-12-31' }));

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

  it('returns validation errors with no-store headers', async () => {
    const response = await POST(post({ address: 'not-a-thor-address', startDate: '2024-01-01', endDate: '2024-12-31' }));

    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    expect(checkRateLimit).not.toHaveBeenCalled();
  });
});
