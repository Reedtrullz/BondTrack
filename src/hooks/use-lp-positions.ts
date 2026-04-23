import React from 'react';
import useSWR from 'swr';
import { getMemberDetails, getPools, getRunePriceHistory, getHistoricalRunePrice, getPoolHistoryAtTimestamp, MemberDetailsRaw, PoolDetailRaw } from '../lib/api/midgard';
import { getLiquidityProvider, LiquidityProviderRaw } from '../lib/api/thornode';
import { LpPoolStatus, LpPosition, LpPricingSource } from '../lib/types/lp';
import { calculateLpWithdrawableAmounts, formatPnlDisplay, calculateAssetPriceFromPoolDepth } from '../lib/utils/calculations';
import { calculateLpPositionValuation, getCurrentAssetPriceUsd, getLpAssetSymbol } from '../lib/utils/lp-analytics';

type LpDataState = 'ready' | 'empty' | 'error';

function getStatusCode(message: string): number | null {
  const match = message.match(/API error:\s*(\d{3})/i);
  return match ? Number(match[1]) : null;
}

function getLpErrorState(error: unknown): { state: LpDataState; message?: string } {
  if (!error) {
    return { state: 'ready' };
  }

  const message = error instanceof Error ? error.message : String(error);
  const statusCode = getStatusCode(message);
  const isMemberLookupFailure = message.includes('/v2/member/');

  if (isMemberLookupFailure && statusCode === 404) {
    return { state: 'empty' };
  }

  if (isMemberLookupFailure && statusCode && statusCode >= 500) {
    return {
      state: 'error',
      message: 'Midgard could not load this address’s LP member record right now. This is an upstream failure, not confirmation that the address has no LP positions.',
    };
  }

  if (message.includes('/v2/history/rune') || message.includes('LP pricing unavailable')) {
    return {
      state: 'error',
      message: 'Midgard LP pricing is temporarily unavailable right now. Current market value cannot be calculated safely until the price feed recovers.',
    };
  }

  if (statusCode && statusCode >= 500) {
    return {
      state: 'error',
      message: 'Midgard LP data is temporarily unavailable right now. Try again shortly.',
    };
  }

  if (statusCode && statusCode >= 400) {
    return {
      state: 'error',
      message: 'Midgard could not load LP data for this address. Verify the address and try again.',
    };
  }

  return {
    state: 'error',
    message: 'Unable to load LP data right now. Try again shortly.',
  };
}

const normalizePoolStatus = (poolStatus: string | undefined): LpPoolStatus => {
  switch (poolStatus) {
    case 'available':
    case 'staged':
    case 'suspended':
      return poolStatus;
    default:
      return 'unknown';
  }
};

