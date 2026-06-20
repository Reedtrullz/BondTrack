'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { NodeStatusCard } from '@/components/dashboard/node-status-card';
import { NetworkComparisonTable } from '@/components/dashboard/network-comparison-table';
import { DashboardCard } from '@/components/shared/dashboard-card';
import { DashboardLoadingSkeleton } from '@/components/shared/dashboard-loading-skeleton';
import { ExportButton } from '@/components/shared/export-button';
import { ActionQueue } from '@/components/dashboard/action-queue';
import { DisclosureSection } from '@/components/dashboard/disclosure-section';
import { InsightHeader } from '@/components/dashboard/insight-header';
import { buildDashboardInsightState } from '@/lib/dashboard/insights';
import {
  buildNodesPageModel,
  getNodeReviewState,
  getNodeRowRiskClass,
  isUrgentNodeException,
  type NodeReviewStateSeverity,
  type NodesSortDirection,
  type NodesSortField,
} from '@/lib/dashboard/nodes-context';
import { getCandidateBondSourceSafety } from '@/lib/dashboard/candidate-bond-source-safety';
import { useApiHealthContext } from '@/lib/hooks/use-api-health';
import { formatRuneDisplayNumber, formatBasisPoints, formatPercent } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

function isUsableNodeMetric(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function formatNodeRune(value: number): string {
  return isUsableNodeMetric(value) ? formatRuneDisplayNumber(value) : '--';
}

function formatNodePercent(value: number): string {
  return isUsableNodeMetric(value) ? formatPercent(value) : '--';
}

function formatNodeNumber(value: number): string {
  return isUsableNodeMetric(value) ? value.toLocaleString() : '--';
}

const nodeReviewStateClass: Record<NodeReviewStateSeverity, string> = {
  critical: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
};

function SortHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
}: {
  label: string;
  field: NodesSortField;
  sortField: NodesSortField;
  sortDirection: NodesSortDirection;
  onSort: (field: NodesSortField) => void;
}) {
  const isActive = sortField === field;
  const Icon = isActive ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  const nextDirection = isActive && sortDirection === 'asc' ? 'descending' : 'ascending';

  return (
    <th
      aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="px-2 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400"
    >
      <button
        type="button"
        className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label={`Sort by ${label} ${nextDirection}`}
        onClick={() => onSort(field)}
      >
        <span className="whitespace-nowrap">{label}</span>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
    </th>
  );
}

