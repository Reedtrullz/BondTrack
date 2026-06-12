import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, OPTIONS } from './route';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { getHealth } from '@/lib/api/midgard';
import { getAllNodes } from '@/lib/api/thornode';

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 59, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/api/midgard', () => ({
  getHealth: vi.fn(),
}));

vi.mock('@/lib/api/thornode', () => ({
  getAllNodes: vi.fn(),
}));

function request(method = 'GET'): NextRequest {
  return new NextRequest('http://localhost/api/ready', {
    method,
    headers: { origin: 'http://localhost:3000' },
  });
}

function expectNoStoreReadyHeaders(response: Response) {
  expect(response.headers.get('Cache-Control')).toBe('no-store, private');
  expect(response.headers.get('Pragma')).toBe('no-cache');
  expect(response.headers.get('Expires')).toBe('0');
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
}

describe('/api/ready', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHealth).mockResolvedValue({ lastThorNode: { height: 123 } });
    vi.mocked(getAllNodes).mockResolvedValue([]);
  });

  it('returns ready when Midgard and THORNode checks pass', async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'ready',
      version: expect.any(String),
      checks: {
        midgard: { status: 'ready', latencyMs: expect.any(Number) },
        thornode: { status: 'ready', latencyMs: expect.any(Number) },
      },
    });
    expect(getHealth).toHaveBeenCalledWith({ cache: 'no-store' });
    expect(getAllNodes).toHaveBeenCalledWith({ cache: 'no-store' });
    expectNoStoreReadyHeaders(response);
  });

  it('returns degraded with check detail when a source check fails', async () => {
    vi.mocked(getAllNodes).mockRejectedValueOnce(new Error('THORNode unavailable'));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.checks.thornode).toMatchObject({
      status: 'degraded',
      detail: 'THORNode unavailable',
    });
    expect(body.checks.midgard.status).toBe('ready');
    expectNoStoreReadyHeaders(response);
  });

  it('returns no-store headers on rate-limit and OPTIONS responses', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });
    const limited = await GET(request());
    expect(limited.status).toBe(429);
    expectNoStoreReadyHeaders(limited);

    const options = await OPTIONS(request('OPTIONS'));
    expect(options.status).toBe(200);
    expect(options.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expectNoStoreReadyHeaders(options);
  });
});
