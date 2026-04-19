'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, RefreshCw, Waves, Download } from 'lucide-react';
import { LpSummaryCard } from '../../../components/dashboard/lp-summary-card';
import { LpNodeRow } from '../../../components/dashboard/lp-node-row';
import { Button } from '../../../components/ui/button';
import { ErrorBoundary } from '../../../components/ui/error-boundary';
import { useLpPositions } from '../../../hooks/use-lp-positions';
import { formatRuneAmount } from '../../../lib/utils/formatters';
import { LpPosition } from '../../../lib/types/lp';

const NANOSECOND_THRESHOLD = 1e12;

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

function LpLoadingState({ loadingProgress }: { loadingProgress: number }) {
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
      {loadingProgress > 0 && (
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
      )}
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

function SummaryMetricCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-950 dark:text-zinc-50">{value}</p>
      {subValue ? <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subValue}</p> : null}
    </div>
  );
}

function formatMemberDate(raw: string): string {
  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    return '--';
  }

  const timestamp = value > NANOSECOND_THRESHOLD ? value / 1e9 : value;
  return new Date(timestamp * 1000).toLocaleDateString();
}

function formatRuneAsset2(positions: LpPosition[]): string {
  const totalAsset2 = positions.reduce((sum, pos) => {
    const value = pos.asset2Deposit;
    if (!value || value === '0') return sum;
    try {
      return sum + BigInt(value);
    } catch {
      return sum;
    }
  }, 0n).toString();
  return formatRuneAmount(totalAsset2);
}

function formatRuneAsset2Withdrawable(positions: LpPosition[]): string {
  const totalWithdrawable = positions.reduce((sum, pos) => {
    let s = sum;
    try {
      s = sum + BigInt(pos.runeWithdrawable || '0');
    } catch {}
    try {
      s = s + BigInt(pos.asset2Withdrawable || '0');
    } catch {}
    return s;
  }, 0n).toString();
  return formatRuneAmount(totalWithdrawable);
}

function formatNetPnL(positions: LpPosition[]): string {
  const totalPnL = positions.reduce((sum, pos) => {
    const pnlPercent = pos.netProfitLossPercent;
    if (!Number.isFinite(pnlPercent) || pnlPercent === 0) return sum;
    const runeValue = BigInt(pos.runeDeposit || '0');
    const asset2Value = BigInt(pos.asset2Deposit || '0');
    const totalDeposited = runeValue + asset2Value;
    if (totalDeposited === 0n) return sum;
    try {
      const positionPnL = (totalDeposited * BigInt(Math.floor(pnlPercent * 100))) / 10000n;
      return sum + positionPnL;
    } catch {
      return sum;
    }
  }, 0n);
  
  const absPnL = totalPnL < 0n ? -totalPnL : totalPnL;
  const sign = totalPnL < 0n ? '-' : '+';
  return `${sign}${formatRuneAmount(absPnL.toString())}`;
}

function formatAverageApy(positions: LpPosition[]): string {
  if (positions.length === 0) return '0.00%';
  
  const totalWeightedApy = positions.reduce((sum, pos) => {
    const runeValue = BigInt(pos.runeDeposit || '0');
    const asset2Value = BigInt(pos.asset2Deposit || '0');
    const totalValue = runeValue + asset2Value;
    const apy = pos.poolApy;
    if (!Number.isFinite(apy)) return sum;
    return sum + (totalValue * BigInt(Math.floor(apy * 100)));
  }, 0n);
  
  const totalDeposits = positions.reduce((sum, pos) => {
    return sum + BigInt(pos.runeDeposit || '0') + BigInt(pos.asset2Deposit || '0');
  }, 0n);
  
  if (totalDeposits === 0n) return '0.00%';
  
  const averageApy = Number(totalWeightedApy) / (Number(totalDeposits) / 100);
  if (!Number.isFinite(averageApy) || Number.isNaN(averageApy)) return '0.00%';
  return `${averageApy.toFixed(2)}%`;
}

