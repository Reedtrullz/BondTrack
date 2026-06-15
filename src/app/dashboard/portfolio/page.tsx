'use client';

import { useMemo, useState } from 'react';
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
import { useApiHealthContext, type ApiHealthStatus } from '@/lib/hooks/use-api-health';
import { buildDashboardInsightState, resolveThornodeGatedBondAction } from '@/lib/dashboard/insights';
import { buildPortfolioPageModel } from '@/lib/dashboard/portfolio-context';
import { formatUsd, runeToNumber } from '@/lib/utils/formatters';
import { ActionQueue } from '@/components/dashboard/action-queue';
import { InsightHeader } from '@/components/dashboard/insight-header';
import { MetricStrip } from '@/components/dashboard/metric-strip';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { FeeRevenueChart } from '@/components/dashboard/fee-revenue-chart';
import { FeeRevenueSummary } from '@/components/dashboard/fee-revenue-summary';
import { PositionTable } from '@/components/dashboard/position-table';
import { MarketOverview } from '@/components/dashboard/market-overview';
import { IntelligenceFeed } from '@/components/dashboard/intelligence-feed';
import { ExportButton } from '@/components/shared/export-button';
import { DashboardCard } from '@/components/shared/dashboard-card';
import { DashboardLoadingSkeleton } from '@/components/shared/dashboard-loading-skeleton';
import { ChartDataTable } from '@/components/shared/chart-data-table';
import { buttonVariants } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ArrowRight,
  Shield,
  Coins,
  Plus,
  Minus,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TransactionAction = 'bond' | 'unbond';

