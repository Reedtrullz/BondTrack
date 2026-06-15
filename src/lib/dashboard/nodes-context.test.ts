import { describe, expect, it } from 'vitest';
import { NETWORK } from '@/lib/config';
import type { BondPosition } from '@/lib/types/node';
import {
  buildNodesPageModel,
  calculateNodeRiskScore,
  getNodeRowRiskClass,
  isUrgentNodeException,
  type NodesSortField,
} from './nodes-context';

function position(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    bondAmount: 10_000,
    bondSharePercent: 100,
    isJailed: false,
    jailReleaseHeight: 0,
    netAPY: 12,
    nodeAddress: 'thor1clean0000000000000000000000000000000000',
    nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
    operatorFee: 1000,
    operatorFeeFormatted: '10.0%',
    requestedToLeave: false,
    slashPoints: 0,
    status: 'Active',
    totalBond: 10_000,
    version: '3.19.0',
    yieldGuardFlags: [],
    ...overrides,
  };
}

describe('calculateNodeRiskScore', () => {
  it('treats jailed nodes as maximum risk and clamps slash risk at the critical threshold', () => {
    expect(calculateNodeRiskScore(position({ isJailed: true, slashPoints: 0 }))).toBe(100);
    expect(calculateNodeRiskScore(position({ slashPoints: NETWORK.SLASH_POINT_THRESHOLDS.critical * 2 }))).toBe(100);
    expect(calculateNodeRiskScore(position({ slashPoints: 0 }))).toBe(0);
  });

  it('treats malformed slash points as unknown low risk instead of returning NaN', () => {
    expect(calculateNodeRiskScore(position({ slashPoints: Number.NaN }))).toBe(0);
    expect(calculateNodeRiskScore(position({ slashPoints: Number.NEGATIVE_INFINITY }))).toBe(0);
    expect(getNodeRowRiskClass(position({ slashPoints: Number.POSITIVE_INFINITY }))).toBe('');
  });
});

describe('getNodeRowRiskClass', () => {
  it('uses red for jailed rows, amber for slash review rows, and no tint for clean rows', () => {
    expect(getNodeRowRiskClass(position({ isJailed: true }))).toContain('bg-red-50');
    expect(getNodeRowRiskClass(position({ slashPoints: NETWORK.SLASH_POINT_THRESHOLDS.critical }))).toContain('bg-amber-50');
    expect(getNodeRowRiskClass(position({ slashPoints: NETWORK.SLASH_POINT_THRESHOLDS.warning }))).toContain('bg-amber-50');
    expect(getNodeRowRiskClass(position({ slashPoints: 0 }))).toBe('');
  });
});

