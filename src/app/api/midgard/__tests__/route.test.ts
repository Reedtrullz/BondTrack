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
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=30');
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
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const firstCall = mockFetch.mock.calls[0][0] as string;
    const secondCall = mockFetch.mock.calls[1][0] as string;
    expect(firstCall).toContain('gateway.liquify.com');
    expect(secondCall).toContain('midgard.thorchain.network');
  });
});
