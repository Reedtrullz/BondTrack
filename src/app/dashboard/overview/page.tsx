'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePriceHistory } from '@/lib/hooks/use-rune-price';
import { useYieldBenchmarks } from '@/lib/hooks/use-yield-benchmarks';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { getFeeRevenue, getNetwork, getPools, type FeeRevenueRaw, type NetworkRaw, type PoolDetailRaw } from '@/lib/api/midgard';
import { MarketOverview } from '@/components/dashboard/market-overview';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { FeeRevenueChart } from '@/components/dashboard/fee-revenue-chart';
import { FeeRevenueSummary } from '@/components/dashboard/fee-revenue-summary';
import { PositionTable } from '@/components/dashboard/position-table';
import { RewardProjections } from '@/components/dashboard/reward-projections';
import { ActionableAlerts } from '@/components/dashboard/actionable-alerts';
import { IntelligenceFeed } from '@/components/dashboard/intelligence-feed';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/shared/export-button';
import { runeToNumber } from '@/lib/utils/formatters';
import { Plus, Minus, Sparkles, Eye } from 'lucide-react';

type TransactionAction = 'bond' | 'unbond';

function buildTransactionHref(address: string | null, action: TransactionAction) {
  const params = new URLSearchParams();

  if (address) {
    params.set('address', address);
  }

  params.set('action', action);

  return `/dashboard/transactions?${params.toString()}`;
}

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);
  const { price, intervals: runePriceHistory, isLoading: priceLoading } = useRunePriceHistory('day', 8);
  const { benchmarks, isLoading: benchmarksLoading } = useYieldBenchmarks();
  const { data: allNodes, isLoading: allNodesLoading } = useAllNodes();
  const [marketPools, setMarketPools] = useState<PoolDetailRaw[]>([]);
  const [marketNetwork, setMarketNetwork] = useState<NetworkRaw | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [feeRevenue, setFeeRevenue] = useState<FeeRevenueRaw | null>(null);
  const [feeRevenueLoading, setFeeRevenueLoading] = useState(true);
  const [feeRevenueError, setFeeRevenueError] = useState<string | null>(null);

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

    if (!Number.isFinite(first) || first <= 0 || !Number.isFinite(last)) return null;
    return ((last - first) / first) * 100;
  })();

  useEffect(() => {
    let active = true;

    async function loadMarketOverview() {
      setMarketLoading(true);

      const [poolsResult, networkResult] = await Promise.allSettled([getPools(), getNetwork()]);

      if (!active) {
        return;
      }

      if (poolsResult.status === 'fulfilled') {
        setMarketPools(poolsResult.value);
      } else {
        console.error(poolsResult.reason);
      }

      if (networkResult.status === 'fulfilled') {
        setMarketNetwork(networkResult.value);
      } else {
        console.error(networkResult.reason);
      }

      setMarketLoading(false);
    }

    async function loadFeeRevenue() {
      setFeeRevenueLoading(true);
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

    loadMarketOverview();
    loadFeeRevenue();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading || priceLoading || benchmarksLoading || allNodesLoading || marketLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
      </div>
    );
  }

  const totalBonded = positions.reduce((sum, p) => sum + p.bondAmount, 0);
  const weightedAPY = positions.length > 0
    ? positions.reduce((sum, p) => sum + p.netAPY * p.bondAmount, 0) / totalBonded
    : 0;

  const averageFeeBps = positions.length > 0
    ? positions.reduce((sum, p) => sum + (p.operatorFee || 0) * p.bondAmount, 0) / totalBonded
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
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
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/50">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>Live</span>
          </div>
        </div>
        {positions.length > 0 && (
          <div className="flex justify-end">
            <ExportButton bondPositions={positions} />
          </div>
        )}
      </div>

      <ActionableAlerts positions={positions} address={address} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <MarketOverview
            pools={marketPools}
            network={marketNetwork}
            runePrice={price}
            runePriceChange24h={runePriceChange24h}
            runePriceChange7d={runePriceChange7d}
            isLoading={marketLoading}
          />

          <PortfolioSummary
            totalBonded={totalBonded}
            runePrice={price}
            weightedAPY={weightedAPY}
            positionCount={positions.length}
            positions={positions}
            benchmarks={benchmarks}
          />

          <div className="space-y-6">
            <FeeRevenueSummary
              summary={feeRevenue?.summary}
              isLoading={feeRevenueLoading}
              error={feeRevenueError}
              userBond={totalBonded}
              totalActiveBond={runeToNumber(marketNetwork?.bondMetrics?.totalActiveBond)}
              bondingEarnings={feeRevenue?.daily?.[feeRevenue.daily.length - 1]?.bondRewards}
              runePrice={price}
            />
            <FeeRevenueChart
              daily={feeRevenue?.daily}
              isLoading={feeRevenueLoading}
              error={feeRevenueError}
            />
          </div>
          
          <div className="space-y-6">
            {totalBonded > 0 && weightedAPY > 0 && (
              <RewardProjections
                totalBonded={totalBonded}
                weightedAPY={weightedAPY}
                runePrice={price}
                averageFeeBps={averageFeeBps}
              />
            )}
            <PositionTable positions={positions} />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 mb-3 text-amber-600/80 dark:text-amber-500/80">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest font-serif italic">Heimdall's Sight</span>
          </div>
          
          <IntelligenceFeed 
            positions={positions} 
            benchmarks={benchmarks} 
            allNodes={allNodes || []}
            providerAddress={address}
            isLoading={allNodesLoading || benchmarksLoading}
          />
          
          <div className="sm:hidden flex justify-end mt-4">
            <ExportButton bondPositions={positions} />
          </div>
        </div>
      </div>
    </div>
  );
}
