'use client';

import { useMemo } from 'react';
import { BondPosition } from '@/lib/types/node';
import { cn } from '@/lib/utils';
import { calculatePersonalFeeLeakage } from '@/lib/utils/fee-calculations';
import { formatRuneFromNumber } from '@/lib/utils/formatters';
import { TrendingDown, ShieldAlert, Info, AlertCircle } from 'lucide-react';

interface PersonalFeeAuditProps {
  positions: BondPosition[];
  networkApy?: number;
}

export function PersonalFeeAudit({ positions, networkApy }: PersonalFeeAuditProps) {
  const safePositions = positions ?? [];
  
  if (safePositions.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
        <ShieldAlert className="w-8 h-8 text-zinc-300 mb-2" />
        <p className="text-sm text-zinc-500">No bond positions found.</p>
      </div>
    );
  }
  
  const audit = useMemo(() => calculatePersonalFeeLeakage(safePositions, 'monthly', networkApy), [safePositions, networkApy]);
  
  const hasRewards = audit.grossReward > 0;

  return (
    <div className="p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Personal Fee Audit</h3>
          <p className="text-sm text-zinc-500">Estimated monthly reward leakage</p>
        </div>
        <div className="flex items-center gap-2">
          {audit.isEstimated && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">
              <AlertCircle className="w-3 h-3" />
              <span>Estimated</span>
            </div>
          )}
          <div className="px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">
            Monthly Projection
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="w-full text-center">
          <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Gross Rewards</div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
            {formatRuneFromNumber(audit.grossReward)}
          </div>
          <div className="text-xs text-zinc-500">RUNE / mo</div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-24 h-px bg-zinc-200 dark:bg-zinc-800" />
          <div className={cn(
            "flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-bold uppercase",
            hasRewards 
              ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400" 
              : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500"
          )}>
            {hasRewards ? <TrendingDown className="w-3 h-3" /> : <Info className="w-3 h-3" />}
            <span>{hasRewards ? 'Leakage' : 'No Activity'}</span>
          </div>
          <div className="w-24 h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <div className="w-full text-center">
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Net Take-home</div>
          <div className="text-4xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
            {formatRuneFromNumber(audit.netTakeHome)}
          </div>
          <div className="text-xs text-emerald-600/70">RUNE / mo</div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Monthly Leakage</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-red-600 dark:text-red-400">
              -{formatRuneFromNumber(audit.feeLeakage)} RUNE
            </span>
            <span className="text-zinc-400">|</span>
            <span className="font-mono text-zinc-600 dark:text-zinc-400">
              {audit.leakagePercent.toFixed(2)}% lost to fees
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
