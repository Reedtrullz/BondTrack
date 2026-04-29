'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useLpPositions } from '@/lib/hooks/use-lp-positions';
import { useRunePriceHistory } from '@/lib/hooks/use-rune-price';
import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';
import { useYieldBenchmarks } from '@/lib/hooks/use-yield-benchmarks';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { getFeeRevenue, getPools, type FeeRevenueRaw, type PoolDetailRaw } from '@/lib/api/midgard';
import { formatUsd, runeToNumber } from '@/lib/utils/formatters';
import { DashboardCard } from '@/components/shared/dashboard-card';
import { ExportButton } from '@/components/shared/export-button';
import { MarketOverview } from '@/components/dashboard/market-overview';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { FeeRevenueChart } from '@/components/dashboard/fee-revenue-chart';
import { FeeRevenueSummary } from '@/components/dashboard/fee-revenue-summary';
import { PositionTable } from '@/components/dashboard/position-table';
import { RewardProjections } from '@/components/dashboard/reward-projections';
import { ActionableAlerts } from '@/components/dashboard/actionable-alerts';
import { IntelligenceFeed } from '@/components/dashboard/intelligence-feed';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  BarChart3,
  ArrowRight,
  Shield,
  Coins,
  Plus,
  Minus,
  Sparkles,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#10b981', '#f59e0b'];

type TransactionAction = 'bond' | 'unbond';

function buildTransactionHref(address: string | null, action: TransactionAction) {
  const params = new URLSearchParams();

  if (address) {
    params.set('address', address);
  }

  params.set('action', action);

  return `/dashboard/transactions?${params.toString()}`;
}

function buildDashboardHref(path: string, address: string | null) {
  if (!address) {
    return path;
  }

  const params = new URLSearchParams({ address });
  return `${path}?${params.toString()}`;
}

