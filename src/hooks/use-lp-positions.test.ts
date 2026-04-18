import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLpPositions } from './use-lp-positions';
import * as midgard from '../lib/api/midgard';

vi.mock('../lib/api/midgard');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

const successfulMemberDetails = {
  pools: [
    {
      pool: 'BTC.BTC',
      runeAddress: 'thor1member',
      assetAddress: 'bc1member',
      liquidityUnits: '100',
      runeDeposit: '5000000000',
      assetDeposit: '250000000',
      runeAdded: '100000000',
      assetAdded: '10000000',
      runePending: '0',
      assetPending: '0',
      runeWithdrawn: '0',
      assetWithdrawn: '0',
      dateFirstAdded: '0',
      dateLastAdded: '0',
    },
  ],
};

const successfulPools = [
  {
    asset: 'BTC.BTC',
    volume24h: '0',
    assetDepth: '0',
    runeDepth: '0',
    assetPrice: '0',
    assetPriceUSD: '0',
    annualPercentageRate: '0',
    poolAPY: '12.5',
    earnings: '0',
    earningsAnnualAsPercentOfDepth: '0',
    lpLuvi: '0',
    saversAPR: '0',
    status: 'available',
    liquidityUnits: '0',
    synthUnits: '0',
    synthSupply: '0',
    units: '0',
    nativeDecimal: '8',
    saversUnits: '0',
    saversDepth: '0',
    totalCollateral: '0',
    totalDebtTor: '0',
    saversYieldShare: '0',
    depthPlus2Percent: '0',
    depthMinus2Percent: '0',
  },
];

describe('useLpPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats a missing member record as an empty LP state', async () => {
    vi.mocked(midgard.getMemberDetails).mockRejectedValueOnce(
      new Error('Midgard proxy failed: API error: 404 Not Found at /api/midgard/v2/member/thor1empty')
    );
    vi.mocked(midgard.getPools).mockResolvedValueOnce([] as never[]);

    const { result } = renderHook(() => useLpPositions('thor1empty'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.state).toBe('empty');
    expect(result.current.error).toBeUndefined();
    expect(result.current.positions).toEqual([]);
  });

  it('surfaces upstream member failures and recovers after retry', async () => {
    vi.mocked(midgard.getMemberDetails)
      .mockRejectedValueOnce(
        new Error('Midgard proxy failed: API error: 502 Bad Gateway at /api/midgard/v2/member/thor1retry')
      )
      .mockResolvedValueOnce(successfulMemberDetails as never);
    vi.mocked(midgard.getPools).mockResolvedValue(successfulPools as never);

    const { result } = renderHook(() => useLpPositions('thor1retry'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('error'));

    expect(result.current.error).toMatch(/upstream failure/i);
    expect(result.current.positions).toEqual([]);

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.positions).toHaveLength(1);
    expect(result.current.positions[0].pool).toBe('BTC.BTC');
    expect(midgard.getMemberDetails).toHaveBeenCalledTimes(2);
  });
});
