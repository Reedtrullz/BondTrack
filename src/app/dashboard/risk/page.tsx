'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useCurrentBlockHeight } from '@/lib/hooks/use-current-block-height';
import { AlertTriangle, Shield, TrendingDown, Clock, Zap, AlertCircle, Lock, Hourglass } from 'lucide-react';
import { SlashMonitor } from '@/components/dashboard/slash-monitor';
import { ChurnOutRisk } from '@/components/dashboard/churn-out-risk';
import { NetworkSecurityMetrics } from '@/components/dashboard/network-security-metrics';
import { UnbondWindowTracker } from '@/components/dashboard/unbond-window-tracker';
import type { YieldGuardFlag, BondPosition } from '@/lib/types/node';
import { useState } from 'react';
import { generatePortfolioAlerts } from '@/lib/utils/portfolio-alerts';
import { cn } from '@/lib/utils';
import { estimateNextChurn } from '@/lib/utils/calculations';

function formatRune(num: number): string {
  return num.toLocaleString();
}

const YIELD_GUARD_CONFIG: Record<YieldGuardFlag, { icon: React.ReactNode; color: string; label: string }> = {
  overbonded: { icon: <TrendingDown className="w-3 h-3" />, color: 'text-orange-500', label: 'Overbonded' },
  highest_slash: { icon: <AlertTriangle className="w-3 h-3" />, color: 'text-red-500', label: 'High Slash' },
  lowest_bond: { icon: <TrendingDown className="w-3 h-3" />, color: 'text-yellow-500', label: 'Lowest Bond' },
  oldest: { icon: <Clock className="w-3 h-3" />, color: 'text-purple-500', label: 'Oldest' },
  leaving: { icon: <AlertCircle className="w-3 h-3" />, color: 'text-zinc-500', label: 'Leaving' },
};

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

function RiskKPIPill({
  icon,
  value,
  label,
  color,
  subtext,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  subtext?: string;
}) {
  return (
    <div className={cn("flex-1 min-w-[80px] p-3 rounded-lg border", color)}>
      <div className="flex items-center gap-2">
        <div className="shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-bold truncate">{value}</div>
          <div className="text-xs truncate">{label}</div>
        </div>
      </div>
      {subtext && <div className="text-xs opacity-70 mt-1 truncate">{subtext}</div>}
    </div>
  );
}

function RiskKPIRow({ positions }: { positions: BondPosition[] }) {
  const { currentBlockHeight } = useCurrentBlockHeight();
  const activeCount = positions.filter(p => p.status === 'Active').length;
  const standbyCount = positions.filter(p => p.status === 'Standby').length;
  const jailedCount = positions.filter(p => p.isJailed).length;
  const slashNodes = positions.filter(p => p.slashPoints > 0).length;
  const criticalSlash = positions.filter(p => p.slashPoints >= 200).length;
  const warningSlash = positions.filter(p => p.slashPoints >= 50 && p.slashPoints < 200).length;
  const nextChurnEstimate = currentBlockHeight ? estimateNextChurn(currentBlockHeight) : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <RiskKPIPill
        icon={<Zap className="w-4 h-4" />}
        value={activeCount}
        label="Earning"
        color="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
        subtext={standbyCount > 0 ? `${standbyCount} standby` : undefined}
      />
      <RiskKPIPill
        icon={<AlertTriangle className="w-4 h-4" />}
        value={slashNodes}
        label="Slash Points"
        color={criticalSlash > 0 ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400" : warningSlash > 0 ? "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400" : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"}
        subtext={criticalSlash > 0 ? `${criticalSlash} critical` : warningSlash > 0 ? `${warningSlash} warning` : undefined}
      />
      <RiskKPIPill
        icon={<Lock className="w-4 h-4" />}
        value={jailedCount}
        label="Jailed"
        color={jailedCount > 0 ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400" : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"}
      />
      <RiskKPIPill
        icon={<Hourglass className="w-4 h-4" />}
        value={nextChurnEstimate ? Math.floor(nextChurnEstimate.blocksRemaining / 1440) + 'd' : '--'}
        label="Next Churn"
        color="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
        subtext={`${activeCount + standbyCount} nodes`}
      />
    </div>
  );
}

function YourNodesAtRisk({ positions }: { positions: BondPosition[] }) {
  const alerts = generatePortfolioAlerts(positions);
  const sortedPositions = [...positions].sort((a, b) => getNodeSeverityScore(b) - getNodeSeverityScore(a));
  const totalBonded = positions.reduce((sum, p) => sum + p.bondAmount, 0);
  const jailedCount = positions.filter(p => p.isJailed).length;

  if (positions.length === 0) {
    return (
      <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center">
        <Shield className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">No Bond Positions</h3>
        <p className="text-sm text-zinc-500">Enter an address to view risk status.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Nodes by Risk</h3>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span>{positions.length} nodes</span>
            <span className="text-emerald-600 dark:text-emerald-400">{formatRune(totalBonded)} RUNE</span>
            {jailedCount > 0 && <span className="text-red-500">{jailedCount} jailed</span>}
          </div>
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    pos.status === 'Active' ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400" :
                    pos.status === 'Standby' ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400" :
                    "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                  )}>
                    {pos.status}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {formatRune(pos.bondAmount)}
                  </span>
                </div>
              </div>
              {alert && (
                <div className="flex items-start gap-2 mt-2">
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

      <RiskKPIRow positions={positions} />

      <YourNodesAtRisk positions={positions} />

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