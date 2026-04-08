import { formatRuneWithUnit } from '@/lib/utils/formatters';
import { TrendingUp, DollarSign, Activity, Coins, ShieldCheck } from 'lucide-react';
import { calculatePortfolioHealth, getGradeColor } from '@/lib/utils/health-score';
import { getYieldPerformanceColor } from '@/lib/utils/yield-benchmarks';
import type { BondPosition } from '@/lib/types/node';
import { YieldBenchmarks } from '@/lib/utils/yield-benchmarks';

interface PortfolioSummaryProps {
  totalBonded: number;
  runePrice: number;
  weightedAPY: number;
  positionCount: number;
  positions: BondPosition[];
  benchmarks?: YieldBenchmarks;
}

export function PortfolioSummary({ totalBonded, runePrice, weightedAPY, positionCount, positions, benchmarks }: PortfolioSummaryProps) {
  const health = calculatePortfolioHealth(positions);
  const usdValue = totalBonded * runePrice;
  const annualEarnings = totalBonded * (weightedAPY / 100);
  const annualEarningsUSD = annualEarnings * runePrice;

  const apyColor = benchmarks 
    ? getYieldPerformanceColor(weightedAPY, benchmarks.networkAverageAPY)
    : 'text-zinc-900 dark:text-zinc-100';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <SummaryCard
        icon={<TrendingUp className="w-5 h-5" />}
        label="Total Bonded"
        value={`${totalBonded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RUNE`}
        subValue={runePrice > 0 ? `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
      />
      <SummaryCard
        icon={<Coins className="w-5 h-5" />}
        label="Annual Earnings"
        value={weightedAPY > 0 ? `${annualEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RUNE` : 'N/A'}
        subValue={weightedAPY > 0 ? `$${annualEarningsUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
      />
      <SummaryCard
        icon={<DollarSign className="w-5 h-5" />}
        label="RUNE Price"
        value={runePrice > 0 ? `$${runePrice.toFixed(4)}` : 'Loading...'}
      />
      <SummaryCard
        icon={<Activity className="w-5 h-5" />}
        label="Weighted APY"
        value={<span className={`font-semibold ${apyColor}`}>{weightedAPY.toFixed(2)}%</span>}
        subValue={benchmarks ? `Avg: ${benchmarks.networkAverageAPY}% · Top: ${benchmarks.topTierAPY}%` : undefined}
      />
      <SummaryCard
        icon={<ShieldCheck className="w-5 h-5" />}
        label="Portfolio Health"
        value={<span className={`font-bold ${getGradeColor(health.grade)}`}>{health.grade}</span>}
        subValue={health.reason}
      />
    </div>
  );
}

function SummaryCard({ icon, label, value, subValue }: {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  subValue?: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-zinc-500 mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      {subValue && <div className="text-xs text-zinc-500 mt-0.5 truncate" title={subValue}>{subValue}</div>}
    </div>
  );
}
