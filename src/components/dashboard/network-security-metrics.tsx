'use client';

import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';
import { useNetworkConstants } from '@/lib/hooks/use-network-constants';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { runeToNumber, formatCompactNumber, rawRuneToPositiveDisplayNumber } from '@/lib/utils/formatters';
import type { BondPosition } from '@/lib/types/node';
import { Shield, Lock, Activity, TrendingUp, TrendingDown, Minus, Wallet, Users, Zap, Coins, Clock } from 'lucide-react';
import { getIncentivePendulumModel, type IncentivePendulumLevel } from '@/lib/dashboard/risk-context';

function calculateNetworkHealth(bondToPoolRatio: number): 'healthy' | 'warning' | 'critical' {
  if (bondToPoolRatio >= 1.5) return 'healthy';
  if (bondToPoolRatio >= 1.0) return 'warning';
  return 'critical';
}

function getHealthColor(status: 'healthy' | 'warning' | 'critical'): string {
  switch (status) {
    case 'healthy': return 'text-sky-600 dark:text-sky-400';
    case 'warning': return 'text-orange-600 dark:text-orange-400';
    case 'critical': return 'text-red-600 dark:text-red-400';
  }
}

function getHealthBgColor(status: 'healthy' | 'warning' | 'critical'): string {
  switch (status) {
    case 'healthy': return 'bg-sky-50 dark:bg-sky-900/20';
    case 'warning': return 'bg-orange-50 dark:bg-orange-900/20';
    case 'critical': return 'bg-red-50 dark:bg-red-900/20';
  }
}

function getPendulumIcon(level: IncentivePendulumLevel): React.ReactNode {
  switch (level) {
    case 'well-secured':
      return <TrendingUp className="w-4 h-4" />;
    case 'healthy':
      return <Minus className="w-4 h-4" />;
    case 'building':
    case 'under-secured':
      return <TrendingDown className="w-4 h-4" />;
  }
}

