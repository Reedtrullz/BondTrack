import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '../[...path]/route';
import * as rateLimit from '@/lib/api/rate-limit';

describe('/api/midgard proxy', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createRequest(
    path: string,
    options?: { origin?: string; method?: string }
  ): NextRequest {
    const url = `http://localhost:3000/api/midgard/${path}`;
    const headers = new Headers();
    if (options?.origin) {
      headers.set('origin', options.origin);
    }
    return new NextRequest(url, {
      headers,
      method: options?.method || 'GET',
    });
  }

  function expectProxySuccessHeaders(response: Response) {
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=30');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  }

  function expectProxyErrorHeaders(response: Response) {
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Expires')).toBe('0');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://bond.thorchain.no');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  }

  it('returns 200 with JSON for allowed path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ status: 'healthy' }),
    } as unknown as Response);

    const request = createRequest('v2/health', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ['v2', 'health'] }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ status: 'healthy' });
    expectProxySuccessHeaders(response);
  });

  it('returns 403 for disallowed path', async () => {
    const request = createRequest('v2/admin', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ['v2', 'admin'] }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Proxy path is not allowed');
    expectProxyErrorHeaders(response);
  });

  it('rejects query parameters that are not allowed for the specific path', async () => {
    const request = createRequest('v2/health?limit=10', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ['v2', 'health'] }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('not allowed');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('enforces caps for allowed per-path history query parameters', async () => {
    const request = createRequest('v2/history/rune?interval=day&count=401', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ['v2', 'history', 'rune'] }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('count');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('validates action type filters before forwarding', async () => {
    const request = createRequest('v2/actions?type=swap%2C%2Fadmin', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ['v2', 'actions'] }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('type');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('validates action txType filters before forwarding', async () => {
    const request = createRequest('v2/actions?txType=', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ['v2', 'actions'] }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('txType');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.spyOn(rateLimit, 'checkRateLimit').mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const request = createRequest('v2/health', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ['v2', 'health'] }),
    });

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toBe('Rate limit exceeded');
    expect(response.headers.get('Retry-After')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Limit')).toBe('300');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expectProxyErrorHeaders(response);
  });

  it('returns correct CORS headers for allowed origin', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ status: 'healthy' }),
    } as unknown as Response);

    const request = createRequest('v2/health', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ['v2', 'health'] }),
    });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://bond.thorchain.no'
    );
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, OPTIONS'
    );
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('returns 200 with CORS headers for OPTIONS request', async () => {
    const request = createRequest('v2/health', {
      origin: 'https://bond.thorchain.no',
      method: 'OPTIONS',
    });
    const response = await OPTIONS(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://bond.thorchain.no'
    );
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, OPTIONS'
    );
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('tries fallback endpoint when primary fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Primary down' }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ status: 'fallback-healthy' }),
      } as unknown as Response);

    const request = createRequest('v2/health', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ['v2', 'health'] }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ status: 'fallback-healthy' });
    expectProxySuccessHeaders(response);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const firstCall = mockFetch.mock.calls[0][0] as string;
    const secondCall = mockFetch.mock.calls[1][0] as string;
    expect(firstCall).toContain('gateway.liquify.com');
    expect(secondCall).toContain('midgard.thorchain.network');
  });

  it('normalizes THORName reverse lookup misses as an empty successful result', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 } as unknown as Response)
      .mockResolvedValueOnce({ ok: false, status: 404 } as unknown as Response);

    const request = createRequest('v2/thorname/rlookup/thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({
        path: ['v2', 'thorname', 'rlookup', 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz'],
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ entry: null });
    expectProxySuccessHeaders(response);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not expose upstream base URLs or detail arrays when all upstreams fail', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response)
      .mockResolvedValueOnce({ ok: false, status: 502 } as unknown as Response);

    const request = createRequest('v2/health', {
      origin: 'https://bond.thorchain.no',
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ['v2', 'health'] }),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'All Midgard endpoints failed' });
    expectProxyErrorHeaders(response);
    warn.mockRestore();
  });
});
