import { fetchThornode } from './client';

export interface MemberDetailsRaw {
  pools: {
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
  }[];
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

export async function getPools() {
  return fetchThornode('/thorchain/pools');
}
