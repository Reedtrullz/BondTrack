'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { useCurrentBlockHeight } from '@/lib/hooks/use-current-block-height';
import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';
import { useNetworkConstants } from '@/lib/hooks/use-network-constants';

import { AlertTriangle, Shield, TrendingDown, Clock, Zap, AlertCircle, Lock, Hourglass, Activity, CheckCircle, TrendingUp, Minus, AlertCircle as AlertIcon } from 'lucide-react';
import { SlashMonitor } from '@/components/dashboard/slash-monitor';
import { ChurnOutRisk } from '@/components/dashboard/churn-out-risk';
import { NetworkSecurityMetrics } from '@/components/dashboard/network-security-metrics';
import { NetworkSecurityCard } from '@/components/dashboard/network-security-card';
import { UnbondWindowTracker } from '@/components/dashboard/unbond-window-tracker';
import { RiskRadar } from '@/components/dashboard/risk-radar';
import { DashboardCard } from '@/components/shared/dashboard-card';
import { DashboardLoadingSkeleton } from '@/components/shared/dashboard-loading-skeleton';
import { ActionQueue } from '@/components/dashboard/action-queue';
import {
  CandidateScoreEvidence,
  getCandidateScoreEvidenceSummary,
  type CandidateScoreEvidenceInput,
} from '@/components/dashboard/candidate-score-evidence';
import { InsightHeader } from '@/components/dashboard/insight-header';
import { SourceFreshnessPanel } from '@/components/dashboard/source-freshness-panel';
import type { YieldGuardFlag, BondPosition } from '@/lib/types/node';
import type { NodeRaw } from '@/lib/api/thornode';
import { useState } from 'react';
import { generatePortfolioAlerts } from '@/lib/utils/portfolio-alerts';
import { cn } from '@/lib/utils';
import { calculateNetworkSecurityState, estimateNextChurn } from '@/lib/utils/calculations';
import { runeToNumber, formatBasisPoints, formatCompactNumber, formatPercent, formatRuneDisplayNumber, formatRuneFromNumber } from '@/lib/utils/formatters';
import { NETWORK } from '@/lib/config';
import { buildDashboardInsightState, type ActionItem } from '@/lib/dashboard/insights';
import { getCandidateBondSourceSafety, type CandidateBondSourceSafety } from '@/lib/dashboard/candidate-bond-source-safety';
import {
  getIncentivePendulumModel,
  getNodeSeverityScore,
  getRiskNodeElementId,
  resolveFocusedNodeRiskContext,
  sortRiskPositions,
  summarizeRiskPositions,
  type CandidateRiskContext,
  type IncentivePendulumLevel,
} from '@/lib/dashboard/risk-context';
import { useApiHealthContext } from '@/lib/hooks/use-api-health';

function formatRuneValue(value: number): string {
  if (!value || value <= 0) return '--';
  return formatRuneFromNumber(value);
}

function formatRuneCompact(value: number): string {
  if (!value || value <= 0) return '--';
  return formatCompactNumber(value);
}

