'use client';

import React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Download, RefreshCw, Waves } from 'lucide-react';
import { LpNodeRow } from '../../../components/dashboard/lp-node-row';
import { LpPortfolioHero } from '../../../components/dashboard/lp-portfolio-hero';
import { LpSummaryCard } from '../../../components/dashboard/lp-summary-card';
import { Button } from '../../../components/ui/button';
import { ErrorBoundary } from '../../../components/ui/error-boundary';
import { useLpPositions } from '../../../hooks/use-lp-positions';
import type { LpPosition } from '../../../lib/types/lp';
import { calculateLpPortfolioSummary } from '../../../lib/utils/lp-analytics';

interface LpStatePanelProps {
  tone: 'empty' | 'error';
  title: string;
  description: string;
  detail: string;
  address?: string | null;
  action?: React.ReactNode;
}

const panelToneStyles: Record<LpStatePanelProps['tone'], string> = {
  empty: 'border-zinc-200 bg-white/90 text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300',
  error: 'border-red-200 bg-red-50/90 text-red-700 shadow-sm dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
};

function LpStatePanel({ tone, title, description, detail, address, action }: LpStatePanelProps) {
  const Icon = tone === 'error' ? AlertTriangle : Waves;
  const iconTone = tone === 'error'
    ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';

  return (
    <section className={`rounded-2xl border p-8 text-center ${panelToneStyles[tone]}`}>
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${iconTone}`}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="mx-auto mt-5 max-w-2xl space-y-3">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
        <p className="text-sm leading-6">{description}</p>
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{detail}</p>
      </div>
      {address ? (
        <div className="mx-auto mt-5 inline-flex max-w-full items-center rounded-full border border-zinc-200 bg-zinc-100/80 px-4 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
          <span className="mr-2 uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">Address</span>
          <span className="truncate font-mono">{address}</span>
        </div>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </section>
  );
}

function LpLoadingState({ loadingProgress = 0 }: { loadingProgress?: number }) {
  return (
    <div className="animate-pulse space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="h-6 w-44 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="h-6 w-56 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
          ))}
        </div>
      </section>
      {loadingProgress > 0 ? (
        <div className="mb-4">
          <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Loading pool data... {Math.round(loadingProgress)}%
          </p>
        </div>
      ) : null}
    </div>
  );
}

function LpErrorBoundaryFallback() {
  return (
    <LpStatePanel
      tone="error"
      title="LP dashboard failed to render"
      description="The LP route hit a client-side rendering issue before the page could finish loading."
      detail="Refresh the page to try again. If the problem persists, check another dashboard route to confirm whether the issue is route-specific or upstream."
      action={
        <Button onClick={() => window.location.reload()} variant="destructive">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload LP page
        </Button>
      }
    />
  );
}

function formatCsvDate(raw: string): string {
  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }

  const timestamp = value > 1e12 ? value / 1e9 : value;
  return new Date(timestamp * 1000).toISOString();
}

function exportLPData(positions: LpPosition[]) {
  const headers = ['Pool', 'Status', 'RUNE Deposit', 'Asset Deposit', 'RUNE Withdrawable', 'Asset Withdrawable', 'PnL %', 'APY %', 'First Added', 'Last Added'];
  const rows = positions.map((position) => [
    position.pool,
    position.poolStatus,
    position.runeDeposit,
    position.asset2Deposit,
    position.runeWithdrawable,
    position.asset2Withdrawable,
    position.netProfitLossPercent === null ? '' : position.netProfitLossPercent.toFixed(2),
    position.poolApy.toFixed(2),
    formatCsvDate(position.dateFirstAdded),
    formatCsvDate(position.dateLastAdded),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lp-positions-${new Date().toISOString().split('T')[0]}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function DashboardContentWithAddress({ address }: { address: string }) {
  const { positions, isLoading, error, state, retry, loadingProgress } = useLpPositions(address);

  const [sortField, setSortField] = React.useState<'pool' | 'pnl' | 'apy' | 'date'>('pool');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const sortedPositions = React.useMemo(() => {
    return [...positions].sort((left, right) => {
      let comparison = 0;

      switch (sortField) {
        case 'pool':
          comparison = left.pool.localeCompare(right.pool);
          break;
        case 'pnl': {
          const leftPnl = left.netProfitLossPercent ?? Number.NEGATIVE_INFINITY;
          const rightPnl = right.netProfitLossPercent ?? Number.NEGATIVE_INFINITY;
          comparison = leftPnl - rightPnl;
          break;
        }
        case 'apy':
          comparison = left.poolApy - right.poolApy;
          break;
        case 'date':
          comparison = Number(left.dateLastAdded) - Number(right.dateLastAdded);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [positions, sortDirection, sortField]);

  const portfolioSummary = React.useMemo(() => calculateLpPortfolioSummary(positions), [positions]);
  const currentOnlyCount = positions.filter((position) => position.pricingSource === 'current-only').length;

  if (isLoading) {
    return <LpLoadingState loadingProgress={loadingProgress} />;
  }

  if (state === 'error' && error) {
    return (
      <LpStatePanel
        tone="error"
        title="LP member data is temporarily unavailable"
        description={error}
        detail="This is an upstream Midgard response problem, not a confirmed “no LP positions” result. Retry the member lookup once Midgard recovers."
        address={address}
        action={
          <Button onClick={() => void retry()} variant="destructive">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        }
      />
    );
  }

  if (state === 'empty') {
    return (
      <LpStatePanel
        tone="empty"
        title="No LP positions found"
        description="Midgard returned a successful member lookup, but there are no liquidity positions associated with this address."
        detail="This empty state only appears after the LP member endpoint responds successfully, so it is distinct from an upstream failure."
        address={address}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex flex-col gap-3 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
              LP Status
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-950 dark:text-zinc-50">Portfolio Overview</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Current market value, historical P/L coverage, and recent LP activity for {positions.length} liquidity {positions.length === 1 ? 'position' : 'positions'}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => void retry()}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => exportLPData(positions)}
              variant="outline"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <p className="max-w-full truncate rounded-full border border-zinc-200 bg-zinc-100/80 px-4 py-2 font-mono text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
              {address}
            </p>
          </div>
        </div>

        {currentOnlyCount > 0 ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            <strong>LP Yield mode:</strong> Historical entry pricing is unavailable for {currentOnlyCount} position{currentOnlyCount === 1 ? '' : 's'}. P/L shows your LP yield (fee earnings minus impermanent loss at current prices) rather than full USD profit/loss including price appreciation.
          </div>
        ) : null}

        <div className="mt-6">
          <LpPortfolioHero summary={portfolioSummary} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {positions.map((position) => (
            <LpSummaryCard key={`${position.pool}-${position.address}`} position={position} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">Your Liquidity Positions</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Pool status, ownership share, and pool context remain visible only after the LP member lookup succeeds.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950/60">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  onClick={() => {
                    if (sortField === 'pool') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('pool');
                    }
                  }}
                >
                  Pool {sortField === 'pool' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pool Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Deposited</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Share</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Withdrawable</th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  onClick={() => {
                    if (sortField === 'pnl') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('pnl');
                    }
                  }}
                >
                  Net PnL {sortField === 'pnl' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  onClick={() => {
                    if (sortField === 'apy') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('apy');
                    }
                  }}
                >
                  Pool APY {sortField === 'apy' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  onClick={() => {
                    if (sortField === 'date') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('date');
                    }
                  }}
                >
                  Activity {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
              {sortedPositions.map((position) => (
                <LpNodeRow key={`${position.pool}-${position.address}`} position={position} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const DashboardContent = () => {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  if (!address) {
    return (
      <LpStatePanel
        tone="empty"
        title="Enter a THORChain address"
        description="Paste an address to inspect live liquidity positions, withdrawable balances, and pool-level performance."
        detail="This route only becomes an LP empty state after a real member lookup succeeds. Without an address, there is nothing to query yet."
      />
    );
  }

  return <DashboardContentWithAddress address={address} />;
};

const LpDashboardPage = () => {
  return (
    <div className="container mx-auto px-4 py-10">
      <ErrorBoundary fallback={<LpErrorBoundaryFallback />}>
        <Suspense fallback={<LpLoadingState />}>
          <DashboardContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default LpDashboardPage;
