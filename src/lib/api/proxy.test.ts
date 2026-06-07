import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createProxyErrorResponse,
  createProxySuccessResponse,
  proxyJsonFromUpstreams,
  rateLimitProxyRequest,
} from './proxy';
import * as rateLimit from './rate-limit';

function createRequest(origin = 'https://bond.thorchain.no'): NextRequest {
  return new NextRequest('http://localhost:3000/api/test/v1/health', {
    headers: { origin },
  });
}

describe('shared API proxy helpers', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('merges CORS/security headers with success cache headers', async () => {
    const response = createProxySuccessResponse(createRequest(), { ok: true }, {
      extraOrigins: ['https://bond.thorchain.no'],
      cacheControl: 'public, max-age=30',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://bond.thorchain.no');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=30');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('returns no-store private error responses', async () => {
    const response = createProxyErrorResponse(createRequest(), 'Blocked', 403, {
      extraOrigins: ['https://bond.thorchain.no'],
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Blocked' });
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://bond.thorchain.no');
  });

  it('builds rate-limit responses with retry metadata', async () => {
    vi.spyOn(rateLimit, 'checkRateLimit').mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    vi.spyOn(rateLimit, 'getClientIp').mockReturnValue('203.0.113.10');

    const response = rateLimitProxyRequest(createRequest(), {
      prefix: 'test',
      maxRequests: 300,
      windowMs: 60_000,
      extraOrigins: ['https://bond.thorchain.no'],
    });

    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
    expect(await response?.json()).toEqual({ error: 'Rate limit exceeded' });
    expect(response?.headers.get('X-RateLimit-Limit')).toBe('300');
    expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response?.headers.get('Retry-After')).toBeTruthy();
  });

  it('tries fallback upstreams when retry is enabled', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ status: 'fallback' }),
      } as unknown as Response);

    const result = await proxyJsonFromUpstreams({
      endpoints: ['https://primary.example', 'https://fallback.example'],
      path: 'v2/health',
      search: '?x=1',
      retryUpstreams: true,
      fetchHeaders: { Accept: 'application/json' },
      timeoutMs: 30_000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ status: 'fallback' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://fallback.example/v2/health?x=1',
      expect.objectContaining({ cache: 'no-store' })
    );
  });

  it('does not try fallback upstreams when retry is disabled', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    const result = await proxyJsonFromUpstreams({
      endpoints: ['https://primary.example', 'https://fallback.example'],
      path: 'v2/health',
      retryUpstreams: false,
      fetchHeaders: { Accept: 'application/json' },
      timeoutMs: 30_000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCodes).toEqual([500]);
      expect(result.errors).toEqual(['https://primary.example: 500']);
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
