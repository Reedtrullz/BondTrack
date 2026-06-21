import type { NodeRaw } from '@/lib/api/thornode';
import type { NodeExplorerCandidate } from '@/components/dashboard/node-explorer';
import { runeToNumber } from '@/lib/utils/formatters';
import { getDirectBondAccessTrust, scoreNodeCandidate } from './node-candidate-score';
import { getCandidateBondSourceSafety, type CandidateBondSourceSafety } from './candidate-bond-source-safety';
import {
  sortNodeCandidates,
  type NodeCandidateSortField,
  type NodeCandidateSortOrder,
} from './node-candidate-sort';
import type { InsightHeaderMetric, InsightSeverity } from './insights';

export type ExplorerFeeFilter = 'all' | 'low' | 'medium' | 'high';
export type ExplorerDecisionAction = 'prepare-bond' | 'review-source' | 'review-risk' | 'review-access' | 'show-all-fees' | 'review-candidates';

export interface ExplorerDecisionModel {
  action: ExplorerDecisionAction;
  candidate?: NodeExplorerCandidate;
  diagnosis: string;
  metrics: InsightHeaderMetric[];
  severity: InsightSeverity;
  statusLabel: string;
  topRisk: string;
}

export interface ExplorerPageModel {
  decision: ExplorerDecisionModel;
  directBondCount: number;
  focusedCandidate: NodeExplorerCandidate | undefined;
  isFocusedCandidateVisible: boolean;
  nodesWithAPY: NodeExplorerCandidate[];
  qualityCounts: Record<'Strong' | 'Watch' | 'Avoid', number>;
  sortedNodes: NodeExplorerCandidate[];
}

export interface BuildExplorerPageModelInput {
  address?: string | null;
  allNodes?: NodeRaw[] | null;
  feeFilter: ExplorerFeeFilter;
  focusedNodeAddress?: string | null;
  maxBondProviders?: number | null;
  sourceSafety?: CandidateBondSourceSafety;
  sortField: NodeCandidateSortField;
  sortOrder: NodeCandidateSortOrder;
}

function buildNodeCandidate({
  address,
  maxBondProviders,
  node,
}: {
  address?: string | null;
  maxBondProviders?: number | null;
  node: NodeRaw;
}): NodeExplorerCandidate {
  const totalBond = runeToNumber(node.total_bond);
  const award = runeToNumber(node.current_award || '0');
  const calculatedAPY = totalBond > 0 ? (award * 146) / totalBond * 100 : 0;
  const operatorFee = Number(node.bond_providers?.node_operator_fee || 0);
  const operatorFeePercent = operatorFee / 10000;
  const adjustedAPY = calculatedAPY * (1 - operatorFeePercent);
  const capacityTrust = getDirectBondAccessTrust({
    maxBondProviders,
    providers: node.bond_providers?.providers,
    userAddress: address,
  });
  const candidateScore = scoreNodeCandidate({
    adjustedAPY,
    totalBond,
    operatorFeePercent,
    slashPoints: node.slash_points,
    status: node.status,
    capacityTrust,
  });

  return {
    ...node,
    adjustedAPY,
    calculatedAPY,
    candidateScore,
    operatorFee,
    operatorFeePercent,
    totalBond,
  };
}

function matchesFeeFilter(node: NodeExplorerCandidate, feeFilter: ExplorerFeeFilter): boolean {
  if (feeFilter === 'all') return true;

  const feePercent = node.operatorFeePercent * 100;
  if (feeFilter === 'low') return feePercent < 10;
  if (feeFilter === 'medium') return feePercent >= 10 && feePercent <= 20;
  return feePercent > 20;
}

function countQuality(nodes: NodeExplorerCandidate[]): Record<'Strong' | 'Watch' | 'Avoid', number> {
  return nodes.reduce(
    (counts, node) => {
      counts[node.candidateScore.quality] += 1;
      return counts;
    },
    { Strong: 0, Watch: 0, Avoid: 0 }
  );
}