function exportLPData(positions: LpPosition[]) {
  const headers = ['Pool', 'Status', 'RUNE Deposit', 'Asset Deposit', 'RUNE Withdrawable', 'Asset Withdrawable', 'PnL %', 'APY %', 'First Added', 'Last Added'];
  const rows = positions.map(p => [
    p.pool,
    p.poolStatus,
    p.runeDeposit,
    p.asset2Deposit,
    p.runeWithdrawable,
    p.asset2Withdrawable,
    p.netProfitLossPercent.toFixed(2),
    p.poolApy.toFixed(2),
    new Date(Number(p.dateFirstAdded) > 1e12 ? Number(p.dateFirstAdded) / 1e9 : Number(p.dateFirstAdded) * 1000).toISOString(),
    new Date(Number(p.dateLastAdded) > 1e12 ? Number(p.dateLastAdded) / 1e9 : Number(p.dateLastAdded) * 1000).toISOString(),
  ]);
  
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lp-positions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const DashboardContent = () => {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading, error, state, retry, loadingProgress } = useLpPositions(address);

  const [sortField, setSortField] = React.useState<'pool' | 'pnl' | 'apy' | 'date'>('pool');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const sortedPositions = React.useMemo(() => {
    return [...positions].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'pool':
          comparison = a.pool.localeCompare(b.pool);
          break;
        case 'pnl':
          comparison = a.netProfitLossPercent - b.netProfitLossPercent;
          break;
        case 'apy':
          comparison = a.poolApy - b.poolApy;
          break;
        case 'date':
          comparison = Number(a.dateLastAdded) - Number(b.dateLastAdded);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [positions, sortField, sortDirection]);

  const totalRuneDeposit = positions.reduce((sum, position) => sum + BigInt(position.runeDeposit || '0'), 0n).toString();
  const earningPools = positions.filter((position) => position.poolStatus === 'available').length;
  const pendingAdds = positions.filter((position) => position.hasPending).length;
  const latestActivity = positions.reduce((latest, position) => {
    const next = Number(position.dateLastAdded);
    return Number.isFinite(next) && next > latest ? next : latest;
  }, 0);

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
              Midgard returned {positions.length} liquidity {positions.length === 1 ? 'position' : 'positions'} for this address.
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
            {address ? (
              <p className="max-w-full truncate rounded-full border border-zinc-200 bg-zinc-100/80 px-4 py-2 font-mono text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                {address}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {positions.map((pos) => (
            <LpSummaryCard key={`${pos.pool}-${pos.address}`} position={pos} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Positions" value={String(positions.length)} subValue="Active LP memberships found" />
        <SummaryMetricCard label="RUNE Deposit" value={formatRuneAmount(totalRuneDeposit)} subValue="Combined current RUNE-side deposit value" />
        <SummaryMetricCard label="ASSET 2 Deposit" value={formatRuneAsset2(positions)} subValue="Combined current ASSET 2-side deposit value" />
        <SummaryMetricCard label="Earning Pools" value={String(earningPools)} subValue={`${pendingAdds} position${pendingAdds === 1 ? '' : 's'} with pending adds`} />
      </section>
      
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Total Withdrawable" value={formatRuneAsset2Withdrawable(positions)} subValue="Combined RUNE + ASSET 2 withdrawable amount" />
        <SummaryMetricCard label="Net PnL" value={formatNetPnL(positions)} subValue="Combined profit/loss across all positions" />
        <SummaryMetricCard label="Last LP Activity" value={latestActivity > 0 ? formatMemberDate(String(latestActivity)) : '--'} subValue="Most recent add-liquidity timestamp" />
        <SummaryMetricCard label="Average APY" value={formatAverageApy(positions)} subValue="Weighted average across all positions" />
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
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300"
                    onClick={() => {
                      if (sortField === 'pool') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      else setSortField('pool');
                    }}
                  >
                    Pool {sortField === 'pool' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pool Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Deposited</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Share</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Withdrawable</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300"
                    onClick={() => {
                      if (sortField === 'pnl') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      else setSortField('pnl');
                    }}
                  >
                    Net PnL {sortField === 'pnl' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300"
                    onClick={() => {
                      if (sortField === 'apy') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      else setSortField('apy');
                    }}
                  >
                    Pool APY {sortField === 'apy' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300"
                    onClick={() => {
                      if (sortField === 'date') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      else setSortField('date');
                    }}
                  >
                    Activity {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
              {sortedPositions.map((pos) => (
                <LpNodeRow key={`${pos.pool}-${pos.address}`} position={pos} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const LpDashboardPage = () => {
  return (
    <div className="container mx-auto py-10 px-4">
      <ErrorBoundary fallback={<LpErrorBoundaryFallback />}>
        <Suspense fallback={<LpLoadingState />}>
          <DashboardContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default LpDashboardPage;
