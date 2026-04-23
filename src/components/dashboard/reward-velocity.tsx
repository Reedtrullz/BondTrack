'use client';

import { TrendingUp, ArrowDownRight, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RewardVelocityProps {
  totalPerChurnReward: number;
  totalOperatorFee: number;
  price: number;
}

export function RewardVelocity({ totalPerChurnReward, totalOperatorFee, price }: RewardVelocityProps) {
  const netReward = totalPerChurnReward - totalOperatorFee;
  const feePercentage = totalPerChurnReward > 0 
    ? (totalOperatorFee / totalPerChurnReward) * 100 
    : 0;
  const usdNet = netReward * price;

  return (
    <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Reward Velocity</h3>
          <p className="text-xs text-zinc-500">Estimated earnings per churn cycle</p>
        </div>
        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Gross Reward */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-500 flex items-center gap-1">
            Gross Earnings
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {totalPerChurnReward.toFixed(4)} <span className="text-xs font-medium text-zinc-400">RUNE</span>
          </div>
        </div>

        {/* Fee Leakage */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-500 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-red-500" />
            Fee Leakage
          </div>
          <div className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">
            -{totalOperatorFee.toFixed(4)} <span className="text-xs font-medium text-red-400/60">RUNE</span>
          </div>
          <div className="text-[10px] text-red-500/70 font-medium uppercase">
            {feePercentage.toFixed(2)}% of gross
          </div>
        </div>

        {/* Net Take-Home */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-500 flex items-center gap-1">
            <Wallet className="w-3 h-3 text-emerald-500" />
            Net Take-Home
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {netReward.toFixed(4)} <span className="text-xs font-medium text-emerald-400/60">RUNE</span>
          </div>
          <div className="text-[10px] text-emerald-500/70 font-medium uppercase">
            ${usdNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        </div>
      </div>

      {/* Visual Flow Bar */}
      <div className="relative h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
        <div 
          className="h-full bg-emerald-500 transition-all duration-500" 
          style={{ width: `${100 - feePercentage}%` }} 
        />
        <div 
          className="h-full bg-red-500 transition-all duration-500" 
          style={{ width: `${feePercentage}%` }} 
        />
      </div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter text-zinc-400">
        <span>Your Share</span>
        <span>Operator Fee</span>
      </div>
    </div>
  );
}