function formatCandidateAddress(node: NodeExplorerCandidate): string {
  return `${node.node_address.slice(0, 10)}...${node.node_address.slice(-4)}`;
}

function buildDecisionMetrics({
  directBondCount,
  qualityCounts,
  sortedNodes,
  sourceSafety,
  topCandidate,
}: {
  directBondCount: number;
  qualityCounts: Record<'Strong' | 'Watch' | 'Avoid', number>;
  sortedNodes: NodeExplorerCandidate[];
  sourceSafety: CandidateBondSourceSafety;
  topCandidate?: NodeExplorerCandidate;
}): InsightHeaderMetric[] {
  return [
    {
      label: 'Visible candidates',
      value: String(sortedNodes.length),
      detail: sortedNodes.length === 1 ? '1 active node shown' : `${sortedNodes.length} active nodes shown`,
    },
    {
      label: 'Direct bond',
      value: String(directBondCount),
      detail: directBondCount > 0
        ? sourceSafety.canPrepareBond ? 'Watched provider listed by THORNode' : 'THORNode source check required first'
        : 'No listed provider access',
    },
    {
      label: 'Top candidate',
      value: topCandidate ? topCandidate.candidateScore.quality : '--',
      detail: topCandidate
        ? `${topCandidate.candidateScore.trustLabel} · Strong ${qualityCounts.Strong} · Watch ${qualityCounts.Watch} · Avoid ${qualityCounts.Avoid}`
        : `Strong ${qualityCounts.Strong} · Watch ${qualityCounts.Watch} · Avoid ${qualityCounts.Avoid}`,
    },
  ];
}

