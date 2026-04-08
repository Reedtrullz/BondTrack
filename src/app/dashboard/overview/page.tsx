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
import { Plus, Minus } from 'lucide-react';

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading: positionsLoading } = useBondPositions(address);
  const { price, isLoading: priceLoading } = useRunePrice();
  const { benchmarks, isLoading: benchmarksLoading } = useYieldBenchmarks();
  const { data: allNodes, isLoading: allNodesLoading } = useAllNodes();

  const isGlobalLoading = positionsLoading || priceLoading || benchmarksLoading || allNodesLoading;

  if (isGlobalLoading) {
    return (
      <div className=\"max-w-7xl mx-auto space-y-6 p-4\">\n        <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4\">\n          {[...Array(4)].map((_, i) => (\n            <div key={i} className=\"h-24 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse\" />\n          ))}\n        </div>\n        <div className=\"h-64 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse\" />\n      </div>\n    );\n  }

  const totalBonded = positions.reduce((sum, p) => sum + p.bondAmount, 0);
  const weightedAPY = positions.length > 0
    ? positions.reduce((sum, p) => sum + p.netAPY * p.bondAmount, 0) / totalBonded
    : 0;

  return (
    <div className=\"max-w-7xl mx-auto space-y-8 p-4\">\n      {/* Header Section */}\n      <div className=\"flex flex-col sm:flex-row sm:items-center justify-between gap-4\">\n        <div className=\"flex gap-2\">\n          <Link\n            href={`/dashboard/transactions?address=${encodeURIComponent(address || '')}`}\n            className=\"inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors\"\n          >\n            <Plus className=\"w-4 h-4\" />\n            Bond More\n          </Link>\n          <Link\n            href={`/dashboard/transactions?address=${encodeURIComponent(address || '')}`}\n            className=\"inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors\"\n          >\n            <Minus className=\"w-4 h-4\" />\n            Unbond\n          </Link>\n        </div>\n        {positions.length > 0 && (\n          <div className=\"flex justify-end\">\n            <ExportButton bondPositions={positions} />\n          </div>\n        )}\n      </div>\n\n      <ActionableAlerts positions={positions} />\n\n      {/* Main Dashboard Grid - Fixed 3:1 Ratio */}\n      <div className=\"grid grid-cols-1 lg:grid-cols-4 gap-8\">\n        {/* Main Content Area (75% width on desktop) */}\n        <div className=\"lg:col-span-3 space-y-8\">\n          <PortfolioSummary\n            totalBonded={totalBonded}\n            runePrice={price}\n            weightedAPY={weightedAPY}\n            positionCount={positions.length}\n            positions={positions}\n            benchmarks={benchmarks}\n          />\n          \n          <div className=\"space-y-8\">\n            {totalBonded > 0 && weightedAPY > 0 && (\n              <RewardProjections\n                totalBonded={totalBonded}\n                weightedAPY={weightedAPY}\n                runePrice={price}\n              />\n            )}\n            <PositionTable positions={positions} />\n          </div>\n        </div>\n\n        {/* Side Actions Panel (25% width on desktop) */}\n        <div className=\"lg:col-span-1 space-y-6\">\n          <BondOptimizer \n            positions={positions} \n            benchmarks={benchmarks} \n            allNodes={allNodes || []} \n            isLoading={allNodesLoading || benchmarksLoading}\n          />\n        </div>\n      </div>\n\n      {/* Bottom Details Section */}\n      {positions.length > 0 && (\n        <div className=\"space-y-4 pt-8 border-t border-zinc-200 dark:border-zinc-800\">\n          <h2 className=\"text-lg font-semibold text-zinc-900 dark:text-zinc-100\">\n            Node Details\n          </h2>\n          <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">\n            {positions.map((pos) => (\n              <NodeStatusCard key={pos.nodeAddress} position={pos} />\n            ))}\n          </div>\n        </div>\n      )}\n    </div>\n  );\n}
