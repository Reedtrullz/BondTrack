import { fetchMidgard } from './client';
import { getCoingeckoRunePrice } from './coingecko';
import { NETWORK } from '../config';

export interface BondDetailsRaw {
  address: string;
  totalBonded: string;
  nodes: {
    address: string;
    bond: string;
    status: string;
  }[];
}

export interface ChurnRaw {
  height: string;
  date: string;
}

export interface EarningsMetaRaw {
  startTime: string;
  endTime: string;
  liquidityFees: string;
  blockRewards: string;
  earnings: string;
  bondingEarnings: string;
  liquidityEarnings: string;
  avgNodeCount: string;
  runePriceUSD: string;
  pools: {
    pool: string;
    assetLiquidityFees: string;
    runeLiquidityFees: string;
    totalLiquidityFeesRune: string;
    saverEarning: string;
    rewards: string;
    earnings: string;
  }[];
}

export interface EarningsIntervalRaw {
  startTime: string;
  endTime: string;
  liquidityFees: string;
  blockRewards: string;
  earnings: string;
  bondingEarnings: string;
  liquidityEarnings: string;
  avgNodeCount: string;
  runePriceUSD: string;
  pools: {
    pool: string;
    assetLiquidityFees: string;
    runeLiquidityFees: string;
    totalLiquidityFeesRune: string;
    saverEarning: string;
    rewards: string;
    earnings: string;
  }[];
}

export interface EarningsHistoryRaw {
  meta: EarningsMetaRaw;
  intervals: EarningsIntervalRaw[];
}

export interface FeeRevenueDailyRaw {
  date: string;
  totalFees: string;
  bondRewards: string;
  poolRewards: string;
  runePriceUSD: string;
}

export interface FeeRevenueSummaryRaw {
  total24h: string;
  total7d: string;
  total30d: string;
  total24hUsd: number;
  total7dUsd: number;
  total30dUsd: number;
}

export interface FeeRevenueRaw {
  daily: FeeRevenueDailyRaw[];
  summary: FeeRevenueSummaryRaw;
}

export interface RunePriceIntervalRaw {
  startTime: string;
  endTime: string;
  runePriceUSD: string;
}

export interface RunePriceHistoryRaw {
  meta: {
    startTime: string;
    endTime: string;
    startRunePriceUSD: string;
    endRunePriceUSD: string;
  };
  intervals: RunePriceIntervalRaw[];
}

export interface NetworkRaw {
  activeBonds: string[];
  activeNodeCount: string;
  standbyBonds: string[];
  standbyNodeCount: string;
  totalPooledRune: string;
  totalReserve: string;
  bondMetrics: {
    totalActiveBond: string;
    totalStandbyBond: string;
    averageActiveBond: string;
    averageStandbyBond: string;
    medianActiveBond: string;
    minimumActiveBond: string;
    maximumActiveBond: string;
    bondHardCap: string;
  };
  bondingAPY: string;
  liquidityAPY: string;
  blockRewards: {
    blockReward: string;
    bondReward: string;
    poolReward: string;
  };
  nextChurnHeight: string;
  poolActivationCountdown: string;
}

export interface ActionRaw {
  type: string;
  date: string;
  height: string;
  pools: string[];
  memo: string;
  tx: {
    type: string;
    address: string;
    coins: { asset: string; amount: string }[];
    txID: string;
    chain: string;
    fromAddress: string;
  };
  status: string;
  in?: {
    address: string;
    coins: { asset: string; amount: string }[];
    txID: string;
  }[];
  out?: {
    address: string;
    coins: { asset: string; amount: string }[];
    txID: string;
  }[];
  metadata?: {
    bond?: {
      memo: string;
      nodeAddress: string;
    };
    refund?: {
      memo: string;
      txType: string;
      reason?: string;
    };
    send?: {
      memo: string;
    };
  };
}

export interface MemberDetailsRaw {
  pools: MemberPoolRaw[];
}

export interface MemberPoolRaw {
  pool: string;
  runeAddress: string;
  assetAddress: string;
  liquidityUnits: string;
  runeDeposit: string;
  assetDeposit: string;
  runeAdded: string;
  assetAdded: string;
  runePending: string;
  assetPending: string;
  runeWithdrawn: string;
  assetWithdrawn: string;
  dateFirstAdded: string;
  dateLastAdded: string;
}

export interface PoolDetailRaw {
  asset: string;
  volume24h: string;
  assetDepth: string;
  runeDepth: string;
  assetPrice: string;
  assetPriceUSD: string;
  annualPercentageRate: string;
  poolAPY: string;
  earnings: string;
  earningsAnnualAsPercentOfDepth: string;
  lpLuvi: string;
  saversAPR: string;
  status: string;
  liquidityUnits: string;
  synthUnits: string;
  synthSupply: string;
  units: string;
  nativeDecimal: string;
  saversUnits: string;
  saversDepth: string;
  totalCollateral: string;
  totalDebtTor: string;
  saversYieldShare: string;
  depthPlus2Percent: string;
  depthMinus2Percent: string;
}

