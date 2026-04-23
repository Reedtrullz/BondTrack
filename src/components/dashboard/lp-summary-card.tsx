import React from 'react';
import type { LpPosition } from '../../lib/types/lp';
import { formatPercent, formatRuneAmount, formatUsd, formatAmount } from '../../lib/utils/formatters';
import { LpStatusBadge } from './lp-status-badge';

function getSignedTone(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'text-zinc-500 dark:text-zinc-400';
  }

  if (value > 0) {
    return 'text-[var(--color-success)]';
  }

  if (value < 0) {
    return 'text-[var(--color-danger)]';
  }

  return 'text-zinc-600 dark:text-zinc-400';
}

function getImpermanentLossTone(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'text-zinc-500 dark:text-zinc-400';
  }

  if (value < 0) {
    return 'text-[var(--color-danger)]';
  }

  if (value > 0) {
    return 'text-[var(--color-success)]';
  }

  return 'text-zinc-600 dark:text-zinc-400';
}

export const LpSummaryCard: React.FC<{ position: LpPosition }> = ({ position }) => {
  const pnlTone = getSignedTone(position.netProfitLossUsd);
  const ilTone = getImpermanentLossTone(position.impermanentLossPercent);

  // Calculate Time in Pool
  const firstAddedTs = Number(position.dateFirstAdded);
  let timeInPool = 'Unknown';
  if (Number.isFinite(firstAddedTs) && firstAddedTs > 0) {
    const ts = firstAddedTs > 1e12 ? firstAddedTs / 1000 : firstAddedTs * 1000;
    const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
    if (days < 1) {
      timeInPool = '< 1 day';
    } else if (days < 30) {
      timeInPool = `${days} day${days === 1 ? '' : 's'}`;
    } else {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      timeInPool = months > 0 
        ? `${months} mo ${remainingDays}d`
        : `${days}d`;
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white/80 p-6 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-glow dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Pool</p>
          <a
            href={`https://thorchain.net/pool/${position.pool}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-bold font-display text-zinc-900 transition-colors hover:text-[var(--color-primary)] dark:text-zinc-100"
          >
            {position.pool}
          </a>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Ownership {formatPercent(position.ownershipPercent)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LpStatusBadge status={position.poolStatus} />
          {position.hasPending ? (
            <span className="rounded-full bg-[var(--color-warning)]/20 px-2 py-1 text-xs font-medium text-[var(--color-warning)]">
              Pending Add
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="RUNE Deposited" value={formatRuneAmount(position.runeDeposit)} />
        <MetricCard label={`${position.assetSymbol} Deposited`} value={formatRuneAmount(position.asset2Deposit)} />
        <MetricCard label="Current Value" value={formatUsd(position.currentTotalValueUsd, 0)} />
        <MetricCard
          label="Net P/L"
          value={formatUsd(position.netProfitLossUsd ?? 0, 0)}
          detail={position.pricingSource === 'current-only'
            ? `${formatPercent(position.netProfitLossPercent)} · LP yield`
            : position.pricingSource === 'estimated'
              ? `${formatPercent(position.netProfitLossPercent)} · estimated entry`
              : formatPercent(position.netProfitLossPercent)}
          valueClassName={pnlTone}
        />
        <MetricCard 
          label="Claimable RUNE" 
          value={formatRuneAmount(position.runeWithdrawable)} 
          valueClassName="text-[var(--color-success)]"
        />
        <MetricCard 
          label={`Claimable ${position.assetSymbol}`} 
          value={formatAmount(position.asset2Withdrawable)} 
          valueClassName="text-[var(--color-success)]"
        />
        <MetricCard
          label="Impermanent Loss"
          value={formatUsd(position.impermanentLossUsd ?? 0, 0)}
          detail={formatPercent(position.impermanentLossPercent)}
          valueClassName={ilTone}
        />
        <MetricCard 
          label="Time in Pool" 
          value={timeInPool} 
          detail={`Started ${new Date(firstAddedTs * 1000).toLocaleDateString()}`}
        />
      </div>
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  valueClassName?: string;
}

function MetricCard({ label, value, detail, valueClassName = 'text-zinc-900 dark:text-zinc-100' }: MetricCardProps) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{label}</p>
      <p className={`text-xl font-semibold font-display truncate ${valueClassName}`} title={value}>{value}</p>
      {detail ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate" title={detail}>{detail}</p> : null}
    </div>
  );
}
