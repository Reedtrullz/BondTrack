import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../[pool]/route';
import { getEarningsHistory } from '@/lib/api/midgard';

vi.mock('@/lib/api/midgard', () => ({
  getEarningsHistory: vi.fn(),
  getNetwork: vi.fn(() => ({
    totalPooledRune: '5000000000000',
    totalBond: '1000000000',
    activeNodeCount: '100',
    standbyNodeCount: '50',
  })),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 29, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

function request(pool: string): NextRequest {
  return new NextRequest(`http://localhost/api/pools/${pool}`, {
    headers: { origin: 'http://localhost:3000' },
  });
}

describe('/api/pools/[pool]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEarningsHistory).mockResolvedValue({
      meta: {
        startTime: '1',
        endTime: '2',
        liquidityFees: '0',
        blockRewards: '0',
        earnings: '0',
        bondingEarnings: '500',
        liquidityEarnings: '0',
        avgNodeCount: '1',
        runePriceUSD: '5',
        pools: [{ pool: 'BTC.BTC', assetLiquidityFees: '1', runeLiquidityFees: '2', totalLiquidityFeesRune: '3', saverEarning: '0', rewards: '4', earnings: '5' }],
      },
      intervals: [
        {
          startTime: '1',
          endTime: '2',
          liquidityFees: '0',
          blockRewards: '0',
          earnings: '0',
          bondingEarnings: '0',
          liquidityEarnings: '0',
          avgNodeCount: '1',
          runePriceUSD: '5',
          pools: [{ pool: 'BTC.BTC', assetLiquidityFees: '1', runeLiquidityFees: '2', totalLiquidityFeesRune: '3', saverEarning: '0', rewards: '4', earnings: '5' }],
        },
      ],
    });
  });

  it('returns pool earnings with no-store private headers for a valid THORChain asset', async () => {
    const response = await GET(request('BTC.BTC'), { params: Promise.resolve({ pool: 'BTC.BTC' }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ pool: 'BTC.BTC', intervals: [{ totalLiquidityFeesRune: '3' }] });
    expect(getEarningsHistory).toHaveBeenCalledWith('day', 30);
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
  });

  it('rejects weird, overlong, or non-asset pool identifiers', async () => {
    const weird = await GET(request('BTC.BTC%2F..'), { params: Promise.resolve({ pool: 'BTC.BTC/..' }) });
    expect(weird.status).toBe(400);

    const overlongPool = `BTC.${'A'.repeat(130)}`;
    const overlong = await GET(request(overlongPool), { params: Promise.resolve({ pool: overlongPool }) });
    expect(overlong.status).toBe(400);

    expect(getEarningsHistory).not.toHaveBeenCalled();
  });
});
