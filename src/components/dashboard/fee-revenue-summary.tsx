'use client';

import { formatRuneAmount, formatUsd, runeToNumber } from '@/lib/utils/formatters';
import type { FeeRevenueSummaryRaw } from '@/lib/api/midgard';

interface FeeRevenueSummaryProps {
  summary?: FeeRevenueSummaryRaw;
  isLoading?: boolean;
  error?: string | null;
  userBond?: number;
  totalActiveBond?: number;
  runePrice?: number;
}

function SummaryCard({ label, runeValue, usdValue }: { label: string; runeValue: string; usdValue: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase text-zinc-400">{label}</p>
      <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{runeValue}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{formatUsd(usdValue, 0)}</p>
    </div>
  );
}

export function FeeRevenueSummary({ summary, isLoading, error, userBond = 0, totalActiveBond = 0, runePrice = 0 }: FeeRevenueSummaryProps) {
  const showUserShareCard = userBond > 0;
  const dailyRevenue = summary?.total24h ?? '0';
  const userEstimatedDailyShare = showUserShareCard && totalActiveBond > 0
    ? (userBond / totalActiveBond) * runeToNumber(dailyRevenue)
    : 0;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {isLoading ? (
          [...Array(showUserShareCard ? 4 : 3)].map((_, index) => (
            <div key={index} className="h-28 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
          ))
        ) : error ? (
          <div className="md:col-span-3 rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-red-500 dark:border-zinc-800">
            {error}
          </div>
        ) : (
          <>
            <SummaryCard label="24H Revenue" runeValue={formatRuneAmount(summary?.total24h ?? '0')} usdValue={summary?.total24hUsd ?? 0} />
            <SummaryCard label="7D Revenue" runeValue={formatRuneAmount(summary?.total7d ?? '0')} usdValue={summary?.total7dUsd ?? 0} />
            <SummaryCard label="30D Revenue" runeValue={formatRuneAmount(summary?.total30d ?? '0')} usdValue={summary?.total30dUsd ?? 0} />
            {showUserShareCard && (
              <div className="md:col-span-3">
                <SummaryCard
                  label="Your Est. Daily Share"
                  runeValue={formatRuneAmount(String(Math.round(userEstimatedDailyShare * 1e8)))}
                  usdValue={userEstimatedDailyShare * runePrice}
                />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
