'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { PositionTable } from '@/components/dashboard/position-table';
import { NodeStatusCard } from '@/components/dashboard/node-status-card';
import { RewardProjections } from '@/components/dashboard/reward-projections';

import { ExportButton } from '@/components/shared/export-button'
import { Plus, Minus, Download } from 'lucide-react';

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);
  const { price, isLoading: priceLoading } = useRunePrice();

  if (isLoading || priceLoading) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/transactions?address=${encodeURIComponent(address || '')}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition"
        >
          <Plus className="w-4 h-4" />
          Bond More
        </Link>
        <Link
          href={`/dashboard/transactions?address=${encodeURIComponent(address || '')}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition"
        >
          <Minus className="w-4 h-4" />
          Unbond
        </Link>
      </div>

      <PortfolioSummary
        totalBonded={totalBonded}
        runePrice={price}
        weightedAPY={weightedAPY}
        positionCount={positions.length}
      />

      {totalBonded > 0 && weightedAPY > 0 && (
        <RewardProjections
          totalBonded={totalBonded}
          weightedAPY={weightedAPY}
          runePrice={price}
        />
      )}

       <PositionTable positions={positions} />
       
       {positions.length > 0 && (
         <ExportButton bondPositions={positions} />
       )}

      {positions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Node Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positions.map((pos) => (
              <NodeStatusCard key={pos.nodeAddress} position={pos} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