function parseBigInt(raw: string | undefined): bigint {
  if (!raw) return 0n;
  try {
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

function deriveOwnershipPercent(memberLiquidityUnits: string, poolLiquidityUnits: string | undefined): number {
  const memberUnits = parseBigInt(memberLiquidityUnits);
  const poolUnits = parseBigInt(poolLiquidityUnits);

  if (memberUnits <= 0n || poolUnits <= 0n) {
    return 0;
  }

  return (Number(memberUnits) / Number(poolUnits)) * 100;
}

interface HistoricalPriceSnapshot {
  entryRunePriceUsd: number | null;
  entryAssetPriceUsd: number | null;
  pricingSource: LpPricingSource;
}

function normalizeHistoryTimestamp(rawTimestamp: string): number {
  const numericTimestamp = Number(rawTimestamp);

  if (!Number.isFinite(numericTimestamp) || numericTimestamp <= 0) {
    return 0;
  }

  return numericTimestamp > 1e12 ? Math.floor(numericTimestamp / 1e9) : numericTimestamp;
}

interface LpDataWithThorNode {
  memberDetails: MemberDetailsRaw;
  pools: PoolDetailRaw[];
  thorNodeLpData: Map<string, LiquidityProviderRaw>;
  runePriceUSD: number;
  historicalPrices: Map<string, HistoricalPriceSnapshot>;
}

export const useLpPositions = (address: string | null) => {
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const { data, error, isLoading, mutate } = useSWR<LpDataWithThorNode>(
    address ? address : null,
    async (addr) => {
      const [memberDetails, pools, runePriceHistory] = await Promise.all([
        getMemberDetails(addr),
        getPools(),
        getRunePriceHistory('day', 1)
      ]);

      const runePriceUSD = runePriceHistory?.intervals?.length
        ? Number(runePriceHistory.intervals[runePriceHistory.intervals.length - 1].runePriceUSD)
        : 0;

      if (!Number.isFinite(runePriceUSD) || runePriceUSD <= 0) {
        throw new Error('Midgard LP pricing unavailable at /api/midgard/v2/history/rune');
      }

      const thorNodeLpData = new Map<string, LiquidityProviderRaw>();
      const memberPools = memberDetails?.pools || [];
      
      const poolPromises = memberPools.map(async (pool, index) => {
        try {
          const lpData = await getLiquidityProvider(pool.pool, addr);
          if (lpData) {
            thorNodeLpData.set(pool.pool, lpData);
          }
          setLoadingProgress(((index + 1) / memberPools.length) * 100);
        } catch {
          // Continue without THORNode data for this pool
        }
      });
      await Promise.allSettled(poolPromises);

      // Fetch historical entry prices for all pools
      const historicalPrices = new Map<string, HistoricalPriceSnapshot>();
      for (const pool of memberPools) {
        const firstAddedTimestamp = normalizeHistoryTimestamp(pool.dateFirstAdded);
        if (firstAddedTimestamp > 0) {
          const runeEntryPrice = await getHistoricalRunePrice(firstAddedTimestamp);
          const poolHistory = await getPoolHistoryAtTimestamp(pool.pool, firstAddedTimestamp);

          if (runeEntryPrice === null) {
            historicalPrices.set(pool.pool, {
              entryRunePriceUsd: null,
              entryAssetPriceUsd: null,
              pricingSource: 'current-only',
            });
            continue;
          }

          if (!poolHistory?.runeDepth || !poolHistory?.assetDepth) {
            // Fallback: Assume symmetric (50/50) deposit on Day 1 to estimate asset price
            const runeDep = Number(pool.runeDeposit);
            const assetDep = Number(pool.assetDeposit);

            if (runeDep > 0 && assetDep > 0) {
              const estimatedAssetEntryPrice = (runeDep * runeEntryPrice) / assetDep;
              historicalPrices.set(pool.pool, {
                entryRunePriceUsd: runeEntryPrice,
                entryAssetPriceUsd: estimatedAssetEntryPrice,
                pricingSource: 'estimated',
              });
              continue;
            }

            historicalPrices.set(pool.pool, {
              entryRunePriceUsd: null,
              entryAssetPriceUsd: null,
              pricingSource: 'current-only',
            });
            continue;
          }

          const asset2EntryPrice = calculateAssetPriceFromPoolDepth(
            poolHistory.runeDepth,
            poolHistory.assetDepth,
            runeEntryPrice
          );

          if (!Number.isFinite(asset2EntryPrice) || asset2EntryPrice <= 0) {
            historicalPrices.set(pool.pool, {
              entryRunePriceUsd: null,
              entryAssetPriceUsd: null,
              pricingSource: 'current-only',
            });
            continue;
          }

          historicalPrices.set(pool.pool, {
            entryRunePriceUsd: runeEntryPrice,
            entryAssetPriceUsd: asset2EntryPrice,
            pricingSource: 'historical',
          });
        }
      }

      return { memberDetails, pools, thorNodeLpData, runePriceUSD, historicalPrices };
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    }
  );

  const errorState = getLpErrorState(error);

  const positions: LpPosition[] = (data?.memberDetails?.pools || []).map((poolRaw) => {
    const poolData = data?.pools?.find((p) => p.asset === poolRaw.pool);
    const poolStatus = normalizePoolStatus(poolData?.status);
    const runePending = parseBigInt(poolRaw.runePending);
    const asset2Pending = parseBigInt(poolRaw.assetPending);
    const thorNodeLp = data?.thorNodeLpData?.get(poolRaw.pool);

    let withdrawable: {
      runeWithdrawable: string;
      asset2Withdrawable: string;
      runeDeposited: string;
      asset2Deposited: string;
    };

    if (thorNodeLp) {
      withdrawable = {
        runeWithdrawable: thorNodeLp.rune_redeem_value,
        asset2Withdrawable: thorNodeLp.asset_redeem_value,
        runeDeposited: thorNodeLp.rune_deposit_value,
        asset2Deposited: thorNodeLp.asset_deposit_value,
      };
    } else {
      withdrawable = calculateLpWithdrawableAmounts(
        poolRaw.runeDeposit,
        poolRaw.assetDeposit,
        poolData?.runeDepth ?? '0',
        poolData?.assetDepth ?? '0',
        poolRaw.runeAdded,
        poolRaw.runeWithdrawn,
        poolRaw.assetAdded,
        poolRaw.assetWithdrawn,
        deriveOwnershipPercent(poolRaw.liquidityUnits, poolData?.liquidityUnits)
      );
    }

    const assetSymbol = getLpAssetSymbol(poolRaw.pool);
    const rawCurrentRunePriceUsd = data?.runePriceUSD ?? 0;
    const rawCurrentAssetPriceUsd = getCurrentAssetPriceUsd(
      {
        assetPriceUSD: poolData?.assetPriceUSD,
        runeDepth: poolData?.runeDepth,
        assetDepth: poolData?.assetDepth,
      },
      rawCurrentRunePriceUsd
    );

    const historicalEntryPrices = data?.historicalPrices?.get(poolRaw.pool);
    const pricingSource = historicalEntryPrices?.pricingSource ?? 'current-only';
    const hasHistoricalPricing = pricingSource === 'historical' || pricingSource === 'estimated';
    const currentRunePriceUsd = rawCurrentRunePriceUsd;
    const currentAssetPriceUsd = rawCurrentAssetPriceUsd;
    const entryRunePriceUsd = hasHistoricalPricing
      ? historicalEntryPrices?.entryRunePriceUsd ?? null
      : null;
    const entryAssetPriceUsd = hasHistoricalPricing
      ? historicalEntryPrices?.entryAssetPriceUsd ?? null
      : null;
    const valuation = calculateLpPositionValuation({
      runeDeposit: withdrawable.runeDeposited,
      assetDeposit: withdrawable.asset2Deposited,
      runeWithdrawable: withdrawable.runeWithdrawable,
      assetWithdrawable: withdrawable.asset2Withdrawable,
      runeCurrentPriceUsd: currentRunePriceUsd,
      assetCurrentPriceUsd: currentAssetPriceUsd,
      runeEntryPriceUsd: entryRunePriceUsd,
      assetEntryPriceUsd: entryAssetPriceUsd,
    });

    return {
      address: poolRaw.assetAddress,
      pool: poolRaw.pool,
      assetSymbol,
      runeDeposit: poolRaw.runeDeposit,
      asset2Deposit: poolRaw.assetDeposit,
      liquidityUnits: poolRaw.liquidityUnits,
      runeAdded: poolRaw.runeAdded,
      runePending: poolRaw.runePending,
      runeWithdrawn: poolRaw.runeWithdrawn,
      asset2Added: poolRaw.assetAdded,
      asset2Pending: poolRaw.assetPending,
      asset2Withdrawn: poolRaw.assetWithdrawn,
      volume24h: poolData?.volume24h ?? '0',
      runeDepth: poolData?.runeDepth ?? '0',
      asset2Depth: poolData?.assetDepth ?? '0',
      dateFirstAdded: poolRaw.dateFirstAdded,
      dateLastAdded: poolRaw.dateLastAdded,
      poolApy: Number.isFinite(Number(poolData?.annualPercentageRate)) ? Number(poolData?.annualPercentageRate) * 100 : 0,
      poolStatus,
      ownershipPercent: deriveOwnershipPercent(poolRaw.liquidityUnits, poolData?.liquidityUnits),
      hasPending: runePending > 0n || asset2Pending > 0n,

      runeDepositedValue: withdrawable.runeDeposited,
      asset2DepositedValue: withdrawable.asset2Deposited,
      runeWithdrawable: withdrawable.runeWithdrawable,
      asset2Withdrawable: withdrawable.asset2Withdrawable,
      currentRunePriceUsd,
      currentAssetPriceUsd,
      entryRunePriceUsd,
      entryAssetPriceUsd,
      currentTotalValueUsd: valuation.currentTotalValueUsd,
      depositedTotalValueUsd: valuation.depositedTotalValueUsd,
      netProfitLoss: valuation.netProfitLossUsd !== null ? formatPnlDisplay(valuation.netProfitLossUsd).text : 'Current value only',
      netProfitLossUsd: valuation.netProfitLossUsd,
      netProfitLossPercent: valuation.netProfitLossPercent,
      hodlValueUsd: valuation.hodlValueUsd,
      impermanentLossUsd: valuation.impermanentLossUsd,
      impermanentLossPercent: valuation.impermanentLossPercent,
      impermanentLossValue: valuation.impermanentLossUsd,
      pricingSource,
      runeEntryPrice: entryRunePriceUsd,
      asset2EntryPrice: entryAssetPriceUsd,
    };
  });

  const state = errorState.state !== 'ready'
    ? errorState.state
    : positions.length > 0
      ? 'ready'
      : 'empty';
  return {
    positions,
    isLoading,
    state,
    error: errorState.message,
    retry: async () => mutate(),
    loadingProgress,
  };
};
