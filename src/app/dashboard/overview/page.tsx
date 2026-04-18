'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { useYieldBenchmarks } from '@/lib/hooks/use-yield-benchmarks';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { PositionTable } from '@/components/dashboard/position-table';
import { RewardProjections } from '@/components/dashboard/reward-projections';
import { ActionableAlerts } from '@/components/dashboard/actionable-alerts';
import { BondOptimizer } from '@/components/dashboard/bond-optimizer';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/shared/export-button';
import { Plus, Minus, Sparkles, BrainCircuit, TrendingUp } from 'lucide-react';

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
  const { price, isLoading: priceLoading } = useRunePrice();
  const { benchmarks, isLoading: benchmarksLoading } = useYieldBenchmarks();
  const { data: allNodes, isLoading: allNodesLoading } = useAllNodes();

  if (isLoading || priceLoading || benchmarksLoading || allNodesLoading) {
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
          <PortfolioSummary
            totalBonded={totalBonded}
            runePrice={price}
            weightedAPY={weightedAPY}
            positionCount={positions.length}
            positions={positions}
            benchmarks={benchmarks}
          />
          
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
          <div className="flex items-center gap-2 mb-3 text-zinc-500 dark:text-zinc-400">
            <BrainCircuit className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Intelligence</span>
          </div>
          
          <BondOptimizer 
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