export interface ActionsResponseRaw {
  actions: ActionRaw[];
  count: string;
}

export async function getBondDetails(address: string): Promise<BondDetailsRaw> {
  return fetchMidgard<BondDetailsRaw>(`/v2/bonds/${encodeURIComponent(address)}`);
}

export async function getChurns(): Promise<ChurnRaw[]> {
  return fetchMidgard<ChurnRaw[]>('/v2/churns');
}

export async function getEarningsHistory(interval?: string, count?: number): Promise<EarningsHistoryRaw> {
  const params = new URLSearchParams();
  if (interval) params.set('interval', interval);
  if (count) params.set('count', String(count));
  const qs = params.toString();
  return fetchMidgard<EarningsHistoryRaw>(`/v2/history/earnings${qs ? `?${qs}` : ''}`);
}

function parseRuneAmount(raw: string | undefined): bigint {
  try {
    if (!raw) return 0n;
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

function formatFeeRevenueDate(timestamp: string): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function sumRuneAmounts(values: string[]): string {
  return values.reduce((sum, value) => sum + parseRuneAmount(value), 0n).toString();
}

function runeAmountToUsd(raw: string, priceUSD: string): number {
  const runeAmount = Number(parseRuneAmount(raw)) / 1e8;
  const runePrice = Number.parseFloat(priceUSD);
  if (!Number.isFinite(runeAmount) || !Number.isFinite(runePrice)) {
    return 0;
  }

  return runeAmount * runePrice;
}

export async function getFeeRevenue(): Promise<FeeRevenueRaw> {
  const earningsHistory = await getEarningsHistory('day', 30);
  const daily = [...(earningsHistory.intervals ?? [])]
    .sort((a, b) => Number(a.startTime) - Number(b.startTime))
    .map((interval) => {
      const totalFees = (parseRuneAmount(interval.liquidityFees) + parseRuneAmount(interval.blockRewards)).toString();
      const bondRewards = interval.bondingEarnings || '0';
      const poolRewards = interval.liquidityEarnings || '0';

      return {
        date: formatFeeRevenueDate(interval.startTime),
        totalFees,
        bondRewards,
        poolRewards,
        runePriceUSD: interval.runePriceUSD,
      } satisfies FeeRevenueDailyRaw;
    });

  let last24h = daily.length > 0 ? daily[daily.length - 1] : null;
  if (last24h && last24h.totalFees === '0' && daily.length > 1) {
    last24h = daily[daily.length - 2];
  }
  const last7d = daily.slice(-7);
  const last30d = daily.slice(-30);

  return {
    daily,
    summary: {
      total24h: last24h?.totalFees ?? '0',
      total7d: sumRuneAmounts(last7d.map((entry) => entry.totalFees)),
      total30d: sumRuneAmounts(last30d.map((entry) => entry.totalFees)),
      total24hUsd: last24h ? runeAmountToUsd(last24h.totalFees, last24h.runePriceUSD) : 0,
      total7dUsd: last7d.reduce((sum, entry) => sum + runeAmountToUsd(entry.totalFees, entry.runePriceUSD), 0),
      total30dUsd: last30d.reduce((sum, entry) => sum + runeAmountToUsd(entry.totalFees, entry.runePriceUSD), 0),
    },
  };
}

export async function getRunePriceHistory(interval = 'day', count?: number, from?: number, to?: number): Promise<RunePriceHistoryRaw> {
  const params = new URLSearchParams();
  params.set('interval', interval);
  if (count !== undefined) params.set('count', String(count));
  if (from !== undefined) params.set('from', String(from));
  if (to !== undefined) params.set('to', String(to));
  const qs = params.toString();
  return fetchMidgard<RunePriceHistoryRaw>(`/v2/history/rune?${qs}`);
}

const HISTORY_COVERAGE_TOLERANCE_SECONDS = 86400;

function normalizeHistoryTimestampValue(timestamp: number | string): number {
  const numericTimestamp = Number(timestamp);

  if (!Number.isFinite(numericTimestamp) || numericTimestamp <= 0) {
    return Number.NaN;
  }

  return numericTimestamp > 1e12 ? numericTimestamp / 1e9 : numericTimestamp;
}

function hasHistoryCoverage(timestamps: Array<number | string>, requestedTimestamp: number): boolean {
  const normalizedRequestedTimestamp = normalizeHistoryTimestampValue(requestedTimestamp);
  const finiteTimestamps = timestamps
    .map((timestamp) => normalizeHistoryTimestampValue(timestamp))
    .filter(Number.isFinite);

  if (!Number.isFinite(normalizedRequestedTimestamp) || finiteTimestamps.length === 0) {
    return false;
  }

  const earliestTimestamp = Math.min(...finiteTimestamps);
  const latestTimestamp = Math.max(...finiteTimestamps);

  return normalizedRequestedTimestamp >= earliestTimestamp - HISTORY_COVERAGE_TOLERANCE_SECONDS
    && normalizedRequestedTimestamp <= latestTimestamp + HISTORY_COVERAGE_TOLERANCE_SECONDS;
}

export async function getHistoricalRunePrice(timestamp: number): Promise<number | null> {
  try {
    const normalizedTimestamp = Math.floor(normalizeHistoryTimestampValue(timestamp));
    if (!Number.isFinite(normalizedTimestamp)) return null;

    // Use a narrow 2-day window instead of a large 'count' to prevent Midgard 502s
    const from = normalizedTimestamp - 86400;
    const to = normalizedTimestamp + 86400;

    const history = await getRunePriceHistory('day', undefined, from, to);

    if (!history.intervals.length) {
      return null;
    }

    if (!hasHistoryCoverage(
      history.intervals.flatMap((interval) => [interval.startTime, interval.endTime]),
      normalizedTimestamp
    )) {
      return null;
    }

    const containingInterval = history.intervals.find((interval) => {
      const intervalStart = normalizeHistoryTimestampValue(interval.startTime);
      const intervalEnd = normalizeHistoryTimestampValue(interval.endTime);
      return Number.isFinite(intervalStart)
        && Number.isFinite(intervalEnd)
        && normalizedTimestamp >= intervalStart
        && normalizedTimestamp < intervalEnd;
    });

    if (containingInterval) {
      const runePriceUsd = Number.parseFloat(containingInterval.runePriceUSD);
      if (Number.isFinite(runePriceUsd) && runePriceUsd > 0) {
        return runePriceUsd;
      }
    }

    // Fallback 1: Try finding the closest interval in the Midgard response
    if (history.intervals.length > 0) {
      let closestInterval = history.intervals[0];
      let minDiff = Math.abs(normalizeHistoryTimestampValue(closestInterval.startTime) - normalizedTimestamp);

      for (const interval of history.intervals) {
        const intervalTimestamp = normalizeHistoryTimestampValue(interval.startTime);
        const diff = Math.abs(intervalTimestamp - normalizedTimestamp);
        if (Number.isFinite(intervalTimestamp) && diff < minDiff) {
          minDiff = diff;
          closestInterval = interval;
        }
      }

      const runePriceUsd = Number.parseFloat(closestInterval.runePriceUSD);
      if (Number.isFinite(runePriceUsd) && runePriceUsd > 0) {
        return runePriceUsd;
      }
    }

    // Fallback 2: Try CoinGecko if Midgard has no data for this range
    return getCoingeckoRunePrice(normalizedTimestamp);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Don't log 404, 500, or 502 as full errors for historical price lookups
    if (!message.includes('404') && !message.includes('500') && !message.includes('502')) {
      console.error('Error fetching historical RUNE price:', error);
    }
    return null;
  }
}

export async function getNetwork(): Promise<NetworkRaw> {
  return fetchMidgard<NetworkRaw>('/v2/network');
}

export async function getActions(address: string, limit: number = NETWORK.MAX_ACTIONS_LIMIT, actionTypes?: string, typeParam = 'type'): Promise<ActionsResponseRaw> {
  const params = new URLSearchParams();
  params.set('address', address);
  params.set('limit', String(limit));
  if (actionTypes) params.set(typeParam, actionTypes);
  const qs = params.toString();
  return fetchMidgard<ActionsResponseRaw>(`/v2/actions${qs ? `?${qs}` : ''}`);
}

export async function getPools(): Promise<PoolDetailRaw[]> {
  return fetchMidgard<PoolDetailRaw[]>('/v2/pools');
}

export interface THORNameAliasRaw {
  chain: string;
  address: string;
}

export interface THORNameEntryRaw {
  name: string;
  expire: string;
  owner: string;
  preferred_asset: string;
  aliases: THORNameAliasRaw[];
}

export interface THORNameLookupRaw {
  entry: THORNameEntryRaw | null;
}

export async function getTHORNameLookup(name: string): Promise<THORNameLookupRaw> {
  return fetchMidgard<THORNameLookupRaw>(`/v2/thorname/lookup/${encodeURIComponent(name)}`);
}

export async function getTHORNameReverseLookup(address: string): Promise<THORNameLookupRaw> {
  // Existing function retains retry behavior for backward compatibility
  try {
    return await fetchMidgard<THORNameLookupRaw>(`/v2/thorname/rlookup/${encodeURIComponent(address)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('404') || message.includes('502')) {
      return { entry: null };
    }
    throw error;
  }
}

/**
 * Perform THORName reverse lookup without retrying on 5xx errors.
 * This is used for optional UI enrichment where repeated retries cause spam.
 */
export async function getTHORNameReverseLookupNoRetry(address: string): Promise<THORNameLookupRaw> {
  const url = `/v2/thorname/rlookup/${encodeURIComponent(address)}`;
  try {
    const res = await fetch(`/api/midgard${url}`, {
      headers: { Accept: 'application/json' },
      // Use Next.js revalidate but no custom retry logic
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      if (res.status === 404 || res.status === 502) {
        return { entry: null };
      }
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as THORNameLookupRaw;
  } catch {
    // Network errors are treated as no result to avoid retries
    return { entry: null };
  }
}


export interface HealthRaw {
  lastThorNode: { height: number };
}

export interface PoolHistoryRaw {
  intervals: {
    startTime: string;
    endTime: string;
    runeDepth: string;
    assetDepth: string;
    synthSupply: string;
    synthDepth: string;
    liquidityUnits: string;
    lpUnits: string;
    membersCount: string;
    status: string;
  }[];
}

export async function getPoolHistory(pool: string, interval = 'day', count?: number, from?: number, to?: number): Promise<PoolHistoryRaw> {
  const params = new URLSearchParams();
  params.set('interval', interval);
  if (count !== undefined) params.set('count', String(count));
  if (from !== undefined) params.set('from', String(from));
  if (to !== undefined) params.set('to', String(to));
  const qs = params.toString();
  return fetchMidgard<PoolHistoryRaw>(`/v2/pools/${encodeURIComponent(pool)}/history?${qs}`);
}

export interface PoolHistoryEntry {
  timestamp: number;
  runeDepth: string;
  assetDepth: string;
  liquidityUnits: string;
}

export async function getPoolHistoryAtTimestamp(pool: string, timestamp: number): Promise<PoolHistoryEntry | null> {
  try {
    const normalizedTimestamp = Math.floor(normalizeHistoryTimestampValue(timestamp));
    if (!Number.isFinite(normalizedTimestamp)) return null;

    // Use a narrow 2-day window instead of a large 'count' to prevent Midgard 502s
    const from = normalizedTimestamp - 86400;
    const to = normalizedTimestamp + 86400;

    const history = await getPoolHistory(pool, 'day', undefined, from, to);

    if (!history.intervals.length) {
      return null;
    }

    const containingInterval = history.intervals.find((interval) => {
      const intervalStart = normalizeHistoryTimestampValue(interval.startTime);
      const intervalEnd = normalizeHistoryTimestampValue(interval.endTime);
      return Number.isFinite(intervalStart)
        && Number.isFinite(intervalEnd)
        && normalizedTimestamp >= intervalStart
        && normalizedTimestamp < intervalEnd;
    });

    if (containingInterval) {
      return {
        timestamp: normalizeHistoryTimestampValue(containingInterval.startTime),
        runeDepth: containingInterval.runeDepth,
        assetDepth: containingInterval.assetDepth,
        liquidityUnits: containingInterval.liquidityUnits,
      };
    }

    let closestEntry: PoolHistoryEntry | null = null;
    let minDiff = Infinity;

    for (const interval of history.intervals) {
      const intervalTimestamp = normalizeHistoryTimestampValue(interval.startTime);
      if (!Number.isFinite(intervalTimestamp)) {
        continue;
      }

      const diff = Math.abs(intervalTimestamp - normalizedTimestamp);

      if (diff < minDiff) {
        minDiff = diff;
        closestEntry = {
          timestamp: intervalTimestamp,
          runeDepth: interval.runeDepth,
          assetDepth: interval.assetDepth,
          liquidityUnits: interval.liquidityUnits,
        };
      }
    }

    return closestEntry;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Don't log 404, 500, or 502 as full errors for historical pool history lookups
    if (!message.includes('404') && !message.includes('500') && !message.includes('502')) {
      console.error(`Failed to fetch pool history for ${pool} at ${timestamp}:`, error);
    }
    return null;
  }
}

export async function getHealth(): Promise<HealthRaw> {
  return fetchMidgard<HealthRaw>('/v2/health');
}

export async function getMemberDetails(address: string): Promise<MemberDetailsRaw> {
  return fetchMidgard<MemberDetailsRaw>(`/v2/member/${encodeURIComponent(address)}`);
}

export async function getTHORNameReverseLookup(address: string): Promise<THORNameLookupRaw> {
  return fetchMidgard<THORNameLookupRaw>(`/v2/thorname/rlookup/${address}`);
}

export interface HealthRaw {
  lastThorNode: { height: number };
}

export async function getHealth(): Promise<HealthRaw> {
  return fetchMidgard<HealthRaw>('/v2/health');
}
