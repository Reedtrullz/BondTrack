import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NodeRaw } from '@/lib/api/thornode';
import { formatRuneDisplayNumber } from '@/lib/utils/formatters';
import type { NodeCandidateScore } from '@/lib/dashboard/node-candidate-score';
import { getCandidateBondSourceSafety, type CandidateBondSourceSafety } from '@/lib/dashboard/candidate-bond-source-safety';
import { buildBondMemoHref, buildDashboardHref, buildNodeRiskHref } from '@/lib/dashboard/hrefs';
import { formatDashboardNumber, formatDashboardPercent, isUsableDashboardMetric } from '@/lib/dashboard/metrics';
import { CandidateScoreEvidence } from './candidate-score-evidence';

export type NodeExplorerCandidate = NodeRaw & {
  calculatedAPY: number;
  adjustedAPY: number;
  operatorFee: number;
  operatorFeePercent: number;
  totalBond: number;
  candidateScore: NodeCandidateScore;
};

interface NodeExplorerProps {
  focusedNodeAddress?: string | null;
  nodes: NodeExplorerCandidate[];
  sourceConfidenceHref?: string;
  sourceSafety?: CandidateBondSourceSafety;
  userAddress: string | null;
  positions: { nodeAddress: string }[];
}

export function getExplorerNodeElementId(nodeAddress: string): string {
  return `explorer-node-${nodeAddress}`;
}

type CandidateRecommendation = {
  title: string;
  detail: string;
  tone: 'healthy' | 'warning' | 'critical';
};

function getCandidateRecommendation(
  node: NodeExplorerCandidate,
  sourceSafety: CandidateBondSourceSafety
): CandidateRecommendation {
  const primaryReason = node.candidateScore.reasons[0] ?? 'candidate evidence needs review';

  if (node.candidateScore.quality === 'Avoid') {
    return {
      title: 'Avoid direct bond',
      detail: `${primaryReason}. Review risk context before opening BOND memo review.`,
      tone: 'critical',
    };
  }

  if (node.candidateScore.capacityTrust !== 'available') {
    return {
      title: 'Confirm provider access first',
      detail: node.candidateScore.capacityTrust === 'needs_whitelist'
        ? 'The watched address is not listed as a THORNode bond provider. Ask the operator to add or confirm provider access before opening BOND memo review.'
        : 'Direct-bond access is not confirmed for this address. Inspect risk context before opening BOND memo review.',
      tone: 'warning',
    };
  }

  if (node.candidateScore.quality === 'Watch') {
    return {
      title: 'Review before bonding',
      detail: `${primaryReason}. Confirm the trade-off before opening BOND memo review.`,
      tone: 'warning',
    };
  }

  if (!sourceSafety.canPrepareBond) {
    return {
      title: sourceSafety.title,
      detail: sourceSafety.detail,
      tone: 'warning',
    };
  }

  return {
    title: 'Review before BOND memo',
    detail: 'Candidate evidence and THORNode-listed provider access support reviewing a BOND memo, but this is not a safety guarantee. Reconfirm risk evidence and the wallet preview before signing.',
    tone: 'healthy',
  };
}

function isUsableCandidateNumber(value: number): boolean {
  return isUsableDashboardMetric(value);
}

function formatCandidateRune(value: number): string {
  return isUsableCandidateNumber(value) ? `ᚱ${formatRuneDisplayNumber(value)}` : '--';
}

function formatCandidatePercent(value: number): string {
  return formatDashboardPercent(value);
}

function formatCandidateNumber(value: number): string {
  return formatDashboardNumber(value);
}

