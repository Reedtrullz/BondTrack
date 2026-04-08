'use client';

import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';
import { runeToNumber, formatCompactNumber } from '@/lib/utils/formatters';
import type { BondPosition } from '@/lib/types/node';
import { Shield, Lock, Activity, User } from 'lucide-react';

function calculateNetworkHealth(bondToPoolRatio: number): 'healthy' | 'warning' | 'critical' {
  if (bondToPoolRatio >= 1.5 && bondToPoolRatio <= 3) return 'healthy';
  if (bondToPoolRatio >= 1 && bondToPoolRatio < 1.5) return 'warning';
  return 'critical';
}

function getHealthColor(status: 'healthy' | 'warning' | 'critical'): string {
  switch (status) {
    case 'healthy': return 'text-emerald-600 dark:text-emerald-400';
    case 'warning': return 'text-orange-600 dark:text-orange-400';
    case 'critical': return 'text-red-600 dark:text-red-400';
  }
}

function getHealthBgColor(status: 'healthy' | 'warning' | 'critical'): string {
  switch (status) {
    case 'healthy': return 'bg-emerald-50 dark:bg-emerald-900/20';
    case 'warning': return 'bg-orange-50 dark:bg-orange-900/20';
    case 'critical': return 'bg-red-50 dark:bg-red-900/20';
  }
}

export function NetworkSecurityMetrics({ positions }: { positions?: BondPosition[] }) {
  const { data: network, error, isLoading } = useNetworkMetrics();

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="animate-pulse h-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  if (error || !network) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="text-red-500 text-sm">Error: {error?.message || 'No network data'}</div>
      </div>
    );
  }

  const totalBonds = runeToNumber(network.totalBondsRune);
  const totalLiquidity = runeToNumber(network.totalLiquidityRune);
  const bondToPoolRatio = totalLiquidity > 0 ? totalBonds / totalLiquidity : 0;
  const healthStatus = calculateNetworkHealth(bondToPoolRatio);

  // Calculate user's share of network bonds if positions provided
  const userTotalBond = positions?.reduce((sum, pos) => sum + pos.bondAmount, 0) ?? 0;
  const userSharePercent = totalBonds > 0 ? (userTotalBond / totalBonds) * 100 : 0;

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Network Security</h3>
        <Shield className="w-4 h-4 text-zinc-400" />
      </div>

      <div className={`p-3 rounded-lg mb-4 ${getHealthBgColor(healthStatus)}`}>
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${getHealthColor(healthStatus)}`} />
          <span className={`font-medium ${getHealthColor(healthStatus)}`}>
            Network {healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Lock className="w-4 h-4" />
            <span>Total Bonds</span>
          </div>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatCompactNumber(totalBonds)} RUNE
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Shield className="w-4 h-4" />
            <span>Total Pool Depth</span>
          </div>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatCompactNumber(totalLiquidity)} RUNE
          </span>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Bond-to-Pool Ratio</span>
            <span className={`font-medium ${getHealthColor(healthStatus)}`}>
              {bondToPoolRatio.toFixed(2)}x
            </span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                healthStatus === 'healthy' ? 'bg-emerald-500' :
                healthStatus === 'warning' ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(bondToPoolRatio * 33, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>Target: 1.5x - 3x</span>
            <span>Current: {bondToPoolRatio.toFixed(2)}x</span>
          </div>
        </div>

        {userSharePercent > 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              <User className="w-4 h-4" />
              <span>Your Share of Network Bonds</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {userSharePercent.toFixed(3)}%
              </span>
              <span className="text-xs text-zinc-500">
                of {formatCompactNumber(totalBonds)} RUNE
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        Security ratio: bonds should be ≈ 2× non-RUNE pool value
      </div>
    </div>
  );
}
