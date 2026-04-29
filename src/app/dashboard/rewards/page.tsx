'use client';

export const dynamic = 'force-dynamic';

import { useRouter, useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice, useRunePriceHistory, useHistoricalRunePrice } from '@/lib/hooks/use-rune-price';
import { useBondHistory } from '@/lib/hooks/use-bond-history';
import { useCoinApiRunePrice } from '@/lib/hooks/use-coinapi-price';
import { PnLDashboard } from '@/components/dashboard/pnl-dashboard';
import { PersonalFeeAudit } from '@/components/dashboard/fee-impact-tracker';
import { AutoCompoundChart } from '@/components/dashboard/auto-compound-chart';
import { PriceChart } from '@/components/dashboard/price-chart';
import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Zap, Download } from 'lucide-react';
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
  const { history: bondHistory } = useBondHistory(address);
  const { price: entryRunePrice } = useHistoricalRunePrice(bondHistory?.firstBondDate || null);
  
  const [mounted, setMounted] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxStartDate, setTaxStartDate] = useState('');
  const [taxEndDate, setTaxEndDate] = useState('');
  const [taxExportLoading, setTaxExportLoading] = useState(false);
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

  const handleExportTaxReport = async () => {
    if (!taxStartDate || !taxEndDate || !address) return;

    setTaxExportLoading(true);
    try {
      const response = await fetch('/api/tax-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, startDate: taxStartDate, endDate: taxEndDate }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tax report');
      }

      const csv = await response.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `tax-report-${address.slice(0, 8)}-${taxStartDate}-to-${taxEndDate}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setShowTaxModal(false);
    } catch (error) {
      console.error('Tax export failed:', error);
    } finally {
      setTaxExportLoading(false);
    }
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
          entryRunePrice={entryRunePrice || undefined}
          bondHistory={bondHistory ?? undefined}
        />
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTaxModal(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Tax Report
          </Button>
        </div>
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
            <PersonalFeeAudit positions={safePositions} networkApy={weightedApy} />
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
        <PriceChart />
      </section>

      {showTaxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Export Tax Report</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Start Date</label>
                <input
                  type="date"
                  value={taxStartDate}
                  onChange={(e) => setTaxStartDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">End Date</label>
                <input
                  type="date"
                  value={taxEndDate}
                  onChange={(e) => setTaxEndDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowTaxModal(false)}
                  disabled={taxExportLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleExportTaxReport}
                  disabled={!taxStartDate || !taxEndDate || taxExportLoading}
                >
                  {taxExportLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Generating...
                    </span>
                  ) : (
                    'Download CSV'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
