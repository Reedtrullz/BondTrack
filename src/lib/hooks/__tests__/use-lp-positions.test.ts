import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __clearLpHistoricalCachesForTests, useLpPositions } from '../use-lp-positions';
import * as midgard from '../../api/midgard';
import * as thornode from '../../api/thornode';
import * as mockDataModule from '../../mock-data';

vi.mock('../../api/midgard');
vi.mock('../../api/thornode', () => ({ getLiquidityProvider: vi.fn().mockResolvedValue(null) }));
vi.mock('../../mock-data', async () => {
  const actual = await vi.importActual<typeof import('../../mock-data')>('../../mock-data');
  return {
    ...actual,
    isDevelopmentMode: vi.fn(() => false),
  };
});

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
    vi.resetAllMocks();
    __clearLpHistoricalCachesForTests();
    vi.mocked(mockDataModule.isDevelopmentMode).mockReturnValue(false);
    vi.mocked(thornode.getLiquidityProvider).mockResolvedValue(null as never);
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValue({
      intervals: [{
        startTime: '1776902400',
        endTime: '1776988800',
        runePriceUSD: '0.48',
      }],
      meta: {
        startTime: '1776902400',
        endTime: '1776988800',
        startRunePriceUSD: '0.48',
        endRunePriceUSD: '0.48',
      },
    } as never);
    vi.mocked(midgard.getHistoricalRunePriceWithSource).mockResolvedValue({ price: 0.48, source: 'midgard' } as never);
    vi.mocked(midgard.getPoolHistoryAtTimestamp).mockResolvedValue({
      timestamp: 1700000000,
      runeDepth: '100000000',
      assetDepth: '100000000',
      liquidityUnits: '1000',
    });
  });

  it('keeps current market valuation when historical entry pricing cannot be resolved', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce({
      pools: [{
        ...successfulMemberDetails.pools[0],
        dateFirstAdded: '1700000000',
      }],
    } as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce([
      {
        ...successfulPools[0],
        liquidityUnits: '1000',
        runeDepth: '250000000000',
        assetDepth: '500000000000',
      },
    ] as never);
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
      intervals: [{
        startTime: '1776902400',
        endTime: '1776988800',
        runePriceUSD: '0.48',
      }],
      meta: {
        startTime: '1776902400',
        endTime: '1776988800',
        startRunePriceUSD: '0.48',
        endRunePriceUSD: '0.48',
      },
    } as never);
    vi.mocked(midgard.getHistoricalRunePriceWithSource).mockResolvedValueOnce(null as never);
    vi.mocked(midgard.getPoolHistoryAtTimestamp).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useLpPositions('thor1currentonly'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.positions[0]).toMatchObject({
      assetSymbol: 'BTC',
      currentRunePriceUsd: 0.48,
      currentAssetPriceUsd: 0.24,
      entryRunePriceUsd: null,
      entryAssetPriceUsd: null,
      pricingSource: 'current-only',
      redeemQuoteSource: 'derived',
      claimableTrusted: false,
      depositedTotalValueUsd: null,
      netProfitLoss: 'Current value only',
      netProfitLossUsd: null,
      netProfitLossPercent: null,
      hodlValueUsd: null,
      impermanentLossUsd: null,
      impermanentLossPercent: null,
    });
    expect(result.current.positions[0].currentTotalValueUsd).toBeCloseTo(240, 6);
  });

  it('returns local LP fixtures without touching live upstreams in mock mode', async () => {
    vi.mocked(mockDataModule.isDevelopmentMode).mockReturnValue(true);
    vi.mocked(midgard.getMemberDetails).mockRejectedValueOnce(new Error('should not call Midgard member'));
    vi.mocked(midgard.getPools).mockRejectedValueOnce(new Error('should not call Midgard pools'));
    vi.mocked(midgard.getRunePriceHistory).mockRejectedValueOnce(new Error('should not call Midgard price'));
    vi.mocked(thornode.getLiquidityProvider).mockRejectedValueOnce(new Error('should not call THORNode LP'));

    const { result } = renderHook(() => useLpPositions(mockDataModule.MOCK_PROVIDER_ADDRESS), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isHistoricalEnrichmentLoading).toBe(false);
    expect(result.current.state).toBe('ready');
    expect(result.current.error).toBeUndefined();
    expect(result.current.runePriceFreshness?.isStale).toBe(false);
    expect(result.current.positions).toHaveLength(1);
    expect(result.current.positions[0]).toMatchObject({
      pool: 'BTC.BTC',
      assetSymbol: 'BTC',
      redeemQuoteSource: 'thornode',
      claimableTrusted: true,
      pricingSource: 'historical',
      entryRunePriceUsd: 0.42,
      entryAssetPriceUsd: 30000,
    });
    expect(result.current.positions[0].currentTotalValueUsd).toBeGreaterThan(0);
    expect(midgard.getMemberDetails).not.toHaveBeenCalled();
    expect(midgard.getPools).not.toHaveBeenCalled();
    expect(midgard.getRunePriceHistory).not.toHaveBeenCalled();
    expect(midgard.getHistoricalRunePriceWithSource).not.toHaveBeenCalled();
    expect(midgard.getPoolHistoryAtTimestamp).not.toHaveBeenCalled();
    expect(thornode.getLiquidityProvider).not.toHaveBeenCalled();
  });

  it('marks fallback LP redeem values as estimated when THORNode redeem lookup fails', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce({
      pools: [{
        ...successfulMemberDetails.pools[0],
        liquidityUnits: '250',
        dateFirstAdded: '1700000000',
      }],
    } as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce([
      {
        ...successfulPools[0],
        liquidityUnits: '1000',
        runeDepth: '250000000000',
        assetDepth: '500000000000',
      },
    ] as never);
    vi.mocked(thornode.getLiquidityProvider).mockRejectedValueOnce(new Error('API error: 502 Bad Gateway'));

    const { result } = renderHook(() => useLpPositions('thor1redeemfail'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.positions[0]).toMatchObject({
      redeemQuoteSource: 'derived',
      claimableTrusted: false,
      runeWithdrawable: '62500000000',
      asset2Withdrawable: '125000000000',
    });
  });

  it('uses trusted claimable values when THORNode returns the canonical redeem quote', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce(successfulMemberDetails as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce(successfulPools as never);
    vi.mocked(thornode.getLiquidityProvider).mockResolvedValueOnce({
      rune_address: 'thor1member',
      asset_address: 'bc1member',
      rune_deposit_value: '5000000000',
      asset_deposit_value: '250000000',
      rune_redeem_value: '5250000000',
      asset_redeem_value: '260000000',
      units: '100',
      pending_rune: '0',
      pending_asset: '0',
      last_add_height: 123,
      last_withdraw_height: 0,
    } as never);

    const { result } = renderHook(() => useLpPositions('thor1redeemok'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.positions[0]).toMatchObject({
      redeemQuoteSource: 'thornode',
      claimableTrusted: true,
      runeWithdrawable: '5250000000',
      asset2Withdrawable: '260000000',
    });
  });

  it('normalizes nanosecond member timestamps before historical lookup and keeps historical pricing when coverage resolves', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce({
      pools: [{
        ...successfulMemberDetails.pools[0],
        pool: 'GAIA.ATOM',
        assetAddress: 'cosmos1member',
        dateFirstAdded: '1700000000000000000',
      }],
    } as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce([
      {
        ...successfulPools[0],
        asset: 'GAIA.ATOM',
        assetPriceUSD: '1.8644',
        runeDepth: '250000000000',
        assetDepth: '500000000000',
      },
    ] as never);
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
      intervals: [{
        startTime: '1776902400',
        endTime: '1776988800',
        runePriceUSD: '0.4885',
      }],
      meta: {
        startTime: '1776902400',
        endTime: '1776988800',
        startRunePriceUSD: '0.4885',
        endRunePriceUSD: '0.4885',
      },
    } as never);
    vi.mocked(midgard.getHistoricalRunePriceWithSource).mockResolvedValueOnce({ price: 0.5, source: 'midgard' } as never);
    vi.mocked(midgard.getPoolHistoryAtTimestamp).mockResolvedValueOnce({
      timestamp: 1700000000,
      runeDepth: '250000000000',
      assetDepth: '500000000000',
      liquidityUnits: '1000',
    });

    const { result } = renderHook(() => useLpPositions('thor1historical'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(midgard.getHistoricalRunePriceWithSource).toHaveBeenCalledWith(1700000000);
    expect(midgard.getPoolHistoryAtTimestamp).toHaveBeenCalledWith('GAIA.ATOM', 1700000000);
    expect(result.current.positions[0]).toMatchObject({
      assetSymbol: 'ATOM',
      currentAssetPriceUsd: 1.8644,
      pricingSource: 'historical',
      entryRunePriceUsd: 0.5,
      entryAssetPriceUsd: 0.25,
    });
    expect(result.current.positions[0].netProfitLoss).not.toBe('Current value only');
  });

  it('treats external historical RUNE fallback as estimated LP entry pricing', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce({
      pools: [{
        ...successfulMemberDetails.pools[0],
        pool: 'GAIA.ATOM',
        assetAddress: 'cosmos1member',
        dateFirstAdded: '1700000000',
      }],
    } as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce([
      {
        ...successfulPools[0],
        asset: 'GAIA.ATOM',
        assetPriceUSD: '1.8644',
        runeDepth: '250000000000',
        assetDepth: '500000000000',
      },
    ] as never);
    vi.mocked(midgard.getHistoricalRunePriceWithSource).mockResolvedValueOnce({ price: 0.5, source: 'coingecko' } as never);
    vi.mocked(midgard.getPoolHistoryAtTimestamp).mockResolvedValueOnce({
      timestamp: 1700000000,
      runeDepth: '250000000000',
      assetDepth: '500000000000',
      liquidityUnits: '1000',
    });

    const { result } = renderHook(() => useLpPositions('thor1externalfallback'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(midgard.getHistoricalRunePriceWithSource).toHaveBeenCalledWith(1700000000);
    expect(result.current.positions[0]).toMatchObject({
      pricingSource: 'estimated',
      entryRunePriceUsd: 0.5,
      entryAssetPriceUsd: 0.25,
      entryRunePriceSource: 'coingecko',
    });
    expect(result.current.positions[0].netProfitLoss).not.toBe('Current value only');
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

  it('surfaces current LP pricing feed failures as an error state', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce(successfulMemberDetails as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce(successfulPools as never);
    vi.mocked(midgard.getRunePriceHistory).mockRejectedValueOnce(
      new Error('Midgard proxy failed: API error: 502 Bad Gateway at /api/midgard/v2/history/rune')
    );

    const { result } = renderHook(() => useLpPositions('thor1pricefail'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('error'));

    expect(result.current.error).toMatch(/pricing is temporarily unavailable/i);
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
    expect(result.current.positions[0]).toMatchObject({
      address: 'bc1member',
      pool: 'BTC.BTC',
      runeDeposit: '5000000000',
      asset2Deposit: '250000000',
      liquidityUnits: '100',
      poolApy: 0.125,
      poolStatus: 'available',
      currentRunePriceUsd: 0.48,
      entryRunePriceUsd: null,
      entryAssetPriceUsd: null,
      pricingSource: 'current-only',
      netProfitLoss: 'Current value only',
      netProfitLossUsd: null,
      netProfitLossPercent: null,
      impermanentLossUsd: null,
      impermanentLossPercent: null,
    });
    expect(midgard.getMemberDetails).toHaveBeenCalledTimes(2);
  });

  it('preserves suspended pool status and falls back invalid pool APY to zero', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce(successfulMemberDetails as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce([
      {
        ...successfulPools[0],
        poolAPY: 'NaN',
        status: 'suspended',
      },
    ] as never);

    const { result } = renderHook(() => useLpPositions('thor1suspended'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.positions[0]).toMatchObject({
      poolApy: 0,
      poolStatus: 'suspended',
    });
  });

  it('marks positions with missing pool metadata as unknown with zero pool APY', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce(successfulMemberDetails as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce([] as never[]);

    const { result } = renderHook(() => useLpPositions('thor1unknown'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.positions[0]).toMatchObject({
      poolApy: 0,
      poolStatus: 'unknown',
    });
  });

  it('derives ownership share and pending add state from member and pool data', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce({
      pools: [{
        ...successfulMemberDetails.pools[0],
        liquidityUnits: '250',
        runePending: '50000000',
        dateFirstAdded: '1700000000',
        dateLastAdded: '1700500000',
      }],
    } as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce([
      {
        ...successfulPools[0],
        liquidityUnits: '1000',
        volume24h: '900000000',
        runeDepth: '250000000000',
        assetDepth: '500000000000',
      },
    ] as never);

    const { result } = renderHook(() => useLpPositions('thor1share'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.positions[0]).toMatchObject({
      ownershipPercent: 25,
      hasPending: true,
      volume24h: '900000000',
      runeDepth: '250000000000',
      asset2Depth: '500000000000',
      dateFirstAdded: '1700000000',
      dateLastAdded: '1700500000',
    });
  });

  it('caches historical RUNE day lookups while still requesting pool-specific history once per pool', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce({
      pools: [
        {
          ...successfulMemberDetails.pools[0],
          pool: 'BTC.BTC',
          assetAddress: 'bc1member',
          dateFirstAdded: '1700000000',
        },
        {
          ...successfulMemberDetails.pools[0],
          pool: 'ETH.ETH',
          assetAddress: '0xmember',
          dateFirstAdded: '1700000100',
        },
      ],
    } as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce([
      { ...successfulPools[0], asset: 'BTC.BTC', runeDepth: '250000000000', assetDepth: '500000000000' },
      { ...successfulPools[0], asset: 'ETH.ETH', runeDepth: '250000000000', assetDepth: '500000000000' },
    ] as never);
    vi.mocked(midgard.getHistoricalRunePriceWithSource).mockResolvedValue({ price: 0.5, source: 'midgard' } as never);
    vi.mocked(midgard.getPoolHistoryAtTimestamp).mockResolvedValue({
      timestamp: 1700000000,
      runeDepth: '250000000000',
      assetDepth: '500000000000',
      liquidityUnits: '1000',
    });

    const { result } = renderHook(() => useLpPositions('thor1cache'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.positions).toHaveLength(2);
    expect(midgard.getHistoricalRunePriceWithSource).toHaveBeenCalledTimes(1);
    expect(midgard.getPoolHistoryAtTimestamp).toHaveBeenCalledTimes(2);
  });

  it('evicts rejected historical RUNE day lookups so a later enrichment can retry the same day', async () => {
    const memberWithHistory = {
      pools: [{
        ...successfulMemberDetails.pools[0],
        dateFirstAdded: '1700000000',
      }],
    };
    vi.mocked(midgard.getMemberDetails).mockResolvedValue(memberWithHistory as never);
    vi.mocked(midgard.getPools).mockResolvedValue([
      { ...successfulPools[0], liquidityUnits: '1000', runeDepth: '250000000000', assetDepth: '500000000000' },
    ] as never);
    vi.mocked(midgard.getHistoricalRunePriceWithSource)
      .mockRejectedValueOnce(new Error('API error: 500 temporary historical price failure'))
      .mockResolvedValueOnce({ price: 0.5, source: 'midgard' } as never);
    vi.mocked(midgard.getPoolHistoryAtTimestamp).mockResolvedValue({
      timestamp: 1700000000,
      runeDepth: '250000000000',
      assetDepth: '500000000000',
      liquidityUnits: '1000',
    });

    const first = renderHook(() => useLpPositions('thor1historicalfail'), { wrapper });

    await waitFor(() => expect(first.result.current.isHistoricalEnrichmentLoading).toBe(false));
    expect(first.result.current.positions[0].pricingSource).toBe('current-only');
    expect(midgard.getHistoricalRunePriceWithSource).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderHook(() => useLpPositions('thor1historicalretry'), { wrapper });

    await waitFor(() => expect(second.result.current.positions[0].pricingSource).toBe('historical'));
    expect(midgard.getHistoricalRunePriceWithSource).toHaveBeenCalledTimes(2);
    expect(second.result.current.positions[0]).toMatchObject({
      entryRunePriceUsd: 0.5,
      pricingSource: 'historical',
    });
  });

  it('quietly degrades to current-only pricing when historical enrichment has a status-less network failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const memberWithHistory = {
      pools: [{
        ...successfulMemberDetails.pools[0],
        dateFirstAdded: '1700000000',
      }],
    };
    vi.mocked(midgard.getMemberDetails).mockResolvedValue(memberWithHistory as never);
    vi.mocked(midgard.getPools).mockResolvedValue([
      { ...successfulPools[0], liquidityUnits: '1000', runeDepth: '250000000000', assetDepth: '500000000000' },
    ] as never);
    vi.mocked(midgard.getHistoricalRunePriceWithSource).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.mocked(midgard.getPoolHistoryAtTimestamp).mockResolvedValue({
      timestamp: 1700000000,
      runeDepth: '250000000000',
      assetDepth: '500000000000',
      liquidityUnits: '1000',
    });

    const { result } = renderHook(() => useLpPositions('thor1historicalnetworkfail'), { wrapper });

    await waitFor(() => expect(result.current.isHistoricalEnrichmentLoading).toBe(false));

    expect(result.current.state).toBe('ready');
    expect(result.current.positions[0]).toMatchObject({
      pricingSource: 'current-only',
      entryRunePriceUsd: null,
      entryAssetPriceUsd: null,
      netProfitLoss: 'Current value only',
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('evicts rejected pool history lookups so a later enrichment can retry the same pool/day', async () => {
    const memberWithHistory = {
      pools: [{
        ...successfulMemberDetails.pools[0],
        dateFirstAdded: '1700000000',
      }],
    };
    vi.mocked(midgard.getMemberDetails).mockResolvedValue(memberWithHistory as never);
    vi.mocked(midgard.getPools).mockResolvedValue([
      { ...successfulPools[0], liquidityUnits: '1000', runeDepth: '250000000000', assetDepth: '500000000000' },
    ] as never);
    vi.mocked(midgard.getHistoricalRunePriceWithSource).mockResolvedValue({ price: 0.5, source: 'midgard' } as never);
    vi.mocked(midgard.getPoolHistoryAtTimestamp)
      .mockRejectedValueOnce(new Error('API error: 500 temporary pool history failure'))
      .mockResolvedValueOnce({
        timestamp: 1700000000,
        runeDepth: '250000000000',
        assetDepth: '500000000000',
        liquidityUnits: '1000',
      });

    const first = renderHook(() => useLpPositions('thor1poolhistoryfail'), { wrapper });

    await waitFor(() => expect(first.result.current.isHistoricalEnrichmentLoading).toBe(false));
    expect(first.result.current.positions[0].pricingSource).toBe('current-only');
    expect(midgard.getPoolHistoryAtTimestamp).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderHook(() => useLpPositions('thor1poolhistoryretry'), { wrapper });

    await waitFor(() => expect(second.result.current.positions[0].pricingSource).toBe('historical'));
    expect(midgard.getPoolHistoryAtTimestamp).toHaveBeenCalledTimes(2);
  });

  it('clears historical caches and refetches enrichment data when retry is requested', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValue({
      pools: [{
        ...successfulMemberDetails.pools[0],
        dateFirstAdded: '1700000000',
      }],
    } as never);
    vi.mocked(midgard.getPools).mockResolvedValue([
      { ...successfulPools[0], liquidityUnits: '1000', runeDepth: '250000000000', assetDepth: '500000000000' },
    ] as never);
    vi.mocked(midgard.getHistoricalRunePriceWithSource)
      .mockRejectedValueOnce(new Error('API error: 500 temporary historical price failure'))
      .mockResolvedValueOnce({ price: 0.5, source: 'midgard' } as never);
    vi.mocked(midgard.getPoolHistoryAtTimestamp).mockResolvedValue({
      timestamp: 1700000000,
      runeDepth: '250000000000',
      assetDepth: '500000000000',
      liquidityUnits: '1000',
    });

    const { result } = renderHook(() => useLpPositions('thor1retryhistorical'), { wrapper });

    await waitFor(() => expect(result.current.isHistoricalEnrichmentLoading).toBe(false));
    expect(result.current.positions[0].pricingSource).toBe('current-only');
    expect(midgard.getHistoricalRunePriceWithSource).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => expect(result.current.positions[0].pricingSource).toBe('historical'));
    expect(midgard.getHistoricalRunePriceWithSource).toHaveBeenCalledTimes(2);
  });

  it('returns "empty" state for 404 member lookup', async () => {
    vi.mocked(midgard.getMemberDetails).mockRejectedValueOnce(
      new Error('Midgard proxy failed: API error: 404 Not Found at /api/midgard/v2/member/thor1empty404')
    );
    vi.mocked(midgard.getPools).mockResolvedValueOnce([] as never[]);

    const { result } = renderHook(() => useLpPositions('thor1empty404'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.state).toBe('empty');
    expect(result.current.error).toBeUndefined();
    expect(result.current.positions).toEqual([]);
  });

  it('returns error with upstream-failure copy for 5xx member lookup', async () => {
    vi.mocked(midgard.getMemberDetails).mockRejectedValueOnce(
      new Error('Midgard proxy failed: API error: 502 Bad Gateway at /api/midgard/v2/member/thor1502')
    );
    vi.mocked(midgard.getPools).mockResolvedValueOnce([] as never[]);

    const { result } = renderHook(() => useLpPositions('thor1502'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('error'));

    expect(result.current.error).toMatch(/could not load this address/u);
    expect(result.current.error).toMatch(/LP member record right now/u);
    expect(result.current.positions).toEqual([]);
  });

  it('returns error with price-feed copy for historical pricing 5xx', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce(successfulMemberDetails as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce(successfulPools as never);
    vi.mocked(midgard.getRunePriceHistory).mockRejectedValueOnce(
      new Error('Midgard proxy failed: API error: 502 Bad Gateway at /api/midgard/v2/history/rune')
    );

    const { result } = renderHook(() => useLpPositions('thor1pricefeedfail'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('error'));

    expect(result.current.error).toBe('Midgard LP pricing is temporarily unavailable right now. Current market value is unavailable until the price feed recovers.');
    expect(result.current.error).not.toMatch(/safely/i);
    expect(result.current.positions).toEqual([]);
  });

  it('returns 0 ownership percent when memberUnits or poolUnits are zero', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce({
      pools: [{
        ...successfulMemberDetails.pools[0],
        liquidityUnits: '0',
      }],
    } as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce([
      {
        ...successfulPools[0],
        liquidityUnits: '1000',
      },
    ] as never);

    const { result } = renderHook(() => useLpPositions('thor1zerounits'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.positions[0].ownershipPercent).toBe(0);
  });

  it('returns 0 ownership percent when pool liquidityUnits is zero', async () => {
    vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce({
      pools: [{
        ...successfulMemberDetails.pools[0],
        liquidityUnits: '100',
      }],
    } as never);
    vi.mocked(midgard.getPools).mockResolvedValueOnce([
      {
        ...successfulPools[0],
        liquidityUnits: '0',
      },
    ] as never);

    const { result } = renderHook(() => useLpPositions('thor1zeropoolunits'), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.positions[0].ownershipPercent).toBe(0);
  });
});
