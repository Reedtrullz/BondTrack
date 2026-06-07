import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../[...path]/route';
import { checkRateLimit } from '@/lib/api/rate-limit';

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 59, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

const mockFetch = vi.fn();

function request(path: string, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/coingecko/${path}${query}`, {
    headers: { origin: 'http://localhost:3000' },
  });
}

function expectNoStorePrivateCorsHeaders(response: Response) {
  expect(response.headers.get('Cache-Control')).toBe('no-store, private');
  expect(response.headers.get('Pragma')).toBe('no-cache');
  expect(response.headers.get('Expires')).toBe('0');
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
}

describe('/api/coingecko proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  it('proxies the allowed market chart range with a strict query schema', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ prices: [[1, 2]] }),
    } as unknown as Response);

    const response = await GET(request('coins/thorchain/market_chart/range', '?vs_currency=usd&from=1704067200&to=1704153600'), {
      params: Promise.resolve({ path: ['coins', 'thorchain', 'market_chart', 'range'] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ prices: [[1, 2]] });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/coins/thorchain/market_chart/range?vs_currency=usd&from=1704067200&to=1704153600',
      expect.objectContaining({ cache: 'force-cache' })
    );
  });

  it('rejects unknown query parameters and disallowed paths', async () => {
    const badQuery = await GET(request('coins/thorchain/market_chart/range', '?vs_currency=usd&from=1704067200&to=1704153600&x=1'), {
      params: Promise.resolve({ path: ['coins', 'thorchain', 'market_chart', 'range'] }),
    });
    expect(badQuery.status).toBe(400);
    expectNoStorePrivateCorsHeaders(badQuery);

    const badPath = await GET(request('coins/bitcoin'), {
      params: Promise.resolve({ path: ['coins', 'bitcoin'] }),
    });
    expect(badPath.status).toBe(403);
    expectNoStorePrivateCorsHeaders(badPath);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns no-store/private headers on rate-limit responses', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const response = await GET(request('coins/thorchain/market_chart/range', '?vs_currency=usd&from=1704067200&to=1704153600'), {
      params: Promise.resolve({ path: ['coins', 'thorchain', 'market_chart', 'range'] }),
    });

    expect(response.status).toBe(429);
    expectNoStorePrivateCorsHeaders(response);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not leak upstream status details in the response body', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502 } as unknown as Response);

    const response = await GET(request('coins/thorchain/market_chart/range', '?vs_currency=usd&from=1704067200&to=1704153600'), {
      params: Promise.resolve({ path: ['coins', 'thorchain', 'market_chart', 'range'] }),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'CoinGecko request failed' });
    expectNoStorePrivateCorsHeaders(response);
    warn.mockRestore();
  });
});
