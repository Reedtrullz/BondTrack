'use client';

import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { getMemberDetails, getPools, getLiquidityProvider } from '@/lib/api/thornode';
import { getRunePriceHistory } from '@/lib/api/midgard';
import {
  calculateLpPnl,
  calculateLpWithdrawableAmounts,
  calculateAssetPrice,
  calculateOwnershipPercent,
  formatPnlDisplay,
} from '@/lib/utils/calculations';
import { formatRuneAmount, runeToNumber } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Waves } from 'lucide-react';
import { LPData, MemberPoolRaw, PoolDetailsRaw, LiquidityProviderRaw } from './types/lp';

interface LPPosition {
  address: string;
  pool: string;
  runeDeposit: string;
  asset2Deposit: string;
  liquidityUnits: string;
  runeAdded: string;
  runePending: string;
  runeWithdrawn: string;
  asset2Added: string;
  asset2Pending: string;
  asset2Withdrawn: string;
  volume24h: string;
  runeDepth: string;
  asset2Depth: string;
  dateFirstAdded: number;
  dateLastAdded: number;
  poolApy: number;
  poolStatus: 'available' | 'staged' | 'suspended' | 'unknown';
  ownershipPercent: number;
  hasPending: boolean;
  runeDepositedValue: string;
  asset2DepositedValue: string;
  runeWithdrawable: string;
  asset2Withdrawable: string;
  netProfitLoss: string;
  netProfitLossPercent: number;
}