function isUsableRiskMetric(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function formatRiskPercent(value: number): string {
  return isUsableRiskMetric(value) ? formatPercent(value) : '--';
}

function formatRiskRune(value: number): string {
  return isUsableRiskMetric(value) && value > 0 ? `ᚱ${formatRuneDisplayNumber(value)}` : '--';
}

function formatRiskNumber(value: number): string {
  return isUsableRiskMetric(value) ? value.toLocaleString() : '--';
}

function formatNodeAddress(nodeAddress: string): string {
  return `${nodeAddress.slice(0, 12)}...${nodeAddress.slice(-6)}`;
}

function buildDashboardHref(path: string, address: string | null, nodeAddress?: string): string {
  const params = new URLSearchParams();
  if (address) {
    params.set('address', address);
  }
  if (nodeAddress) {
    params.set('node', nodeAddress);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function getActionNodeAddress(action: ActionItem): string | null {
  try {
    return new URL(action.href, 'https://heimdall.local').searchParams.get('node');
  } catch {
    return null;
  }
}

function getNonFocusedRiskActions(actions: ActionItem[], focusedNodeAddress: string | null): ActionItem[] {
  if (!focusedNodeAddress) return actions;

  return actions.filter((action) => getActionNodeAddress(action) !== focusedNodeAddress);
}

function buildBondPrepHref(address: string | null, nodeAddress: string): string {
  const params = new URLSearchParams();
  if (address) {
    params.set('address', address);
  }
  params.set('action', 'bond');
  params.set('node', nodeAddress);

  return `/dashboard/transactions?${params.toString()}`;
}

function getFocusedRiskCapacitySummary(candidateContext: CandidateRiskContext): string {
  switch (candidateContext.candidateScore.capacityTrust) {
    case 'available':
      return 'Provider whitelisted';
    case 'needs_whitelist':
      return 'Whitelist needed';
    case 'full':
      return 'Provider slots full';
    case 'unknown':
      return 'Access unknown';
  }
}

function getFocusedCandidateRiskDecision({
  address,
  candidateContext,
  explorerHref,
  nodeAddress,
  sourceConfidenceHref,
  sourceSafety,
}: {
  address: string | null;
  candidateContext: CandidateRiskContext;
  explorerHref: string;
  nodeAddress: string;
  sourceConfidenceHref: string;
  sourceSafety: CandidateBondSourceSafety;
}) {
  const { candidateScore } = candidateContext;

  if (candidateScore.capacityTrust === 'available' && candidateScore.quality === 'Strong') {
    if (!sourceSafety.canPrepareBond) {
      return {
        detail: sourceSafety.detail,
        href: sourceConfidenceHref,
        label: 'Wait for source confidence',
        linkLabel: 'Review source confidence',
        tone: 'review' as const,
      };
    }

    return {
      detail: 'Watched address is already listed as a provider and the candidate score is strong.',
      href: buildBondPrepHref(address, nodeAddress),
      label: 'Prepare BOND memo',
      linkLabel: 'Prepare BOND memo',
      tone: 'ready' as const,
    };
  }

  if (candidateScore.capacityTrust === 'needs_whitelist') {
    return {
      detail: 'Do not bond until this address is whitelisted.',
      href: explorerHref,
      label: 'Ask operator to whitelist',
      linkLabel: 'Compare alternatives',
      tone: 'blocked' as const,
    };
  }

  if (candidateScore.capacityTrust === 'full') {
    return {
      detail: 'Provider slots are full; choose another node until capacity reopens.',
      href: explorerHref,
      label: 'Choose another candidate',
      linkLabel: 'Compare alternatives',
      tone: 'blocked' as const,
    };
  }

  if (candidateScore.capacityTrust === 'unknown') {
    return {
      detail: 'Provider access is incomplete; verify before bonding.',
      href: explorerHref,
      label: 'Verify provider access',
      linkLabel: 'Compare candidates',
      tone: 'review' as const,
    };
  }

  return {
    detail: 'Provider access is available, but the candidate score still needs risk review before bonding.',
    href: explorerHref,
    label: 'Review risk evidence',
    linkLabel: 'Compare candidates',
    tone: 'review' as const,
  };
}

function getFocusedBondedRiskDecision(position: BondPosition, severity: number) {
  const flags = position.yieldGuardFlags ?? [];

  if (position.isJailed) {
    return {
      detail: 'Node is jailed. Confirm operator recovery status before adding bond or changing exposure.',
      label: 'Inspect jail status',
      tone: 'critical' as const,
    };
  }

  if (position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical) {
    return {
      detail: 'Slash exposure is above the provider-review threshold. Review trend, jail context, and recent node status before changing bond.',
      label: 'Review slash exposure',
      tone: 'warning' as const,
    };
  }

  if (position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning || position.slashPoints > 0) {
    return {
      detail: 'Slash exposure is elevated. Review this node before the next churn or before adding more bond.',
      label: 'Review slash exposure',
      tone: 'warning' as const,
    };
  }

  if (flags.includes('lowest_bond')) {
    return {
      detail: 'This node is flagged near the low-bond edge. Review churn context before moving or adding exposure.',
      label: 'Review churn risk',
      tone: 'warning' as const,
    };
  }

  if (position.status !== 'Active') {
    return {
      detail: 'This node is not active. Confirm status and earning continuity before taking bond action.',
      label: 'Inspect node status',
      tone: 'warning' as const,
    };
  }

  if (severity >= NETWORK.NODE_SEVERITY_SCORES.highRisk) {
    return {
      detail: 'This node has risk flags. Review the underlying evidence before changing bond exposure.',
      label: 'Review node evidence',
      tone: 'warning' as const,
    };
  }

  return {
    detail: 'No immediate bonded-node action is required. Review evidence if this alert came from an older queue item.',
    label: 'Review node evidence',
    tone: 'ready' as const,
  };
}

const YIELD_GUARD_CONFIG: Record<YieldGuardFlag, { icon: React.ReactNode; color: string; label: string }> = {
  highest_slash: { icon: <AlertTriangle className="w-3 h-3" />, color: 'text-red-500', label: 'High Slash' },
  lowest_bond: { icon: <TrendingDown className="w-3 h-3" />, color: 'text-yellow-500', label: 'Lowest Bond' },
  oldest: { icon: <Clock className="w-3 h-3" />, color: 'text-purple-500', label: 'Oldest' },
  leaving: { icon: <AlertCircle className="w-3 h-3" />, color: 'text-zinc-500', label: 'Leaving' },
};

function RiskSummaryBanner({ positions }: { positions: BondPosition[] }) {
  const { data: network } = useNetworkMetrics();
  const { currentBlockHeight } = useCurrentBlockHeight();
  const summary = summarizeRiskPositions(positions);

  const statusIcon = summary.statusLabel === 'Healthy' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : summary.statusLabel === 'Review Needed' ? <AlertIcon className="w-5 h-5 text-amber-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />;
  const statusColor = summary.statusLabel === 'Healthy' ? 'text-emerald-600 dark:text-emerald-400' : summary.statusLabel === 'Review Needed' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

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
  if (bondToPoolRatio > NETWORK.BOND_TO_POOL_THRESHOLDS.healthy) {
    pendulumStatus = { status: 'Well Secured', icon: <TrendingUp className="w-3 h-3" />, color: 'text-emerald-600 dark:text-emerald-400' };
  } else if (bondToPoolRatio >= NETWORK.BOND_TO_POOL_THRESHOLDS.building) {
    pendulumStatus = { status: 'Healthy', icon: <Minus className="w-3 h-3" />, color: 'text-emerald-600 dark:text-emerald-400' };
  } else if (bondToPoolRatio >= NETWORK.BOND_TO_POOL_THRESHOLDS.underSecured) {
    pendulumStatus = { status: 'Building', icon: <TrendingDown className="w-3 h-3" />, color: 'text-amber-600 dark:text-amber-400' };
  } else {
    pendulumStatus = { status: 'Under-secured', icon: <TrendingDown className="w-3 h-3" />, color: 'text-red-600 dark:text-red-400' };
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
      <section
        aria-label="Risk summary"
        className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center"
      >
        <Shield className="w-10 h-10 mx-auto mb-3 text-zinc-400" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">No Bond Positions</h3>
        <p className="text-sm text-zinc-500">Enter an address to view risk status.</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Risk summary"
      className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {statusIcon}
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{summary.healthScore}</div>
            <div aria-label="Provider exposure status" className={cn("text-sm font-medium", statusColor)}>
              {summary.statusLabel}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatRuneValue(summary.totalBonded)}</div>
          <div className="text-xs text-zinc-500">Total Bonded</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
          <Zap className="w-3 h-3" />{summary.activeCount} active
        </span>
        {summary.standbyCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            {summary.standbyCount} standby
          </span>
        )}
        {summary.jailedCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <Lock className="w-3 h-3" />{summary.jailedCount} jailed
          </span>
        )}
        {summary.providerReviewCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />{summary.providerReviewCount} review
          </span>
        )}
        {summary.highSlashReviewCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            {summary.highSlashReviewCount} high slash review
          </span>
        )}
        {summary.elevatedSlashReviewCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
            {summary.elevatedSlashReviewCount} slash watch
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2 sm:flex sm:items-center sm:gap-4">
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
        <div className="text-xs text-zinc-400 sm:text-right">
          {networkLiquidity > 0 ? networkLiquidityDisplay : '--'} TVL
        </div>
      </div>
    </section>
  );
}

