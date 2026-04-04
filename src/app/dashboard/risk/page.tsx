'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { AlertTriangle, Shield } from 'lucide-react';
import { SlashMonitor } from '@/components/dashboard/slash-monitor';
import { ChurnOutRisk } from '@/components/dashboard/churn-out-risk';
import { NetworkSecurityMetrics } from '@/components/dashboard/network-security-metrics';
import { UnbondWindowTracker } from '@/components/dashboard/unbond-window-tracker';

export default function RiskPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Risk Monitor</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SlashMonitor />
        <ChurnOutRisk />
        <NetworkSecurityMetrics />
        <UnbondWindowTracker />
      </div>

      {address && (
        <div className="mt-6">
          <h3 className="text-md font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Your Positions</h3>
          {isLoading ? (
            <div className="animate-pulse h-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ) : positions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <Shield className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p>No bond positions found for this address.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((pos) => (
                <div key={pos.nodeAddress} className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <AlertTriangle className="w-5 h-5 text-zinc-400 shrink-0" />
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-300">
                      {pos.nodeAddress.slice(0, 16)}...{pos.nodeAddress.slice(-6)}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {pos.totalBond.toLocaleString()} RUNE • {pos.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
