'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { AlertTriangle, Shield, Gauge, Clock, UserMinus, TrendingDown, DollarSign, Hourglass } from 'lucide-react';
import { SlashMonitor } from '@/components/dashboard/slash-monitor';
import { ChurnOutRisk } from '@/components/dashboard/churn-out-risk';
import { NetworkSecurityMetrics } from '@/components/dashboard/network-security-metrics';
import { UnbondWindowTracker } from '@/components/dashboard/unbond-window-tracker';
import { RiskExposureSummary } from '@/components/dashboard/risk-exposure-summary';
import type { YieldGuardFlag } from '@/lib/types/node';
import { useState } from 'react';
import { generatePortfolioAlerts } from '@/lib/utils/portfolio-alerts';
import { cn } from '@/lib/utils';

function EarningStatusSummary({ positions }: { positions: ReturnType<typeof useBondPositions>['positions'] }) {
  const activeCount = positions.filter(p => p.status === 'Active').length;
  const standbyCount = positions.filter(p => p.status === 'Standby').length;
  const jailedCount = positions.filter(p => p.isJailed).length;
  const totalBonded = positions.reduce((sum, p) => sum + p.bondAmount, 0);

  if (positions.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Earning</span>
        </div>
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
        <div className="text-xs text-emerald-600/70">Active nodes</div>
      </div>

      <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
        <div className="flex items-center gap-2 mb-1">
          <Hourglass className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Not Earning</span>
        </div>
        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{standbyCount}</div>
        <div className="text-xs text-amber-600/70">Standby nodes</div>
      </div>

      <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-xs font-medium text-red-700 dark:text-red-400">Jailed</span>
        </div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{jailedCount}</div>
        <div className="text-xs text-red-600/70">Cannot earn</div>
      </div>

      <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-zinc-600" />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-400">Total Bonded</span>
        </div>
        <div className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">{totalBonded.toLocaleString()}</div>
        <div className="text-xs text-zinc-500">RUNE</div>
      </div>
    </div>
  );
}

const YIELD_GUARD_CONFIG: Record<YieldGuardFlag, { icon: React.ReactNode; color: string; label: string }> = {
  overbonded: { icon: <Gauge className="w-4 h-4" />, color: 'text-orange-500', label: 'Overbonded' },
  highest_slash: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-500', label: 'High Slash' },
  lowest_bond: { icon: <TrendingDown className="w-4 h-4" />, color: 'text-yellow-500', label: 'Lowest Bond' },
  oldest: { icon: <Clock className="w-4 h-4" />, color: 'text-purple-500', label: 'Oldest' },
  leaving: { icon: <UserMinus className="w-4 h-4" />, color: 'text-zinc-500', label: 'Leaving' },
};

function YourNodesAtRisk({ positions }: { positions: ReturnType<typeof useBondPositions>['positions'] }) {
  const alerts = generatePortfolioAlerts(positions);
  const atRiskPositions = positions.filter(p => p.yieldGuardFlags && p.yieldGuardFlags.length > 0);
  
  if (positions.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-zinc-400" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Your Nodes at Risk</h3>
        </div>
        <p className="text-sm text-zinc-500">No bond positions found for this address.</p>
      </div>
    );
  }

  const totalBonded = positions.reduce((sum, p) => sum + p.bondAmount, 0);
  const jailedCount = positions.filter(p => p.isJailed).length;

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-zinc-400" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Your Nodes at Risk</h3>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500">{positions.length} nodes</span>
          <span className="text-zinc-300">•</span>
          <span className="text-emerald-600 dark:text-emerald-400">{totalBonded.toLocaleString()} RUNE</span>
          {jailedCount > 0 && (
            <>
              <span className="text-zinc-300">•</span>
              <span className="text-red-500">{jailedCount} jailed</span>
            </>
          )}
        </div>
      </div>

      {atRiskPositions.length === 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
          <Shield className="w-5 h-5 text-emerald-500" />
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            All your nodes are healthy - no Yield Guard warnings
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {atRiskPositions.map(pos => {
            const primaryFlag = pos.yieldGuardFlags?.[0];
            const alert = alerts.find(a => {
              if (primaryFlag === 'highest_slash' && a.type === 'SLASH') return true;
              if (primaryFlag === 'lowest_bond' && a.type === 'CHURN') return true;
              if (pos.isJailed && a.type === 'JAIL') return true;
              return false;
            });

            return (
              <div 
                key={pos.nodeAddress} 
                className="flex flex-col p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="font-mono text-sm text-zinc-700 dark:text-zinc-300 truncate">
                      {pos.nodeAddress.slice(0, 14)}...{pos.nodeAddress.slice(-6)}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {pos.yieldGuardFlags?.map(flag => {
                        const config = YIELD_GUARD_CONFIG[flag];
                        return (
                          <span 
                            key={flag}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color} bg-zinc-100 dark:bg-zinc-700`}
                            title={config.label}
                          >
                            {config.icon}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-sm text-zinc-500 shrink-0 ml-2">
                    {pos.bondAmount.toLocaleString()} RUNE
                  </div>
                </div>
                {alert && (
                  <div className="flex items-start gap-2 px-2 py-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight">
                      Action
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                      {alert.suggestion}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 text-xs text-zinc-500">
        {atRiskPositions.length > 0 
          ? `Monitor these nodes - they may churn out or stop earning soon`
          : `Based on Yield Guard criteria: overbonded, high slash points, lowest bond, oldest, leaving`}
      </div>
    </div>
  );
}

export default function RiskPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Risk Monitor</h2>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Shield className="w-3 h-3" />
          <span>Security-first view</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RiskExposureSummary positions={positions} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <YourNodesAtRisk positions={positions} />
          <EarningStatusSummary positions={positions} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SlashMonitor positions={positions} />
        <ChurnOutRisk positions={positions} />
        <NetworkSecurityMetrics positions={positions} />
        <UnbondWindowTracker positions={positions} />
      </div>

      {address && (
        <div className="mt-6">
          <h3 className="text-md font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Your All Positions</h3>
          {isLoading ? (
            <div className="animate-pulse h-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ) : positions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <Shield className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p>No bond positions found for this address</p>
            </div>
            ) : (
            <div className="space-y-3">
              {positions.map((pos) => (
                <div 
                  key={pos.nodeAddress} 
                  className={cn(
                    "flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-all",
                    selectedNode === pos.nodeAddress ? "ring-2 ring-emerald-500 border-emerald-500" : ""
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                      {pos.nodeAddress.slice(0, 16)}...{pos.nodeAddress.slice(-6)}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {pos.totalBond.toLocaleString()} RUNE • {pos.status}
                      {pos.slashPoints > 0 && (
                        <span className="ml-2 text-orange-500">• {pos.slashPoints} slash pts</span>
                      )}
                    </div>
                  </div>
                  {pos.isJailed && (
                    <span className="shrink-0 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      JAILED
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
