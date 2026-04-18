'use client';

import { useCallback, type MouseEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TransactionComposer } from '@/components/dashboard/transaction-composer';
import { TransactionHistory } from '@/components/dashboard/transaction-history';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useWatchlist } from '@/lib/hooks/use-watchlist';
import { useBondHistory } from '@/lib/hooks/use-bond-history';

type TransactionAction = 'bond' | 'unbond';

function parseTransactionAction(action: string | null): TransactionAction {
  return action?.toLowerCase() === 'unbond' ? 'unbond' : 'bond';
}

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const address = searchParams.get('address');
  const action = parseTransactionAction(searchParams.get('action'));

  const { positions } = useBondPositions(address);
  const { addresses: watchlist, addAddress, removeAddress } = useWatchlist();
  const { bondActions } = useBondHistory(address);

  const syncTransactionMode = useCallback((nextAction: TransactionAction) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set('action', nextAction);
    params.delete('amount');

    router.replace(`/dashboard/transactions?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleComposerClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest('button');
    const label = button?.textContent?.trim();

    if (label === 'BOND' && action !== 'bond') {
      syncTransactionMode('bond');
    }

    if (label === 'UNBOND' && action !== 'unbond') {
      syncTransactionMode('unbond');
    }
  }, [action, syncTransactionMode]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Transaction Center</h2>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-md font-medium text-zinc-700 dark:text-zinc-300">
              Transaction Composer
            </h3>
            <span
              className={action === 'bond'
                ? 'inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-400'}
            >
              {action === 'bond' ? 'Bond mode' : 'Unbond mode'}
            </span>
          </div>
          <div onClick={handleComposerClick}>
            <TransactionComposer positions={positions} address={address} />
          </div>
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