export function NetworkSecurityMetrics({ positions }: { positions?: BondPosition[] }) {
  const { data: network, error, isLoading: networkLoading } = useNetworkMetrics();
  const { isLoading: constantsLoading } = useNetworkConstants();
  const { data: nodes } = useAllNodes();

  const isLoading = networkLoading || constantsLoading;

  if (isLoading || error || !network) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="animate-pulse h-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  const totalActiveBonds = runeToNumber(network.bondMetrics?.totalActiveBond || '0');
  const totalStandbyBonds = runeToNumber(network.bondMetrics?.totalStandbyBond || '0');
  const totalBonds = totalActiveBonds + totalStandbyBonds;
  const totalLiquidity = runeToNumber(network.totalPooledRune || '0');
  const incentivePendulum = getIncentivePendulumModel({ totalBonds, totalLiquidity });
  const bondToPoolRatio = incentivePendulum.bondToPoolRatio;
  const healthStatus = calculateNetworkHealth(bondToPoolRatio);
  const pendulumIcon = getPendulumIcon(incentivePendulum.level);

  // Calculate user's share of network bonds if positions provided
  const userTotalBond = positions?.reduce((sum, pos) => sum + pos.bondAmount, 0) ?? 0;
  const userSharePercent = totalBonds > 0 ? (userTotalBond / totalBonds) * 100 : 0;

  // Get effective security bond (bottom 2/3 of active nodes with usable bond source rows).
  const activeNodes = nodes?.filter(n => n.status === 'Active') ?? [];
  const activeBondRows = activeNodes.flatMap((node) => {
    const totalBond = rawRuneToPositiveDisplayNumber(node.total_bond);
    return totalBond === null ? [] : [{ totalBond }];
  });
  const excludedEffectiveSecurityNodeCount = activeNodes.length - activeBondRows.length;
  const excludedEffectiveSecurityNodeNoun = excludedEffectiveSecurityNodeCount === 1 ? 'node' : 'nodes';
  const excludedEffectiveSecurityVerb = excludedEffectiveSecurityNodeCount === 1 ? 'was' : 'were';
  const sortedByBond = [...activeBondRows].sort((a, b) => b.totalBond - a.totalBond);
  const topThirdCount = Math.floor(sortedByBond.length / 3);
  const effectiveSecurityRows = sortedByBond.slice(topThirdCount);
  const effectiveSecurityBond = effectiveSecurityRows.length > 0
    ? effectiveSecurityRows.reduce((sum, row) => sum + row.totalBond, 0)
    : null;
  const effectiveSecurityLabel = excludedEffectiveSecurityNodeCount > 0
    ? 'Effective Security Sample'
    : 'Effective Security';
  const effectiveSecurityValue = effectiveSecurityBond === null
    ? '--'
    : `${formatCompactNumber(effectiveSecurityBond)} RUNE`;
  const effectiveSecurityExplanation = effectiveSecurityBond === null
    ? 'Effective security unavailable until active-node bond source rows are usable. Higher increases network-level bond coverage, not a provider safety verdict.'
    : excludedEffectiveSecurityNodeCount > 0
      ? 'Effective security sample = bottom 2/3 active nodes with usable bond data. Higher increases network-level bond coverage, not a provider safety verdict.'
      : 'Effective security = bottom 2/3 active nodes. Higher increases network-level bond coverage, not a provider safety verdict.';

  const nodeSharePercent = incentivePendulum.nodeShare;

  // Block rewards (per block)
  const bondReward = runeToNumber(network.blockRewards?.bondReward || '0');
  const poolReward = runeToNumber(network.blockRewards?.poolReward || '0');
  
  // Total reserve
  const totalReserve = runeToNumber(network.totalReserve || '0');
  
  // Pool activation countdown (blocks)
  const poolActivationCountdown = parseInt(network.poolActivationCountdown || '0', 10);
  const activationDays = Math.floor(poolActivationCountdown / 1440); // ~1 block per 6 seconds = 1440/day

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Incentive Pendulum</h3>
        <Shield className="w-4 h-4 text-zinc-400" />
      </div>

      {/* Pendulum Status - The key insight */}
      <div className={`p-3 rounded-lg mb-4 ${getHealthBgColor(healthStatus)}`}>
        <div className="flex items-center gap-2">
          {pendulumIcon}
          <span className={`font-medium ${getHealthColor(healthStatus)}`}>
            {incentivePendulum.status}
          </span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
          {incentivePendulum.description}
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
                healthStatus === 'healthy' ? 'bg-sky-500' :
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
        <div className="flex items-center justify-between" role="group" aria-label={effectiveSecurityLabel}>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Users className="w-4 h-4" />
            <span>{effectiveSecurityLabel}</span>
          </div>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {effectiveSecurityValue}
          </span>
        </div>
        {activeNodes.length > 0 && activeBondRows.length === 0 && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            THORNode returned active nodes, but every active-node total-bond row was unusable. Heimdall is not calculating effective security from this sample.
          </p>
        )}
        {excludedEffectiveSecurityNodeCount > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {excludedEffectiveSecurityNodeCount} active {excludedEffectiveSecurityNodeNoun} had unusable bond source data and {excludedEffectiveSecurityVerb} excluded from effective security.
          </p>
        )}

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

        {/* Block Rewards */}
        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            <Zap className="w-4 h-4" />
            <span>Block Rewards (per block)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Node Bond</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {formatCompactNumber(bondReward)} RUNE
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">LP Pool</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                {formatCompactNumber(poolReward)} RUNE
              </span>
            </div>
          </div>
        </div>

        {/* Total Reserve */}
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Coins className="w-4 h-4" />
            <span>Total Reserve</span>
          </div>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatCompactNumber(totalReserve)} RUNE
          </span>
        </div>

        {/* Pool Activation */}
        {poolActivationCountdown > 0 && (
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Clock className="w-4 h-4" />
              <span>Pool Activation</span>
            </div>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {activationDays > 0 ? `${activationDays}d` : `${poolActivationCountdown} blocks`}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        {effectiveSecurityExplanation}
      </div>
    </div>
  );
}
