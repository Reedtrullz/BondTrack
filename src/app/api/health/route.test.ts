import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, OPTIONS } from './route';
import { checkRateLimit } from '@/lib/api/rate-limit';

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 59, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

function request(method = 'GET'): NextRequest {
  return new NextRequest('http://localhost/api/health', {
    method,
    headers: { origin: 'http://localhost:3000' },
  });
}

function expectNoStoreHealthHeaders(response: Response) {
  expect(response.headers.get('Cache-Control')).toBe('no-store, private');
  expect(response.headers.get('Pragma')).toBe('no-cache');
  expect(response.headers.get('Expires')).toBe('0');
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
}

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns health with explicit no-store freshness headers', async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'healthy', version: expect.any(String) });
    expectNoStoreHealthHeaders(response);
  });

  it('returns no-store headers on rate-limit and OPTIONS responses', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });
    const limited = await GET(request());
    expect(limited.status).toBe(429);
    expectNoStoreHealthHeaders(limited);

    const options = await OPTIONS(request('OPTIONS'));
    expect(options.status).toBe(200);
    expect(options.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expectNoStoreHealthHeaders(options);
  });
});
