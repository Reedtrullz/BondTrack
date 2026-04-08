import { fetchMidgard } from './client';

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
  totalPools: string;
  totalLiquidityRune: string;
  totalBondsRune: string;
  totalReserve: string;
  runePriceUSD: string;
  runePriceBTC: string;
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
    send?: {
      memo: string;
    };
  };
}

export interface ActionsResponseRaw {
  actions: ActionRaw[];
  count: string;
}

export async function getBondDetails(address: string): Promise<BondDetailsRaw> {
  return fetchMidgard<BondDetailsRaw>(`/v2/bonds/${address}`);
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

export async function getRunePriceHistory(interval = 'day', count = 30): Promise<RunePriceHistoryRaw> {
  return fetchMidgard<RunePriceHistoryRaw>(`/v2/history/rune?interval=${interval}&count=${count}`);
}

export async function getNetwork(): Promise<NetworkRaw> {
  return fetchMidgard<NetworkRaw>('/v2/network');
}

export async function getActions(address: string, count = 50, type?: string): Promise<ActionsResponseRaw> {
  const params = new URLSearchParams();
  params.set('address', address);
  params.set('count', String(count));
  if (type) params.set('type', type);
  const qs = params.toString();
  return fetchMidgard<ActionsResponseRaw>(`/v2/actions${qs ? `?${qs}` : ''}`);
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
  return fetchMidgard<THORNameLookupRaw>(`/v2/thorname/lookup/${name}`);
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
