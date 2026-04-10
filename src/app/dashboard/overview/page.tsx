'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { useYieldBenchmarks } from '@/lib/hooks/use-yield-benchmarks';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { PositionTable } from '@/components/dashboard/position-table';
import { NodeStatusCard } from '@/components/dashboard/node-status-card';
import { RewardProjections } from '@/components/dashboard/reward-projections';
import { ActionableAlerts } from '@/components/dashboard/actionable-alerts';
import { BondOptimizer } from '@/components/dashboard/bond-optimizer';

import { ExportButton } from '@/components/shared/export-button';
import { Plus, Minus, Sparkles, BrainCircuit } from 'lucide-react';

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
            <div key={i} className="h-24 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
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
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 py-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Link
              href={`/dashboard/transactions?address=${encodeURIComponent(address || '')}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Bond More
            </Link>
            <Link
              href={`/dashboard/transactions?address=${encodeURIComponent(address || '')}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Minus className="w-4 h-4" />
              Unbond
            </Link>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-800">
            <Sparkles className="w-3 h-3" />
            Live Update
          </div>
        </div>
        {positions.length > 0 && (
          <div className="flex justify-end">
            <ExportButton bondPositions={positions} />
          </div>
        )}
      </div>

      <ActionableAlerts positions={positions} address={address} />

      {/* Main Dashboard Grid - Fixed 3:1 Ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content Area (75% width on desktop) */}
        <div className="lg:col-span-3 space-y-8">
          <PortfolioSummary
            totalBonded={totalBonded}
            runePrice={price}
            weightedAPY={weightedAPY}
            positionCount={positions.length}
            positions={positions}
            benchmarks={benchmarks}
          />
          
          <div className="space-y-8">
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

        {/* Intelligence Hub Column (25% width on desktop) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center gap-2 mb-2 text-zinc-500 dark:text-zinc-400">
            <BrainCircuit className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Portfolio Intelligence</span>
          </div>
          
<BondOptimizer 
              positions={positions} 
              benchmarks={benchmarks} 
              allNodes={allNodes || []}
              providerAddress={address}
              isLoading={allNodesLoading || benchmarksLoading}
            />
          
          {/* Mobile Only Export - hidden on sm+ */}
          <div className="sm:hidden flex justify-end">
            <ExportButton bondPositions={positions} />
          </div>
        </div>
      </div>

      {/* Bottom Details Section */}
      {positions.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Node Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.map((pos) => (
              <NodeStatusCard key={pos.nodeAddress} position={pos} address={address} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
