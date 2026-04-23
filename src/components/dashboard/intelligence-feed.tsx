'use client';

import { useMemo } from 'react';
import { BondPosition } from '@/lib/types/node';
import { YieldBenchmarks } from '@/lib/utils/yield-benchmarks';
import { analyzeBondOptimization } from '@/lib/utils/bond-optimizer';
import { generatePortfolioAlerts } from '@/lib/utils/portfolio-alerts';
import { Eye, TrendingUp, ArrowRight, AlertCircle, CheckCircle2, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface IntelligenceFeedProps {
  positions: BondPosition[];
  benchmarks: YieldBenchmarks | undefined;
  allNodes: any[];
  providerAddress: string | null;
  isLoading?: boolean;
}

export function IntelligenceFeed({ positions, benchmarks, allNodes, providerAddress, isLoading }: IntelligenceFeedProps) {
  const insights = useMemo(() => {
    if (!benchmarks || !allNodes) return [];
    
    const optimization = analyzeBondOptimization(positions, benchmarks, allNodes);
    const alerts = generatePortfolioAlerts(positions);
    
    // Combine into a unified feed of "Heimdall's Sight"
    return [
      ...alerts.map(a => ({ ...a, category: 'security' as const })),
      ...optimization.map(o => ({
        id: `opt-${o.currentNodeAddress}`,
        severity: 'info' as const,
        category: 'yield' as const,
        message: o.reason,
        suggestion: `Move bond from ${o.currentNodeAddress.slice(0, 6)} to ${o.suggestedNodeAddress.slice(0, 6)}`,
        actionLabel: 'Optimize',
        actionLink: '/dashboard/transactions',
        data: o
      }))
    ];
  }, [positions, benchmarks, allNodes]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-200/40 dark:bg-zinc-800/40 animate-pulse border border-zinc-200/50 dark:border-zinc-800/50" />
        ))}
      </div>
    );
  }

  if (insights.length === 0 && positions.length > 0) {
    return (
      <div className="relative p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5 text-center group overflow-hidden shadow-sm">
        <div className="absolute -inset-px bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1 uppercase tracking-widest font-serif italic">
            All-Seeing Guard
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[200px] mx-auto">
            Heimdall sees no threats to your bond. Your positions are optimal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <div 
          key={insight.id}
          className={cn(
            "p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden shadow-sm",
            insight.severity === 'critical' 
              ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40" 
              : "bg-white/40 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 hover:border-zinc-400 dark:hover:border-zinc-600"
          )}
        >
          {/* Accent Line */}
          <div className={cn(
            "absolute left-0 top-0 bottom-0 w-1",
            insight.severity === 'critical' ? "bg-red-500" : insight.severity === 'warning' ? "bg-amber-500" : "bg-emerald-500"
          )} />

          <div className="flex gap-3">
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              insight.severity === 'critical' ? "bg-red-500/10 text-red-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            )}>
              {insight.category === 'security' ? <Eye className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  insight.severity === 'critical' ? "text-red-600" : "text-zinc-400"
                )}>
                  {insight.category === 'security' ? 'Heimdall Alert' : 'Yield Insight'}
                </span>
                {insight.severity === 'critical' && (
                  <Zap className="w-3 h-3 text-red-500 animate-pulse" />
                )}
              </div>
              
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug mb-1">
                {insight.message}
              </p>
              
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic mb-3">
                {insight.suggestion}
              </p>

              {insight.actionLink && (
                <Link 
                  href={`${insight.actionLink}?address=${providerAddress}`}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                >
                  {insight.actionLabel} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