function buildExplorerDecision({
  directBondCount,
  nodesWithAPY,
  qualityCounts,
  sortedNodes,
  sourceSafety,
}: {
  directBondCount: number;
  nodesWithAPY: NodeExplorerCandidate[];
  qualityCounts: Record<'Strong' | 'Watch' | 'Avoid', number>;
  sortedNodes: NodeExplorerCandidate[];
  sourceSafety: CandidateBondSourceSafety;
}): ExplorerDecisionModel {
  const directBondCandidate = sortedNodes.find((node) => (
    node.candidateScore.quality === 'Strong' && node.candidateScore.capacityTrust === 'available'
  ));
  const topCandidate = directBondCandidate ?? sortedNodes[0];
  const metrics = buildDecisionMetrics({
    directBondCount,
    qualityCounts,
    sortedNodes,
    sourceSafety,
    topCandidate,
  });

  if (sortedNodes.length === 0) {
    const activeCandidateCountLabel = `${nodesWithAPY.length} active candidate${nodesWithAPY.length === 1 ? '' : 's'}`;
    return {
      action: nodesWithAPY.length > 0 ? 'show-all-fees' : 'review-candidates',
      diagnosis: nodesWithAPY.length > 0
        ? `${activeCandidateCountLabel} ${nodesWithAPY.length === 1 ? 'exists' : 'exist'}, but the current filters hide ${nodesWithAPY.length === 1 ? 'it' : 'them'}. Show all fees before drawing a conclusion.`
        : 'THORNode returned no active candidates for this view. Treat discovery as unavailable until the source set refreshes.',
      metrics,
      severity: nodesWithAPY.length > 0 ? 'info' : 'warning',
      statusLabel: nodesWithAPY.length > 0 ? 'Filtered' : 'No candidates',
      topRisk: nodesWithAPY.length > 0 ? 'Filters hide every candidate' : 'No active candidates returned',
    };
  }

  if (!topCandidate) {
    return {
      action: 'review-candidates',
      diagnosis: 'No candidate can be ranked from the current source response.',
      metrics,
      severity: 'warning',
      statusLabel: 'No candidates',
      topRisk: 'Candidate evidence unavailable',
    };
  }

  const candidateLabel = formatCandidateAddress(topCandidate);
  const firstReason = topCandidate.candidateScore.reasons[0] ?? 'candidate evidence needs review';

  if (directBondCandidate && !sourceSafety.canPrepareBond) {
    return {
      action: 'review-source',
      candidate: directBondCandidate,
      diagnosis: `${candidateLabel} lists the watched address as a bond provider, but ${sourceSafety.detail}`,
      metrics,
      severity: sourceSafety.severity,
      statusLabel: sourceSafety.statusLabel,
      topRisk: 'Wait for THORNode source check before reviewing any BOND memo',
    };
  }

  if (directBondCandidate) {
    return {
      action: 'prepare-bond',
      candidate: directBondCandidate,
      diagnosis: `${candidateLabel} is the strongest visible candidate with the watched provider listed by THORNode, but this is not a safety guarantee. Reconfirm the wallet preview before signing any BOND transaction.`,
      metrics,
      severity: 'info',
      statusLabel: 'Candidate Review',
      topRisk: 'Strong candidate still needs wallet review',
    };
  }

  if (topCandidate.candidateScore.quality === 'Avoid') {
    return {
      action: 'review-risk',
      candidate: topCandidate,
      diagnosis: `The best visible candidate is still Avoid-rated because ${firstReason.toLowerCase()}. Review risk evidence before reviewing any BOND memo.`,
      metrics,
      severity: 'critical',
      statusLabel: 'Avoid',
      topRisk: 'No BOND candidate is review-ready',
    };
  }

  if (topCandidate.candidateScore.capacityTrust !== 'available') {
    return {
      action: 'review-access',
      candidate: topCandidate,
      diagnosis: `${candidateLabel} is the strongest visible candidate, but ${topCandidate.candidateScore.trustLabel.toLowerCase()}. Confirm provider access before reviewing any BOND memo.`,
      metrics,
      severity: 'warning',
      statusLabel: 'Review Access',
      topRisk: 'Provider access needs confirmation',
    };
  }

  return {
    action: 'review-risk',
    candidate: topCandidate,
    diagnosis: `${candidateLabel} is bondable but Watch-rated because ${firstReason.toLowerCase()}. Review risk context before deciding.`,
    metrics,
    severity: 'warning',
    statusLabel: 'Review',
    topRisk: 'Review candidate trade-offs first',
  };
}

export function buildExplorerPageModel({
  address,
  allNodes,
  feeFilter,
  focusedNodeAddress,
  maxBondProviders,
  sourceSafety = getCandidateBondSourceSafety('unknown'),
  sortField,
  sortOrder,
}: BuildExplorerPageModelInput): ExplorerPageModel {
  const nodesWithAPY = (allNodes ?? [])
    .filter((node) => node.status === 'Active')
    .map((node) => buildNodeCandidate({ address, maxBondProviders, node }));
  const feeFiltered = nodesWithAPY.filter((node) => matchesFeeFilter(node, feeFilter));
  const sortedNodes = sortNodeCandidates(feeFiltered, sortField, sortOrder);
  const focusedCandidate = focusedNodeAddress
    ? nodesWithAPY.find((node) => node.node_address === focusedNodeAddress)
    : undefined;
  const isFocusedCandidateVisible = focusedNodeAddress
    ? sortedNodes.some((node) => node.node_address === focusedNodeAddress)
    : false;
  const directBondCount = sortedNodes.filter((node) => (
    node.candidateScore.quality === 'Strong' && node.candidateScore.capacityTrust === 'available'
  )).length;
  const qualityCounts = countQuality(sortedNodes);

  return {
    decision: buildExplorerDecision({
      directBondCount,
      nodesWithAPY,
      qualityCounts,
      sortedNodes,
      sourceSafety,
    }),
    directBondCount,
    focusedCandidate,
    isFocusedCandidateVisible,
    nodesWithAPY,
    qualityCounts,
    sortedNodes,
  };
}
