import { formatRuneWithUnit } from '@/lib/utils/formatters';
import { TrendingUp, DollarSign, Activity } from 'lucide-react';

interface PortfolioSummaryProps {
  totalBonded: number;
  runePrice: number;
  weightedAPY: number;
  positionCount: number;
}

export function PortfolioSummary({ totalBonded, runePrice, weightedAPY, positionCount }: PortfolioSummaryProps) {
  const usdValue = totalBonded * runePrice;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        icon={<TrendingUp className="w-5 h-5" />}
        label="Total Bonded"
        value={`${totalBonded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RUNE`}
        subValue={runePrice > 0 ? `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
      />
      <SummaryCard
        icon={<DollarSign className="w-5 h-5" />}
        label="RUNE Price"
        value={runePrice > 0 ? `$${runePrice.toFixed(4)}` : 'Loading...'}
      />
      <SummaryCard
        icon={<Activity className="w-5 h-5" />}
        label="Weighted APY"
        value={`${weightedAPY.toFixed(2)}%`}
      />
      <SummaryCard
        icon={<TrendingUp className="w-5 h-5" />}
        label="Positions"
        value={String(positionCount)}
      />
    </div>
  );
}

function SummaryCard({ icon, label, value, subValue }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-zinc-500 mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      {subValue && <div className="text-sm text-zinc-500 mt-0.5">{subValue}</div>}
    </div>
  );
}
