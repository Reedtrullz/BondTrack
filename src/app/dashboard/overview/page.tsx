'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { PositionTable } from '@/components/dashboard/position-table';
import { NodeStatusCard } from '@/components/dashboard/node-status-card';

import { ExportButton } from '@/components/shared/export-button'

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
      <PortfolioSummary
        totalBonded={totalBonded}
        runePrice={price}
        weightedAPY={weightedAPY}
        positionCount={positions.length}
      />

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
