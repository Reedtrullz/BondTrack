'use client';

import { useId, useState } from 'react';
import { TrendingUp, DollarSign, Activity, Coins, ShieldCheck, Info } from 'lucide-react';
import { calculatePortfolioHealth, type HealthScoreResult } from '@/lib/utils/health-score';
import { formatPercent, formatRuneDisplayNumber, formatRuneFromNumber, formatUsd, formatUtcDateTime } from '@/lib/utils/formatters';
import { getYieldPerformanceColor } from '@/lib/utils/yield-benchmarks';
import type { BondPosition } from '@/lib/types/node';
import { YieldBenchmarks } from '@/lib/utils/yield-benchmarks';
import { getProviderExposureReviewState } from '@/lib/dashboard/provider-exposure-review';
import { cn } from '@/lib/utils';

interface PortfolioSummaryProps {
  totalBonded: number;
  runePrice: number;
  runePriceIsStale?: boolean;
  runePriceUpdatedAt?: Date | null;
  weightedAPY: number;
  positions: BondPosition[];
  benchmarks?: YieldBenchmarks;
  feeImpactRUNE?: number;
  feeImpactUSD?: number;
}

function isUsableSummaryNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function PortfolioSummary({ totalBonded, runePrice, runePriceIsStale = false, runePriceUpdatedAt, weightedAPY, positions, benchmarks, feeImpactRUNE, feeImpactUSD }: PortfolioSummaryProps) {
  const health = calculatePortfolioHealth(positions);
  const hasUsableTotalBonded = isUsableSummaryNumber(totalBonded);
  const hasUsableRunePrice = isUsableSummaryNumber(runePrice) && runePrice > 0;
  const hasUsableWeightedAPY = isUsableSummaryNumber(weightedAPY);
  const usdValue = hasUsableTotalBonded && hasUsableRunePrice ? totalBonded * runePrice : null;
  const annualEarnings = hasUsableTotalBonded && hasUsableWeightedAPY && weightedAPY > 0
    ? totalBonded * (weightedAPY / 100)
    : null;
  const annualEarningsUSD = annualEarnings !== null && hasUsableRunePrice ? annualEarnings * runePrice : null;
  const hasUsableFeeImpact = isUsableSummaryNumber(feeImpactRUNE) && feeImpactRUNE > 0;

  const apyColor = benchmarks && hasUsableWeightedAPY
    ? getYieldPerformanceColor(weightedAPY, benchmarks.networkAverageAPY)
    : 'text-zinc-900 dark:text-zinc-100';
  const runePriceSubValue = runePriceIsStale
    ? `Stale price${runePriceUpdatedAt ? ` · updated ${formatUtcDateTime(runePriceUpdatedAt)}` : ''}`
    : runePriceUpdatedAt
      ? `Updated ${formatUtcDateTime(runePriceUpdatedAt)}`
      : hasUsableRunePrice
        ? 'Quote loaded without freshness'
        : undefined;
  const quoteDerivedSuffix = runePriceIsStale
    ? ' · stale quote'
    : hasUsableRunePrice && !runePriceUpdatedAt
      ? ' · quote unverified'
      : '';
  const totalBondedUsdSubValue = `${usdValue !== null ? formatUsd(usdValue, 2, 2) : '--'} USD${usdValue !== null ? quoteDerivedSuffix : ''}`;
  const annualEarningsUsdSubValue = annualEarningsUSD !== null
    ? `${formatUsd(annualEarningsUSD, 2, 2)}${quoteDerivedSuffix}`
    : '--';
  const feeImpactUsdSubValue = isUsableSummaryNumber(feeImpactUSD) && feeImpactUSD > 0
    ? `-${formatUsd(feeImpactUSD, 2, 2)}${quoteDerivedSuffix}`
    : undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <SummaryCard 
        icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
        label="Total Bonded"
        value={hasUsableTotalBonded ? formatRuneFromNumber(totalBonded) : '--'}
        subValue={totalBondedUsdSubValue}
        highlight="emerald"
      />
      <SummaryCard 
        icon={<Coins className="w-4 h-4 text-amber-500" />}
        label="Annual Earnings (Net)"
        value={annualEarnings !== null ? formatRuneDisplayNumber(annualEarnings) : 'N/A'}
        subValue={annualEarningsUsdSubValue}
        highlight="amber"
      />
      {hasUsableFeeImpact && (
        <SummaryCard 
          icon={<DollarSign className="w-4 h-4 text-red-500" />}
          label="Fee Impact"
          value={`-${formatRuneDisplayNumber(feeImpactRUNE)} RUNE`}
          subValue={feeImpactUsdSubValue}
          highlight="red"
        />
      )}
      <SummaryCard 
        icon={<DollarSign className="w-4 h-4 text-cyan-500" />}
        label="RUNE Price"
        value={hasUsableRunePrice ? formatUsd(runePrice, 4, 4) : '--'}
        subValue={runePriceSubValue}
        highlight="cyan"
      />
      <SummaryCard 
        icon={<Activity className="w-4 h-4 text-purple-500" />}
        label="Weighted APY"
        value={<span className={cn("font-bold", apyColor)}>{formatPercent(hasUsableWeightedAPY ? weightedAPY : null)}</span>}
        subValue={benchmarks ? `Avg: ${benchmarks.networkAverageAPY}% · Top: ${benchmarks.topTierAPY}%` : undefined}
        highlight="purple"
      />
      <SummaryCard 
        icon={<ShieldCheck className="w-4 h-4" />}
        label="Provider Exposure"
        value={<HealthScoreDisplay health={health} />}
      />
    </div>
  );
}

