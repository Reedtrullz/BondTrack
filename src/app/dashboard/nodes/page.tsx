'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { NodeStatusCard } from '@/components/dashboard/node-status-card';

export default function NodesPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);

  if (isLoading) {
    return <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />)}</div>;
  }

  if (positions.length === 0) {
    return <p className="text-zinc-500">No bonded positions found.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Node Health</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {positions.map((pos) => (
          <NodeStatusCard key={pos.nodeAddress} position={pos} />
        ))}
      </div>
    </div>
  );
}