describe('buildNodesPageModel', () => {
  it('keeps minor slash history out of provider review cards', () => {
    const minorSlash = position({
      nodeAddress: 'thor1minor',
      slashPoints: NETWORK.SLASH_POINT_THRESHOLDS.warning - 1,
    });
    const warningSlash = position({
      nodeAddress: 'thor1warning',
      slashPoints: NETWORK.SLASH_POINT_THRESHOLDS.warning,
    });

    const model = buildNodesPageModel({
      positions: [minorSlash, warningSlash],
      sortDirection: 'desc',
      sortField: 'riskScore',
    });

    expect(isUrgentNodeException(minorSlash)).toBe(false);
    expect(isUrgentNodeException(warningSlash)).toBe(true);
    expect(model.exceptionPositions.map((node) => node.nodeAddress)).toEqual(['thor1warning']);
  });

  it('promotes actionable yield flags without treating every yield marker as urgent', () => {
    const highestSlashOnly = position({
      nodeAddress: 'thor1highestslash',
      slashPoints: 1,
      yieldGuardFlags: ['highest_slash'],
    });
    const oldestOnly = position({
      nodeAddress: 'thor1oldest',
      yieldGuardFlags: ['oldest'],
    });
    const lowestBond = position({
      nodeAddress: 'thor1lowestbond',
      yieldGuardFlags: ['lowest_bond'],
    });
    const leaving = position({
      nodeAddress: 'thor1leaving',
      yieldGuardFlags: ['leaving'],
    });

    const model = buildNodesPageModel({
      positions: [highestSlashOnly, oldestOnly, lowestBond, leaving],
      sortDirection: 'desc',
      sortField: 'riskScore',
    });

    expect(isUrgentNodeException(highestSlashOnly)).toBe(false);
    expect(isUrgentNodeException(oldestOnly)).toBe(false);
    expect(isUrgentNodeException(lowestBond)).toBe(true);
    expect(isUrgentNodeException(leaving)).toBe(true);
    expect(model.exceptionPositions.map((node) => node.nodeAddress)).toEqual(['thor1leaving', 'thor1lowestbond']);
  });

  it('puts provider review cards before lower-severity node context', () => {
    const jailed = position({
      isJailed: true,
      nodeAddress: 'thor1jailed',
      slashPoints: 0,
      status: 'Active',
    });
    const warningSlash = position({
      nodeAddress: 'thor1warning',
      slashPoints: NETWORK.SLASH_POINT_THRESHOLDS.warning,
    });
    const standby = position({
      nodeAddress: 'thor1standby',
      status: 'Standby',
    });
    const yieldGuard = position({
      nodeAddress: 'thor1yieldguard',
      yieldGuardFlags: ['lowest_bond'],
    });
    const clean = position({ nodeAddress: 'thor1clean' });

    const model = buildNodesPageModel({
      positions: [clean, standby, yieldGuard, warningSlash, jailed],
      sortDirection: 'desc',
      sortField: 'riskScore',
    });

    expect(model.exceptionPositions.map((node) => node.nodeAddress)).toEqual([
      'thor1jailed',
      'thor1warning',
      'thor1standby',
      'thor1yieldguard',
    ]);
  });

  it.each([
    ['nodeAddress', 'thor1aaa', 'thor1zzz'],
    ['status', 'Active', 'Standby'],
    ['bondAmount', 100, 300],
    ['netAPY', 4, 14],
    ['slashPoints', 1, 80],
    ['operatorFee', 500, 2000],
  ] as Array<[NodesSortField, string | number, string | number]>)('sorts comparison rows by %s with the requested direction', (sortField, low, high) => {
    const lowNode = position({
      nodeAddress: sortField === 'nodeAddress' ? String(low) : 'thor1low',
      status: sortField === 'status' ? String(low) : 'Active',
      bondAmount: sortField === 'bondAmount' ? Number(low) : 100,
      netAPY: sortField === 'netAPY' ? Number(low) : 4,
      slashPoints: sortField === 'slashPoints' ? Number(low) : 1,
      operatorFee: sortField === 'operatorFee' ? Number(low) : 500,
    });
    const highNode = position({
      nodeAddress: sortField === 'nodeAddress' ? String(high) : 'thor1high',
      status: sortField === 'status' ? String(high) : 'Standby',
      bondAmount: sortField === 'bondAmount' ? Number(high) : 300,
      netAPY: sortField === 'netAPY' ? Number(high) : 14,
      slashPoints: sortField === 'slashPoints' ? Number(high) : 80,
      operatorFee: sortField === 'operatorFee' ? Number(high) : 2000,
    });

    const ascending = buildNodesPageModel({
      positions: [highNode, lowNode],
      sortDirection: 'asc',
      sortField,
    });
    const descending = buildNodesPageModel({
      positions: [lowNode, highNode],
      sortDirection: 'desc',
      sortField,
    });

    expect(ascending.sortedPositions[0].nodeAddress).toBe(lowNode.nodeAddress);
    expect(descending.sortedPositions[0].nodeAddress).toBe(highNode.nodeAddress);
  });

  it('sorts comparison rows by computed risk score by default', () => {
    const model = buildNodesPageModel({
      positions: [
        position({ nodeAddress: 'thor1clean', slashPoints: 0 }),
        position({ nodeAddress: 'thor1critical', slashPoints: NETWORK.SLASH_POINT_THRESHOLDS.critical }),
        position({ nodeAddress: 'thor1warning', slashPoints: NETWORK.SLASH_POINT_THRESHOLDS.warning }),
      ],
      sortDirection: 'desc',
      sortField: 'riskScore',
    });

    expect(model.sortedPositions.map((node) => node.nodeAddress)).toEqual([
      'thor1critical',
      'thor1warning',
      'thor1clean',
    ]);
  });
});
