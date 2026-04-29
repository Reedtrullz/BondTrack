import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMidgardMock } = vi.hoisted(() => ({
  fetchMidgardMock: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  fetchMidgard: fetchMidgardMock,
}));

import { getFeeRevenue } from '@/lib/api/midgard';

beforeEach(() => {
  fetchMidgardMock.mockReset();
});

describe('getFeeRevenue', () => {
  it('aggregates daily fee revenue into 24h, 7d, and 30d summaries', async () => {
    fetchMidgardMock.mockResolvedValue({
      intervals: [
        {
          startTime: '1714000000',
          endTime: '1714086400',
          liquidityFees: '100000000',
          blockRewards: '200000000',
          earnings: '0',
          bondingEarnings: '300000000',
          liquidityEarnings: '400000000',
          avgNodeCount: '0',
          runePriceUSD: '2.50',
          pools: [],
        },
        {
          startTime: '1714086400',
          endTime: '1714172800',
          liquidityFees: '250000000',
          blockRewards: '150000000',
          earnings: '0',
          bondingEarnings: '500000000',
          liquidityEarnings: '600000000',
          avgNodeCount: '0',
          runePriceUSD: '3.00',
          pools: [],
        },
        {
          startTime: '1714172800',
          endTime: '1714259200',
          liquidityFees: '50000000',
          blockRewards: '50000000',
          earnings: '0',
          bondingEarnings: '100000000',
          liquidityEarnings: '200000000',
          avgNodeCount: '0',
          runePriceUSD: '4.00',
          pools: [],
        },
      ],
    });

    const result = await getFeeRevenue();

    expect(fetchMidgardMock).toHaveBeenCalledWith('/v2/history/earnings?interval=day&count=30');
    expect(result.daily).toHaveLength(3);
    expect(result.daily[0]).toEqual({
      date: expect.any(String),
      totalFees: '300000000',
      bondRewards: '300000000',
      poolRewards: '400000000',
      runePriceUSD: '2.50',
    });
    expect(result.summary.total24h).toBe('100000000');
    expect(result.summary.total7d).toBe('800000000');
    expect(result.summary.total30d).toBe('800000000');
    expect(result.summary.total24hUsd).toBe(4);
    expect(result.summary.total7dUsd).toBe(23.5);
    expect(result.summary.total30dUsd).toBe(23.5);
  });

  it('handles a single interval', async () => {
    fetchMidgardMock.mockResolvedValue({
      intervals: [
        {
          startTime: '1714000000',
          endTime: '1714086400',
          liquidityFees: '0',
          blockRewards: '100000000',
          earnings: '0',
          bondingEarnings: '0',
          liquidityEarnings: '0',
          avgNodeCount: '0',
          runePriceUSD: '5',
          pools: [],
        },
      ],
    });

    const result = await getFeeRevenue();

    expect(result.daily).toHaveLength(1);
    expect(result.summary.total24h).toBe('100000000');
    expect(result.summary.total7d).toBe('100000000');
    expect(result.summary.total30d).toBe('100000000');
    expect(result.summary.total24hUsd).toBe(5);
  });

  it('returns zeroed summaries for empty intervals', async () => {
    fetchMidgardMock.mockResolvedValue({ intervals: [] });

    const result = await getFeeRevenue();

    expect(result.daily).toEqual([]);
    expect(result.summary).toEqual({
      total24h: '0',
      total7d: '0',
      total30d: '0',
      total24hUsd: 0,
      total7dUsd: 0,
      total30dUsd: 0,
    });
  });
});
