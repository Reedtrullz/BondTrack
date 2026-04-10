import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { getMemberDetails, getPools, MemberDetailsRaw, PoolDetailRaw } from '../lib/api/midgard';
import { LpPosition } from '../lib/types/lp';

interface LpData {
  memberDetails: MemberDetailsRaw;
  pools: PoolDetailRaw[];
}

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

  const isNotFound = error?.includes('404');

  const positions: LpPosition[] = (data?.memberDetails?.pools || []).map((poolRaw) => {
    const poolData = data?.pools?.find((p) => p.asset === poolRaw.pool);
    
    return {
      address: poolRaw.assetAddress,
      pool: poolRaw.pool,
      bondedRune: poolRaw.runeDeposit,
      rewards: poolRaw.runeAdded,
      apy: poolData ? parseFloat(poolData.poolAPY) : 0,
      healthScore: 100,
      slashRisk: 0,
      status: 'active',
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
