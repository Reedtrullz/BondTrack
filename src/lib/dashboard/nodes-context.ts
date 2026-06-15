import { NETWORK } from '@/lib/config';
import type { BondPosition } from '@/lib/types/node';

export type NodesSortField = 'nodeAddress' | 'status' | 'bondAmount' | 'netAPY' | 'slashPoints' | 'operatorFee' | 'riskScore';
export type NodesSortDirection = 'asc' | 'desc';

export interface NodesPageModel {
  exceptionPositions: BondPosition[];
  sortedPositions: BondPosition[];
}

export interface BuildNodesPageModelInput {
  positions: BondPosition[];
  sortDirection: NodesSortDirection;
  sortField: NodesSortField;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function calculateNodeRiskScore(position: BondPosition): number {
  if (position.isJailed) return 100;
  return Math.min((finiteNonNegative(position.slashPoints) / NETWORK.SLASH_POINT_THRESHOLDS.critical) * 100, 100);
}

export function getNodeRowRiskClass(position: BondPosition): string {
  const slashPoints = finiteNonNegative(position.slashPoints);

  if (position.isJailed || slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical) {
    return 'bg-red-50 dark:bg-red-950/30';
  }
  if (slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning) {
    return 'bg-amber-50 dark:bg-amber-950/30';
  }
  return '';
}

export function isUrgentNodeException(position: BondPosition): boolean {
  const slashPoints = finiteNonNegative(position.slashPoints);
  const flags = position.yieldGuardFlags ?? [];
  const hasUrgentYieldFlag = flags.includes('lowest_bond') || flags.includes('leaving');

  return (
    position.isJailed ||
    position.status !== 'Active' ||
    slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning ||
    hasUrgentYieldFlag
  );
}

function getExceptionPriority(position: BondPosition): number {
  if (position.isJailed) return 500 + calculateNodeRiskScore(position);
  if (position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical) return 400 + calculateNodeRiskScore(position);
  if (position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning) return 300 + calculateNodeRiskScore(position);
  if (position.status !== 'Active') return 200 + calculateNodeRiskScore(position);
  if (isUrgentNodeException(position)) return 100 + calculateNodeRiskScore(position);
  return calculateNodeRiskScore(position);
}

function getSortValue(position: BondPosition, sortField: NodesSortField): number | string {
  switch (sortField) {
    case 'nodeAddress':
      return position.nodeAddress;
    case 'status':
      return position.status;
    case 'bondAmount':
      return finiteNonNegative(position.bondAmount);
    case 'netAPY':
      return finiteNonNegative(position.netAPY);
    case 'slashPoints':
      return finiteNonNegative(position.slashPoints);
    case 'operatorFee':
      return finiteNonNegative(position.operatorFee);
    case 'riskScore':
      return calculateNodeRiskScore(position);
  }
}

function compareValues(left: number | string, right: number | string): number {
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right);
  }

  if (left === right) return 0;
  return left > right ? 1 : -1;
}

function sortPositions(
  positions: BondPosition[],
  sortField: NodesSortField,
  sortDirection: NodesSortDirection
): BondPosition[] {
  return [...positions].sort((left, right) => {
    const comparison = compareValues(getSortValue(left, sortField), getSortValue(right, sortField));
    const directionalComparison = sortDirection === 'asc' ? comparison : -comparison;
    if (directionalComparison !== 0) return directionalComparison;
    return left.nodeAddress.localeCompare(right.nodeAddress);
  });
}

function sortExceptionPositions(positions: BondPosition[]): BondPosition[] {
  return positions
    .filter(isUrgentNodeException)
    .sort((left, right) => {
      const priorityDelta = getExceptionPriority(right) - getExceptionPriority(left);
      if (priorityDelta !== 0) return priorityDelta;
      const riskDelta = calculateNodeRiskScore(right) - calculateNodeRiskScore(left);
      if (riskDelta !== 0) return riskDelta;
      return left.nodeAddress.localeCompare(right.nodeAddress);
    });
}

export function buildNodesPageModel({
  positions,
  sortDirection,
  sortField,
}: BuildNodesPageModelInput): NodesPageModel {
  return {
    exceptionPositions: sortExceptionPositions(positions),
    sortedPositions: sortPositions(positions, sortField, sortDirection),
  };
}
