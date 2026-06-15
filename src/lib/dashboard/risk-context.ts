import type { NodeRaw } from '@/lib/api/thornode';
import type { BondPosition } from '@/lib/types/node';
import { NETWORK } from '@/lib/config';
import { runeToNumber } from '@/lib/utils/formatters';
import { calculatePortfolioHealth } from '@/lib/utils/health-score';
import { getDirectBondAccessTrust, scoreNodeCandidate, type NodeCandidateScore } from './node-candidate-score';

export interface CandidateRiskContext {
  adjustedAPY: number;
  candidateScore: NodeCandidateScore;
  operatorFee: number;
  totalBond: number;
}

export interface RiskPositionSummary {
  activeCount: number;
  atRiskCount: number;
  criticalSlashCount: number;
  healthScore: number;
  jailedCount: number;
  slashNodeCount: number;
  standbyCount: number;
  statusLabel: 'Healthy' | 'Needs Attention' | 'At Risk';
  totalBonded: number;
  warningSlashCount: number;
}

export type IncentivePendulumLevel = 'well-secured' | 'healthy' | 'building' | 'under-secured';

export interface IncentivePendulumModel {
  bondToPoolRatio: number;
  description: string;
  level: IncentivePendulumLevel;
  lpShare: number;
  nodeShare: number;
  progressPercent: number;
  status: 'Well Secured' | 'Healthy' | 'Building' | 'Under-secured';
}

export type FocusedNodeRiskContext =
  | { kind: 'none' }
  | {
      kind: 'bonded';
      elementId: string;
      position: BondPosition;
      severity: number;
    }
  | {
      kind: 'candidate';
      candidateContext: CandidateRiskContext;
      node: NodeRaw;
    }
  | {
      kind: 'missing';
      nodeAddress: string;
    };

export function getRiskNodeElementId(nodeAddress: string): string {
  return `risk-node-${nodeAddress}`;
}

export function getNodeSeverityScore(position: BondPosition): number {
  let score = 0;

  if (position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical) {
    score += NETWORK.NODE_SEVERITY_SCORES.criticalSlash;
  } else if (position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning) {
    score += NETWORK.NODE_SEVERITY_SCORES.warningSlash;
  } else if (position.slashPoints > 0) {
    score += NETWORK.NODE_SEVERITY_SCORES.minorSlash;
  }

  if (position.isJailed) score += NETWORK.NODE_SEVERITY_SCORES.jailed;
  if (position.yieldGuardFlags?.includes('lowest_bond')) score += NETWORK.NODE_SEVERITY_SCORES.highRisk;

  return score;
}

export function sortRiskPositions(positions: BondPosition[]): BondPosition[] {
  return [...positions].sort((left, right) => {
    const severityDiff = getNodeSeverityScore(right) - getNodeSeverityScore(left);
    if (severityDiff !== 0) return severityDiff;
    const slashDiff = right.slashPoints - left.slashPoints;
    if (slashDiff !== 0) return slashDiff;
    return right.bondAmount - left.bondAmount;
  });
}

export function summarizeRiskPositions(positions: BondPosition[]): RiskPositionSummary {
  const activeCount = positions.filter((position) => position.status === 'Active').length;
  const standbyCount = positions.filter((position) => position.status === 'Standby').length;
  const jailedCount = positions.filter((position) => position.isJailed).length;
  const atRiskCount = positions.filter((position) => (position.yieldGuardFlags?.length ?? 0) > 0).length;
  const slashNodeCount = positions.filter((position) => position.slashPoints > 0).length;
  const criticalSlashCount = positions.filter(
    (position) => position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical
  ).length;
  const warningSlashCount = positions.filter(
    (position) =>
      position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning &&
      position.slashPoints < NETWORK.SLASH_POINT_THRESHOLDS.critical
  ).length;
  const healthScore = calculatePortfolioHealth(positions).score;
  const hasCriticalSlash = criticalSlashCount > 0;
  const hasJailed = jailedCount > 0;
  const isHealthy =
    healthScore >= NETWORK.HEALTH_SCORE_THRESHOLDS.healthy &&
    !hasCriticalSlash &&
    !hasJailed;
  const statusLabel = isHealthy
    ? 'Healthy'
    : healthScore >= NETWORK.HEALTH_SCORE_THRESHOLDS.warning
      ? 'Needs Attention'
      : 'At Risk';

  return {
    activeCount,
    atRiskCount,
    criticalSlashCount,
    healthScore,
    jailedCount,
    slashNodeCount,
    standbyCount,
    statusLabel,
    totalBonded: positions.reduce((sum, position) => sum + position.bondAmount, 0),
    warningSlashCount,
  };
}

