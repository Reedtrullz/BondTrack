'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Info, ShieldCheck, WalletCards } from 'lucide-react';
import { TransactionComposer } from '@/components/dashboard/transaction-composer';
import { TransactionHistory } from '@/components/dashboard/transaction-history';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useWatchlist } from '@/lib/hooks/use-watchlist';
import { useBondHistory } from '@/lib/hooks/use-bond-history';
import { useApiHealthContext } from '@/lib/hooks/use-api-health';
import { useWalletContext } from '@/lib/hooks/use-wallet';
import {
  buildTransactionPreflightModel,
  parseTransactionAction,
  type TransactionAction,
  type TransactionPreflightSeverity,
} from '@/lib/dashboard/transaction-preflight';
import { buildSourceFreshness } from '@/lib/dashboard/insights';
import { SourceFreshnessPanel } from '@/components/dashboard/source-freshness-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const preflightSeverityClass: Record<TransactionPreflightSeverity, string> = {
  ready: 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200',
  info: 'border-sky-200 bg-sky-50/80 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200',
  warning: 'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200',
  critical: 'border-red-200 bg-red-50/80 text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200',
};

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const address = searchParams.get('address');
  const action = parseTransactionAction(searchParams.get('action'));

  const { positions, isLoading: positionsLoading, error: positionsError } = useBondPositions(address);
  const { addresses: watchlist } = useWatchlist();
  const { isConnected, isNetworkMismatch, address: walletAddress, walletType, networkMismatch } = useWalletContext();
  const apiHealth = useApiHealthContext();
  useBondHistory(address);

  const preflight = buildTransactionPreflightModel({
    actionParam: searchParams.get('action'),
    dashboardAddress: address,
    positions,
    source: {
      positionsError: Boolean(positionsError),
      positionsLoading,
      thornodeStatus: apiHealth.thornode,
    },
    wallet: {
      address: walletAddress,
      isConnected,
      isNetworkMismatch,
      networkMismatch,
      walletType,
    },
  });
  const preflightIcon = preflight.severity === 'critical'
    ? AlertTriangle
    : preflight.severity === 'warning'
      ? AlertTriangle
      : preflight.severity === 'ready'
        ? ShieldCheck
        : Info;
  const PreflightIcon = preflightIcon;
  const transactionSources = buildSourceFreshness(apiHealth, { includeRunePriceSource: false });

  const syncTransactionMode = useCallback((nextAction: TransactionAction) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set('action', nextAction);
    params.delete('amount');

    router.replace(`/dashboard/transactions?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Transactions</h1>
        <p className="hidden max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400 sm:block">
          Prepare THORChain BOND and UNBOND deposit memos, then let the connected wallet confirm the final payload and network fee before broadcast.
        </p>
      </div>

      <section
        aria-label="Transaction safety preflight"
        className={cn(
          'rounded-2xl border p-3 shadow-sm sm:p-5',
          preflightSeverityClass[preflight.severity]
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/50 dark:bg-zinc-950/30">
              <PreflightIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide opacity-80">Transaction preflight</p>
              <h2 className="text-lg font-bold">{preflight.status}</h2>
              <p className="mt-1 text-sm leading-5 opacity-90">{preflight.detail}</p>
            </div>
          </div>
          <a
            href="#transaction-composer"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-white/60 px-3 text-xs font-bold text-current shadow-sm transition hover:bg-white/80 dark:bg-zinc-950/30 dark:hover:bg-zinc-900/60"
          >
            Open composer
          </a>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 xl:grid-cols-5">
          {preflight.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-xl border bg-white/70 p-2.5 dark:bg-zinc-950/30 sm:p-3',
                preflightSeverityClass[item.severity]
              )}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-75">
                {item.id === 'wallet' ? <WalletCards className="h-3.5 w-3.5" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                {item.label}
              </div>
              <div className="mt-1 truncate text-sm font-bold">{item.value}</div>
              <p className="mt-1 hidden text-xs leading-4 opacity-80 sm:block">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <SourceFreshnessPanel sources={transactionSources} compact title="Transaction source confidence" />
      
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <section
          id="transaction-composer"
          aria-label="Transaction composer"
          className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 scroll-mt-24"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-md font-medium text-zinc-700 dark:text-zinc-300">
              Transaction Composer
            </h2>
            <span
              className={action === 'bond'
                ? 'inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-emerald-600 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-400'}
            >
              {action === 'bond' ? 'Bond mode' : 'Unbond mode'}
            </span>
          </div>
          <TransactionComposer
            positions={positions}
            address={address}
            onModeChange={syncTransactionMode}
            sourceSafety={preflight.source}
          />
        </section>

        <aside
          className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
          aria-label="Dashboard address context"
        >
          <div className="mb-4 space-y-1">
            <h2 className="text-md font-semibold text-zinc-800 dark:text-zinc-200">
              Dashboard address context
            </h2>
            <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              These addresses switch the watched dashboard account. They never fill the BOND/UNBOND node field or memo.
            </p>
          </div>
          <Tabs defaultValue="watchlist" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 bg-zinc-100 dark:bg-zinc-800">
              <TabsTrigger value="watchlist">Addresses</TabsTrigger>
              <TabsTrigger value="history">Bond history</TabsTrigger>
            </TabsList>
            <TabsContent value="watchlist" className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Watched dashboard addresses
              </h3>
              {watchlist.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No saved dashboard addresses. Successful lookups appear here for navigation only.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {watchlist.map(addr => (
                    <button
                      key={addr}
                      type="button"
                      onClick={() => router.push(`/dashboard?address=${encodeURIComponent(addr)}`)}
                      className="px-3 py-1 text-xs font-mono bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      aria-label={`Open dashboard for watched address ${addr}`}
                      title={addr}
                    >
                      {addr.slice(0, 10)}...
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="history" className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Bond history for watched address
              </h3>
              {address ? (
                <TransactionHistory address={address} />
              ) : (
                <p className="text-sm text-zinc-500">Enter an address to load bond and unbond history.</p>
              )}
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
