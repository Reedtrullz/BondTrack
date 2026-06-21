import { useId, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricTooltipProps {
  label: string;
  explanation: string;
  className?: string;
  showLabel?: boolean;
}

export function MetricTooltip({
  label,
  explanation,
  className,
  showLabel = true,
}: MetricTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  return (
    <div className={cn('relative inline-flex items-center gap-1', className)}>
      {showLabel ? <span className="text-xs text-zinc-500">{label}</span> : null}
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-zinc-800 dark:hover:text-zinc-300 dark:focus-visible:ring-offset-zinc-950"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={() => setIsVisible(true)}
        aria-label={`Explain ${label}`}
        aria-expanded={isVisible}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        <HelpCircle className="h-3 w-3" />
      </button>
      
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
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
  runePrice: 'Current price of THORChain\'s native token (RUNE) in USD. Updates when the price source refreshes.',
  operatorFee: 'Fee (in basis points) that node operators take from your earnings. 1000 BPS = 10%.',
  yieldGuard:
    'Flags from current source checks: High Slash, Lowest Bond, Oldest, or Leaving. Review source freshness before acting.',
  churnRisk: 'Nodes closest to being churned out (replaced). Monitor these to avoid downtime.',
  bondShare: 'Your percentage of the total bond on a node. Higher share = more earnings.',
};
