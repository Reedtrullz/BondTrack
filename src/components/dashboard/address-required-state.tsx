'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, Eye, RadioTower, ShieldCheck, WalletCards } from 'lucide-react';
import { AddressInput } from '@/components/shared/address-input';
import { DashboardCard } from '@/components/shared/dashboard-card';
import { RecentAddresses } from '@/components/shared/recent-addresses';

interface AddressRequiredStateProps {
  invalidUrlAddress?: boolean;
  onAddressSubmit: (address: string) => void;
}

export function AddressRequiredState({
  invalidUrlAddress = false,
  onAddressSubmit,
}: AddressRequiredStateProps) {
  return (
    <main
      id="main"
      className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-center gap-5">
        <section
          aria-label="Address required diagnosis"
          className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20 sm:p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                  {invalidUrlAddress ? (
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                  {invalidUrlAddress ? 'Address rejected' : 'Address required'}
                </span>
                <span className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                  Heimdall command center
                </span>
              </div>
              <h1 className="mt-4 max-w-3xl text-2xl font-bold leading-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
                {invalidUrlAddress
                  ? 'Malformed address ignored before loading dashboard data'
                  : 'Choose a watched THORChain address to start triage'}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {invalidUrlAddress
                  ? 'Heimdall did not use the address in this URL and did not change the saved dashboard address. Enter a valid THORChain address or THORName to continue safely.'
                  : 'Heimdall needs a bond provider, node operator, or LP address before it can rank node risk, rewards, LP exposure, and address-scoped source checks.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href="/dashboard/transactions?action=bond"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 dark:border-amber-800 dark:bg-zinc-950 dark:text-amber-100 dark:hover:bg-amber-950"
              >
                Prepare transaction memo
              </Link>
              <Link
                href="/dashboard/changelogs"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 dark:border-amber-800 dark:bg-zinc-950 dark:text-amber-100 dark:hover:bg-amber-950"
              >
                Review changelogs
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <DashboardCard className="p-4 sm:p-5" title="Start lookup">
            <p className="mb-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Paste a watched address or THORName. The dashboard stays public and read-only; wallet connection is only needed later for wallet-presented transaction review.
            </p>
            <AddressInput onAddressSubmit={onAddressSubmit} />
          </DashboardCard>

          <DashboardCard className="p-4 sm:p-5" title="Decision trust">
            <div className="grid gap-3">
              <TrustBoundary
                icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                title="Public read-only"
                detail="Dashboard routes query public chain data and do not require auth."
              />
              <TrustBoundary
                icon={<RadioTower className="h-4 w-4" aria-hidden="true" />}
                title="Freshness after lookup"
                detail="THORNode, Midgard, and price confidence appear before decisions."
              />
              <TrustBoundary
                icon={<WalletCards className="h-4 w-4" aria-hidden="true" />}
                title="Wallet stays separate"
                detail="Watched addresses never authorize BOND or UNBOND transactions."
              />
            </div>
          </DashboardCard>
        </div>

        <DashboardCard className="p-4 sm:p-5" title="Recent local addresses">
          <RecentAddresses />
        </DashboardCard>
      </div>
    </main>
  );
}

function TrustBoundary({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{detail}</p>
      </div>
    </div>
  );
}