function NodesList({
  positions,
  focusedNodeAddress,
}: {
  positions: BondPosition[];
  focusedNodeAddress?: string | null;
}) {
  const alerts = generatePortfolioAlerts(positions);
  const sortedPositions = sortRiskPositions(positions);
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
          const isHighRisk = severity >= NETWORK.NODE_SEVERITY_SCORES.highRisk;
          const isFocused = Boolean(focusedNodeAddress && pos.nodeAddress === focusedNodeAddress);

          return (
            <div 
              key={pos.nodeAddress} 
              id={getRiskNodeElementId(pos.nodeAddress)}
              className={cn(
                "scroll-mt-24 p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                isHighRisk && "bg-red-50/50 dark:bg-red-900/10",
                isFocused && "bg-amber-50 ring-2 ring-amber-400 dark:bg-amber-950/20 dark:ring-amber-500"
              )}
              data-focused-node={isFocused ? 'true' : undefined}
              aria-label={isFocused ? `Focused risk node ${pos.nodeAddress}` : undefined}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="font-mono text-sm text-zinc-700 dark:text-zinc-300 truncate">
                    {pos.nodeAddress.slice(0, 12)}...{pos.nodeAddress.slice(-4)}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {isFocused ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                        Focused
                      </span>
                    ) : null}
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
                        pos.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400' :
                        pos.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-400' :
                        'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-400'
                      )}>
                        {pos.slashPoints} pts
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    pos.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400' :
                    pos.status === 'Standby' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400' :
                    'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
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

