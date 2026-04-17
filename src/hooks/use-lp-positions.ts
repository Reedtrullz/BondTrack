import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { getMemberDetails, getPools, MemberDetailsRaw, PoolDetailRaw } from '../lib/api/midgard';
import { LpPosition } from '../lib/types/lp';

interface LpData {
  memberDetails: MemberDetailsRaw;
  pools: PoolDetailRaw[];
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

export const useLpPositions = () => {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  const { data, error, isLoading } = useSWR<LpData>(
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
    }
  );

  const isNotFound = error && String(error).includes('404');

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

  const totalBondedRune = isNotFound ? '0' : positions.reduce((acc, pos) => acc + BigInt(pos.bondedRune), 0n).toString();
  const totalRewards = isNotFound ? '0' : positions.reduce((acc, pos) => acc + BigInt(pos.rewards), 0n).toString();

  return {
    positions,
    isLoading,
    error: isNotFound ? undefined : (error instanceof Error ? error.message : undefined),
    totalBondedRune,
    totalRewards,
  };
};
