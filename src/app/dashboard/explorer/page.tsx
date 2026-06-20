'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useNetworkConstants } from '@/lib/hooks/use-network-constants';
import { useApiHealthContext } from '@/lib/hooks/use-api-health';
import { getExplorerNodeElementId, NodeExplorer, type NodeExplorerCandidate } from '@/components/dashboard/node-explorer';
import { CandidateScoreEvidence } from '@/components/dashboard/candidate-score-evidence';
import { InsightHeader } from '@/components/dashboard/insight-header';
import { SourceFreshnessPanel } from '@/components/dashboard/source-freshness-panel';
import { DashboardLoadingSkeleton } from '@/components/shared/dashboard-loading-skeleton';
import { buttonVariants } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, Filter, ArrowUpDown, Info } from 'lucide-react';
import {
  getCandidateSortLabel,
  getDefaultCandidateSortOrder,
  type NodeCandidateSortField,
  type NodeCandidateSortOrder,
} from '@/lib/dashboard/node-candidate-sort';
import { buildExplorerPageModel, type ExplorerDecisionAction, type ExplorerFeeFilter } from '@/lib/dashboard/explorer-context';
import { getCandidateBondSourceSafety, type CandidateBondSourceSafety } from '@/lib/dashboard/candidate-bond-source-safety';
import { buildSourceFreshness } from '@/lib/dashboard/insights';
import { formatBasisPoints, formatPercent, formatRuneDisplayNumber } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

const EXPLORER_SOURCE_CONFIDENCE_HREF = '#explorer-source-confidence';

