import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '../[...path]/route';
import * as rateLimitModule from '@/lib/api/rate-limit';

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 299, resetAt: Date.now() + 60000 })),
  getClientIp: vi.fn((request: NextRequest) => request.headers.get('x-forwarded-for') || 'unknown'),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  const url = new URL(`http://localhost:3000/api/thorchain${path}`);
  return {
    url: url.toString(),
    nextUrl: url,
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

function expectProxySuccessHeaders(response: Response) {
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=5');
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
}

describe('/api/thorchain proxy', () => {
  beforeEach(() => {
    vi.mocked(rateLimitModule.checkRateLimit).mockReturnValue({
      allowed: true,
      remaining: 299,
      resetAt: Date.now() + 60000,
    });
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ test: 'data' }),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with JSON for allowed path', async () => {
    const req = createMockRequest('/nodes', { origin: 'http://localhost:3000' });
    const res = await GET(req, { params: Promise.resolve({ path: ['nodes'] }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ test: 'data' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expectProxySuccessHeaders(res);
  });

  it('returns 403 for disallowed path', async () => {
    const req = createMockRequest('/admin', { origin: 'http://localhost:3000' });
    const res = await GET(req, { params: Promise.resolve({ path: ['admin'] }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Proxy path is not allowed');
    expect(json.path).toBe('admin');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 429 with retry headers when rate limited', async () => {
    const { checkRateLimit } = await import('@/lib/api/rate-limit');
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const req = createMockRequest('/nodes', { origin: 'http://localhost:3000' });
    const res = await GET(req, { params: Promise.resolve({ path: ['nodes'] }) });
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe('Rate limit exceeded');
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(res.headers.get('X-RateLimit-Limit')).toBe('300');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(Number(res.headers.get('X-RateLimit-Reset'))).toBeGreaterThan(0);
  });

  it('returns correct CORS headers for allowed origin', async () => {
    const req = createMockRequest('/nodes', { origin: 'http://localhost:3000' });
    const res = await GET(req, { params: Promise.resolve({ path: ['nodes'] }) });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(res.headers.get('Vary')).toBe('Origin');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('returns 200 with CORS headers for OPTIONS request', async () => {
    const req = createMockRequest('/nodes', { origin: 'http://localhost:3000' });
    const res = await OPTIONS(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Accept');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('strips leading thorchain/ segment and returns 200', async () => {
    const req = createMockRequest('/thorchain/nodes', { origin: 'http://localhost:3000' });
    const res = await GET(req, { params: Promise.resolve({ path: ['thorchain', 'nodes'] }) });
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://gateway.liquify.com/chain/thorchain_api/thorchain/nodes',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
    );
  });

  it('allows Cosmos bank balances at the THORNode API root, not under /thorchain', async () => {
    const address = 'thor1validbalanceaddress1234567890abcdef';
    const req = createMockRequest(`/cosmos/bank/v1beta1/balances/${address}`, { origin: 'http://localhost:3000' });

    const res = await GET(req, {
      params: Promise.resolve({ path: ['cosmos', 'bank', 'v1beta1', 'balances', address] }),
    });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://gateway.liquify.com/chain/thorchain_api/cosmos/bank/v1beta1/balances/${address}`,
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
    );
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/thorchain/cosmos/bank/v1beta1/balances/'),
      expect.anything()
    );
  });
});
