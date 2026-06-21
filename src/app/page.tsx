'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AddressInput } from '@/components/shared/address-input';
import { RecentAddresses } from '@/components/shared/recent-addresses';
import { Database, Eye, Lock, RadioTower, ShieldCheck, WalletCards } from 'lucide-react';
import { readDashboardAddress, writeDashboardAddress } from '@/lib/storage/keys';
import { isValidTHORChainAddress } from '@/lib/utils/address-validation';
import { useWatchlist } from '@/lib/hooks/use-watchlist';

export default function Home() {
  const router = useRouter();
  const { addAddress } = useWatchlist();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const lastAddress = readDashboardAddress();
    if (lastAddress && isValidTHORChainAddress(lastAddress)) {
      router.replace(`/dashboard?address=${encodeURIComponent(lastAddress)}`);
    }
  }, [router]);

  const handleAddressSubmit = (address: string) => {
    writeDashboardAddress(address);
    addAddress(address);
    router.push(`/dashboard?address=${encodeURIComponent(address)}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
          <section className="space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 shadow-sm dark:border-amber-900/60 dark:bg-zinc-900 dark:text-amber-300">
                <Eye className="h-4 w-4" aria-hidden="true" />
                Heimdall
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                  THORChain operations console
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
                  Enter a bond provider address, then inspect node risk, rewards,
                  source freshness, and wallet transaction review context from one read-only dashboard.
                </p>
              </div>
            </div>

            <section
              aria-label="Address lookup"
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
            >
              <div className="mb-4 flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Start with a bond provider address
                </h2>
                <p className="text-sm leading-5 text-zinc-500 dark:text-zinc-400">
                  Heimdall opens directly to the command center after a valid THORChain
                  address or THORName resolves.
                </p>
              </div>
              <AddressInput onAddressSubmit={handleAddressSubmit} />
            </section>

            <section
              aria-label="Recent dashboard addresses"
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
            >
              <RecentAddresses />
            </section>
          </section>

          <aside
            aria-label="Heimdall trust boundaries"
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Read-only by default
              </div>
              <h2 className="mt-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Trust boundaries
              </h2>
              <p className="mt-1 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
                Know what Heimdall stores, what it reads, and where wallet authority stays.
              </p>
            </div>

            <div className="space-y-3">
              <TrustBoundary
                icon={<Database className="h-4 w-4" aria-hidden="true" />}
                title="Public on-chain data"
                detail="Address-bound dashboard data comes from THORNode and Midgard public endpoints."
              />
              <TrustBoundary
                icon={<Lock className="h-4 w-4" aria-hidden="true" />}
                title="Stored locally"
                detail="Recent addresses and dismissed alerts stay in this browser."
              />
              <TrustBoundary
                icon={<WalletCards className="h-4 w-4" aria-hidden="true" />}
                title="Wallet approval stays external"
                detail="BOND and UNBOND payloads open in your wallet for final review; approve only if memo, amount, network, and fee match."
              />
              <TrustBoundary
                icon={<RadioTower className="h-4 w-4" aria-hidden="true" />}
                title="Source-aware dashboard"
                detail="Operational pages surface degraded or stale source state before detailed metrics."
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function TrustBoundary({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{detail}</p>
      </div>
    </div>
  );
}
