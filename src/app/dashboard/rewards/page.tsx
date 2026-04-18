'use client';

export const dynamic = 'force-dynamic';

import { useRouter, useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { PnLDashboard } from '@/components/dashboard/pnl-dashboard';
import { PersonalFeeAudit } from '@/components/dashboard/fee-impact-tracker';
import { AutoCompoundChart } from '@/components/dashboard/auto-compound-chart';
import { APYChart } from '@/components/dashboard/apy-chart';
import { PriceChart } from '@/components/dashboard/price-chart';
import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Zap } from 'lucide-react';
import { calculateWeightedApy } from '@/lib/utils/fee-calculations';
import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';
import { Button } from '@/components/ui/button';

export default function RewardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);
  const { price: runePrice } = useRunePrice();
  const { data: networkData } = useNetworkMetrics();
  const [mounted, setMounted] = useState(false);
  const safePositions = positions ?? [];
  const networkApy = networkData?.bondingAPY ? parseFloat(networkData.bondingAPY) : undefined;
  const weightedApy = useMemo(() => {
    if (!networkApy) return 0;
    return calculateWeightedApy(safePositions, networkApy);
  }, [safePositions, networkApy]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOptimizeNow = () => {
    const params = new URLSearchParams();

    if (address) {
      params.set('address', address);
    }

    params.set('action', 'optimize');

    router.push(`/dashboard/transactions?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!address || safePositions.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 max-w-2xl mx-auto mt-12">
        <h2 className="text-xl font-semibold mb-2">No Bond Positions Found</h2>
        <p className="text-zinc-500">Please enter a valid THORChain address to view reward metrics.</p>
      </div>
    );
  }

  if (!mounted) {
    return <div className="p-8 flex items-center justify-center min-h-[400px]" />;
  }

  return (
    <div className="space-y-12 pb-20">
      <section className="relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">PnL Performance</h2>
          <div className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            Live Metrics
          </div>
        </div>
        <PnLDashboard 
          positions={safePositions} 
          currentRunePrice={runePrice || 0}
          address={address}
        />
      </section>

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
          <div className="lg:col-span-4">
            <PersonalFeeAudit positions={safePositions} networkApy={networkApy} />
          </div>
          
          <div className="lg:col-span-8">
            {weightedApy > 0 ? (
              <AutoCompoundChart 
                positions={safePositions} 
                weightedApy={weightedApy} 
              />
            ) : (
              <div className="p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex items-center justify-center min-h-[300px]">
                <p className="text-zinc-500">Loading APY data...</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-emerald-500 rounded-full" />
            <div>
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-tight">Strategic Insight</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {safePositions.length === 1 
                  ? "Your portfolio is concentrated in a single node. Consider diversifying to reduce operator fee exposure."
                  : "Your weighted APY is stable. Compounding your rewards monthly could increase your end-of-year balance."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleOptimizeNow}
            className="min-w-[8.5rem]"
          >
            Optimize Now
          </Button>
        </div>
      </section>

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