export function getIncentivePendulumModel({
  totalBonds,
  totalLiquidity,
}: {
  totalBonds: number;
  totalLiquidity: number;
}): IncentivePendulumModel {
  const safeTotalBonds = Number.isFinite(totalBonds) && totalBonds > 0 ? totalBonds : 0;
  const safeTotalLiquidity = Number.isFinite(totalLiquidity) && totalLiquidity > 0 ? totalLiquidity : 0;
  const bondToPoolRatio = safeTotalLiquidity > 0 ? safeTotalBonds / safeTotalLiquidity : 0;
  const nodeShareFraction = bondToPoolRatio > NETWORK.BOND_TO_POOL_THRESHOLDS.underSecured
    ? 1 - 1 / (bondToPoolRatio + 1)
    : bondToPoolRatio / (bondToPoolRatio + 1);
  const nodeShare = nodeShareFraction * 100;
  const lpShare = 100 - nodeShare;
  const progressPercent = Math.min(bondToPoolRatio * NETWORK.PROGRESS_BAR_MULTIPLIER, 100);

  if (bondToPoolRatio > NETWORK.BOND_TO_POOL_THRESHOLDS.healthy) {
    return {
      bondToPoolRatio,
      description: 'Bond exceeds 2.5x liquidity. Node rewards maximized, LP yields reduced.',
      level: 'well-secured',
      lpShare,
      nodeShare,
      progressPercent,
      status: 'Well Secured',
    };
  }

  if (bondToPoolRatio >= NETWORK.BOND_TO_POOL_THRESHOLDS.building) {
    return {
      bondToPoolRatio,
      description: 'Bond 1.5-2x liquidity. Balanced reward distribution.',
      level: 'healthy',
      lpShare,
      nodeShare,
      progressPercent,
      status: 'Healthy',
    };
  }

  if (bondToPoolRatio >= NETWORK.BOND_TO_POOL_THRESHOLDS.underSecured) {
    return {
      bondToPoolRatio,
      description: 'Bond > liquidity but below target. More bonding needed for full security.',
      level: 'building',
      lpShare,
      nodeShare,
      progressPercent,
      status: 'Building',
    };
  }

  return {
    bondToPoolRatio,
    description: 'Liquidity exceeds bond. Network shifts rewards to nodes to encourage bonding.',
    level: 'under-secured',
    lpShare,
    nodeShare,
    progressPercent,
    status: 'Under-secured',
  };
}

export function buildCandidateRiskContext(
  node: NodeRaw,
  userAddress: string | null,
  maxBondProviders: number | null
): CandidateRiskContext {
  const totalBond = runeToNumber(node.total_bond);
  const award = runeToNumber(node.current_award || '0');
  const apy = totalBond > 0 ? (award * 146) / totalBond * 100 : 0;
  const operatorFee = Number(node.bond_providers?.node_operator_fee || 0);
  const operatorFeePercent = operatorFee / 10000;
  const adjustedAPY = apy * (1 - operatorFeePercent);
  const capacityTrust = getDirectBondAccessTrust({
    maxBondProviders,
    providers: node.bond_providers?.providers,
    userAddress,
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
    adjustedAPY,
    candidateScore,
    operatorFee,
    totalBond,
  };
}

export function resolveFocusedNodeRiskContext({
  allNodes,
  focusedNodeAddress,
  maxBondProviders,
  positions,
  userAddress,
}: {
  allNodes: NodeRaw[];
  focusedNodeAddress: string | null;
  maxBondProviders: number | null;
  positions: BondPosition[];
  userAddress: string | null;
}): FocusedNodeRiskContext {
  if (!focusedNodeAddress) return { kind: 'none' };

  const focusedPosition = positions.find((position) => position.nodeAddress === focusedNodeAddress);
  if (focusedPosition) {
    return {
      kind: 'bonded',
      elementId: getRiskNodeElementId(focusedPosition.nodeAddress),
      position: focusedPosition,
      severity: getNodeSeverityScore(focusedPosition),
    };
  }

  const focusedCandidate = allNodes.find((node) => node.node_address === focusedNodeAddress);
  if (focusedCandidate) {
    return {
      kind: 'candidate',
      candidateContext: buildCandidateRiskContext(focusedCandidate, userAddress, maxBondProviders),
      node: focusedCandidate,
    };
  }

  return {
    kind: 'missing',
    nodeAddress: focusedNodeAddress,
  };
}
