'use client';

import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';
import { useNetworkConstants } from '@/lib/hooks/use-network-constants';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { runeToNumber, formatCompactNumber } from '@/lib/utils/formatters';
import type { BondPosition } from '@/lib/types/node';
import { Shield, Lock, Activity, TrendingUp, TrendingDown, Minus, Wallet, Users, Zap } from 'lucide-react';

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

function getPendulumStatus(bondToPoolRatio: number): { status: string; icon: React.ReactNode; description: string } {
  if (bondToPoolRatio >= 2.5) {
    return {
      status: 'Node Favored',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'High bond → nodes earn more. LP yields may be lower.'
    };
  }
  if (bondToPoolRatio <= 1.2) {
    return {
      status: 'LP Favored',
      icon: <TrendingDown className="w-4 h-4" />,
      description: 'More liquidity than bond → LPs earn more. Consider bonding more?'
    };
  }
  return {
    status: 'Balanced',
    icon: <Minus className="w-4 h-4" />,
    description: 'Near equilibrium (~2x). Rewards split fairly between nodes and LPs.'
  };
}

export function NetworkSecurityMetrics({ positions }: { positions?: BondPosition[] }) {
  const { data: network, error, isLoading: networkLoading } = useNetworkMetrics();
  const { constants, isLoading: constantsLoading } = useNetworkConstants();
  const { data: nodes } = useAllNodes();

  const isLoading = networkLoading || constantsLoading;

  if (isLoading || error || !network) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="animate-pulse h-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  const totalBonds = runeToNumber(network.bondMetrics?.totalActiveBond || '0');
  const totalLiquidity = runeToNumber(network.totalPooledRune || '0');
  const bondToPoolRatio = totalLiquidity > 0 ? totalBonds / totalLiquidity : 0;
  const healthStatus = calculateNetworkHealth(bondToPoolRatio);
  const pendulum = getPendulumStatus(bondToPoolRatio);

  // Calculate user's share of network bonds if positions provided
  const userTotalBond = positions?.reduce((sum, pos) => sum + pos.bondAmount, 0) ?? 0;
  const userSharePercent = totalBonds > 0 ? (userTotalBond / totalBonds) * 100 : 0;

  // Get effective security bond (bottom 2/3 of active nodes)
  const activeNodes = nodes?.filter(n => n.status === 'Active') ?? [];
  const sortedByBond = [...activeNodes].sort((a, b) => {
    const bondA = BigInt(a.total_bond || '0');
    const bondB = BigInt(b.total_bond || '0');
    return bondA > bondB ? -1 : bondA < bondB ? 1 : 0;
  });
  const effectiveCount = Math.floor(sortedByBond.length * 0.667);
  const effectiveSecurityBond = sortedByBond.slice(effectiveCount).reduce((sum, n) => {
    return sum + runeToNumber(n.total_bond);
  }, 0);

  // Estimate node share (simplified calculation)
  const securing = effectiveSecurityBond > 0 ? effectiveSecurityBond : totalBonds;
  const secured = totalLiquidity;
  const nodeSharePercent = secured > 0 ? Math.min((securing / secured) * 50, 75) : 50;

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Incentive Pendulum</h3>
        <Shield className="w-4 h-4 text-zinc-400" />
      </div>

      {/* Pendulum Status - The key insight */}
      <div className={`p-3 rounded-lg mb-4 ${getHealthBgColor(healthStatus)}`}>
        <div className="flex items-center gap-2">
          {pendulum.icon}
          <span className={`font-medium ${getHealthColor(healthStatus)}`}>
            {pendulum.status}
          </span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
          {pendulum.description}
        </p>
      </div>

      {/* Estimated Reward Split */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-blue-700 dark:text-blue-400">Node Share</span>
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{nodeSharePercent.toFixed(0)}%</div>
        </div>
        <div className="p-2 rounded bg-purple-50 dark:bg-purple-900/20 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Wallet className="w-3 h-3 text-purple-600" />
            <span className="text-xs text-purple-700 dark:text-purple-400">LP Share</span>
          </div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{(100 - nodeSharePercent).toFixed(0)}%</div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Bond-to-Pool Ratio */}
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

        {/* Effective Security */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Users className="w-4 h-4" />
            <span>Effective Security</span>
          </div>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatCompactNumber(effectiveSecurityBond)} RUNE
          </span>
        </div>

        {/* Total Bonds */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Lock className="w-4 h-4" />
            <span>Total Bonds</span>
          </div>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatCompactNumber(totalBonds)} RUNE
          </span>
        </div>

        {/* Pool Depth */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Shield className="w-4 h-4" />
            <span>Pool Depth</span>
          </div>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatCompactNumber(totalLiquidity)} RUNE
          </span>
        </div>

        {/* Your Share */}
        {userSharePercent > 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              <Activity className="w-4 h-4" />
              <span>Your Share of Bond</span>
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
        Effective security = bottom 2/3 active nodes. Higher = more network security.
      </div>
    </div>
  );
}
