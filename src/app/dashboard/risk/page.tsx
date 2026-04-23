'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useCurrentBlockHeight } from '@/lib/hooks/use-current-block-height';
import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';

import { AlertTriangle, Shield, TrendingDown, Clock, Zap, AlertCircle, Lock, Hourglass, Activity, CheckCircle, TrendingUp, Minus, AlertCircle as AlertIcon } from 'lucide-react';
import { calculatePortfolioHealth } from '@/lib/utils/health-score';
import { SlashMonitor } from '@/components/dashboard/slash-monitor';
import { ChurnOutRisk } from '@/components/dashboard/churn-out-risk';
import { NetworkSecurityMetrics } from '@/components/dashboard/network-security-metrics';
import { UnbondWindowTracker } from '@/components/dashboard/unbond-window-tracker';
import type { YieldGuardFlag, BondPosition } from '@/lib/types/node';
import { useState } from 'react';
import { generatePortfolioAlerts } from '@/lib/utils/portfolio-alerts';
import { cn } from '@/lib/utils';
import { estimateNextChurn } from '@/lib/utils/calculations';
import { runeToNumber, formatCompactNumber, formatRuneFromNumber } from '@/lib/utils/formatters';

function formatRuneValue(value: number): string {
  if (!value || value <= 0) return '--';
  return formatRuneFromNumber(value);
}

function formatRuneCompact(value: number): string {
  if (!value || value <= 0) return '--';
  return formatCompactNumber(value);
}

function getNodeSeverityScore(p: BondPosition): number {
  let score = 0;
  if (p.slashPoints >= 200) score += 50;
  else if (p.slashPoints >= 50) score += 25;
  else if (p.slashPoints > 0) score += 10;
  if (p.isJailed) score += 100;
  if (p.yieldGuardFlags?.includes('lowest_bond')) score += 20;
  if (p.yieldGuardFlags?.includes('overbonded')) score += 15;
  return score;
}

const YIELD_GUARD_CONFIG: Record<YieldGuardFlag, { icon: React.ReactNode; color: string; label: string }> = {
  overbonded: { icon: <TrendingDown className="w-3 h-3" />, color: 'text-orange-500', label: 'Overbonded' },
  highest_slash: { icon: <AlertTriangle className="w-3 h-3" />, color: 'text-red-500', label: 'High Slash' },
  lowest_bond: { icon: <TrendingDown className="w-3 h-3" />, color: 'text-yellow-500', label: 'Lowest Bond' },
  oldest: { icon: <Clock className="w-3 h-3" />, color: 'text-purple-500', label: 'Oldest' },
  leaving: { icon: <AlertCircle className="w-3 h-3" />, color: 'text-zinc-500', label: 'Leaving' },
};