export default function NodesPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);
  const apiHealth = useApiHealthContext();

  const [sortField, setSortField] = React.useState<NodesSortField>('riskScore');
  const [sortDirection, setSortDirection] = React.useState<NodesSortDirection>('desc');

  const handleSort = React.useCallback((field: NodesSortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  const nodesModel = React.useMemo(() => buildNodesPageModel({
    positions,
    sortDirection,
    sortField,
  }), [positions, sortDirection, sortField]);
  const { exceptionPositions, sortedPositions } = nodesModel;

  const nodeInsight = React.useMemo(() => buildDashboardInsightState({
    address,
    positions,
    apiHealth,
    network: null,
    includeRunePriceSource: false,
  }), [address, positions, apiHealth]);
  const bondSourceSafety = React.useMemo(
    () => getCandidateBondSourceSafety(apiHealth.thornode),
    [apiHealth.thornode]
  );

  if (isLoading) {
    return (
      <DashboardLoadingSkeleton
        title="Loading node positions"
        detail="Waiting for THORNode source responses before ranking node exceptions, slash points, and validator status."
        cards={3}
        className="p-0"
      />
    );
  }

  if (positions.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Nodes</h1>
        <InsightHeader
          severity={nodeInsight.severity}
          statusLabel={nodeInsight.statusLabel}
          diagnosis={nodeInsight.diagnosis}
          topRisk={nodeInsight.topRisk}
          headingLevel={2}
          metrics={nodeInsight.headerMetrics}
          primaryAction={nodeInsight.primaryAction}
          eyebrow="Node"
          compactMobileMetrics
        />
        <ActionQueue
          items={nodeInsight.actions.slice(0, 4)}
          title="Node exceptions"
          emptyTitle="No tracked node exceptions"
          emptyDetail="Current THORNode node data does not show bonded nodes for this address. Treat this as the current source result, not proof of address validity or past/pending bond activity."
          compact
        />
        <DashboardCard className="p-5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No bonded nodes tracked
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Confirm the provider address, review source checks, open BOND review, or use Node Discovery to inspect candidate nodes before committing capital.
          </p>
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Nodes</h1>
        <InsightHeader
          severity={nodeInsight.severity}
          statusLabel={nodeInsight.statusLabel}
          diagnosis={nodeInsight.diagnosis}
          topRisk={nodeInsight.topRisk}
          headingLevel={2}
          metrics={nodeInsight.headerMetrics}
          primaryAction={nodeInsight.primaryAction}
          eyebrow="Node"
          compactMobileMetrics
        />
        <ActionQueue
          items={nodeInsight.actions.slice(0, 4)}
          title="Node exceptions"
          emptyTitle="No urgent node exception visible"
          emptyDetail="Current THORNode node data does not show jail, elevated slash, churn-risk, or status exceptions. Routine metrics remain visible below."
          compact
        />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Provider review cards</h2>
          {positions.length > 0 && <ExportButton bondPositions={positions} />}
        </div>
        {exceptionPositions.length > 0 ? (
          <section aria-label="Provider node review cards" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exceptionPositions.map((pos) => (
              <NodeStatusCard key={pos.nodeAddress} position={pos} address={address} sourceSafety={bondSourceSafety} />
            ))}
          </section>
        ) : (
          <DashboardCard className="p-5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No provider review cards to show. Minor slash history and routine node metrics remain visible in the comparison table below.
            </p>
          </DashboardCard>
        )}
      </div>

      <DashboardCard>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">Node Comparison</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Sortable overview of all bonded nodes. Review state labels name the reason before the full row details.
            </p>
          </div>
        </div>
        <div
          className="max-w-full overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800"
          aria-label="Scrollable node comparison"
        >
          <table className="min-w-[62rem] divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950/60">
              <tr>
                <SortHeader label="Node Address" field="nodeAddress" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Status" field="status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Bond Amount" field="bondAmount" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="APY" field="netAPY" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Slash Points" field="slashPoints" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Operator Fee" field="operatorFee" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Review State" field="riskScore" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
              {sortedPositions.map((position) => {
                const reviewState = getNodeReviewState(position);

                return (
                  <tr
                    key={position.nodeAddress}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${getNodeRowRiskClass(position)}`}
                    data-urgent-exception={isUrgentNodeException(position) ? 'true' : 'false'}
                  >
                    <td className="px-4 py-3 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                      {position.nodeAddress.slice(0, 8)}...{position.nodeAddress.slice(-4)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {position.status}
                      {position.isJailed && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          Jailed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-zinc-900 dark:text-zinc-100">
                      {formatNodeRune(position.bondAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-zinc-900 dark:text-zinc-100">
                      {formatNodePercent(position.netAPY)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-zinc-900 dark:text-zinc-100">
                      {formatNodeNumber(position.slashPoints)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-zinc-900 dark:text-zinc-100">
                      {isUsableNodeMetric(position.operatorFee) ? formatBasisPoints(position.operatorFee) : '--'}
                    </td>
                    <td
                      aria-label={`${reviewState.label} ${reviewState.detail}`}
                      className="px-4 py-3 text-left text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <div className="flex min-w-44 flex-col items-start gap-1">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold',
                            nodeReviewStateClass[reviewState.severity]
                          )}
                        >
                          {reviewState.label}
                        </span>
                        <span className="max-w-52 text-xs leading-4 text-zinc-500 dark:text-zinc-400">
                          {reviewState.detail}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DisclosureSection
        title="All node cards"
        summary="Detailed per-node cards are collapsed because the exception queue above is the primary operator view."
      >
        <section aria-label="All node status cards" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {positions.map((pos) => (
            <NodeStatusCard key={pos.nodeAddress} position={pos} address={address} sourceSafety={bondSourceSafety} />
          ))}
        </section>
      </DisclosureSection>

      <NetworkComparisonTable address={address} />
    </div>
  );
}
