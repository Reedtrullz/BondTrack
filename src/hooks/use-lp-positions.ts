import useSWR from 'swr';
import { getMemberDetails, getPools, MemberDetailsRaw, PoolDetailRaw } from '../lib/api/midgard';
import { LpPosition } from '../lib/types/lp';

interface LpData {
  memberDetails: MemberDetailsRaw;
  pools: PoolDetailRaw[];
}

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

/**
 * Maps Midgard pool status to LP UI status union.
 * available = pool is healthy and accepting LPs → active
 * staged = pool is not yet activated → standby
 */
const mapPoolStatusToUi = (poolStatus: string | undefined): LpPosition['status'] => {
  switch (poolStatus) {
    case 'available':
      return 'active';
    case 'staged':
      return 'standby';
    default:
      return 'standby'; // Default to standby for unknown statuses
  }
};

/**
 * Derives health score from pool status.
 * LP positions cannot be slashed like node bonds, so health is based on pool availability.
 */
const deriveHealthScore = (poolStatus: string | undefined): number => {
  switch (poolStatus) {
    case 'available':
      return 100; // Pool is healthy
    case 'staged':
      return 50; // Pool not yet fully active
    default:
      return 50; // Default to reduced health for unknown statuses
  }
};

export const useLpPositions = (address: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<LpData>(
    address ? address : null,
    async (addr) => {
      const [memberDetails, pools] = await Promise.all([
        getMemberDetails(addr),
        getPools(),
      ]);
      return { memberDetails, pools };
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
    const poolStatus = poolData?.status;
    
    return {
      address: poolRaw.assetAddress,
      pool: poolRaw.pool,
      bondedRune: poolRaw.runeDeposit,
      rewards: poolRaw.runeAdded,
      apy: poolData ? parseFloat(poolData.poolAPY) : 0,
      healthScore: deriveHealthScore(poolStatus),
      slashRisk: 0,
      status: mapPoolStatusToUi(poolStatus),
      unbondWindowRemaining: 0,
    };
  });

  const state = errorState.state !== 'ready'
    ? errorState.state
    : positions.length > 0
      ? 'ready'
      : 'empty';

  const totalBondedRune = state !== 'ready' ? '0' : positions.reduce((acc, pos) => acc + BigInt(pos.bondedRune), 0n).toString();
  const totalRewards = state !== 'ready' ? '0' : positions.reduce((acc, pos) => acc + BigInt(pos.rewards), 0n).toString();

  return {
    positions,
    isLoading,
    state,
    error: errorState.message,
    totalBondedRune,
    totalRewards,
    retry: async () => mutate(),
  };
};
