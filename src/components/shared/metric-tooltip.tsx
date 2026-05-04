import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricTooltipProps {
  label: string;
  explanation: string;
  className?: string;
}

export function MetricTooltip({ label, explanation, className }: MetricTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={cn('relative inline-flex items-center gap-1', className)}>
      <span className="text-xs text-zinc-500">{label}</span>
      <button
        type="button"
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        aria-label={`Explain ${label}`}
      >
        <HelpCircle className="h-3 w-3" />
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-50">
          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{explanation}</p>
        </div>
      )}
    </div>
  );
}

export const METRIC_EXPLANATIONS = {
  weightedApy: 'Weighted average of your bond positions\' APY, weighted by bond amount. Higher is better.',
  portfolioHealth: 'Score from A-F based on slash points, jail status, and node age. A is best, F is worst.',
  totalBonded: 'Total RUNE bonded across all your nodes. This is your active investment.',
  netEarnings: 'Your share of network earnings based on your bond share. Varies with network activity.',
  runePrice: 'Current price of THORChain\'s native token (RUNE) in USD. Updates live.',
  operatorFee: 'Fee (in basis points) that node operators take from your earnings. 1000 BPS = 10%.',
  yieldGuard: 'Flags indicating potential risks: Overbonded (no yield), High Slash, Lowest Bond, Oldest, or Leaving.',
  churnRisk: 'Nodes closest to being churned out (replaced). Monitor these to avoid downtime.',
  bondShare: 'Your percentage of the total bond on a node. Higher share = more earnings.',
};
