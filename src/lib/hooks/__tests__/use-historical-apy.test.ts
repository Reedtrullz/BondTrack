import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { useHistoricalApy } from '../use-historical-apy';
import * as midgard from '@/lib/api/midgard';

vi.mock('@/lib/api/midgard');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

const dailyBondingEarnings = (bondingEarnings: string): midgard.EarningsIntervalRaw => ({
  startTime: '1704067200000000000',
  endTime: '1704153600000000000',
  liquidityFees: '0',
  blockRewards: '0',
  earnings: bondingEarnings,
  bondingEarnings,
  liquidityEarnings: '0',
  avgNodeCount: '100',
  runePriceUSD: '5.00',
  pools: [],
});

const networkWithActiveBond = (totalActiveBond: string): midgard.NetworkRaw => ({
  activeBonds: [],
  activeNodeCount: '100',
  standbyBonds: [],
  standbyNodeCount: '0',
  totalPooledRune: '0',
  totalReserve: '0',
  bondMetrics: {
    totalActiveBond,
    totalStandbyBond: '0',
    averageActiveBond: '0',
    averageStandbyBond: '0',
    medianActiveBond: '0',
    minimumActiveBond: '0',
    maximumActiveBond: '0',
    bondHardCap: '0',
  },
  bondingAPY: '0',
  liquidityAPY: '0',
  blockRewards: {
    blockReward: '0',
    bondReward: '0',
    poolReward: '0',
  },
  nextChurnHeight: '0',
  poolActivationCountdown: '0',
});

describe('useHistoricalApy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('annualizes daily bonding earnings without double-converting RUNE units', async () => {
    vi.mocked(midgard.getEarningsHistory).mockResolvedValueOnce({
      meta: {} as midgard.EarningsMetaRaw,
      intervals: Array.from({ length: 10 }, () => dailyBondingEarnings('1000000000')),
    });
    vi.mocked(midgard.getNetwork).mockResolvedValueOnce(
      networkWithActiveBond('1000000000000')
    );

    const { result } = renderHook(() => useHistoricalApy(10), { wrapper });

    await waitFor(() => expect(result.current.historicalApy).not.toBeNull());

    expect(midgard.getEarningsHistory).toHaveBeenCalledWith('day', 10);
    expect(result.current.historicalApy).toBeCloseTo(36.5, 6);
  });
});
