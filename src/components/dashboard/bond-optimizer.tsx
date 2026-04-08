'use client';

import { useMemo } from 'react';
import { BondPosition } from '@/lib/types/node';
import { YieldBenchmarks } from '@/lib/utils/yield-benchmarks';
import { analyzeBondOptimization, type OptimizationSuggestion } from '@/lib/utils/bond-optimizer';
import { TrendingUp, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface BondOptimizerProps {
  positions: BondPosition[];
  benchmarks: YieldBenchmarks | undefined;
  allNodes: any[];
}

export function BondOptimizer({ positions, benchmarks, allNodes }: BondOptimizerProps) {
  const suggestions = useMemo(() => {
    if (!benchmarks || !allNodes) return [];
    return analyzeBondOptimization(positions, benchmarks, allNodes);
  }, [positions, benchmarks, allNodes]);

  if (suggestions.length === 0) return null;

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Bond Optimization Suggestions
        </h3>
      </div>

      <div className="space-y-3">
        {suggestions.map((sug, idx) => (
          <div 
            key={idx} 
            className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-mono">{sug.currentNodeAddress.slice(0, 12)}...</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="font-mono">{sug.suggestedNodeAddress.slice(0, 12)}...</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {sug.reason}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">Potential Gain</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  +{sug.potentialGain.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <AlertCircle className="w-3 h-3" />
                <span> {sug.currentAPY.toFixed(2)}% $\rightarrow$ {sug.suggestedAPY.toFixed(2)}%</span>
              </div>
              <Link 
                href={`/dashboard/transactions?address=${sug.currentNodeAddress}`}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                Optimize $\rightarrow$
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[10px] text-zinc-400 italic">
        Optimizations are based on current network APY benchmarks. Moving bonds may involve unbonding periods and churn risk.
      </div>
    </div>
  );
}