function HealthScoreDisplay({ health }: { health: HealthScoreResult }) {
  const { breakdown } = health;
  const [isOpen, setIsOpen] = useState(false);
  const breakdownId = useId();
  const reviewState = getProviderExposureReviewState(health);
  const hasReviewDeductions = breakdown.slashPenalty > 0
    || breakdown.atRiskPenalty > 0
    || breakdown.jailedPenalty > 0
    || breakdown.statusPenalty > 0;
  
  return (
    <div className="space-y-2 font-sans">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={cn("block text-sm font-semibold leading-tight", reviewState.className)}>{reviewState.label}</span>
          {health.reason && (
            <span className="mt-1 block text-xs font-medium leading-snug text-zinc-500 dark:text-zinc-400">{health.reason}</span>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-offset-zinc-950"
          aria-label={`Provider exposure evidence: ${health.reason}`}
          aria-expanded={isOpen}
          aria-controls={breakdownId}
          onClick={() => setIsOpen((open) => !open)}
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {isOpen ? (
        <div
          id={breakdownId}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-sans text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
        >
          <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Provider Exposure Evidence
          </div>
          <div className="space-y-1">
            <p className="text-zinc-900 dark:text-zinc-100">Review state: {reviewState.label}</p>
            {!hasReviewDeductions && (
              <p>No review deductions currently visible</p>
            )}
            {breakdown.slashPenalty > 0 && (
              <p className="text-amber-700 dark:text-amber-300">- Slash exposure penalty: {breakdown.slashPenalty} points</p>
            )}
            {breakdown.atRiskPenalty > 0 && (
              <p className="text-yellow-700 dark:text-yellow-300">- At-risk penalty: {breakdown.atRiskPenalty} points</p>
            )}
            {breakdown.jailedPenalty > 0 && (
              <p className="text-orange-700 dark:text-orange-300">- Jailed penalty: {breakdown.jailedPenalty} points</p>
            )}
            {breakdown.statusPenalty > 0 && (
              <p className="text-amber-700 dark:text-amber-300">- Non-active status penalty: {breakdown.statusPenalty} points</p>
            )}
            {health.reason && (
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">{health.reason}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ icon, label, value, subValue, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  subValue?: string;
  highlight?: 'emerald' | 'amber' | 'cyan' | 'purple' | 'red';
}) {
  const highlightStyles = {
    emerald: 'border-emerald-200/60 dark:border-emerald-800/40 hover:shadow-emerald-500/20',
    amber: 'border-amber-200/60 dark:border-amber-800/40 hover:shadow-amber-500/20',
    cyan: 'border-cyan-200/60 dark:border-cyan-800/40 hover:shadow-cyan-500/20',
    purple: 'border-purple-200/60 dark:border-purple-800/40 hover:shadow-purple-500/20',
    red: 'border-red-200/60 dark:border-red-800/40 hover:shadow-red-500/20',
  };

  return (
    <div
      role="group"
      aria-label={`${label} summary`}
      className={cn(
        "p-4 rounded-xl border bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up",
        highlight ? highlightStyles[highlight] : "border-zinc-200/60 dark:border-zinc-800/60"
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">{value}</div>
      {subValue && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 truncate">{subValue}</div>}
    </div>
  );
}
