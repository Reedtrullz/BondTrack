import { fetchThornode } from './client';

export interface PoolDetailsRaw {
  asset: string;
  status: 'available' | 'staged' | 'suspended' | 'unknown';
  poolAPY: string;
  volume24h: string;
  runeDepth: string;
  assetDepth: string;
  liquidityUnits: string;
}

export interface MemberPoolRaw {
  pool: string;
  assetAddress: string;
  runeDeposit: string;
  assetDeposit: string;
  runePending: string;
  assetPending: string;
  runeAdded: string;
  runeWithdrawn: string;
  assetAdded: string;
  assetWithdrawn: string;
  liquidityUnits: string;
  dateFirstAdded: number;
  dateLastAdded: number;
}

export interface MemberDetailsRaw {
  pools: MemberPoolRaw[];
}

export interface LPData {
  memberDetails: MemberDetailsRaw | null;
  pools: PoolDetailsRaw[];
  thorNodeLpData: Map<string, LiquidityProviderRaw>;
  runePriceUSD: number;
}

export interface LiquidityProviderRaw {
  rune_redeem_value: string;
  asset_redeem_value: string;
  rune_deposit_value: string;
  asset_deposit_value: string;
}

export async function getAllNodes(init?: RequestInit) {
  return fetchThornode('/thorchain/nodes', init);
}

export async function getNetworkConstants(init?: RequestInit) {
  return fetchThornode('/thorchain/constants', init);
}

export async function getLiquidityProvider(pool: string, address: string) {
  try {
    return await fetchThornode(
      `/thorchain/pool/${encodeURIComponent(pool)}/liquidity_provider/${encodeURIComponent(address)}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('404') || message.includes('not found') || message.includes('Not Implemented')) {
      return null;
    }
    throw error;
  }
}

export async function getMemberDetails(address: string): Promise<MemberDetailsRaw> {
  return fetchThornode(`/thorchain/member/${address}`);
}

export async function getPools(): Promise<PoolDetailsRaw[]> {
  return fetchThornode('/thorchain/pools');
}
