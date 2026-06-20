import React from 'react';
import useSWR from 'swr';
import { getMemberDetails, getPools, getRunePriceHistory, getHistoricalRunePriceWithSource, getPoolHistoryAtTimestamp, MemberDetailsRaw, PoolDetailRaw, PoolHistoryEntry, type HistoricalRunePriceResult } from '../api/midgard';
import { getLiquidityProvider, LiquidityProviderRaw } from '../api/thornode';
import { LpPoolStatus, LpPosition, LpPricingSource, LpRedeemQuoteSource, type LpEntryRunePriceSource } from '../types/lp';
import { calculateLpWithdrawableAmounts, formatPnlDisplay, calculateAssetPriceFromPoolDepth } from '../utils/calculations';
import { normalizeApy } from '../utils/fee-calculations';
import { rawRuneToDisplayNumber } from '../utils/formatters';
import { calculateLpPositionValuation, getCurrentAssetPriceUsd, getLpAssetSymbol } from '../utils/lp-analytics';
import { getMidgardDataFreshness, normalizeMidgardTimestampToSeconds, type MidgardFreshness } from '../utils/midgard-time';
import { MOCK_RUNE_PRICE, isDevelopmentMode } from '../mock-data';

type LpDataState = 'ready' | 'empty' | 'error';
const LP_RUNE_PRICE_STALE_AFTER_MS = 36 * 60 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), ms);
    }),
  ]);
}

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
      message: 'Midgard LP pricing is temporarily unavailable right now. Current market value is unavailable until the price feed recovers.',
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
  entryRunePriceSource: LpEntryRunePriceSource | null;
  pricingSource: LpPricingSource;
}

const SECONDS_PER_DAY = 86400;
const historicalRunePriceCache = new Map<number, Promise<HistoricalRunePriceResult | null>>();
const historicalPoolHistoryCache = new Map<string, Promise<PoolHistoryEntry | null>>();

