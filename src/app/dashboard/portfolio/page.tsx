'use client';

import { useState } from 'react';
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
import { usePools } from '@/lib/hooks/use-pools';
import { useFeeRevenue } from '@/lib/hooks/use-fee-revenue';
import { formatUsd, runeToNumber } from '@/lib/utils/formatters';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { FeeRevenueChart } from '@/components/dashboard/fee-revenue-chart';
import { FeeRevenueSummary } from '@/components/dashboard/fee-revenue-summary';
import { PositionTable } from '@/components/dashboard/position-table';
import { MarketOverview } from '@/components/dashboard/market-overview';
import { IntelligenceFeed } from '@/components/dashboard/intelligence-feed';
import { ExportButton } from '@/components/shared/export-button';
import { DashboardCard } from '@/components/shared/dashboard-card';
import { ChartDataTable } from '@/components/shared/chart-data-table';
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
  ChevronDown,
  ChevronUp,
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
  const {
    positions: bondPositions,
    isLoading: bondLoading,
  } = useBondPositions(address);
  const {
    positions: lpPositions,
    error: lpError,
  } = useLpPositions(address);
  const { price: runePrice, intervals: runePriceHistory, isLoading: priceLoading, isStale: runePriceIsStale, updatedAt: runePriceUpdatedAt } = useRunePriceHistory('hour', 24 * 7 + 1);
  const { data: marketNetwork, isLoading: metricsLoading } = useNetworkMetrics();
  const { benchmarks, isLoading: benchmarksLoading } = useYieldBenchmarks();
  const { data: allNodes, isLoading: allNodesLoading } = useAllNodes();
  const { pools: marketPools, isLoading: marketLoading } = usePools();
  const { feeRevenue, isLoading: feeRevenueLoading, error: feeRevenueError } = useFeeRevenue();

  const [showFeeRevenue, setShowFeeRevenue] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);

  const isLoading = bondLoading || priceLoading || metricsLoading || benchmarksLoading || allNodesLoading || marketLoading;

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

  const lpDataUnavailable = Boolean(lpError);
  const effectiveLpPositions = lpDataUnavailable ? [] : lpPositions;
  const totalLpValueUsd = effectiveLpPositions.reduce(
    (sum, p) => sum + p.currentTotalValueUsd,
    0
  );

  const totalSum = totalBondedValueUsd + totalLpValueUsd;

  const weightedAPY = bondPositions.length > 0 && totalBondedRune > 0
    ? bondPositions.reduce((sum, p) => sum + p.netAPY * p.bondAmount, 0) / totalBondedRune
    : 0;

  const runePriceChange24h = (() => {
    if (runePriceHistory.length < 25) return null;

    const last = runePriceHistory[runePriceHistory.length - 1].runePriceUSD;
    const first = runePriceHistory[runePriceHistory.length - 25].runePriceUSD;

    if (!Number.isFinite(first) || first <= 0 || !Number.isFinite(last)) {
      return null;
    }

    return ((last - first) / first) * 100;
  })();

  const runePriceChange7d = (() => {
    if (runePriceHistory.length < 169) return null;

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
      {/* Header */}
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/50">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>Live</span>
          </div>
          {bondPositions.length > 0 && <ExportButton bondPositions={bondPositions} />}
        </div>
      </div>

      {/* Hero Stats */}
      <PortfolioSummary
        totalBonded={totalBondedRune}
        runePrice={runePrice}
        runePriceIsStale={runePriceIsStale}
        runePriceUpdatedAt={runePriceUpdatedAt}
        weightedAPY={weightedAPY}
        positions={bondPositions}
        benchmarks={benchmarks}
        feeImpactRUNE={0}
        feeImpactUSD={0}
      />

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Bond Positions */}
        <DashboardCard title="Bond Positions">
          <PositionTable positions={bondPositions} />
        </DashboardCard>

        {/* Right: Asset Allocation */}
        <DashboardCard title="Asset Allocation">
          {totalSum > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={0}>
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
                  formatter={(value: unknown) =>
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
              <ChartDataTable
                caption="Portfolio asset allocation"
                columns={['Asset group', 'Value']}
                rows={pieData.map((item) => [item.name, formatUsd(item.value, 2)])}
              />
            </>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
              No portfolio data available
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Quick Actions */}
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

      {/* Collapsible: Fee Revenue */}
      <DashboardCard className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent">
        <button
          onClick={() => setShowFeeRevenue(!showFeeRevenue)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Fee Revenue
          {showFeeRevenue ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
        {showFeeRevenue && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        )}
      </DashboardCard>

      {/* Collapsible: Market Overview */}
      <DashboardCard className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent">
        <button
          onClick={() => setShowMarket(!showMarket)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Market Overview
          {showMarket ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
        {showMarket && (
          <div className="mt-4">
            <MarketOverview
              pools={marketPools}
              network={marketNetwork ?? null}
              runePrice={runePrice}
              runePriceChange24h={runePriceChange24h}
              runePriceChange7d={runePriceChange7d}
              isLoading={marketLoading}
            />
          </div>
        )}
      </DashboardCard>

      {/* Intelligence Feed */}
      <DashboardCard className="space-y-4 border-0 bg-transparent p-0 shadow-none dark:bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-600/80 dark:text-amber-500/80">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest font-serif italic">Heimdall&apos;s Sight</span>
          </div>
          <button
            onClick={() => setShowIntelligence(!showIntelligence)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            {showIntelligence ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
        {showIntelligence && (
          <IntelligenceFeed
            positions={bondPositions}
            benchmarks={benchmarks}
            allNodes={allNodes || []}
            providerAddress={address}
            isLoading={allNodesLoading || benchmarksLoading}
          />
        )}
      </DashboardCard>
    </div>
  );
}