function getPortfolioSourceStatus(midgard: ApiHealthStatus, thornode: ApiHealthStatus) {
  if (midgard === 'down' || thornode === 'down') {
    return {
      label: 'Sources down',
      detail: 'Current data may be unavailable',
      dotClass: 'bg-red-500',
      className: 'border-red-200/70 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200',
    };
  }

  if (midgard === 'unknown' || thornode === 'unknown') {
    return {
      label: 'Sources unknown',
      detail: 'Health check pending',
      dotClass: 'bg-amber-500',
      className: 'border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
    };
  }

  if (midgard === 'degraded' || thornode === 'degraded') {
    return {
      label: 'Sources degraded',
      detail: 'One source is retrying',
      dotClass: 'bg-amber-500',
      className: 'border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
    };
  }

  return {
    label: 'Sources responding',
    detail: 'Recent Midgard + THORNode checks succeeded',
    dotClass: 'bg-emerald-500',
    className: 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200',
  };
}

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
  const { price: runePrice, intervals: runePriceHistory, isStale: runePriceIsStale, updatedAt: runePriceUpdatedAt } = useRunePriceHistory('hour', 24 * 7 + 1);
  const { data: marketNetwork } = useNetworkMetrics();
  const { benchmarks, isLoading: benchmarksLoading } = useYieldBenchmarks();
  const { data: allNodes, isLoading: allNodesLoading } = useAllNodes();
  const { pools: marketPools, isLoading: marketLoading } = usePools();
  const { feeRevenue, isLoading: feeRevenueLoading, error: feeRevenueError } = useFeeRevenue();
  const apiHealth = useApiHealthContext();

  const [showFeeRevenue, setShowFeeRevenue] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);

  const thornodeSourceUnreliable = apiHealth.thornode === 'degraded' || apiHealth.thornode === 'down';
  const isLoading = bondLoading && !thornodeSourceUnreliable;

  const portfolioModel = useMemo(() => buildPortfolioPageModel({
    bondPositions,
    lpError,
    lpPositions,
    runePrice,
    runePriceHistory,
    runePriceIsStale,
  }), [
    bondPositions,
    lpError,
    lpPositions,
    runePrice,
    runePriceHistory,
    runePriceIsStale,
  ]);
  const {
    effectiveLpPositions,
    pieData,
    runePriceChange24h,
    runePriceChange7d,
    totalBondedRune,
    totalPortfolioValueUsd,
    weightedAPY,
  } = portfolioModel;
  const portfolioInsight = useMemo(() => buildDashboardInsightState({
    address,
    positions: bondPositions,
    lpPositions: effectiveLpPositions,
    network: marketNetwork,
    apiHealth,
    runePrice,
    runePriceIsStale,
    runePriceUpdatedAt,
  }), [
    address,
    bondPositions,
    effectiveLpPositions,
    marketNetwork,
    apiHealth,
    runePrice,
    runePriceIsStale,
    runePriceUpdatedAt,
  ]);
  const sourceStatus = useMemo(
    () => getPortfolioSourceStatus(apiHealth.midgard, apiHealth.thornode),
    [apiHealth.midgard, apiHealth.thornode]
  );
  const bondAction = resolveThornodeGatedBondAction(portfolioInsight.actions, {
    label: 'Prepare BOND Memo',
    href: buildTransactionHref(address, 'bond'),
  });
  const BondActionIcon = bondAction.kind === 'source-confidence' ? AlertTriangle : Plus;
  const canOfferUnbondPrep = bondAction.kind === 'bond-ready' && bondPositions.length > 0;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <DashboardLoadingSkeleton
          title="Loading portfolio data"
          detail="Waiting for bond positions, LP positions, RUNE price, and market context before showing exposure or health."
          cards={4}
          className="p-0"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Portfolio
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Unified view of your Bond and LP positions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Portfolio transaction actions">
          <Link
            href={bondAction.href}
            className={buttonVariants({
              variant: bondAction.kind === 'source-confidence' ? 'outline' : 'success',
              className: 'gap-2',
            })}
          >
            <BondActionIcon className="w-4 h-4" />
            {bondAction.label}
          </Link>
          {canOfferUnbondPrep && (
            <Link
              href={buildTransactionHref(address, 'unbond')}
              className={buttonVariants({ variant: 'destructive', className: 'gap-2' })}
            >
              <Minus className="w-4 h-4" />
              Prepare UNBOND Memo
            </Link>
          )}
          <div
            role="group"
            aria-label="Portfolio source health"
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold',
              sourceStatus.className
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', sourceStatus.dotClass)} aria-hidden="true" />
            <span>{sourceStatus.label}</span>
            <span className="hidden font-medium opacity-80 sm:inline">{sourceStatus.detail}</span>
          </div>
          {bondPositions.length > 0 && <ExportButton bondPositions={bondPositions} />}
        </div>
      </div>

      <InsightHeader
        severity={portfolioInsight.severity}
        statusLabel={portfolioInsight.statusLabel}
        diagnosis={portfolioInsight.diagnosis}
        topRisk={portfolioInsight.topRisk}
        headingLevel={2}
        metrics={portfolioInsight.headerMetrics}
        primaryAction={portfolioInsight.primaryAction}
        eyebrow="Portfolio"
        compactMobileMetrics
      />

      <ActionQueue
        items={portfolioInsight.actions.slice(0, 3)}
        title="Next portfolio actions"
        compact
      />

      <MetricStrip metrics={portfolioModel.confidenceMetrics} title="Portfolio exposure confidence" />

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
          {totalPortfolioValueUsd > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={1}>
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
            <span className="text-xs font-bold uppercase font-serif italic">Heimdall&apos;s Sight</span>
          </div>
          <button
            type="button"
            aria-label={showIntelligence ? 'Hide Heimdall insight feed' : 'Show Heimdall insight feed'}
            aria-expanded={showIntelligence}
            aria-controls="portfolio-intelligence-feed"
            onClick={() => setShowIntelligence(!showIntelligence)}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 dark:focus-visible:ring-offset-zinc-950"
          >
            {showIntelligence ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
        {showIntelligence && (
          <div id="portfolio-intelligence-feed">
            <IntelligenceFeed
              positions={bondPositions}
              benchmarks={benchmarks}
              allNodes={allNodes || []}
              providerAddress={address}
              isLoading={allNodesLoading || benchmarksLoading}
            />
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
