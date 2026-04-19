import React from 'react';
import useSWR from 'swr';
import { getMemberDetails, getPools, getRunePriceHistory, MemberDetailsRaw, PoolDetailRaw, RunePriceHistoryRaw } from '../lib/api/midgard';
import { getLiquidityProvider, LiquidityProviderRaw } from '../lib/api/thornode';
import { LpPoolStatus, LpPosition } from '../lib/types/lp';
import { calculateLpWithdrawableAmounts, calculateLpPnl, calculateImpermanentLoss, formatPnlDisplay } from '../lib/utils/calculations';
import { runeToNumber, formatRuneAmount } from '../lib/utils/formatters';

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

interface LpDataWithThorNode {
  memberDetails: MemberDetailsRaw;
  pools: PoolDetailRaw[];
  thorNodeLpData: Map<string, LiquidityProviderRaw>;
  runePriceUSD: number;
}

export const useLpPositions = (address: string | null) => {
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const { data, error, isLoading, mutate } = useSWR<LpDataWithThorNode>(
    address ? address : null,
    async (addr) => {
      const [memberDetails, pools, runePriceHistory] = await Promise.all([
        getMemberDetails(addr),
        getPools(),
        getRunePriceHistory('day', 1).catch(() => null)
      ]);

      const runePriceUSD = runePriceHistory?.intervals?.length
        ? Number(runePriceHistory.intervals[runePriceHistory.intervals.length - 1].runePriceUSD)
        : 0;

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

      return { memberDetails, pools, thorNodeLpData, runePriceUSD };
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
    const parsedPoolApy = Number(poolData?.poolAPY ?? 0);
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

    const runePrice = data?.runePriceUSD ?? 0;
    const assetPrice = runePrice;
    const pnl = calculateLpPnl(
      withdrawable.runeDeposited,
      withdrawable.asset2Deposited,
      withdrawable.runeWithdrawable,
      withdrawable.asset2Withdrawable,
      runePrice,
      assetPrice,
      runePrice,
      assetPrice
    );

    const il = calculateImpermanentLoss(
      withdrawable.runeWithdrawable,
      withdrawable.asset2Withdrawable,
      runePrice,
      assetPrice,
      runePrice,
      assetPrice
    );

    return {
      address: poolRaw.assetAddress,
      pool: poolRaw.pool,
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
      poolApy: Number.isFinite(parsedPoolApy) ? parsedPoolApy : 0,
      poolStatus,
      ownershipPercent: deriveOwnershipPercent(poolRaw.liquidityUnits, poolData?.liquidityUnits),
      hasPending: runePending > 0n || asset2Pending > 0n,

      runeDepositedValue: withdrawable.runeDeposited,
      asset2DepositedValue: withdrawable.asset2Deposited,
      runeWithdrawable: withdrawable.runeWithdrawable,
      asset2Withdrawable: withdrawable.asset2Withdrawable,
      netProfitLoss: formatPnlDisplay(pnl.pnl).text,
      netProfitLossPercent: pnl.pnlPercent,
      impermanentLossPercent: il.ilPercent,
      impermanentLossValue: il.ilValue,
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
