import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { getRunePriceAtDate, getRunePriceRange } from '@/lib/api/coinapi';
import { checkRateLimit } from '@/lib/api/rate-limit';

vi.mock('@/lib/api/coinapi', () => ({
  getRunePriceAtDate: vi.fn(),
  getRunePriceRange: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 79, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/coinapi/rune-price${query}`, {
    headers: { origin: 'http://localhost:3000' },
  });
}

describe('/api/coinapi/rune-price', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('COINAPI_KEY', 'test-key');
  });

  it('rejects malformed and unknown date requests before rate limiting', async () => {
    const response = await GET(request('?date=2024-02-30&extra=1'));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('Unknown query parameter') });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
  });

  it('rejects future dates before rate limiting', async () => {
    const nextYear = new Date();
    nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
    const response = await GET(request(`?date=${nextYear.toISOString().slice(0, 10)}`));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('future');
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('rejects empty mixed date/range parameters before rate limiting', async () => {
    const singleDateWithEmptyRange = await GET(request('?date=2024-01-01&timeStart='));
    expect(singleDateWithEmptyRange.status).toBe(400);
    expect((await singleDateWithEmptyRange.json()).error).toContain('Use either date or timeStart/timeEnd');

    const emptyDateWithRange = await GET(request('?date=&timeStart=2024-01-01T00:00:00Z&timeEnd=2024-01-02T00:00:00Z'));
    expect(emptyDateWithRange.status).toBe(400);
    expect((await emptyDateWithRange.json()).error).toContain('Use either date or timeStart/timeEnd');

    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(getRunePriceAtDate).not.toHaveBeenCalled();
    expect(getRunePriceRange).not.toHaveBeenCalled();
  });

  it('rejects empty provided parameters before rate limiting', async () => {
    const emptyDate = await GET(request('?date='));
    expect(emptyDate.status).toBe(400);
    expect((await emptyDate.json()).error).toContain('date is required');

    const emptyRangeStart = await GET(request('?timeStart=&timeEnd=2024-01-02T00:00:00Z'));
    expect(emptyRangeStart.status).toBe(400);
    expect((await emptyRangeStart.json()).error).toContain('timeStart is required');

    const emptyRangeEnd = await GET(request('?timeStart=2024-01-01T00:00:00Z&timeEnd='));
    expect(emptyRangeEnd.status).toBe(400);
    expect((await emptyRangeEnd.json()).error).toContain('timeEnd is required');

    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(getRunePriceAtDate).not.toHaveBeenCalled();
    expect(getRunePriceRange).not.toHaveBeenCalled();
  });

  it('rejects range requests longer than the cap before rate limiting', async () => {
    const response = await GET(request('?timeStart=2022-01-01&timeEnd=2023-02-01'));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('370 days');
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('serves a valid single-date request with rate-limit headers', async () => {
    vi.mocked(getRunePriceAtDate).mockResolvedValue(6.25);

    const response = await GET(request('?date=2024-01-10'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ price: 6.25, date: '2024-01-10' });
    expect(checkRateLimit).toHaveBeenCalledTimes(1);
    expect(getRunePriceAtDate).toHaveBeenCalledWith(new Date('2024-01-10T00:00:00.000Z'));
    expect(response.headers.get('X-RateLimit-Limit')).toBe('80');
  });

  it('serves a valid bounded range request', async () => {
    vi.mocked(getRunePriceRange).mockResolvedValue([
      { time_period_start: '2024-01-01T00:00:00.000Z', time_period_end: '2024-01-02T00:00:00.000Z', rate_open: 1, rate_high: 2, rate_low: 1, rate_close: 2 },
    ]);

    const response = await GET(request('?timeStart=2024-01-01T00:00:00Z&timeEnd=2024-01-02T00:00:00Z'));

    expect(response.status).toBe(200);
    expect((await response.json()).intervals).toHaveLength(1);
    expect(getRunePriceRange).toHaveBeenCalledWith('2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z');
  });
});
