'use client';

import { useMemo } from 'react';
import { BondPosition } from '@/lib/types/node';
import { YieldBenchmarks } from '@/lib/utils/yield-benchmarks';
import { analyzeBondOptimization, type OptimizationSuggestion } from '@/lib/utils/bond-optimizer';
import { TrendingUp, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface BondOptimizerProps {
  positions: BondPosition[];
  benchmarks: YieldBenchmarks | undefined;
  allNodes: any[];
  isLoading?: boolean;
}

export function BondOptimizer({ positions, benchmarks, allNodes, isLoading }: BondOptimizerProps) {
  const suggestions = useMemo(() => {
    if (!benchmarks || !allNodes) return [];
    return analyzeBondOptimization(positions, benchmarks, allNodes);
  }, [positions, benchmarks, allNodes]);

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  // "Certified Optimal" State
  if (suggestions.length === 0) {
    return (
      <div className="relative p-6 rounded-lg border-2 border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-900/10 text-center group overflow-hidden">
        {/* Background Glow Effect */}
        <div className="absolute -inset-px bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-400 mb-1 uppercase tracking-wider">
            Portfolio Optimized
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Your current bond distribution is optimal based on network APY benchmarks.
          </p>
          <div className="mt-4 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase">
            <TrendingUp className="w-3 h-3" />
            Certified Optimal
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Optimization Opportunities
        </h3>
      </div>

      <div className="space-y-3">
        {suggestions.map((sug, idx) => (
          <div 
            key={idx} 
            className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 text-xs text-zinc-500 truncate">
                  <span className="font-mono truncate">{sug.currentNodeAddress.slice(0, 8)}...</span>
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  <span className="font-mono truncate">{sug.suggestedNodeAddress.slice(0, 8)}...</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {sug.reason}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-zinc-500">Potential Gain</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  +{sug.potentialGain.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span> {sug.currentAPY.toFixed(2)}% → {sug.suggestedAPY.toFixed(2)}%</span>
              </div>
              <Link 
                href={`/dashboard/transactions?address=${sug.currentNodeAddress}`}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex-shrink-0"
              >
                Optimize →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400">
        * Moving bonds involves unbonding periods and churn risk.
      </div>
    </div>
  );
}