function historicalDayKey(timestamp: number): number {
  return Math.floor(timestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;
}

function getCachedHistoricalRunePrice(timestamp: number): Promise<HistoricalRunePriceResult | null> {
  const dayKey = historicalDayKey(timestamp);
  let promise = historicalRunePriceCache.get(dayKey);
  if (!promise) {
    promise = getHistoricalRunePriceWithSource(timestamp).catch((error) => {
      if (historicalRunePriceCache.get(dayKey) === promise) {
        historicalRunePriceCache.delete(dayKey);
      }
      throw error;
    });
    historicalRunePriceCache.set(dayKey, promise);
  }
  return promise;
}

function getCachedPoolHistoryAtTimestamp(pool: string, timestamp: number): Promise<PoolHistoryEntry | null> {
  const dayKey = historicalDayKey(timestamp);
  const cacheKey = `${pool}:${dayKey}`;
  let promise = historicalPoolHistoryCache.get(cacheKey);
  if (!promise) {
    promise = getPoolHistoryAtTimestamp(pool, timestamp).catch((error) => {
      if (historicalPoolHistoryCache.get(cacheKey) === promise) {
        historicalPoolHistoryCache.delete(cacheKey);
      }
      throw error;
    });
    historicalPoolHistoryCache.set(cacheKey, promise);
  }
  return promise;
}

function clearLpHistoricalCaches(): void {
  historicalRunePriceCache.clear();
  historicalPoolHistoryCache.clear();
}

export function __clearLpHistoricalCachesForTests(): void {
  if (process.env.NODE_ENV !== 'test') return;
  clearLpHistoricalCaches();
}

function normalizeHistoryTimestamp(rawTimestamp: string): number {
  return normalizeMidgardTimestampToSeconds(rawTimestamp);
}

interface CurrentLpDataWithThorNode {
  memberDetails: MemberDetailsRaw;
  pools: PoolDetailRaw[];
  thorNodeLpData: Map<string, LiquidityProviderRaw>;
  thorNodeLpFailures: Set<string>;
  runePriceUSD: number;
  runePriceFreshness: MidgardFreshness;
}

function buildMockCurrentLpData(address: string): CurrentLpDataWithThorNode {
  const memberDetails: MemberDetailsRaw = {
    pools: [
      {
        pool: 'BTC.BTC',
        runeAddress: address,
        assetAddress: 'bc1qheimdallmocklp0000000000000000000000',
        liquidityUnits: '125000000',
        runeDeposit: '250000000000',
        assetDeposit: '5000000',
        runeAdded: '250000000000',
        assetAdded: '5000000',
        runePending: '0',
        assetPending: '0',
        runeWithdrawn: '0',
        assetWithdrawn: '0',
        dateFirstAdded: '1700000000',
        dateLastAdded: '1700000000',
      },
    ],
  };
  const pools: PoolDetailRaw[] = [
    {
      asset: 'BTC.BTC',
      volume24h: '3250000000000',
      assetDepth: '10000000000',
      runeDepth: '9050000000000000',
      assetPrice: '905000',
      assetPriceUSD: '45000',
      annualPercentageRate: '0.084',
      poolAPY: '0.087',
      earnings: '0',
      earningsAnnualAsPercentOfDepth: '0',
      lpLuvi: '0',
      saversAPR: '0',
      status: 'available',
      liquidityUnits: '1000000000000',
      synthUnits: '0',
      synthSupply: '0',
      units: '1000000000000',
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
  const thorNodeLpData = new Map<string, LiquidityProviderRaw>([
    [
      'BTC.BTC',
      {
        rune_address: address,
        asset_address: 'bc1qheimdallmocklp0000000000000000000000',
        rune_deposit_value: '250000000000',
        asset_deposit_value: '5000000',
        rune_redeem_value: '260000000000',
        asset_redeem_value: '4500000',
        units: '125000000',
        pending_rune: '0',
        pending_asset: '0',
        last_add_height: 12345678,
        last_withdraw_height: 0,
      },
    ],
  ]);

  return {
    memberDetails,
    pools,
    thorNodeLpData,
    thorNodeLpFailures: new Set<string>(),
    runePriceUSD: MOCK_RUNE_PRICE,
    runePriceFreshness: getMidgardDataFreshness(Math.floor(Date.now() / 1000), LP_RUNE_PRICE_STALE_AFTER_MS),
  };
}

function buildMockHistoricalPriceSnapshots(): Map<string, HistoricalPriceSnapshot> {
  return new Map<string, HistoricalPriceSnapshot>([
    [
      'BTC.BTC',
      {
        entryRunePriceUsd: 0.42,
        entryAssetPriceUsd: 30000,
        entryRunePriceSource: 'midgard',
        pricingSource: 'historical',
      },
    ],
  ]);
}

async function fetchHistoricalPriceSnapshots(memberPools: MemberDetailsRaw['pools']): Promise<Map<string, HistoricalPriceSnapshot>> {
  const historicalPrices = new Map<string, HistoricalPriceSnapshot>();
  const pricePromises = memberPools.map(async (pool) => {
    const firstAddedTimestamp = normalizeHistoryTimestamp(pool.dateFirstAdded);
    if (firstAddedTimestamp <= 0) {
      return;
    }

    try {
      const [runeEntryPriceResult, poolHistory] = await Promise.all([
        withTimeout(getCachedHistoricalRunePrice(firstAddedTimestamp), 4000),
        withTimeout(getCachedPoolHistoryAtTimestamp(pool.pool, firstAddedTimestamp), 4000)
      ]);

      if (runeEntryPriceResult === null) {
        historicalPrices.set(pool.pool, {
          entryRunePriceUsd: null,
          entryAssetPriceUsd: null,
          entryRunePriceSource: null,
          pricingSource: 'current-only',
        });
        return;
      }

      const runeEntryPrice = runeEntryPriceResult.price;
      const entryRunePriceSource = runeEntryPriceResult.source;
      const hasMidgardRuneEntryPrice = entryRunePriceSource === 'midgard';

      if (!poolHistory?.runeDepth || !poolHistory?.assetDepth) {
        // Fallback: Assume symmetric (50/50) deposit on Day 1 to estimate asset price
        const runeDep = rawRuneToDisplayNumber(pool.runeDeposit);
        const assetDep = rawRuneToDisplayNumber(pool.assetDeposit);

        if (runeDep > 0 && assetDep > 0) {
          const estimatedAssetEntryPrice = (runeDep * runeEntryPrice) / assetDep;
          historicalPrices.set(pool.pool, {
            entryRunePriceUsd: runeEntryPrice,
            entryAssetPriceUsd: estimatedAssetEntryPrice,
            entryRunePriceSource,
            pricingSource: 'estimated',
          });
        } else {
          historicalPrices.set(pool.pool, {
            entryRunePriceUsd: runeEntryPrice,
            entryAssetPriceUsd: null,
            entryRunePriceSource,
            pricingSource: 'current-only',
          });
        }
        return;
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
          entryRunePriceSource: null,
          pricingSource: 'current-only',
        });
        return;
      }

      historicalPrices.set(pool.pool, {
        entryRunePriceUsd: runeEntryPrice,
        entryAssetPriceUsd: asset2EntryPrice,
        entryRunePriceSource,
        pricingSource: hasMidgardRuneEntryPrice ? 'historical' : 'estimated',
      });
    } catch {
      historicalPrices.set(pool.pool, {
        entryRunePriceUsd: null,
        entryAssetPriceUsd: null,
        entryRunePriceSource: null,
        pricingSource: 'current-only',
      });
    }
  });

  await Promise.allSettled(pricePromises);
  return historicalPrices;
}

function buildHistoricalSWRKey(address: string | null, memberDetails: MemberDetailsRaw | undefined): [string, string, string] | null {
  if (!address || !memberDetails?.pools?.length) return null;
  const poolSignature = memberDetails.pools
    .map((pool) => `${pool.pool}:${normalizeHistoryTimestamp(pool.dateFirstAdded)}`)
    .filter((entry) => !entry.endsWith(':0'))
    .sort()
    .join('|');
  return poolSignature ? ['lp-historical', address, poolSignature] : null;
}

export const useLpPositions = (address: string | null) => {
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const useMockData = isDevelopmentMode();
  const mockCurrentData = React.useMemo(
    () => (useMockData && address ? buildMockCurrentLpData(address) : undefined),
    [address, useMockData]
  );
  const mockHistoricalPrices = React.useMemo(
    () => (useMockData && address ? buildMockHistoricalPriceSnapshots() : undefined),
    [address, useMockData]
  );
  const currentSWRKey: [string, string] | null = address && !useMockData ? ['lp-current', address] : null;
  const { data, error, isLoading: isCurrentLoading, mutate: mutateCurrentPositions } = useSWR<CurrentLpDataWithThorNode>(
    currentSWRKey,
    async (key) => {
      const addr = String(key[1]);
      const [memberDetails, pools, runePriceHistory] = await Promise.all([
        getMemberDetails(addr),
        getPools(),
        getRunePriceHistory('day', 1)
      ]);

      const latestRunePriceInterval = runePriceHistory?.intervals?.length
        ? runePriceHistory.intervals[runePriceHistory.intervals.length - 1]
        : undefined;
      const runePriceUSD = latestRunePriceInterval
        ? Number(latestRunePriceInterval.runePriceUSD)
        : 0;
      const runePriceFreshness = getMidgardDataFreshness(
        latestRunePriceInterval?.endTime || latestRunePriceInterval?.startTime,
        LP_RUNE_PRICE_STALE_AFTER_MS
      );

      if (!Number.isFinite(runePriceUSD) || runePriceUSD <= 0) {
        throw new Error('Midgard LP pricing unavailable at /api/midgard/v2/history/rune');
      }

      const thorNodeLpData = new Map<string, LiquidityProviderRaw>();
      const thorNodeLpFailures = new Set<string>();
      const memberPools = memberDetails?.pools || [];
      
      const poolPromises = memberPools.map(async (pool, index) => {
        try {
          const lpData = await getLiquidityProvider(pool.pool, addr);
          if (lpData) {
            thorNodeLpData.set(pool.pool, lpData);
          } else {
            thorNodeLpFailures.add(pool.pool);
          }
        } catch {
          thorNodeLpFailures.add(pool.pool);
        } finally {
          setLoadingProgress(((index + 1) / memberPools.length) * 100);
        }
      });
      await Promise.allSettled(poolPromises);

      return { memberDetails, pools, thorNodeLpData, thorNodeLpFailures, runePriceUSD, runePriceFreshness };
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    }
  );

  const effectiveData = mockCurrentData ?? data;
  const historicalSWRKey = useMockData ? null : buildHistoricalSWRKey(address, effectiveData?.memberDetails);
  const { data: historicalPrices, isLoading: isHistoricalLoading, mutate: mutateHistoricalPrices } = useSWR<Map<string, HistoricalPriceSnapshot>>(
    historicalSWRKey,
    () => fetchHistoricalPriceSnapshots(effectiveData?.memberDetails.pools ?? []),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );
  const effectiveHistoricalPrices = mockHistoricalPrices ?? historicalPrices;

  const errorState = getLpErrorState(error);

  const positions: LpPosition[] = (effectiveData?.memberDetails?.pools || []).map((poolRaw) => {
    const poolData = effectiveData?.pools?.find((p) => p.asset === poolRaw.pool);
    const poolStatus = normalizePoolStatus(poolData?.status);
    const runePending = parseBigInt(poolRaw.runePending);
    const asset2Pending = parseBigInt(poolRaw.assetPending);
    const thorNodeLp = effectiveData?.thorNodeLpData?.get(poolRaw.pool);
    const ownershipPercent = deriveOwnershipPercent(poolRaw.liquidityUnits, poolData?.liquidityUnits);
    const canDeriveRedeemQuote = ownershipPercent > 0
      && parseBigInt(poolData?.runeDepth) > 0n
      && parseBigInt(poolData?.assetDepth) > 0n
      && parseBigInt(poolData?.liquidityUnits) > 0n;

    let withdrawable: {
      runeWithdrawable: string;
      asset2Withdrawable: string;
      runeDeposited: string;
      asset2Deposited: string;
    };
    let redeemQuoteSource: LpRedeemQuoteSource;

    if (thorNodeLp) {
      withdrawable = {
        runeWithdrawable: thorNodeLp.rune_redeem_value,
        asset2Withdrawable: thorNodeLp.asset_redeem_value,
        runeDeposited: thorNodeLp.rune_deposit_value,
        asset2Deposited: thorNodeLp.asset_deposit_value,
      };
      redeemQuoteSource = 'thornode';
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
        ownershipPercent
      );
      redeemQuoteSource = canDeriveRedeemQuote ? 'derived' : 'unavailable';
    }

    const assetSymbol = getLpAssetSymbol(poolRaw.pool);
    const rawCurrentRunePriceUsd = effectiveData?.runePriceUSD ?? 0;
    const rawCurrentAssetPriceUsd = getCurrentAssetPriceUsd(
      {
        assetPriceUSD: poolData?.assetPriceUSD,
        runeDepth: poolData?.runeDepth,
        assetDepth: poolData?.assetDepth,
      },
      rawCurrentRunePriceUsd
    );

    const historicalEntryPrices = effectiveHistoricalPrices?.get(poolRaw.pool);
    const pricingSource = historicalEntryPrices?.pricingSource ?? 'current-only';
    const hasEntryPricing = pricingSource === 'historical' || pricingSource === 'estimated';
    const entryRunePriceSource = hasEntryPricing ? historicalEntryPrices?.entryRunePriceSource ?? null : null;
    const currentRunePriceUsd = rawCurrentRunePriceUsd;
    const currentAssetPriceUsd = rawCurrentAssetPriceUsd;
    const entryRunePriceUsd = hasEntryPricing
      ? historicalEntryPrices?.entryRunePriceUsd ?? null
      : null;
    const entryAssetPriceUsd = hasEntryPricing
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
    const trustedPerformance = hasEntryPricing
      ? {
          depositedTotalValueUsd: valuation.depositedTotalValueUsd,
          netProfitLoss: valuation.netProfitLossUsd !== null ? formatPnlDisplay(valuation.netProfitLossUsd).text : 'Current value only',
          netProfitLossUsd: valuation.netProfitLossUsd,
          netProfitLossPercent: valuation.netProfitLossPercent,
          hodlValueUsd: valuation.hodlValueUsd,
          impermanentLossUsd: valuation.impermanentLossUsd,
          impermanentLossPercent: valuation.impermanentLossPercent,
          impermanentLossValue: valuation.impermanentLossUsd,
        }
      : {
          depositedTotalValueUsd: null,
          netProfitLoss: 'Current value only',
          netProfitLossUsd: null,
          netProfitLossPercent: null,
          hodlValueUsd: null,
          impermanentLossUsd: null,
          impermanentLossPercent: null,
          impermanentLossValue: null,
        };

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
      poolApy: (() => {
        const fromApy = normalizeApy(poolData?.poolAPY);
        if (fromApy > 0) return fromApy;
        return normalizeApy(poolData?.annualPercentageRate);
      })(),
      poolStatus,
      ownershipPercent,
      hasPending: runePending > 0n || asset2Pending > 0n,

      runeDepositedValue: withdrawable.runeDeposited,
      asset2DepositedValue: withdrawable.asset2Deposited,
      runeWithdrawable: withdrawable.runeWithdrawable,
      asset2Withdrawable: withdrawable.asset2Withdrawable,
      redeemQuoteSource,
      claimableTrusted: redeemQuoteSource === 'thornode',
      currentRunePriceUsd,
      currentAssetPriceUsd,
      entryRunePriceUsd,
      entryAssetPriceUsd,
      entryRunePriceSource,
      currentTotalValueUsd: valuation.currentTotalValueUsd,
      depositedTotalValueUsd: trustedPerformance.depositedTotalValueUsd,
      netProfitLoss: trustedPerformance.netProfitLoss,
      netProfitLossUsd: trustedPerformance.netProfitLossUsd,
      netProfitLossPercent: trustedPerformance.netProfitLossPercent,
      hodlValueUsd: trustedPerformance.hodlValueUsd,
      impermanentLossUsd: trustedPerformance.impermanentLossUsd,
      impermanentLossPercent: trustedPerformance.impermanentLossPercent,
      impermanentLossValue: trustedPerformance.impermanentLossValue,
      pricingSource,
      runeEntryPrice: entryRunePriceUsd,
      asset2EntryPrice: entryAssetPriceUsd,
    };
  });

  const isHistoricalEnrichmentLoading = historicalSWRKey !== null && isHistoricalLoading && !effectiveHistoricalPrices;
  const isLoading = useMockData ? false : isCurrentLoading;
  const state = errorState.state !== 'ready'
    ? errorState.state
    : isLoading
      ? 'empty'
    : positions.length > 0
      ? 'ready'
      : 'empty';
  return {
    positions,
    isLoading,
    isHistoricalEnrichmentLoading,
    state,
    error: errorState.message,
    retry: async () => {
      if (useMockData) {
        return;
      }
      clearLpHistoricalCaches();
      await mutateCurrentPositions();
      if (historicalSWRKey) {
        await mutateHistoricalPrices(undefined, { revalidate: true });
      }
    },
    loadingProgress,
    runePriceFreshness: effectiveData?.runePriceFreshness,
  };
};