export default function LPPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  const { data, error, isLoading, mutate } = useSWR<LPData>(
    address || null,
    async (addr) => {
      const [memberDetails, pools, runePriceHistory] = await Promise.all([
        getMemberDetails(addr),
        getPools(),
        getRunePriceHistory('day', 1).catch(() => null),
      ]);

      const runePriceUSD =
        runePriceHistory?.intervals?.length > 0
          ? Number(runePriceHistory.intervals[runePriceHistory.intervals.length - 1].runePriceUSD)
          : 0;

      const thorNodeLpData = new Map<string, any>();
      const poolPromises = (memberDetails?.pools || []).map(async (pool) => {
        try {
          const lpData = await getLiquidityProvider(pool.pool, addr);
          if (lpData) {
            thorNodeLpData.set(pool.pool, lpData);
          }
        } catch (e) {
          // Ignore errors for individual pools
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

  // Determine state based on error
  const getState = (): 'ready' | 'empty' | 'error' => {
    if (!error) return 'ready';
    
    const message = error instanceof Error ? error.message : String(error);
    const statusMatch = message.match(/API error:\s*(\d{3})/i);
    const status = statusMatch ? Number(statusMatch[1]) : null;
    const isMemberError = message.includes('/v2/member/');

    if (isMemberError && status === 404) {
      return 'empty';
    }
    if (isMemberError && status && status >= 500) {
      return 'error';
    }
    if (status && status >= 500) {
      return 'error';
    }
    if (status && status >= 400) {
      return 'error';
    }
    return 'error';
  };

  const state = getState();

  // Process positions
  const positions: LPPosition[] = (data?.memberDetails?.pools || []).map((pool: any) => {
    const poolData = data?.pools?.find((p: any) => p.asset === pool.pool);
    
    const poolStatus = (() => {
      switch (poolData?.status) {
        case 'available':
        case 'staged':
        case 'suspended':
          return poolData.status;
        default:
          return 'unknown';
      }
    })();

    const poolApy = Number(poolData?.poolAPY ?? 0);
    const runePending = BigInt(pool.runePending);
    const assetPending = BigInt(pool.assetPending);
    
    const thorNodeData = data?.thorNodeLpData?.get(pool.pool);
    
    let withdrawableData;
    if (thorNodeData) {
      withdrawableData = {
        runeWithdrawable: thorNodeData.rune_redeem_value,
        asset2Withdrawable: thorNodeData.asset_redeem_value,
        runeDeposited: thorNodeData.rune_deposit_value,
        asset2Deposited: thorNodeData.asset_deposit_value,
      };
    } else {
      const ownershipPercent = calculateOwnershipPercent(pool.liquidityUnits, poolData?.liquidityUnits);
      withdrawableData = calculateLpWithdrawableAmounts(
        pool.runeDeposit,
        pool.assetDeposit,
        poolData?.runeDepth ?? '0',
        poolData?.assetDepth ?? '0',
        pool.runeAdded,
        pool.runeWithdrawn,
        pool.assetAdded,
        pool.assetWithdrawn,
        ownershipPercent,
        poolData?.liquidityUnits
      );
    }

    const runePriceUSD = data?.runePriceUSD ?? 0;
    const assetPriceUSD = calculateAssetPrice(
      poolData?.runeDepth ?? '0',
      poolData?.assetDepth ?? '0',
      runePriceUSD
    );

    // Use current prices as entry prices (simplified approach)
    const runeEntryPrice = runePriceUSD;
    const assetEntryPrice = assetPriceUSD;

    const pnl = calculateLpPnl(
      withdrawableData.runeDeposited,
      withdrawableData.asset2Deposited,
      withdrawableData.runeWithdrawable,
      withdrawableData.asset2Withdrawable,
      runePriceUSD,
      assetPriceUSD,
      runeEntryPrice,
      assetEntryPrice
    );

    const ownershipPercent = calculateOwnershipPercent(pool.liquidityUnits, poolData?.liquidityUnits);

    return {
      address: pool.assetAddress,
      pool: pool.pool,
      runeDeposit: pool.runeDeposit,
      asset2Deposit: pool.assetDeposit,
      liquidityUnits: pool.liquidityUnits,
      runeAdded: pool.runeAdded,
      runePending: pool.runePending,
      runeWithdrawn: pool.runeWithdrawn,
      asset2Added: pool.assetAdded,
      asset2Pending: pool.assetPending,
      asset2Withdrawn: pool.assetWithdrawn,
      volume24h: poolData?.volume24h ?? '0',
      runeDepth: poolData?.runeDepth ?? '0',
      asset2Depth: poolData?.assetDepth ?? '0',
      dateFirstAdded: pool.dateFirstAdded,
      dateLastAdded: pool.dateLastAdded,
      poolApy: Number.isFinite(poolApy) ? poolApy : 0,
      poolStatus,
      ownershipPercent,
      hasPending: runePending > BigInt(0) || assetPending > BigInt(0),
      runeDepositedValue: withdrawableData.runeDeposited,
      asset2DepositedValue: withdrawableData.asset2Deposited,
      runeWithdrawable: withdrawableData.runeWithdrawable,
      asset2Withdrawable: withdrawableData.asset2Withdrawable,
      netProfitLoss: formatPnlDisplay(pnl.pnlPercent).text,
      netProfitLossPercent: pnl.pnlPercent,
    };
  });

  const displayState = state !== 'ready' ? state : positions.length > 0 ? 'ready' : 'empty';

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="h-6 w-44 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 h-4 w-full max-w-xl rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="h-6 w-56 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (displayState === 'error' && error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/90 p-8 text-center shadow-sm dark:border-red-900/60 dark:bg-red-950/30">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="mx-auto mt-5 max-w-2xl space-y-3">
          <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            LP member data is temporarily unavailable
          </h2>
          <p className="text-sm leading-6">
            {error instanceof Error ? error.message : 'Unable to load LP data right now. Try again shortly.'}
          </p>
          <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            This is an upstream Midgard response problem, not a confirmed "no LP positions" result. Retry the member lookup once Midgard recovers.
          </p>
        </div>
        {address && (
          <div className="mx-auto mt-5 inline-flex max-w-full items-center rounded-full border border-zinc-200 bg-zinc-100/80 px-4 py-2 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
            <span className="mr-2 uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
              Address
            </span>
            <span className="truncate">{address}</span>
          </div>
        )}
        <div className="mt-6 flex justify-center">
          <Button onClick={() => mutate()} variant="destructive">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (displayState === 'empty') {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white/90 p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <Waves className="h-7 w-7" />
        </div>
        <div className="mx-auto mt-5 max-w-2xl space-y-3">
          <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            No LP positions found
          </h2>
          <p className="text-sm leading-6">
            Midgard returned a successful member lookup, but there are no liquidity positions associated with this address.
          </p>
          <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            This empty state only appears after the LP member endpoint responds successfully, so it is distinct from an upstream failure.
          </p>
        </div>
        {address && (
          <div className="mx-auto mt-5 inline-flex max-w-full items-center rounded-full border border-zinc-200 bg-zinc-100/80 px-4 py-2 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
            <span className="mr-2 uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
              Address
            </span>
            <span className="truncate">{address}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Portfolio Overview */}
      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex flex-col gap-3 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
              LP Status
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              Portfolio Overview
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Midgard returned {positions.length} liquidity {positions.length === 1 ? 'position' : 'positions'} for this address.
            </p>
          </div>
          {address && (
            <p className="max-w-full truncate rounded-full border border-zinc-200 bg-zinc-100/80 px-4 py-2 font-mono text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
              {address}
            </p>
          )}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {positions.map((position) => (
            <LPPositionCard key={`${position.pool}-${position.address}`} position={position} />
          ))}
        </div>
      </section>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Positions"
          value={String(positions.length)}
          subValue="Active LP memberships found"
        />
        <StatCard
          label="RUNE Deposit"
          value={formatRuneAmount(
            positions.reduce((sum, p) => sum + BigInt(p.runeDeposit || '0'), BigInt(0)).toString()
          )}
          subValue="Combined current RUNE-side deposit value"
        />
        <StatCard
          label="ASSET 2 Deposit"
          value={formatRuneAmount(
            positions
              .reduce((sum, p) => {
                const asset2 = p.asset2Deposit;
                if (!asset2 || asset2 === '0') return sum;
                try {
                  return sum + BigInt(asset2);
                } catch {
                  return sum;
                }
              }, BigInt(0))
              .toString()
          )}
          subValue="Combined current ASSET 2-side deposit value"
        />
        <StatCard
          label="Earning Pools"
          value={String(positions.filter((p) => p.poolStatus === 'available').length)}
          subValue={`${positions.filter((p) => p.hasPending).length} position${positions.filter((p) => p.hasPending).length === 1 ? '' : 's'} with pending adds`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Withdrawable"
          value={formatRuneAmount(
            positions
              .reduce((sum, p) => {
                try {
                  sum += BigInt(p.runeWithdrawable || '0');
                } catch {}
                try {
                  sum += BigInt(p.asset2Withdrawable || '0');
                } catch {}
                return sum;
              }, BigInt(0))
              .toString()
          )}
          subValue="Combined RUNE + ASSET 2 withdrawable amount"
        />
        <StatCard
          label="Net PnL"
          value={(() => {
            const netPnL = positions.reduce((sum, p) => {
              const pnlPercent = p.netProfitLossPercent;
              if (!Number.isFinite(pnlPercent) || pnlPercent === 0) return sum;
              const totalDeposit = BigInt(p.runeDeposit || '0') + BigInt(p.asset2Deposit || '0');
              if (totalDeposit === BigInt(0)) return sum;
              try {
                const pnlValue = totalDeposit * BigInt(Math.floor(100 * pnlPercent)) / BigInt(10000);
                return sum + pnlValue;
              } catch {
                return sum;
              }
            }, BigInt(0));
            const sign = netPnL < BigInt(0) ? '-' : '+';
            return `${sign}${formatRuneAmount((netPnL < BigInt(0) ? -netPnL : netPnL).toString())}`;
          })()}
          subValue="Combined profit/loss across all positions"
        />
        <StatCard
          label="Last LP Activity"
          value={(() => {
            const lastActivity = positions.reduce((max, p) => {
              const date = Number(p.dateLastAdded);
              return Number.isFinite(date) && date > max ? date : max;
            }, 0);
            if (!Number.isFinite(lastActivity) || lastActivity <= 0) return '--';
            return new Date(lastActivity > 1e12 ? lastActivity / 1e9 : lastActivity).toLocaleDateString();
          })()}
          subValue="Most recent add-liquidity timestamp"
        />
        <StatCard
          label="Average APY"
          value={(() => {
            if (positions.length === 0) return '0.00%';
            const weightedSum = positions.reduce((sum, p) => {
              const runeDeposit = BigInt(p.runeDeposit || '0');
              const assetDeposit = BigInt(p.asset2Deposit || '0');
              const apy = p.poolApy;
              return Number.isFinite(apy) ? sum + (runeDeposit + assetDeposit) * BigInt(Math.floor(100 * apy)) : sum;
            }, BigInt(0));
            const totalDeposit = positions.reduce(
              (sum, p) => sum + BigInt(p.runeDeposit || '0') + BigInt(p.asset2Deposit || '0'),
              BigInt(0)
            );
            if (totalDeposit === BigInt(0)) return '0.00%';
            const avgApy = Number(weightedSum) / (Number(totalDeposit) / 100);
            return !Number.isFinite(avgApy) || Number.isNaN(avgApy) ? '0.00%' : `${avgApy.toFixed(2)}%`;
          })()}
          subValue="Weighted average across all positions"
        />
      </div>

      {/* Positions Table */}
      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
            Your Liquidity Positions
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Pool status, ownership share, and pool context remain visible only after the LP member lookup succeeds.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Pool
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Pool Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Deposited
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Share
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Withdrawable
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Net PnL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Pool APY
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Activity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
              {positions.map((position) => (
                <LPTableRow key={`${position.pool}-${position.address}`} position={position} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function LPPositionCard({ position }: { position: LPPosition }) {
  const pnlDisplay = formatPnlDisplay(position.netProfitLossPercent);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Pool
          </p>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{position.pool}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Ownership {Number.isFinite(position.ownershipPercent) ? `${position.ownershipPercent.toFixed(2)}%` : '0.00%'} · LP Units{' '}
            {(() => {
              try {
                return BigInt(position.liquidityUnits).toLocaleString('en-US');
              } catch {
                return '0';
              }
            })()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PoolStatusBadge status={position.poolStatus} />
          {position.hasPending && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              Pending Add
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">RUNE Deposited</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatRuneAmount(position.runeDeposit)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">ASSET 2 Deposited</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatRuneAmount(position.asset2Deposit)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">RUNE Withdrawable</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">
            {formatRuneAmount(position.runeWithdrawable)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">ASSET 2 Withdrawable</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">
            {formatRuneAmount(position.asset2Withdrawable)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Net Profit/Loss</p>
          <p className={`text-xl font-semibold ${pnlDisplay.color}`}>{position.netProfitLoss}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">PnL Percentage</p>
          <p className={`text-xl font-semibold ${pnlDisplay.color}`}>
            {position.netProfitLossPercent.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pool APY</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">
            {position.poolApy.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">24H Volume</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatRuneAmount(position.volume24h)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pool Depth</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatRuneAmount(position.runeDepth)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">RUNE Added</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatRuneAmount(position.runeAdded)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">RUNE Withdrawn</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatRuneAmount(position.runeWithdrawn)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">ASSET 2 Added</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatRuneAmount(position.asset2Added)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">ASSET 2 Withdrawn</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatRuneAmount(position.asset2Withdrawn)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">First Added</p>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {formatDate(position.dateFirstAdded)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Last Added</p>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {formatDate(position.dateLastAdded)}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pending Amount</p>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {position.hasPending ? (
              <span className="text-amber-600 dark:text-amber-400">
                {formatRuneAmount(position.runePending)} + {formatRuneAmount(position.asset2Pending)}
              </span>
            ) : (
              '--'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function LPTableRow({ position }: { position: LPPosition }) {
  const pnlDisplay = formatPnlDisplay(position.netProfitLossPercent);
  const address = position.address ?? '';

  return (
    <tr className="border-b border-zinc-100 bg-white transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
      <td className="py-4 px-4">
        <div className="flex flex-col">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{position.pool}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {address.length >= 10 ? `${address.slice(0, 6)}...${address.slice(-4)}` : '--'}
          </span>
          {position.hasPending && (
            <span className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              Pending add
            </span>
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        <PoolStatusBadge status={position.poolStatus} />
      </td>
      <td className="py-4 px-4">
        <div className="space-y-2">
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            RUNE: {formatRuneAmount(position.runeDeposit)}
          </div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            ASSET: {formatRuneAmount(position.asset2Deposit)}
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
          {position.ownershipPercent.toFixed(2)}%
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {(() => {
            try {
              return BigInt(position.liquidityUnits).toLocaleString('en-US');
            } catch {
              return '0';
            }
          })()}{' '}
          units
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="space-y-2">
          <div className="font-semibold text-green-600 dark:text-green-400">
            RUNE: {formatRuneAmount(position.runeWithdrawable)}
          </div>
          <div className="font-semibold text-green-600 dark:text-green-400">
            ASSET: {formatRuneAmount(position.asset2Withdrawable)}
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="space-y-2">
          <div className={`font-semibold ${pnlDisplay.color}`}>{position.netProfitLoss}</div>
          <div className={`text-sm ${pnlDisplay.color}`}>{position.netProfitLossPercent.toFixed(2)}%</div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="space-y-2">
          <div className="font-semibold text-green-600 dark:text-green-400">
            {position.poolApy.toFixed(2)}%
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">APY</div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="space-y-1">
          <div className="text-sm text-zinc-900 dark:text-zinc-100">
            {formatDate(position.dateFirstAdded)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Last {formatDate(position.dateLastAdded)}
          </div>
          <div className={`text-xs ${position.hasPending ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {position.hasPending ? 'Pending' : 'Active'}
          </div>
        </div>
      </td>
    </tr>
  );
}

function PoolStatusBadge({ status }: { status: 'available' | 'staged' | 'suspended' | 'unknown' }) {
  if (!status) return null;

  const statusConfig = {
    available: {
      bgClass: 'bg-green-500',
      textClass: 'text-white dark:text-white',
      label: 'Available',
    },
    staged: {
      bgClass: 'bg-yellow-500',
      textClass: 'text-zinc-900 dark:text-white',
      label: 'Staged',
    },
    suspended: {
      bgClass: 'bg-red-500',
      textClass: 'text-white dark:text-white',
      label: 'Suspended',
    },
    unknown: {
      bgClass: 'bg-zinc-500',
      textClass: 'text-white dark:text-white',
      label: 'Unknown',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`rounded px-2 py-1 text-sm font-medium ${config.bgClass} ${config.textClass}`}>
      {config.label}
    </span>
  );
}

function StatCard({ label, value, subValue }: { label: string; value: string; subValue: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-950 dark:text-zinc-50">{value}</p>
      {subValue && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subValue}</p>}
    </div>
  );
}

function formatDate(timestamp: number): string {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return '--';
  return new Date(ts > 1e12 ? ts / 1e9 : ts).toLocaleDateString();
}