export default function PortfolioPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const [marketPools, setMarketPools] = useState<PoolDetailRaw[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [feeRevenue, setFeeRevenue] = useState<FeeRevenueRaw | null>(null);
  const [feeRevenueLoading, setFeeRevenueLoading] = useState(true);
  const [feeRevenueError, setFeeRevenueError] = useState<string | null>(null);

  const {
    positions: bondPositions,
    isLoading: bondLoading,
  } = useBondPositions(address);
  const {
    positions: lpPositions,
    isLoading: lpLoading,
  } = useLpPositions(address);
  const { price: runePrice, intervals: runePriceHistory, isLoading: priceLoading } = useRunePriceHistory('day', 8);
  const { data: marketNetwork, isLoading: metricsLoading } = useNetworkMetrics();
  const { benchmarks, isLoading: benchmarksLoading } = useYieldBenchmarks();
  const { data: allNodes, isLoading: allNodesLoading } = useAllNodes();

  useEffect(() => {
    let active = true;

    async function loadMarketPools() {
      try {
        const pools = await getPools();
        if (active) {
          setMarketPools(pools);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setMarketLoading(false);
        }
      }
    }

    async function loadFeeRevenue() {
      setFeeRevenueError(null);

      try {
        const data = await getFeeRevenue();
        if (active) {
          setFeeRevenue(data);
        }
      } catch (error) {
        if (active) {
          setFeeRevenueError('Failed to load fee revenue');
          console.error(error);
        }
      } finally {
        if (active) {
          setFeeRevenueLoading(false);
        }
      }
    }

    loadMarketPools();
    loadFeeRevenue();

    return () => {
      active = false;
    };
  }, []);

  const isLoading = bondLoading || lpLoading || priceLoading || metricsLoading || benchmarksLoading || allNodesLoading || marketLoading;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
      </div>
    );
  }

  const totalBondedRune = bondPositions.reduce((sum, p) => sum + p.bondAmount, 0);
  const totalBondedValueUsd = totalBondedRune * runePrice;

  const totalLpValueUsd = lpPositions.reduce(
    (sum, p) => sum + p.currentTotalValueUsd,
    0
  );

  const totalAum = totalBondedValueUsd + totalLpValueUsd;
  const weightedAPY = bondPositions.length > 0 && totalBondedRune > 0
    ? bondPositions.reduce((sum, p) => sum + p.netAPY * p.bondAmount, 0) / totalBondedRune
    : 0;
  const averageFeeBps = bondPositions.length > 0 && totalBondedRune > 0
    ? bondPositions.reduce((sum, p) => sum + (p.operatorFee || 0) * p.bondAmount, 0) / totalBondedRune
    : 0;
  const runePriceChange24h = (() => {
    if (runePriceHistory.length < 2) return null;

    const first = runePriceHistory[runePriceHistory.length - 2].runePriceUSD;
    const last = runePriceHistory[runePriceHistory.length - 1].runePriceUSD;

    if (!Number.isFinite(first) || first <= 0 || !Number.isFinite(last)) {
      return null;
    }

    return ((last - first) / first) * 100;
  })();
  const runePriceChange7d = (() => {
    if (runePriceHistory.length < 8) return null;

    const first = runePriceHistory[0].runePriceUSD;
    const last = runePriceHistory[runePriceHistory.length - 1].runePriceUSD;

    if (!Number.isFinite(first) || first <= 0 || !Number.isFinite(last)) {
      return null;
    }

    return ((last - first) / first) * 100;
  })();

  const pieData = [
    { name: 'Bond', value: totalBondedValueUsd, fill: COLORS[0] },
    { name: 'LP', value: totalLpValueUsd, fill: COLORS[1] },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Portfolio
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Unified view of your Bond and LP positions
          </p>
        </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={buildTransactionHref(address, 'bond')}>
              <Button variant="success" className="gap-2">
                <Plus className="w-4 h-4" />
                Bond More
              </Button>
            </Link>
            <Link href={buildTransactionHref(address, 'unbond')}>
              <Button variant="destructive" className="gap-2">
                <Minus className="w-4 h-4" />
                Unbond
              </Button>
            </Link>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/50">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>Live</span>
            </div>
            {bondPositions.length > 0 && <ExportButton bondPositions={bondPositions} />}
          </div>
        </div>

      <DashboardCard title="Total Portfolio Value" icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}>
        <div className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
          {formatUsd(totalAum, 2)}
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            Bond:{' '}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {formatUsd(totalBondedValueUsd, 2)}
            </span>
          </span>
          <span>
            LP:{' '}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {formatUsd(totalLpValueUsd, 2)}
            </span>
          </span>
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Asset Allocation">
          {totalAum > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                />
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number' ? formatUsd(value, 2) : String(value)
                  }
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid rgb(228 228 231)',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
              No portfolio data available
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Performance Summary">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">7d Portfolio Impact</p>
              <p
                className={cn(
                  'text-lg font-bold font-mono',
                  runePriceChange7d != null && runePriceChange7d >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {runePriceChange7d != null
                  ? `${runePriceChange7d >= 0 ? '+' : ''}${runePriceChange7d.toFixed(2)}%`
                  : '--'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {runePriceChange7d != null && totalBondedValueUsd > 0
                  ? formatUsd(totalBondedValueUsd * (runePriceChange7d / 100), 2)
                  : '--'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">24h Portfolio Impact</p>
              <p
                className={cn(
                  'text-lg font-bold font-mono',
                  runePriceChange24h != null && runePriceChange24h >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {runePriceChange24h != null
                  ? `${runePriceChange24h >= 0 ? '+' : ''}${runePriceChange24h.toFixed(2)}%`
                  : '--'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {runePriceChange24h != null && totalBondedValueUsd > 0
                  ? formatUsd(totalBondedValueUsd * (runePriceChange24h / 100), 2)
                  : '--'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Weighted APY</p>
              <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {weightedAPY > 0 ? `${(weightedAPY * 100).toFixed(2)}%` : '--'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg Operator Fee</p>
              <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {averageFeeBps > 0 ? `${(averageFeeBps / 100).toFixed(2)}%` : '--'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Active Positions</p>
              <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {bondPositions.length + lpPositions.length}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Est. Daily Earnings</p>
              <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {totalBondedRune > 0 && weightedAPY > 0
                  ? formatUsd((totalBondedRune * weightedAPY / 365) * runePrice, 2)
                  : '--'}
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <Link
            href={buildDashboardHref('/dashboard/risk', address)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
              'hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <Shield className="w-4 h-4" />
            View Risk
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={buildDashboardHref('/dashboard/rewards', address)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
              'hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <TrendingUp className="w-4 h-4" />
            View Rewards
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={buildDashboardHref('/dashboard/lp', address)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
              'hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <Coins className="w-4 h-4" />
            View LP
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </DashboardCard>

      <PortfolioSummary
        totalBonded={totalBondedRune}
        runePrice={runePrice}
        weightedAPY={weightedAPY}
        positionCount={bondPositions.length}
        positions={bondPositions}
        benchmarks={benchmarks}
      />

      <DashboardCard title="Bond Positions">
        <PositionTable positions={bondPositions} />
      </DashboardCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FeeRevenueChart
          daily={feeRevenue?.daily}
          isLoading={feeRevenueLoading}
          error={feeRevenueError}
        />
        <FeeRevenueSummary
          summary={feeRevenue?.summary}
          isLoading={feeRevenueLoading}
          error={feeRevenueError}
          userBond={totalBondedRune}
          totalActiveBond={runeToNumber(marketNetwork?.bondMetrics?.totalActiveBond)}
          runePrice={runePrice}
        />
      </div>

      <MarketOverview
        pools={marketPools}
        network={marketNetwork ?? null}
        runePrice={runePrice}
        runePriceChange24h={runePriceChange24h}
        runePriceChange7d={runePriceChange7d}
        isLoading={marketLoading}
      />

      {totalBondedRune > 0 && weightedAPY > 0 && (
        <RewardProjections
          totalBonded={totalBondedRune}
          weightedAPY={weightedAPY}
          runePrice={runePrice}
          averageFeeBps={averageFeeBps}
        />
      )}

      <ActionableAlerts positions={bondPositions} address={address} />

      <DashboardCard className="space-y-4 border-0 bg-transparent p-0 shadow-none dark:bg-transparent">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-amber-600/80 dark:text-amber-500/80">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest font-serif italic">Heimdall&apos;s Sight</span>
          </div>
        </div>
        <IntelligenceFeed
          positions={bondPositions}
          benchmarks={benchmarks}
          allNodes={allNodes || []}
          providerAddress={address}
          isLoading={allNodesLoading || benchmarksLoading}
        />
      </DashboardCard>
    </div>
  );
}
