'use client';

import { TrendingUp, DollarSign, Activity, Coins, ShieldCheck, Info } from 'lucide-react';
import { calculatePortfolioHealth, getGradeColor, type HealthGrade, type HealthScoreBreakdown } from '@/lib/utils/health-score';
import { formatRuneFromNumber } from '@/lib/utils/formatters';
import { getYieldPerformanceColor } from '@/lib/utils/yield-benchmarks';
import type { BondPosition } from '@/lib/types/node';
import { YieldBenchmarks } from '@/lib/utils/yield-benchmarks';
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

export function PortfolioSummary({ totalBonded, runePrice, runePriceIsStale = false, runePriceUpdatedAt, weightedAPY, positions, benchmarks, feeImpactRUNE, feeImpactUSD }: PortfolioSummaryProps) {
  const health = calculatePortfolioHealth(positions);
  const usdValue = totalBonded * runePrice;
  const annualEarnings = totalBonded * (weightedAPY / 100);
  const annualEarningsUSD = annualEarnings * runePrice;

  const apyColor = benchmarks 
    ? getYieldPerformanceColor(weightedAPY, benchmarks.networkAverageAPY)
    : 'text-zinc-900 dark:text-zinc-100';
  const runePriceSubValue = runePriceIsStale
    ? `Stale price${runePriceUpdatedAt ? ` · updated ${runePriceUpdatedAt.toLocaleString()}` : ''}`
    : runePriceUpdatedAt
      ? `Updated ${runePriceUpdatedAt.toLocaleString()}`
      : undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <SummaryCard 
        icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
        label="Total Bonded"
        value={formatRuneFromNumber(totalBonded)}
        subValue={`${runePrice > 0 ? `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'} USD`}
        highlight="emerald"
      />
      <SummaryCard 
        icon={<Coins className="w-4 h-4 text-amber-500" />}
        label="Annual Earnings (Net)"
        value={weightedAPY > 0 ? `${annualEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
        subValue={weightedAPY > 0 ? `$${annualEarningsUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
        highlight="amber"
      />
      {feeImpactRUNE !== undefined && feeImpactRUNE > 0 && (
        <SummaryCard 
          icon={<DollarSign className="w-4 h-4 text-red-500" />}
          label="Fee Impact"
          value={`-${feeImpactRUNE.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RUNE`}
          subValue={feeImpactUSD ? `-$${feeImpactUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
          highlight="red"
        />
      )}
      <SummaryCard 
        icon={<DollarSign className="w-4 h-4 text-cyan-500" />}
        label="RUNE Price"
        value={runePrice > 0 ? `$${runePrice.toFixed(4)}` : '--'}
        subValue={runePriceSubValue}
        highlight="cyan"
      />
      <SummaryCard 
        icon={<Activity className="w-4 h-4 text-purple-500" />}
        label="Weighted APY"
        value={<span className={cn("font-bold", apyColor)}>{weightedAPY.toFixed(2)}%</span>}
        subValue={benchmarks ? `Avg: ${benchmarks.networkAverageAPY}% · Top: ${benchmarks.topTierAPY}%` : undefined}
        highlight="purple"
      />
      <SummaryCard 
        icon={<ShieldCheck className="w-4 h-4" />}
        label="Portfolio Health"
        value={<HealthScoreDisplay health={health} />}
      />
    </div>
  );
}

function HealthScoreDisplay({ health }: { health: { grade: HealthGrade; score: number; reason: string; breakdown: HealthScoreBreakdown } }) {
  const { breakdown } = health;
  
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn("text-2xl font-bold", getGradeColor(health.grade))}>{health.grade}</span>
      <div className="relative group">
        <Info className="w-3.5 h-3.5 text-zinc-400 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-zinc-800">
          <div className="flex items-center gap-1.5 mb-1.5 text-zinc-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Health Score Breakdown
          </div>
          <div className="space-y-1 text-zinc-400">
            <p>Starting points: {breakdown.startingPoints}</p>
            {breakdown.slashPenalty > 0 && (
              <p className="text-red-400">- Slash penalty: {breakdown.slashPenalty} points</p>
            )}
            {breakdown.atRiskPenalty > 0 && (
              <p className="text-yellow-400">- At-risk penalty: {breakdown.atRiskPenalty} points</p>
            )}
            {breakdown.jailedPenalty > 0 && (
              <p className="text-orange-400">- Jailed penalty: {breakdown.jailedPenalty} points</p>
            )}
            <div className="pt-1 border-t border-zinc-800">
              <span className="text-zinc-300">Final score: {breakdown.finalScore}/100</span>
            </div>
            {health.reason && (
              <p className="text-zinc-500 mt-1">{health.reason}</p>
            )}
          </div>
        </div>
      </div>
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
    <div className={cn(
      "p-4 rounded-xl border bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up",
      highlight ? highlightStyles[highlight] : "border-zinc-200/60 dark:border-zinc-800/60"
    )}>
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">{value}</div>
      {subValue && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 truncate">{subValue}</div>}
    </div>
  );
}