function getApyTone(adjustedAPY: number): string {
  if (!isUsableCandidateNumber(adjustedAPY)) return 'text-zinc-600 dark:text-zinc-400';
  if (adjustedAPY > 70) return 'text-emerald-600 dark:text-emerald-400';
  if (adjustedAPY > 50) return 'text-blue-600 dark:text-blue-400';
  if (adjustedAPY > 30) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getSlashTone(slashPoints: number): string {
  if (!isUsableCandidateNumber(slashPoints)) return 'text-zinc-600 dark:text-zinc-400';
  if (slashPoints === 0) return 'text-emerald-600 dark:text-emerald-400';
  if (slashPoints < 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

const DEFAULT_SOURCE_SAFETY = getCandidateBondSourceSafety('unknown');

export function NodeExplorer({
  focusedNodeAddress,
  nodes,
  sourceConfidenceHref = '#source-confidence',
  sourceSafety = DEFAULT_SOURCE_SAFETY,
  userAddress,
  positions,
}: NodeExplorerProps) {
  const isNodeBonded = (nodeAddress: string) => {
    return positions.some(p => p.nodeAddress === nodeAddress);
  };

  const validApyValues = nodes
    .map((node) => node.adjustedAPY)
    .filter(isUsableCandidateNumber);
  const averageApy = validApyValues.length > 0
    ? validApyValues.reduce((sum, value) => sum + value, 0) / validApyValues.length
    : null;

  return (
    <div className="space-y-4">
      {nodes.length === 0 && (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No nodes match your filters. Try adjusting the fee filter.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {nodes.map((node) => {
          const bonded = isNodeBonded(node.node_address);
          const isFocused = focusedNodeAddress === node.node_address;
          const isAvoid = node.candidateScore.quality === 'Avoid';
          const hasProviderAccessIssue = node.candidateScore.capacityTrust !== 'available';
          const sourceBlockedForDirectBond = node.candidateScore.quality === 'Strong'
            && node.candidateScore.capacityTrust === 'available'
            && !sourceSafety.canPrepareBond;
          const canPrepareBond = node.candidateScore.quality === 'Strong'
            && node.candidateScore.capacityTrust === 'available'
            && sourceSafety.canPrepareBond;
          const reviewActionLabel = isAvoid || !hasProviderAccessIssue ? 'Review risk first' : 'Review provider access first';
          const reviewActionClass = isAvoid
            ? 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50'
            : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/50';
          const nodeDetailsHref = buildDashboardHref('/dashboard/nodes', {
            address: userAddress,
            params: { node: node.node_address },
          });
          const nodeRiskHref = buildNodeRiskHref(userAddress, node.node_address);
          const fallbackActionHref = sourceBlockedForDirectBond ? sourceConfidenceHref : nodeRiskHref;
          const fallbackActionLabel = sourceBlockedForDirectBond ? 'Review source checks' : reviewActionLabel;
          const recommendation = getCandidateRecommendation(node, sourceSafety);
          const RecommendationIcon = recommendation.tone === 'healthy' ? Info : AlertTriangle;
          const recommendationTone = recommendation.tone === 'healthy'
            ? 'border-sky-400 bg-sky-50 text-sky-950 dark:border-sky-500/70 dark:bg-sky-950/25 dark:text-sky-100'
            : recommendation.tone === 'warning'
              ? 'border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-500/70 dark:bg-amber-950/25 dark:text-amber-100'
              : 'border-red-400 bg-red-50 text-red-950 dark:border-red-500/70 dark:bg-red-950/25 dark:text-red-100';
          const riskSignals = node.candidateScore.reasons.slice(0, 3);
          const qualityTone = node.candidateScore.quality === 'Strong'
            ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200'
            : node.candidateScore.quality === 'Watch'
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
              : 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200';
          const bondActionClass = 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900';

          return (
            <div
              key={node.node_address}
              id={getExplorerNodeElementId(node.node_address)}
              className={cn(
                "scroll-mt-24 rounded-lg border border-zinc-200 bg-white p-4 transition-all duration-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900",
                isFocused && "border-amber-300 bg-amber-50/60 ring-2 ring-amber-400 dark:border-amber-800 dark:bg-amber-950/20 dark:ring-amber-500"
              )}
              data-testid="candidate-card"
              data-focused-node={isFocused ? 'true' : undefined}
              aria-label={`${isFocused ? 'Focused candidate' : 'Candidate'} node ${node.node_address}`}
            >
              {/* Header */}
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="max-w-full break-all font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {node.node_address.slice(0, 12)}...{node.node_address.slice(-4)}
                    </span>
                    <span className={cn('px-2 py-0.5 text-xs font-bold rounded-full', qualityTone)}>
                      {node.candidateScore.quality} candidate
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="min-w-0 break-all">Version: {node.version}</span>
                    {bonded && (
                      <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                        Bonded
                      </span>
                    )}
                    {isFocused ? (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 rounded-full">
                        Focused
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div
                className={cn('mb-4 rounded-md border-l-4 px-3 py-3', recommendationTone)}
                data-testid="candidate-recommendation"
                aria-label={`${recommendation.title}: ${recommendation.detail}`}
              >
                <div className="flex items-start gap-2">
                  <RecommendationIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{recommendation.title}</p>
                    <p className="mt-1 text-sm opacity-85">{recommendation.detail}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Candidate risk signals">
                  {riskSignals.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full bg-white/65 px-2 py-1 text-xs font-semibold dark:bg-black/20"
                      data-testid="candidate-risk-reason"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              <CandidateScoreEvidence
                candidate={node}
                className="mb-4 border-y border-zinc-200 py-3 dark:border-zinc-800"
              />

              {/* Stats */}
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div
                  className="min-w-0"
                  data-testid="candidate-apy"
                  aria-label={isUsableCandidateNumber(node.adjustedAPY)
                    ? `Adjusted APY ${node.adjustedAPY.toFixed(2)} percent`
                    : 'Adjusted APY unavailable'}
                >
                  <p className="text-xs text-zinc-500">Adj. APY</p>
                  <p className={cn("break-words font-mono text-zinc-900 dark:text-zinc-100", getApyTone(node.adjustedAPY))}>
                    {formatCandidatePercent(node.adjustedAPY)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Total Bond</p>
                  <p className="break-words font-mono text-zinc-900 dark:text-zinc-100">
                    {formatCandidateRune(node.totalBond)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Operator Fee</p>
                  <p className="break-words font-mono text-zinc-900 dark:text-zinc-100">
                    {formatCandidatePercent(node.operatorFeePercent * 100)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Slash Points</p>
                  <p className={cn("break-words font-mono", getSlashTone(node.slash_points))}>
                    {formatCandidateNumber(node.slash_points)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Status</p>
                  <div className="flex min-w-0 items-center gap-1">
                    {node.status === 'Active' ? (
                      <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                    ) : node.status === 'Standby' ? (
                      <AlertTriangle className="h-3 w-3 shrink-0 text-yellow-500" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
                    )}
                    <span className="min-w-0 break-words text-zinc-900 dark:text-zinc-100">{node.status}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Capacity Trust</p>
                  <p className="break-words text-zinc-900 dark:text-zinc-100">
                    {node.candidateScore.trustLabel}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800 sm:grid-cols-[minmax(0,1fr)_auto]">
                {canPrepareBond ? (
                  <Link
                    href={buildBondMemoHref(userAddress, node.node_address, 'bond')}
                    className={cn('inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-sm font-semibold transition', bondActionClass)}
                  >
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    Review BOND Memo
                  </Link>
                ) : (
                  <Link
                    href={fallbackActionHref}
                    className={cn("inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-sm font-semibold transition", reviewActionClass)}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {fallbackActionLabel}
                  </Link>
                )}
                <Link
                  href={nodeDetailsHref}
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Details
                  <ArrowRight className="h-3 w-3 shrink-0" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        {nodes.length > 0 ? (
          <>
            Showing {nodes.length} nodes
            {averageApy !== null ? (
              <>
                {' '}with average APY of{' '}
                <span className="font-mono font-medium">
                  {formatCandidatePercent(averageApy)}
                </span>
              </>
            ) : (
              ' with average APY unavailable from current source data.'
            )}
          </>
        ) : (
          'No average APY shown because the current filters returned no candidates.'
        )}
      </div>
    </div>
  );
}
