'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { runeToNumber } from '@/lib/utils/formatters';
import { PnLDashboard } from '@/components/dashboard/pnl-dashboard';
import { PersonalFeeAudit } from '@/components/dashboard/fee-impact-tracker';
import { AutoCompoundChart } from '@/components/dashboard/auto-compound-chart';
import { APYChart } from '@/components/dashboard/apy-chart';
import { PriceChart } from '@/components/dashboard/price-chart';
import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Zap } from 'lucide-react';
import { calculateWeightedApy } from '@/lib/utils/fee-calculations';
import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';

export default function RewardsPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);
  const { price: runePrice } = useRunePrice();
  const { data: networkData } = useNetworkMetrics(); // Correct SWR destructuring
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    // Parse the network APY string to a number (e.g. "0.27" -> 0.0027)
    const baseline = networkData?.bondingAPY ? parseFloat(networkData.bondingAPY) / 100 : 0;
    return calculateWeightedApy(positions, baseline);
  }, [positions, networkData]);

  if (!mounted) {
    return <div className="p-8 flex items-center justify-center min-h-[400px]" />;
  }

  return (
    <div className="space-y-12 pb-20">
      {/* LAYER 1: PERFORMANCE HEADLINE */}
      <section className="relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">PnL Performance</h2>
          <div className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            Live Metrics
          </div>
        </div>
        <PnLDashboard 
          positions={positions} 
          currentRunePrice={runePrice || 0} 
        />
      </section>

      {/* LAYER 2: THE OPTIMIZATION HUB */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
              Yield Optimization
            </h3>
            <p className="text-xs text-zinc-500">Reduce leakage and maximize future growth</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Leakage Pipeline */}
          <div className="lg:col-span-4">
            <PersonalFeeAudit positions={positions} />
          </div>
          
          {/* Growth Projection */}
          <div className="lg:col-span-8">
            <AutoCompoundChart 
              positions={positions} 
              weightedApy={weightedApy} 
            />
          </div>
        </div>

        {/* Strategic Insight Bar */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-emerald-500 rounded-full" />
            <div>
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-tight">Strategic Insight</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {positions.length === 1 
                  ? "Your portfolio is concentrated in a single node. Consider diversifying to reduce operator fee exposure."
                  : "Your weighted APY is stable. Compounding your rewards monthly could increase your end-of-year balance."}
              </p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold transition-all hover:scale-105 active:scale-95">
            Optimize Now
          </button>
        </div>
      </section>

      {/* LAYER 3: MARKET BASELINE */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
            Market Context
          </h3>
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