function RiskSummaryBanner({ positions }: { positions: BondPosition[] }) {
  const { data: network } = useNetworkMetrics();
  const { currentBlockHeight } = useCurrentBlockHeight();
  
  const totalBonded = positions.reduce((sum, p) => sum + p.bondAmount, 0);
  const activeCount = positions.filter(p => p.status === 'Active').length;
  const standbyCount = positions.filter(p => p.status === 'Standby').length;
  const jailedCount = positions.filter(p => p.isJailed).length;
  const atRiskCount = positions.filter(p => p.yieldGuardFlags && p.yieldGuardFlags.length > 0).length;
  const criticalCount = positions.filter(p => p.slashPoints >= 200).length;
  const warningCount = positions.filter(p => p.slashPoints >= 50 && p.slashPoints < 200).length;
  
  // Use canonical health score from utility layer
  const health = calculatePortfolioHealth(positions);
  const healthScore = health.score;
  
  const statusIcon = healthScore >= 80 ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : healthScore >= 50 ? <AlertIcon className="w-5 h-5 text-amber-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />;
  const statusText = healthScore >= 80 ? "Healthy" : healthScore >= 50 ? "Needs Attention" : "At Risk";
  const statusColor = healthScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : healthScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  // Use NETWORK bonds for pendulum (active + standby)
  const networkBondRaw = network?.bondMetrics?.totalActiveBond || '0';
  const networkStandbyRaw = network?.bondMetrics?.totalStandbyBond || '0';
  const networkLiquidityRaw = network?.totalPooledRune || '0';
  const networkBond = runeToNumber(networkBondRaw) + runeToNumber(networkStandbyRaw);
  const networkLiquidity = runeToNumber(networkLiquidityRaw);
  const bondToPoolRatio = networkLiquidity > 0 ? networkBond / networkLiquidity : 0;
  
  // For display
  const networkLiquidityDisplay = networkLiquidity > 0 
    ? formatRuneFromNumber(networkLiquidity) 
    : '0';
  
  // THORChain Incentive Pendulum status:
  // - >2.5x: Well Secured, 1.5-2.5x: Healthy, 1.0-1.5x: Building, <1.0x: Under-secured
  let pendulumStatus: { status: string; icon: React.ReactNode; color: string };
  if (bondToPoolRatio > 2.5) {
    pendulumStatus = { status: "Well Secured", icon: <TrendingUp className="w-3 h-3" />, color: "text-emerald-600 dark:text-emerald-400" };
  } else if (bondToPoolRatio >= 1.5) {
    pendulumStatus = { status: "Healthy", icon: <Minus className="w-3 h-3" />, color: "text-emerald-600 dark:text-emerald-400" };
  } else if (bondToPoolRatio >= 1.0) {
    pendulumStatus = { status: "Building", icon: <TrendingDown className="w-3 h-3" />, color: "text-amber-600 dark:text-amber-400" };
  } else {
    pendulumStatus = { status: "Under-secured", icon: <TrendingDown className="w-3 h-3" />, color: "text-red-600 dark:text-red-400" };
  }

  const nextChurn = currentBlockHeight ? estimateNextChurn(currentBlockHeight) : null;
  const nextChurnText = nextChurn ? (() => {
    const totalSeconds = nextChurn.estimatedSeconds;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  })() : '--';

  if (positions.length === 0) {
    return (
      <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center">
        <Shield className="w-10 h-10 mx-auto mb-3 text-zinc-400" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">No Bond Positions</h3>
        <p className="text-sm text-zinc-500">Enter an address to view risk status.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {statusIcon}
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{healthScore}</div>
            <div className={cn("text-sm font-medium", statusColor)}>{statusText}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatRuneValue(totalBonded)}</div>
          <div className="text-xs text-zinc-500">Total Bonded</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
          <Zap className="w-3 h-3" />{activeCount} active
        </span>
        {standbyCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            {standbyCount} standby
          </span>
        )}
        {jailedCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <Lock className="w-3 h-3" />{jailedCount} jailed
          </span>
        )}
        {atRiskCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-3 h-3" />{atRiskCount} at risk
          </span>
        )}
        {criticalCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300">
            {criticalCount} critical
          </span>
        )}
        {warningCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
            {warningCount} warning
          </span>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-500">Pendulum:</span>
            <span className={cn("font-medium", pendulumStatus.color)}>
              {pendulumStatus.icon}
              <span className="ml-1">{pendulumStatus.status}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-500">Unbond:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{nextChurnText}</span>
          </div>
        </div>
        <div className="text-xs text-zinc-400">
          {networkLiquidity > 0 ? networkLiquidityDisplay : '--'} TVL
        </div>
      </div>
    </div>
  );
}

