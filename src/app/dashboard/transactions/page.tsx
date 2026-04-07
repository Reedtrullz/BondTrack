'use client';

import { useSearchParams } from 'next/navigation';
import { TransactionComposer } from '@/components/dashboard/transaction-composer';
import { TransactionHistory } from '@/components/dashboard/transaction-history';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useWatchlist } from '@/lib/hooks/use-watchlist';
import { useBondHistory } from '@/lib/hooks/use-bond-history';

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  const { positions } = useBondPositions(address);
  const { addresses: watchlist, addAddress, removeAddress } = useWatchlist();
  const { bondActions } = useBondHistory(address);

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

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300 mb-4">
            Watchlist
          </h3>
          {watchlist.length === 0 ? (
            <p className="text-sm text-zinc-500">No saved addresses. Your recent lookups appear here.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {watchlist.map(addr => (
                <button
                  key={addr}
                  onClick={() => window.location.href = `/dashboard?address=${addr}`}
                  className="px-3 py-1 text-xs font-mono bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  {addr.slice(0, 10)}...
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {address && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300 mb-4">
            Bond History
          </h3>
          <TransactionHistory address={address} />
        </div>
      )}
    </div>
  );
}