function FocusedNodeContext({
  allNodes,
  address,
  detailsVisible,
  focusedNodeAddress,
  isLoading,
  maxBondProviders,
  onReviewDetails,
  positions,
  sourceConfidenceHref,
  sourceSafety,
}: {
  allNodes: NodeRaw[];
  address: string | null;
  detailsVisible: boolean;
  focusedNodeAddress: string | null;
  isLoading: boolean;
  maxBondProviders: number | null;
  onReviewDetails: () => void;
  positions: BondPosition[];
  sourceConfidenceHref: string;
  sourceSafety: CandidateBondSourceSafety;
}) {
  if (!focusedNodeAddress) return null;

  if (isLoading) {
    return (
      <section
        aria-label="Focused node risk context"
        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        data-testid="focused-risk-context"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          <Activity className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          Loading focused node context
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Heimdall is matching the focused node against bonded positions and current THORNode candidates.
        </p>
      </section>
    );
  }

  const focusedContext = resolveFocusedNodeRiskContext({
    allNodes,
    focusedNodeAddress,
    maxBondProviders,
    positions,
    userAddress: address,
  });

  if (focusedContext.kind === 'none') return null;

  if (focusedContext.kind === 'candidate') {
      const { candidateContext, node: focusedCandidate } = focusedContext;
      const explorerHref = buildDashboardHref('/dashboard/explorer', address, focusedCandidate.node_address);
      const qualityTone = candidateContext.candidateScore.quality === 'Avoid'
        ? 'text-red-700 dark:text-red-300'
        : candidateContext.candidateScore.quality === 'Watch'
          ? 'text-amber-700 dark:text-amber-300'
          : 'text-emerald-700 dark:text-emerald-300';
      const riskDecision = getFocusedCandidateRiskDecision({
        address,
        candidateContext,
        explorerHref,
        nodeAddress: focusedCandidate.node_address,
        sourceConfidenceHref,
        sourceSafety,
      });
      const decisionToneClass = riskDecision.tone === 'ready'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100'
        : riskDecision.tone === 'blocked'
          ? 'border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-100'
          : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100';
      const primaryLinkClass = riskDecision.tone === 'ready'
        ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400'
        : riskDecision.tone === 'blocked'
          ? 'border-red-300 bg-white text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-zinc-950 dark:text-red-100 dark:hover:bg-red-950'
          : 'border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-zinc-950 dark:text-amber-100 dark:hover:bg-amber-950';
      const secondaryLinkClass = 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900';
      const metricSummary = [
        getFocusedRiskCapacitySummary(candidateContext),
        `Slash ${formatRiskNumber(focusedCandidate.slash_points)}`,
        `Fee ${isUsableRiskMetric(candidateContext.operatorFee) ? formatBasisPoints(candidateContext.operatorFee) : '--'}`,
      ].join(' · ');
      const showSecondaryExplorerLink = riskDecision.href !== explorerHref;
      const candidateScoreEvidence: CandidateScoreEvidenceInput = {
        adjustedAPY: candidateContext.adjustedAPY,
        candidateScore: candidateContext.candidateScore,
        operatorFeePercent: candidateContext.operatorFee / 10000,
        slash_points: focusedCandidate.slash_points,
        totalBond: candidateContext.totalBond,
      };
      const inlineEvidenceSummary = getCandidateScoreEvidenceSummary(candidateScoreEvidence);
      const inlineCapacityEvidence = getFocusedRiskCapacitySummary(candidateContext);
      const inlineSourceEvidence = sourceSafety.canPrepareBond
        ? `THORNode: ${inlineEvidenceSummary}. Capacity: ${inlineCapacityEvidence}.`
        : `THORNode source: ${sourceSafety.value}. Capacity: ${inlineCapacityEvidence}.`;

      return (
        <section
          aria-label="Focused node risk context"
          className="rounded-xl border border-amber-200 bg-amber-50/70 p-2 dark:border-amber-900/60 dark:bg-amber-950/20 sm:p-4"
          data-testid="focused-risk-context"
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  Provider access review
                </span>
                <span className={cn("text-xs font-semibold uppercase", qualityTone)}>
                  {candidateContext.candidateScore.quality} candidate · {candidateContext.candidateScore.score}/100
                </span>
              </div>
              <h2 className="mt-2 break-all font-mono text-sm font-semibold text-zinc-950 dark:text-zinc-50 sm:text-base">
                {focusedCandidate.node_address}
              </h2>
              <p className="mt-1 hidden text-sm text-zinc-700 dark:text-zinc-300 sm:block">
                This node is not bonded to the watched address yet. Confirm provider access before preparing any BOND transaction.
              </p>
            </div>
          </div>

          <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div
              className={cn("rounded-lg border p-2 sm:p-3", decisionToneClass)}
              data-testid="focused-risk-primary-action"
            >
              <div className="text-xs font-bold uppercase opacity-75">Next action</div>
              <div className="mt-1 text-base font-semibold">{riskDecision.label}</div>
              <p
                className="mt-1 text-xs font-semibold opacity-80"
                data-testid="focused-risk-inline-evidence"
              >
                {inlineSourceEvidence}
              </p>
              <p className="mt-1 text-sm opacity-85">{riskDecision.detail}</p>
            </div>
            <div className="order-first grid grid-cols-1 gap-2 sm:grid-cols-2 lg:order-none lg:w-48 lg:grid-cols-1">
              <a
                href={riskDecision.href}
                className={cn(
                  "inline-flex min-h-9 items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-semibold transition-colors",
                  primaryLinkClass
                )}
                data-testid="focused-risk-primary-link"
              >
                {riskDecision.linkLabel}
              </a>
              {showSecondaryExplorerLink ? (
                <a
                  href={explorerHref}
                  className={cn(
                    "inline-flex min-h-9 items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-semibold transition-colors",
                    secondaryLinkClass
                  )}
                >
                  Compare candidates
                </a>
              ) : null}
            </div>
          </div>

          <CandidateScoreEvidence
            candidate={candidateScoreEvidence}
            className="mt-2 rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40"
            testId="focused-risk-score-evidence"
          />

          <details className="mt-2" data-testid="focused-risk-metric-details">
            <summary className="cursor-pointer rounded-lg border border-amber-200/70 bg-white/70 px-3 py-1.5 text-sm font-semibold leading-snug text-zinc-800 transition-colors hover:bg-white dark:border-amber-900/50 dark:bg-zinc-950/40 dark:text-zinc-100 dark:hover:bg-zinc-950">
              <span>Operational details</span>
              <span className="mt-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {metricSummary}
              </span>
            </summary>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="focused-risk-candidate-metrics">
              <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40">
                <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Adjusted APY</div>
                <div className="mt-1 font-mono font-semibold text-zinc-950 dark:text-zinc-50">
                  {formatRiskPercent(candidateContext.adjustedAPY)}
                </div>
              </div>
              <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40">
                <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Slash points</div>
                <div className={cn(
                  "mt-1 font-mono font-semibold",
                  isUsableRiskMetric(focusedCandidate.slash_points)
                    ? focusedCandidate.slash_points > 0 ? qualityTone : 'text-emerald-700 dark:text-emerald-300'
                    : 'text-zinc-600 dark:text-zinc-400'
                )}>
                  {formatRiskNumber(focusedCandidate.slash_points)}
                </div>
              </div>
              <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40">
                <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Operator fee</div>
                <div className="mt-1 font-mono font-semibold text-zinc-950 dark:text-zinc-50">
                  {isUsableRiskMetric(candidateContext.operatorFee) ? formatBasisPoints(candidateContext.operatorFee) : '--'}
                </div>
              </div>
              <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40">
                <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Total bond</div>
                <div className="mt-1 font-mono font-semibold text-zinc-950 dark:text-zinc-50">
                  {formatRiskRune(candidateContext.totalBond)}
                </div>
              </div>
              <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40">
                <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Status</div>
                <div className="mt-1 font-semibold text-zinc-950 dark:text-zinc-50">{focusedCandidate.status}</div>
              </div>
              <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40">
                <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Capacity trust</div>
                <div className="mt-1 font-semibold text-zinc-950 dark:text-zinc-50">
                  {candidateContext.candidateScore.trustLabel}
                </div>
              </div>
              <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 sm:col-span-2 dark:border-amber-900/50 dark:bg-zinc-950/40">
                <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Evidence</div>
                <div className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {candidateContext.candidateScore.reasons.join(', ')}
                </div>
              </div>
            </div>
          </details>
        </section>
      );
  }

  if (focusedContext.kind === 'missing') {
    return (
      <section
        aria-label="Focused node risk context"
        className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"
        data-testid="focused-risk-context"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              Focused node not in this address
            </div>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              The focused node is <span className="font-mono">{formatNodeAddress(focusedContext.nodeAddress)}</span>, but it is not in the loaded bond positions for this dashboard address.
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Treat this as candidate or stale-alert context until the node appears in the watched address positions.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const { position: focusedPosition, severity } = focusedContext;
  const statusTone = focusedPosition.isJailed || severity >= NETWORK.NODE_SEVERITY_SCORES.highRisk
    ? 'text-red-700 dark:text-red-300'
    : focusedPosition.slashPoints > 0
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-emerald-700 dark:text-emerald-300';
  const flags = focusedPosition.yieldGuardFlags ?? [];
  const flagLabels = flags.map((flag) => YIELD_GUARD_CONFIG[flag].label);
  const decision = getFocusedBondedRiskDecision(focusedPosition, severity);
  const decisionToneClass = decision.tone === 'critical'
    ? 'border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-100'
    : decision.tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100'
      : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100';
  const primaryButtonClass = decision.tone === 'critical'
    ? 'border-red-300 bg-white text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-zinc-950 dark:text-red-100 dark:hover:bg-red-950'
    : decision.tone === 'warning'
      ? 'border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-zinc-950 dark:text-amber-100 dark:hover:bg-amber-950'
      : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400';
  const metricSummary = [
    focusedPosition.status,
    `Slash ${formatRiskNumber(focusedPosition.slashPoints)}`,
    `Flags ${flagLabels.length > 0 ? flagLabels.join(', ') : 'None'}`,
  ].join(' · ');
  const inlineEvidence = [
    `status ${focusedPosition.status}`,
    focusedPosition.isJailed ? 'jailed' : null,
    `slash ${formatRiskNumber(focusedPosition.slashPoints)}`,
    flagLabels.length > 0 ? `flags ${flagLabels.join(', ')}` : 'no risk flags',
  ].filter(Boolean).join(' · ');

  return (
    <section
      aria-label="Focused node risk context"
      className="rounded-xl border border-amber-200 bg-amber-50/70 p-2 dark:border-amber-900/60 dark:bg-amber-950/20 sm:p-4"
      data-testid="focused-risk-context"
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              Alert context
            </span>
            <span className={cn("text-xs font-semibold uppercase", statusTone)}>
              {focusedPosition.isJailed ? 'Jailed node' : focusedPosition.slashPoints > 0 ? 'Slash context' : 'Node context'}
            </span>
          </div>
          <h2 className="mt-2 font-mono text-sm font-semibold text-zinc-950 dark:text-zinc-50 sm:text-base">
            {focusedPosition.nodeAddress}
          </h2>
          <p className="mt-1 hidden text-sm text-zinc-700 dark:text-zinc-300 sm:block">
            Heimdall matched the alert to this bonded node. Review slash, jail, churn, and unbond context before acting.
          </p>
        </div>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div
          className={cn("rounded-lg border p-2 sm:p-3", decisionToneClass)}
          data-testid="focused-bonded-primary-action"
        >
          <div className="text-xs font-bold uppercase opacity-75">Next action</div>
          <div className="mt-1 text-base font-semibold">{decision.label}</div>
          <p
            className="mt-1 text-xs font-semibold opacity-80"
            data-testid="focused-bonded-inline-evidence"
          >
            THORNode: {inlineEvidence}. Midgard: block height feeds jail and churn timing.
          </p>
          <p className="mt-1 text-sm opacity-85">{decision.detail}</p>
        </div>
        <div className="order-first grid grid-cols-1 gap-2 sm:grid-cols-2 lg:order-none lg:w-48 lg:grid-cols-1">
          <button
            type="button"
            onClick={onReviewDetails}
            className={cn(
              "inline-flex min-h-9 items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-semibold transition-colors",
              primaryButtonClass
            )}
            data-testid="focused-bonded-primary-button"
          >
            {detailsVisible ? 'Hide risk details' : decision.label}
          </button>
          <a
            href={`#${getRiskNodeElementId(focusedPosition.nodeAddress)}`}
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Jump to highlighted row
          </a>
        </div>
      </div>

      <details className="mt-2" data-testid="focused-bonded-metric-details">
        <summary className="cursor-pointer rounded-lg border border-amber-200/70 bg-white/70 px-3 py-1.5 text-sm font-semibold leading-snug text-zinc-800 transition-colors hover:bg-white dark:border-amber-900/50 dark:bg-zinc-950/40 dark:text-zinc-100 dark:hover:bg-zinc-950">
          <span>Operational details</span>
          <span className="mt-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {metricSummary}
          </span>
        </summary>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="focused-bonded-metrics">
          <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40">
            <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Status</div>
            <div className={cn("mt-1 font-semibold", statusTone)}>{focusedPosition.status}</div>
          </div>
          <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40">
            <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Slash points</div>
            <div className={cn("mt-1 font-mono font-semibold", focusedPosition.slashPoints > 0 ? statusTone : null)}>
              {focusedPosition.slashPoints}
            </div>
          </div>
          <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40">
            <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Your bond</div>
            <div className="mt-1 font-mono font-semibold text-zinc-950 dark:text-zinc-50">
              {formatRuneValue(focusedPosition.bondAmount)}
            </div>
          </div>
          <div className="rounded-lg border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-zinc-950/40">
            <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Flags</div>
            <div className="mt-1 font-semibold text-zinc-950 dark:text-zinc-50">
              {flagLabels.length > 0 ? flagLabels.join(', ') : 'None'}
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}

function RiskKPIs({ positions }: { positions: BondPosition[] }) {
  const { currentBlockHeight } = useCurrentBlockHeight();
  const summary = summarizeRiskPositions(positions);
  const nextChurnEstimate = currentBlockHeight ? estimateNextChurn(currentBlockHeight) : null;
  const churnDays = nextChurnEstimate ? Math.floor(nextChurnEstimate.estimatedSeconds / 86400) : null;

  const pills = [
    { icon: <Zap className="w-4 h-4" />, value: summary.activeCount, label: 'Earning', color: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400', sub: summary.standbyCount > 0 ? `${summary.standbyCount} standby` : null },
    { icon: <AlertTriangle className="w-4 h-4" />, value: summary.slashNodeCount, label: 'Slash review', color: summary.highSlashReviewCount > 0 ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' : summary.elevatedSlashReviewCount > 0 ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400', sub: summary.highSlashReviewCount > 0 ? `${summary.highSlashReviewCount} high` : summary.elevatedSlashReviewCount > 0 ? `${summary.elevatedSlashReviewCount} watch` : null },
    { icon: <Lock className="w-4 h-4" />, value: summary.jailedCount, label: 'Jailed', color: summary.jailedCount > 0 ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400', sub: null },
    { icon: <Hourglass className="w-4 h-4" />, value: churnDays !== null ? churnDays + 'd' : '--', label: 'Churn', color: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400', sub: null },
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

function getPendulumPresentation(level: IncentivePendulumLevel) {
  switch (level) {
    case 'well-secured':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        color: 'text-emerald-600 dark:text-emerald-400',
        icon: <TrendingUp className="w-4 h-4" />,
      };
    case 'healthy':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        color: 'text-emerald-600 dark:text-emerald-400',
        icon: <Minus className="w-4 h-4" />,
      };
    case 'building':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        color: 'text-amber-600 dark:text-amber-400',
        icon: <TrendingDown className="w-4 h-4" />,
      };
    case 'under-secured':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        color: 'text-red-600 dark:text-red-400',
        icon: <TrendingDown className="w-4 h-4" />,
      };
  }
}

function IncentivePendulum() {
  const { data: network } = useNetworkMetrics();
  
  const totalActiveRaw = network?.bondMetrics?.totalActiveBond || '0';
  const totalStandbyRaw = network?.bondMetrics?.totalStandbyBond || '0';
  const totalLiquidityRaw = network?.totalPooledRune || '0';
  const totalBonds = runeToNumber(totalActiveRaw) + runeToNumber(totalStandbyRaw);
  const totalLiquidity = runeToNumber(totalLiquidityRaw);
  const pendulum = getIncentivePendulumModel({ totalBonds, totalLiquidity });
  const pendulumPresentation = getPendulumPresentation(pendulum.level);

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

      <div className={cn("p-4", pendulumPresentation.bg)}>
        <div className="flex items-center gap-2">
          {pendulumPresentation.icon}
          <span className={cn("font-medium text-lg", pendulumPresentation.color)}>
            {pendulum.status}
          </span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {pendulum.description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-900/20 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="w-3 h-3 text-emerald-600" />
            <span className="text-xs text-emerald-700 dark:text-emerald-400">Nodes (Bond)</span>
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalBonds > 0 ? formatRuneCompact(totalBonds) : '--'}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">{pendulum.nodeShare.toFixed(0)}%</div>
        </div>
        <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-blue-700 dark:text-blue-400">LPs (Liquidity)</span>
          </div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalLiquidity > 0 ? formatRuneCompact(totalLiquidity) : '--'}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400">{pendulum.lpShare.toFixed(0)}%</div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-zinc-500">Bond-to-Pool Ratio</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{pendulum.bondToPoolRatio.toFixed(2)}x</span>
        </div>
        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all",
              pendulum.level === 'well-secured' || pendulum.level === 'healthy' ? 'bg-emerald-500' :
              pendulum.level === 'building' ? 'bg-amber-500' : 'bg-red-500'
            )}
            style={{ width: `${pendulum.progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
          <span>Target: {NETWORK.BOND_TO_POOL_THRESHOLDS.building}x - 3x</span>
          <span>Current: {pendulum.bondToPoolRatio.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
}

export default function RiskPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const focusedNodeAddress = searchParams.get('node');
  const { positions, isLoading: positionsLoading } = useBondPositions(address);
  const { data: allNodes, isLoading: allNodesLoading } = useAllNodes();
  const { data: network, isLoading: networkLoading } = useNetworkMetrics();
  const { constants: networkConstants } = useNetworkConstants();
  const apiHealth = useApiHealthContext();
  const sourceSafety = getCandidateBondSourceSafety(apiHealth.thornode);
  const [showDetails, setShowDetails] = useState(false);
  const maxBondProviders = networkConstants?.MaxBondProviders
    ? Number(networkConstants.MaxBondProviders)
    : null;

  if (positionsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Risk</h1>
        <DashboardLoadingSkeleton
          title="Loading risk analysis"
          detail="Waiting for THORNode bond positions before showing slash, jail, churn, or no-bond decisions."
          cards={4}
          className="p-0"
        />
      </div>
    );
  }

  const totalActiveBond = runeToNumber(network?.bondMetrics?.totalActiveBond || '0');
  const totalStandbyBond = runeToNumber(network?.bondMetrics?.totalStandbyBond || '0');
  const totalPooledRune = runeToNumber(network?.totalPooledRune || '0');
  const totalBonds = totalActiveBond + totalStandbyBond;
  const pendulum = getIncentivePendulumModel({
    totalBonds,
    totalLiquidity: totalPooledRune,
  });
  const bondToPoolRatio = pendulum.bondToPoolRatio;
  const activeBondToPoolRatio = totalPooledRune > 0 ? totalActiveBond / totalPooledRune : 0;
  const securityState = calculateNetworkSecurityState(bondToPoolRatio);
  const riskInsight = buildDashboardInsightState({
    address,
    positions,
    network,
    apiHealth,
    includeRunePriceSource: false,
  });

  const handleToggleDetails = () => {
    const willShowDetails = !showDetails;
    setShowDetails(willShowDetails);

    if (willShowDetails) {
      window.setTimeout(() => {
        const detailsPanel = document.getElementById('risk-details');
        if (detailsPanel && typeof detailsPanel.scrollIntoView === 'function') {
          detailsPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }, 0);
    }
  };
  const riskPrimaryAction = positions.length === 0 || riskInsight.actions.length > 0
    ? riskInsight.primaryAction
    : {
        label: showDetails ? 'Hide risk details' : 'Review risk details',
        href: '#risk-details',
        onClick: handleToggleDetails,
      };
  const visibleRiskActions = getNonFocusedRiskActions(riskInsight.actions, focusedNodeAddress).slice(0, 4);
  const showActionQueue = !focusedNodeAddress || visibleRiskActions.length > 0;
  const actionQueueTitle = focusedNodeAddress ? 'Other provider reviews' : 'Provider exposure review';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Risk</h1>
      <InsightHeader
        severity={riskInsight.severity}
        statusLabel={riskInsight.statusLabel}
        diagnosis={riskInsight.diagnosis}
        topRisk={riskInsight.topRisk}
        headingLevel={2}
        metrics={riskInsight.headerMetrics}
        primaryAction={riskPrimaryAction}
        eyebrow="Provider risk"
        compactMobileMetrics
      />
      <div id="risk-source-confidence" className="scroll-mt-24">
        <SourceFreshnessPanel sources={riskInsight.sources} compact />
      </div>
      {focusedNodeAddress ? (
        <FocusedNodeContext
          allNodes={allNodes ?? []}
          address={address}
          detailsVisible={showDetails}
          focusedNodeAddress={focusedNodeAddress}
          isLoading={positionsLoading || allNodesLoading}
          maxBondProviders={maxBondProviders}
          onReviewDetails={handleToggleDetails}
          positions={positions}
          sourceConfidenceHref="#risk-source-confidence"
          sourceSafety={sourceSafety}
        />
      ) : null}
      {showActionQueue ? (
        <ActionQueue
          items={visibleRiskActions}
          title={actionQueueTitle}
          emptyTitle="Risk queue is clear"
          emptyDetail="No jail, slash exposure, churn-risk, or source-confidence issue is visible now."
          compact
        />
      ) : null}

      <RiskSummaryBanner positions={positions} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RiskKPIs positions={positions} />
          <div className="mt-4">
            <IncentivePendulum />
          </div>
          <div className="mt-4">
            {networkLoading ? (
              <DashboardCard className="p-6">
                <div className="animate-pulse h-28 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              </DashboardCard>
            ) : (
              <NetworkSecurityCard
                ratio={bondToPoolRatio}
                activeRatio={activeBondToPoolRatio}
                health={securityState.securityHealth}
                status={securityState.solvencyStatus}
              />
            )}
          </div>
        </div>
        <DashboardCard className="lg:col-span-1 p-4 rounded-lg bg-white dark:bg-zinc-900">
          <h3 className="text-xs font-bold uppercase text-zinc-500 mb-2 font-serif italic">Shield Analysis</h3>
          {positions.length > 0 ? (
            <RiskRadar positions={positions} />
          ) : (
            <div className="h-[240px] flex items-center justify-center text-zinc-500 text-xs italic">
              Awaiting node signal...
            </div>
          )}
        </DashboardCard>
      </div>

      <NodesList positions={positions} focusedNodeAddress={focusedNodeAddress} />

      {showDetails && (
        <div id="risk-details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SlashMonitor positions={positions} />
          <ChurnOutRisk positions={positions} />
          <UnbondWindowTracker positions={positions} />
          <NetworkSecurityMetrics positions={positions} />
        </div>
        </div>
      )}
    </div>
  );
}