function NodesList({ positions }: { positions: BondPosition[] }) {
  const alerts = generatePortfolioAlerts(positions);
  const sortedPositions = [...positions].sort((a, b) => getNodeSeverityScore(b) - getNodeSeverityScore(a));
  const totalBonded = positions.reduce((sum, p) => sum + p.bondAmount, 0);

  if (positions.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Your Nodes</h3>
        </div>
        <div className="text-xs text-zinc-500">
          {positions.length} nodes · {formatRuneValue(totalBonded)} RUNE
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
        {sortedPositions.map(pos => {
          const primaryFlag = pos.yieldGuardFlags?.[0];
          const alert = alerts.find(a => {
            if (primaryFlag === 'highest_slash' && a.type === 'SLASH') return true;
            if (primaryFlag === 'lowest_bond' && a.type === 'CHURN') return true;
            if (pos.isJailed && a.type === 'JAIL') return true;
            return false;
          });
          const severity = getNodeSeverityScore(pos);
          const isHighRisk = severity >= 25;

          return (
            <div 
              key={pos.nodeAddress} 
              className={cn(
                "p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors",
                isHighRisk && "bg-red-50/50 dark:bg-red-900/10"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="font-mono text-sm text-zinc-700 dark:text-zinc-300 truncate">
                    {pos.nodeAddress.slice(0, 12)}...{pos.nodeAddress.slice(-4)}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {pos.yieldGuardFlags?.map(flag => {
                      const config = YIELD_GUARD_CONFIG[flag];
                      return (
                        <span 
                          key={flag}
                          className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium", config.color, "bg-zinc-100 dark:bg-zinc-700")}
                          title={config.label}
                        >
                          {config.icon}
                        </span>
                      );
                    })}
                    {pos.slashPoints > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium",
                        pos.slashPoints >= 200 ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400" :
                        pos.slashPoints >= 50 ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-400" :
                        "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-400"
                      )}>
                        {pos.slashPoints} pts
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    pos.status === 'Active' ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400" :
                    pos.status === 'Standby' ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400" :
                    "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                  )}>
                    {pos.status}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {formatRuneValue(pos.bondAmount)}
                  </span>
                </div>
              </div>
              {alert && (
                <div className="flex items-start gap-2 mt-1.5">
                  <div className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">
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
    </div>
  );
}

function RiskKPIs({ positions }: { positions: BondPosition[] }) {
  const { currentBlockHeight } = useCurrentBlockHeight();
  const activeCount = positions.filter(p => p.status === 'Active').length;
  const standbyCount = positions.filter(p => p.status === 'Standby').length;
  const jailedCount = positions.filter(p => p.isJailed).length;
  const slashNodes = positions.filter(p => p.slashPoints > 0).length;
  const criticalSlash = positions.filter(p => p.slashPoints >= 200).length;
  const warningSlash = positions.filter(p => p.slashPoints >= 50 && p.slashPoints < 200).length;
  const nextChurnEstimate = currentBlockHeight ? estimateNextChurn(currentBlockHeight) : null;
  const churnDays = nextChurnEstimate ? Math.floor(nextChurnEstimate.estimatedSeconds / 86400) : null;

  const pills = [
    { icon: <Zap className="w-4 h-4" />, value: activeCount, label: "Earning", color: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400", sub: standbyCount > 0 ? `${standbyCount} standby` : null },
    { icon: <AlertTriangle className="w-4 h-4" />, value: slashNodes, label: "Slash", color: criticalSlash > 0 ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400" : warningSlash > 0 ? "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400" : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400", sub: criticalSlash > 0 ? `${criticalSlash} crit` : warningSlash > 0 ? `${warningSlash} warn` : null },
    { icon: <Lock className="w-4 h-4" />, value: jailedCount, label: "Jailed", color: jailedCount > 0 ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400" : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400", sub: null },
    { icon: <Hourglass className="w-4 h-4" />, value: churnDays !== null ? churnDays + 'd' : '--', label: "Churn", color: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400", sub: null },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {pills.map((pill, i) => (
        <div key={i} className={cn("flex-1 min-w-[80px] p-2.5 rounded-lg border", pill.color)}>
          <div className="flex items-center gap-2">
            <div className="shrink-0">{pill.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold truncate">{pill.value}</div>
              <div className="text-xs truncate opacity-80">{pill.label}</div>
            </div>
          </div>
          {pill.sub && <div className="text-xs opacity-70 mt-0.5 truncate">{pill.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function IncentivePendulum() {
  const { data: network } = useNetworkMetrics();
  
  const totalActiveRaw = network?.bondMetrics?.totalActiveBond || '0';
  const totalStandbyRaw = network?.bondMetrics?.totalStandbyBond || '0';
  const totalLiquidityRaw = network?.totalPooledRune || '0';
  const totalBonds = runeToNumber(totalActiveRaw) + runeToNumber(totalStandbyRaw);
  const totalLiquidity = runeToNumber(totalLiquidityRaw);
  const bondToPoolRatio = totalLiquidity > 0 ? totalBonds / totalLiquidity : 0;
  
  // THORChain Incentive Pendulum:
  // - >2.5x: Well Secured (nodes earn more)
  // - 1.5-2.5x: Healthy (balanced)
  // - 1.0-1.5x: Building (bond > liquidity but needs more)
  // - <1.0x: Under-secured (liquidity > bond)
  let pendulumStatus: { status: string; icon: React.ReactNode; color: string; bg: string; desc: string };
  if (bondToPoolRatio > 2.5) {
    pendulumStatus = { 
      status: "Well Secured", 
      icon: <TrendingUp className="w-4 h-4" />, 
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      desc: "Bond exceeds 2.5x liquidity. Node rewards maximized, LP yields reduced."
    };
  } else if (bondToPoolRatio >= 1.5) {
    pendulumStatus = { 
      status: "Healthy", 
      icon: <Minus className="w-4 h-4" />, 
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      desc: "Bond 1.5-2x liquidity. Balanced reward distribution."
    };
  } else if (bondToPoolRatio >= 1.0) {
    pendulumStatus = { 
      status: "Building", 
      icon: <TrendingDown className="w-4 h-4" />, 
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      desc: "Bond > liquidity but below target. More bonding needed for full security."
    };
  } else {
    pendulumStatus = { 
      status: "Under-secured", 
      icon: <TrendingDown className="w-4 h-4" />, 
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
      desc: "Liquidity exceeds bond. Network shifts rewards to nodes to encourage bonding."
    };
  }

  // THORChain incentive pendulum: actual reward split formula
  // When bond > liquidity: nodeShare = 1 - 1/(bondToPool + 1)
  // When bond <= liquidity: nodeShare = bondToPool / (bondToPool + 1)
  const nodeShareFraction = bondToPoolRatio > 1
    ? 1 - 1 / (bondToPoolRatio + 1)
    : bondToPoolRatio / (bondToPoolRatio + 1);
  const nodeShare = nodeShareFraction * 100;
  const lpShare = 100 - nodeShare;

  if (!network) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        <div className="animate-pulse h-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Incentive Pendulum</h3>
      </div>

      <div className={cn("p-4", pendulumStatus.bg)}>
        <div className="flex items-center gap-2">
          {pendulumStatus.icon}
          <span className={cn("font-medium text-lg", pendulumStatus.color)}>
            {pendulumStatus.status}
          </span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {pendulumStatus.desc}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-900/20 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="w-3 h-3 text-emerald-600" />
            <span className="text-xs text-emerald-700 dark:text-emerald-400">Nodes (Bond)</span>
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalBonds > 0 ? formatRuneCompact(totalBonds) : '--'}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">{nodeShare.toFixed(0)}%</div>
        </div>
        <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-blue-700 dark:text-blue-400">LPs (Liquidity)</span>
          </div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalLiquidity > 0 ? formatRuneCompact(totalLiquidity) : '--'}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400">{lpShare.toFixed(0)}%</div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-zinc-500">Bond-to-Pool Ratio</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{bondToPoolRatio.toFixed(2)}x</span>
        </div>
        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all",
              bondToPoolRatio >= 1.5 && bondToPoolRatio <= 3 ? "bg-emerald-500" :
              bondToPoolRatio >= 1 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${Math.min(bondToPoolRatio * 33, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
          <span>Target: 1.5x - 3x</span>
          <span>Current: {bondToPoolRatio.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
}

export default function RiskPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions } = useBondPositions(address);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Risk Monitor</h2>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <RiskSummaryBanner positions={positions} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <RiskKPIs positions={positions} />
        </div>
        <div>
          <IncentivePendulum />
        </div>
      </div>

      <NodesList positions={positions} />

      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SlashMonitor positions={positions} />
          <ChurnOutRisk positions={positions} />
          <UnbondWindowTracker positions={positions} />
          <NetworkSecurityMetrics positions={positions} />
        </div>
      )}
    </div>
  );
}
