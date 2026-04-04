'use client';

import { useSearchParams } from 'next/navigation';
import { TransactionComposer } from '@/components/dashboard/transaction-composer';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  const { positions } = useBondPositions(address);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Transaction Center</h2>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300 mb-4">
            Transaction Composer
          </h3>
          <TransactionComposer positions={positions} />
        </div>
      </div>
    </div>
  );
}
