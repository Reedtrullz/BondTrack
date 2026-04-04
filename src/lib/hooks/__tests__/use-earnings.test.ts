import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { useEarningsHistory } from '../use-earnings';
import * as midgard from '@/lib/api/midgard';

vi.mock('@/lib/api/midgard');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

const mockEarnings = {
  meta: {
    startTime: '1704067200000000000',
    endTime: '1706745600000000000',
    liquidityFees: '150000000000',
    blockRewards: '500000000000',
    earnings: '650000000000',
    bondingEarnings: '450000000000',
    liquidityEarnings: '200000000000',
    avgNodeCount: '80',
    runePriceUSD: '5.25',
    pools: [],
  },
  intervals: [
    {
      startTime: '1704067200000000000',
      endTime: '1704153600000000000',
      liquidityFees: '50000000000',
      blockRewards: '160000000000',
      earnings: '210000000000',
      bondingEarnings: '145000000000',
      liquidityEarnings: '65000000000',
      avgNodeCount: '80',
      runePriceUSD: '5.20',
      pools: [],
    },
    {
      startTime: '1704153600000000000',
      endTime: '1704240000000000000',
      liquidityFees: '48000000000',
      blockRewards: '165000000000',
      earnings: '213000000000',
      bondingEarnings: '147000000000',
      liquidityEarnings: '66000000000',
      avgNodeCount: '81',
      runePriceUSD: '5.22',
      pools: [],
    },
  ],
};

describe('useEarningsHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches earnings with default parameters', async () => {
    vi.mocked(midgard.getEarningsHistory).mockResolvedValueOnce(mockEarnings as any);

    const { result } = renderHook(() => useEarningsHistory(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.earnings).toBeDefined();
    expect(result.current.earnings?.intervals.length).toBe(2);
  });

  it('passes custom interval and count parameters', async () => {
    vi.mocked(midgard.getEarningsHistory).mockResolvedValueOnce(mockEarnings as any);

    const { result } = renderHook(() => useEarningsHistory('week', 12), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(midgard.getEarningsHistory).toHaveBeenCalledWith('week', 12);
  });

  it('handles error state', async () => {
    vi.mocked(midgard.getEarningsHistory).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEarningsHistory(), { wrapper });
    await waitFor(() => expect(result.current.error).toBeDefined());

    expect(result.current.error).toBeDefined();
    expect(result.current.earnings).toBeUndefined();
  });
});