function isUsableCandidateMetric(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function formatCandidateRune(value: number): string {
  return isUsableCandidateMetric(value) ? `ᚱ${formatRuneDisplayNumber(value)}` : '--';
}

function formatCandidatePercent(value: number): string {
  return isUsableCandidateMetric(value) ? formatPercent(value) : '--';
}

function formatCandidateNumber(value: number): string {
  return isUsableCandidateMetric(value) ? value.toLocaleString() : '--';
}

function buildExplorerHref(path: string, address: string | null, nodeAddress?: string) {
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

function buildBondPrepHref(address: string | null, nodeAddress?: string) {
  const params = new URLSearchParams();
  if (address) {
    params.set('address', address);
  }
  params.set('action', 'bond');
  if (nodeAddress) {
    params.set('node', nodeAddress);
  }

  return `/dashboard/transactions?${params.toString()}`;
}

function getDecisionActionLabel(action: ExplorerDecisionAction): string {
  switch (action) {
    case 'prepare-bond':
      return 'Review BOND memo';
    case 'review-source':
      return 'Review source checks';
    case 'review-access':
      return 'Review provider access';
    case 'review-risk':
      return 'Review risk evidence';
    case 'show-all-fees':
      return 'Show all fees';
    case 'review-candidates':
      return 'Review candidates';
  }
}

function getFocusedCandidateAction(
  candidate: NodeExplorerCandidate,
  address: string | null,
  sourceSafety: CandidateBondSourceSafety
) {
  if (candidate.candidateScore.quality === 'Strong' && candidate.candidateScore.capacityTrust === 'available') {
    if (!sourceSafety.canPrepareBond) {
      return {
        href: EXPLORER_SOURCE_CONFIDENCE_HREF,
        label: 'Review source checks',
        tone: 'review' as const,
      };
    }

    return {
      href: buildBondPrepHref(address, candidate.node_address),
      label: 'Review BOND memo',
      tone: 'review' as const,
    };
  }

  if (candidate.candidateScore.capacityTrust !== 'available') {
    return {
      href: buildExplorerHref('/dashboard/risk', address, candidate.node_address),
      label: 'Review provider access',
      tone: 'review' as const,
    };
  }

  return {
    href: buildExplorerHref('/dashboard/risk', address, candidate.node_address),
    label: 'Review risk evidence',
    tone: 'review' as const,
  };
}

function getFocusedCapacitySummary(candidate: NodeExplorerCandidate): string {
  switch (candidate.candidateScore.capacityTrust) {
    case 'available':
      return 'Provider listed by THORNode';
    case 'needs_whitelist':
      return 'Provider not listed by THORNode';
    case 'full':
      return 'Provider slots full';
    case 'unknown':
      return 'Capacity unknown';
  }
}

function FocusedCandidateSummary({
  address,
  candidate,
  isVisible,
  nodeAddress,
  onShowAllFees,
  sourceSafety,
}: {
  address: string | null;
  candidate: NodeExplorerCandidate | undefined;
  isVisible: boolean;
  nodeAddress: string;
  onShowAllFees: () => void;
  sourceSafety: CandidateBondSourceSafety;
}) {
  if (!candidate) {
    return (
      <section
        aria-label="Focused candidate context"
        className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100"
        data-testid="focused-candidate-context"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold">Focused node is not in the active candidate set</h2>
            <p className="mt-1 text-sm opacity-85">
              The requested node <span className="break-all font-mono">{nodeAddress}</span> is not visible in active THORNode candidates right now. It may be inactive, stale, or missing from the latest source response.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const qualityTone = candidate.candidateScore.quality === 'Avoid'
    ? 'border-red-200 bg-red-50/80 text-red-950 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-100'
    : candidate.candidateScore.quality === 'Watch'
      ? 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100'
      : 'border-sky-200 bg-sky-50/80 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-100';
  const focusedAction = getFocusedCandidateAction(candidate, address, sourceSafety);
  const directBondSourceBlocked = candidate.candidateScore.quality === 'Strong'
    && candidate.candidateScore.capacityTrust === 'available'
    && !sourceSafety.canPrepareBond;
  const primaryActionClass = 'border-current/30 bg-white/90 text-current hover:bg-white dark:bg-zinc-950/70 dark:hover:bg-zinc-900';
  const secondaryActionClass = 'border-current/25 bg-white/55 text-current hover:bg-white/80 dark:bg-zinc-950/40 dark:hover:bg-zinc-900';
  const metricSummary = [
    getFocusedCapacitySummary(candidate),
    `Slash ${formatCandidateNumber(candidate.slash_points)}`,
    `Fee ${isUsableCandidateMetric(candidate.operatorFee) ? formatBasisPoints(candidate.operatorFee) : '--'}`,
  ].join(' · ');

  return (
    <section
      aria-label="Focused candidate context"
      className={cn("mb-6 rounded-xl border p-3 sm:p-4", qualityTone)}
      data-testid="focused-candidate-context"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-white/65 px-2.5 py-1 text-xs font-bold uppercase dark:bg-black/20">
              Focused candidate
            </span>
            <span className="text-xs font-semibold uppercase">
              {candidate.candidateScore.quality} candidate
            </span>
          </div>
          <h2 className="mt-2 break-all font-mono text-sm font-semibold sm:text-base">
            {candidate.node_address}
          </h2>
          <p className="mt-1 text-sm opacity-85">
            This is the node selected from risk review. Compare the evidence below before reviewing any BOND memo.
          </p>
          {directBondSourceBlocked ? (
            <p className="mt-2 rounded-lg border border-current/20 bg-white/60 px-3 py-2 text-sm font-semibold dark:bg-black/20" data-testid="focused-candidate-source-warning">
              {sourceSafety.detail}
            </p>
          ) : null}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 lg:w-auto lg:grid-cols-1">
          {isVisible ? (
            <Link
              href={focusedAction.href}
              className={cn(
                'inline-flex min-h-9 w-full items-center justify-center rounded-md border px-2 py-2 text-center text-xs font-semibold transition-colors sm:px-3 sm:text-sm lg:w-auto',
                primaryActionClass
              )}
              data-testid="focused-candidate-primary-action"
            >
              {focusedAction.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onShowAllFees}
              className={cn(
                'inline-flex min-h-9 w-full items-center justify-center rounded-md border px-2 py-2 text-center text-xs font-semibold transition-colors sm:px-3 sm:text-sm lg:w-auto',
                primaryActionClass
              )}
              data-testid="focused-candidate-primary-action"
            >
              Show all fees
            </button>
          )}
          {isVisible ? (
            <a
              href={`#${getExplorerNodeElementId(candidate.node_address)}`}
              className={cn(
                'inline-flex min-h-9 w-full items-center justify-center rounded-md border px-2 py-2 text-center text-xs font-semibold transition-colors sm:px-3 sm:text-sm lg:w-auto',
                secondaryActionClass
              )}
            >
              Jump to card
            </a>
          ) : (
            <Link
              href={focusedAction.href}
              className={cn(
                'inline-flex min-h-9 w-full items-center justify-center rounded-md border px-2 py-2 text-center text-xs font-semibold transition-colors sm:px-3 sm:text-sm lg:w-auto',
                secondaryActionClass
              )}
            >
              {focusedAction.label}
            </Link>
          )}
        </div>
      </div>

      <CandidateScoreEvidence
        candidate={candidate}
        className="mt-3 rounded-lg border border-current/15 bg-white/65 p-3 dark:bg-black/20"
        testId="focused-candidate-score-evidence"
      />

      <details className="mt-2" data-testid="focused-candidate-metric-details">
        <summary className="cursor-pointer rounded-lg border border-current/15 bg-white/55 px-3 py-1.5 text-sm font-semibold leading-snug transition-colors hover:bg-white/75 dark:bg-black/15 dark:hover:bg-black/25">
          <span>Operational details</span>
          <span className="mt-1 block text-xs font-medium opacity-75">
            {metricSummary}
          </span>
        </summary>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" data-testid="focused-candidate-metrics">
          <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
            <div className="text-xs font-semibold uppercase opacity-70">Adjusted APY</div>
            <div className="mt-1 font-mono font-semibold">{formatCandidatePercent(candidate.adjustedAPY)}</div>
          </div>
          <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
            <div className="text-xs font-semibold uppercase opacity-70">Slash points</div>
            <div className="mt-1 font-mono font-semibold">{formatCandidateNumber(candidate.slash_points)}</div>
          </div>
          <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
            <div className="text-xs font-semibold uppercase opacity-70">Operator fee</div>
            <div className="mt-1 font-mono font-semibold">
              {isUsableCandidateMetric(candidate.operatorFee) ? formatBasisPoints(candidate.operatorFee) : '--'}
            </div>
          </div>
          <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
            <div className="text-xs font-semibold uppercase opacity-70">Total bond</div>
            <div className="mt-1 font-mono font-semibold">{formatCandidateRune(candidate.totalBond)}</div>
          </div>
          <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
            <div className="text-xs font-semibold uppercase opacity-70">Capacity</div>
            <div className="mt-1 font-semibold">{candidate.candidateScore.trustLabel}</div>
          </div>
          <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
            <div className="text-xs font-semibold uppercase opacity-70">Grid status</div>
            <div className="mt-1 font-semibold">{isVisible ? 'Highlighted' : 'Filtered out'}</div>
          </div>
        </div>
      </details>
    </section>
  );
}

export default function ExplorerPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const focusedNodeAddress = searchParams.get('node');

  const { data: allNodes, isLoading, error } = useAllNodes();
  const { positions } = useBondPositions(address);
  const { constants: networkConstants } = useNetworkConstants();
  const apiHealth = useApiHealthContext();
  const sourceSafety = useMemo(() => getCandidateBondSourceSafety(apiHealth.thornode), [apiHealth.thornode]);
  const explorerSources = useMemo(() => buildSourceFreshness(apiHealth, { includeRunePriceSource: false }), [apiHealth]);
  const maxBondProviders = networkConstants?.MaxBondProviders
    ? Number(networkConstants.MaxBondProviders)
    : null;

  const [feeFilter, setFeeFilter] = useState<ExplorerFeeFilter>('all');
  const [sortField, setSortField] = useState<NodeCandidateSortField>('quality');
  const [sortOrder, setSortOrder] = useState<NodeCandidateSortOrder>(getDefaultCandidateSortOrder('quality'));
  const explorerModel = useMemo(() => buildExplorerPageModel({
    address,
    allNodes,
    feeFilter,
    focusedNodeAddress,
    maxBondProviders,
    sourceSafety,
    sortField,
    sortOrder,
  }), [
    address,
    allNodes,
    feeFilter,
    focusedNodeAddress,
    maxBondProviders,
    sourceSafety,
    sortField,
    sortOrder,
  ]);
  const {
    decision,
    directBondCount,
    focusedCandidate,
    isFocusedCandidateVisible,
    qualityCounts,
    sortedNodes,
  } = explorerModel;
  const candidateCountLabel = `${sortedNodes.length} candidate${sortedNodes.length === 1 ? '' : 's'}`;
  const directBondIsActionable = directBondCount > 0 && sourceSafety.canPrepareBond;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={address ? `/dashboard/portfolio?address=${encodeURIComponent(address)}` : '/dashboard/portfolio'}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-2' })}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portfolio
          </Link>
        </div>
        <DashboardLoadingSkeleton
          title="Loading node discovery data"
          detail="Waiting for the active THORNode set before ranking candidates by slash history, operator fee, APY, and capacity trust."
          cards={6}
          className="p-0"
        />
      </div>
    );
  }

  if (error || !allNodes) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={address ? `/dashboard/portfolio?address=${encodeURIComponent(address)}` : '/dashboard/portfolio'}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-2' })}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portfolio
          </Link>
        </div>
        <div className="text-center py-12 text-zinc-500">
          Failed to load node data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={address ? `/dashboard/portfolio?address=${encodeURIComponent(address)}` : '/dashboard/portfolio'}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-2' })}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Node Discovery
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Rank bond candidates by quality, slash history, operator fee, and capacity trust
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Showing {candidateCountLabel}</span>
        </div>
      </div>

      <div id="explorer-source-confidence" className="mb-3 scroll-mt-24 sm:mb-6">
        <SourceFreshnessPanel
          ariaLabel="Discovery source checks"
          sources={explorerSources}
          compact
          title="Discovery source checks"
        />
      </div>

      {focusedNodeAddress ? (
        <FocusedCandidateSummary
          address={address}
          candidate={focusedCandidate}
          isVisible={isFocusedCandidateVisible}
          nodeAddress={focusedNodeAddress}
          onShowAllFees={() => setFeeFilter('all')}
          sourceSafety={sourceSafety}
        />
      ) : null}

      <InsightHeader
        severity={decision.severity}
        statusLabel={decision.statusLabel}
        diagnosis={decision.diagnosis}
        topRisk={decision.topRisk}
        headingLevel={2}
        metrics={decision.metrics}
        primaryAction={decision.action === 'prepare-bond'
          ? {
              label: getDecisionActionLabel(decision.action),
              href: buildBondPrepHref(address, decision.candidate?.node_address),
            }
          : decision.action === 'review-source'
            ? {
                label: getDecisionActionLabel(decision.action),
                href: EXPLORER_SOURCE_CONFIDENCE_HREF,
              }
          : decision.action === 'review-risk' || decision.action === 'review-access'
            ? {
                label: getDecisionActionLabel(decision.action),
                href: buildExplorerHref('/dashboard/risk', address, decision.candidate?.node_address),
              }
            : decision.action === 'show-all-fees'
              ? {
                  label: getDecisionActionLabel(decision.action),
                  href: '#explorer-candidates',
                  onClick: () => setFeeFilter('all'),
                }
              : {
                  label: getDecisionActionLabel(decision.action),
                  href: '#explorer-candidates',
                }}
        eyebrow="Discovery decision"
        compactMobileMetrics
        compactMetricDetailMode="all"
      />

      <section
        aria-label="Candidate quality summary"
        className={`mt-3 rounded-xl border p-2.5 sm:mt-6 sm:p-4 ${
          directBondIsActionable
            ? 'border-sky-200 bg-sky-50/70 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-100'
            : 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100'
        }`}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            {directBondIsActionable ? (
              <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            <div>
              <h2 className="text-sm font-bold">
                {directBondCount > 0
                  ? sourceSafety.canPrepareBond
                    ? `${directBondCount} direct-bond candidate${directBondCount === 1 ? '' : 's'} with watched-provider evidence`
                    : `${directBondCount} direct-bond candidate${directBondCount === 1 ? '' : 's'} waiting on THORNode source check`
                  : 'No direct-bond candidates with watched-provider evidence'}
              </h2>
              <p className="mt-1 text-sm opacity-85">
                {directBondCount > 0
                  ? sourceSafety.canPrepareBond
                    ? 'Only Strong candidates where THORNode lists the watched address as a bond provider can be reviewed in the transaction composer. Other nodes route through Risk review first.'
                    : sourceSafety.detail
                  : 'No visible node lists the watched address as a bond provider with low enough risk. Review operator access and risk evidence before reviewing any BOND memo.'}
              </p>
              <p className="mt-1 text-xs opacity-70">
                {maxBondProviders
                  ? `Provider-slot evidence uses THORNode MaxBondProviders (${maxBondProviders}).`
                  : 'Provider-slot evidence waits for THORNode constants; unlisted addresses stay in review.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold md:min-w-72">
            <div className="flex items-center justify-center gap-1 rounded-full bg-white/60 px-2 py-1 dark:bg-black/20 md:block md:rounded-lg md:px-3 md:py-2">
              <div className="font-bold md:text-lg">{qualityCounts.Strong}</div>
              <div>Strong</div>
            </div>
            <div className="flex items-center justify-center gap-1 rounded-full bg-white/60 px-2 py-1 dark:bg-black/20 md:block md:rounded-lg md:px-3 md:py-2">
              <div className="font-bold md:text-lg">{qualityCounts.Watch}</div>
              <div>Watch</div>
            </div>
            <div className="flex items-center justify-center gap-1 rounded-full bg-white/60 px-2 py-1 dark:bg-black/20 md:block md:rounded-lg md:px-3 md:py-2">
              <div className="font-bold md:text-lg">{qualityCounts.Avoid}</div>
              <div>Avoid</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Sorting */}
      <div className="my-3 flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900 sm:my-6 sm:gap-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filters:</span>
        </div>

        {/* Fee Filter */}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="text-xs text-zinc-500">Fee:</span>
          {(['all', 'low', 'medium', 'high'] as ExplorerFeeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setFeeFilter(filter)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors sm:px-3 sm:py-1.5 ${
                feeFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'low' ? '<10%' : filter === 'medium' ? '10-20%' : '>20%'}
            </button>
          ))}
        </div>

        <div
          className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap"
          data-testid="explorer-sort-controls"
        >
          <span className="text-xs text-zinc-500">Sort by:</span>
          {(['quality', 'apy', 'bond', 'slash', 'version'] as NodeCandidateSortField[]).map((field) => (
            <button
              key={field}
              onClick={() => {
                if (sortField === field) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField(field);
                  setSortOrder(getDefaultCandidateSortOrder(field));
                }
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors sm:px-3 sm:py-1.5 ${
                sortField === field
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {getCandidateSortLabel(field)}
              {sortField === field && (
                <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Node Cards */}
      <div id="explorer-candidates" className="scroll-mt-24">
        <NodeExplorer
          focusedNodeAddress={focusedNodeAddress}
          nodes={sortedNodes}
          sourceConfidenceHref={EXPLORER_SOURCE_CONFIDENCE_HREF}
          sourceSafety={sourceSafety}
          userAddress={address}
          positions={positions}
        />
      </div>
    </div>
  );
}
