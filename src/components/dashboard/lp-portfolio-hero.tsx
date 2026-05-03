'use client';

import { formatPercent, formatUsd } from '../../lib/utils/formatters';
import type { LpPortfolioSummary } from '../../lib/utils/lp-analytics';

interface LpPortfolioHeroProps {
  summary: LpPortfolioSummary;
}

export function LpPortfolioHero({ summary }: LpPortfolioHeroProps) {
  const lastActivityLabel = summary.latestActivityTimestamp
    ? new Date(summary.latestActivityTimestamp * 1000).toLocaleDateString()
    : '--';
  const netProfitLossValue = summary.totalNetProfitLossUsd === null
    ? '$0'
    : formatUsd(summary.totalNetProfitLossUsd, 0);
  const netProfitLossDetail = summary.totalNetProfitLossPercent === null
    ? summary.currentOnlyCount > 0
      ? `LP yield · ${summary.currentOnlyCount} position${summary.currentOnlyCount === 1 ? '' : 's'} without entry prices`
      : 'No positions'
    : summary.currentOnlyCount > 0
      ? `${formatPercent(summary.totalNetProfitLossPercent)} · includes LP yield estimates`
      : formatPercent(summary.totalNetProfitLossPercent);
  const positionsDetail = summary.currentOnlyCount > 0
    ? `${summary.historicalCount} with full history · ${summary.currentOnlyCount} current-only`
    : `${summary.historicalCount} with full history`;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <HeroCard
        label="Total LP Value"
        value={formatUsd(summary.totalValueUsd, 0)}
        detail="Current withdrawable market value"
      />
      <HeroCard
        label="Net P/L"
        value={netProfitLossValue}
        detail={netProfitLossDetail}
      />
      <HeroCard
        label="Positions"
        value={String(summary.positionCount)}
        detail={positionsDetail}
      />
      <HeroCard
        label="Last Activity"
        value={lastActivityLabel}
        detail="Most recent add-liquidity date"
      />
    </section>
  );
}

interface HeroCardProps {
  label: string;
  value: string;
  detail: string;
}

function HeroCard({ label, value, detail }: HeroCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-md backdrop-blur-md transition-all duration-300 hover:shadow-glow dark:border-zinc-800 dark:bg-zinc-900/80">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-bold font-display text-gradient">{value}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  );
}
