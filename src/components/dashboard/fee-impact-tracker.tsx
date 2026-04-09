'use client';

import React, { useMemo } from 'react';
import { BondPosition } from '@/lib/types/node';
import { cn } from '@/lib/utils';
import { calculatePersonalFeeLeakage } from '@/lib/utils/fee-calculations';
import { ArrowRight, TrendingDown, ShieldAlert } from 'lucide-react';

interface PersonalFeeAuditProps {
  positions: BondPosition[];
}

export function PersonalFeeAudit({ positions }: PersonalFeeAuditProps) {
  const audit = useMemo(() => calculatePersonalFeeLeakage(positions, 'monthly'), [positions]);

  if (positions.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
        <ShieldAlert className="w-8 h-8 text-zinc-300 mb-2" />
        <p className="text-sm text-zinc-500">No positions found to audit</p>
      </div>
    );
  }

  return (
    <div className="p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Personal Fee Audit</h3>
          <p className="text-sm text-zinc-500">Estimated monthly reward leakage</p>
        </div>
        <div className="px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">
          Monthly Projection
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Gross Rewards */}
        <div className="flex-1 w-full text-center md:text-left">
          <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Gross Rewards</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
            {audit.grossReward.toLocaleString(undefined, { minimumFractionDigits: 4 })}
          </div>
          <div className="text-xs text-zinc-500">RUNE / mo</div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="hidden md:block w-12 h-px bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400">
            <TrendingDown className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase">Leakage</span>
          </div>
          <div className="hidden md:block w-12 h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {/* Net Take-home */}
        <div className="flex-1 w-full text-center md:text-right">
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Net Take-home</div>
          <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
            {audit.netTakeHome.toLocaleString(undefined, { minimumFractionDigits: 4 })}
          </div>
          <div className="text-xs text-emerald-600/70">RUNE / mo</div>
        </div>
      </div>

      <div className="mt-8 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase">Monthly Leakage</div>
            <div className="text-sm font-bold text-red-600 dark:text-red-400">
              -{audit.feeLeakage.toLocaleString(undefined, { minimumFractionDigits: 4 })} RUNE
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {((audit.feeLeakage / audit.grossReward) * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-zinc-500 uppercase">Lost to fees</div>
        </div>
      </div>
    </div>
  );
}
