'use client';

import { useEffect, useState } from 'react';
import { useChurnCountdown } from '@/lib/hooks/use-churn-countdown';
import { Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ChurnCountdown() {
  const { data, isLoading, error } = useChurnCountdown();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (isLoading || error || !data) {
    return (
      <div className="flex items-center gap-1 text-xs text-zinc-500">
        <Clock className="h-3 w-3" />
        <span>Churn: --</span>
      </div>
    );
  }

  const { blocksRemaining, timeRemaining } = data;
  const { days, hours, minutes } = timeRemaining;

  // Color coding based on urgency
  let colorClass = 'text-zinc-500';
  if (blocksRemaining < 100) {
    colorClass = 'text-red-500 font-bold';
  } else if (blocksRemaining < 500) {
    colorClass = 'text-orange-500';
  } else if (blocksRemaining < 1000) {
    colorClass = 'text-yellow-500';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 text-xs ${colorClass} cursor-pointer`}>
            <Clock className="h-3 w-3" />
            <span>
              Next Churn: {days}d {hours}h {minutes}m ({blocksRemaining} blocks)
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p>Churn Interval: ~6048 blocks (~7 days)</p>
            <p>Blocks Remaining: {blocksRemaining}</p>
            <p>Estimated Time: {days} days, {hours} hours, {minutes} minutes</p>
            <p className="mt-1 text-zinc-500">Unbond windows open after churn</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
