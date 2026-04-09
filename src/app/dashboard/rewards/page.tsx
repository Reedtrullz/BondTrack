'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { runeToNumber } from '@/lib/utils/formatters';
import { PnLDashboard } from '@/components/dashboard/pnl-dashboard';
import { PersonalFeeAudit } from '@/components/dashboard/fee-impact-tracker';
import { AutoCompoundChart } from '@/components/dashboard/auto-compound-chart';
import { APYChart } from '@/components/dashboard/apy-chart';
import { PriceChart } from '@/components/dashboard/price-chart';
import { useMemo } from 'react';

export default function RewardsPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);
  const { price: runePrice } = useRunePrice();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!address || positions.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 max-w-2xl mx-auto mt-12">
        <h2 className="text-xl font-semibold mb-2">No Bond Positions Found</h2>
        <p className="text-zinc-500">Please enter a valid THORChain address to view reward metrics.</p>
      </div>
    );
  }

  const weightedApy = useMemo(() => {
    const totalBond = positions.reduce((sum, p) => sum + p.bondAmount, 0);
    if (totalBond === 0) return 0;
    return 0.12; 
  }, [positions]);

  return (
    <div className="space-y-12 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">PnL Performance</h2>
        <div className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
          Live Metrics
        </div>
      </div>

      {/* Hero Section: High-level PnL */}
      <section className="relative">
        <PnLDashboard 
          positions={positions} 
          currentRunePrice={runePrice || 0} 
        />
      </section>

      {/* Optimization Pipeline: Unified Flow */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
            Yield Optimization
          </h3>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <PersonalFeeAudit positions={positions} />
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
                Yield Benchmarking
              </h3>
              <div className="flex flex-col gap-4">
                 <p className="text-sm text-zinc-500">
                   Benchmarking against top-tier nodes will be integrated in the next phase.
                 </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <AutoCompoundChart 
              positions={positions} 
              weightedApy={weightedApy} 
            />
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
                Rewards Strategy
              </h3>
              <div className="text-sm text-zinc-500">
                Strategic suggestions for optimizing your bond based on current network APY.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Context: Base Layer */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
            Market Context
          </h3>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <APYChart />
          </div>
          <div className="lg:col-span-1">
            <PriceChart />
          </div>
        </div>
      </section>
    </div>
  );
}
