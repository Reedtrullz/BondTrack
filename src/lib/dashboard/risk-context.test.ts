import { describe, expect, it } from 'vitest';
import type { NodeRaw } from '@/lib/api/thornode';
import type { BondPosition } from '@/lib/types/node';
import {
  buildCandidateRiskContext,
  getIncentivePendulumModel,
  getNodeSeverityScore,
  getRiskNodeElementId,
  resolveFocusedNodeRiskContext,
  sortRiskPositions,
  summarizeRiskPositions,
} from './risk-context';

function position(overrides: Partial<BondPosition>): BondPosition {
  return {
    nodeAddress: overrides.nodeAddress ?? 'thor1node',
    nodeOperatorAddress: 'thor1operator',
    bondAmount: 10_000,
    bondSharePercent: 10,
    status: 'Active',
    operatorFee: 500,
    operatorFeeFormatted: '5.0%',
    netAPY: 12,
    totalBond: 100_000,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '3.19.0',
    requestedToLeave: false,
    yieldGuardFlags: [],
    ...overrides,
  };
}

function node(overrides: Partial<NodeRaw>): NodeRaw {
  return {
    node_address: overrides.node_address ?? 'thor1candidate',
    status: overrides.status ?? 'Active',
    pub_key_set: { secp256k1: 'secp', ed25519: 'ed' },
    validator_cons_pub_key: 'validator',
    peer_id: 'peer',
    active_block_height: 123,
    status_since: 100,
    node_operator_address: 'thor1operator',
    total_bond: '1000000000000',
    bond_providers: {
      node_operator_fee: '2500',
      providers: [],
      ...overrides.bond_providers,
    },
    signer_membership: [],
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '127.0.0.1',
    version: '3.19.0',
    slash_points: overrides.slash_points ?? 150,
    jail: {},
    current_award: overrides.current_award ?? '10000000000',
    observe_chains: [],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
    ...overrides,
  };
}

describe('risk context helpers', () => {
  it('scores and sorts nodes so urgent operator risk appears first', () => {
    const healthy = position({ nodeAddress: 'thor1healthy' });
    const churnRisk = position({
      nodeAddress: 'thor1churn',
      yieldGuardFlags: ['lowest_bond'],
    });
    const slashRisk = position({
      nodeAddress: 'thor1slash',
      slashPoints: 120,
      yieldGuardFlags: ['highest_slash'],
    });
    const jailed = position({
      nodeAddress: 'thor1jailed',
      isJailed: true,
      slashPoints: 40,
    });

    expect(getNodeSeverityScore(healthy)).toBe(0);
    expect(getNodeSeverityScore(jailed)).toBeGreaterThan(getNodeSeverityScore(slashRisk));
    expect(sortRiskPositions([healthy, churnRisk, jailed, slashRisk]).map((item) => item.nodeAddress)).toEqual([
      'thor1jailed',
      'thor1slash',
      'thor1churn',
      'thor1healthy',
    ]);
  });

  it('builds candidate risk evidence from live THORNode data and direct-bond capacity', () => {
    const candidate = buildCandidateRiskContext(
      node({
        node_address: 'thor1candidate',
        slash_points: 150,
        bond_providers: {
          node_operator_fee: '2500',
          providers: [{ bond_address: 'thor1other', bond: '1000000000' }],
        },
      }),
      'thor1provider',
      1
    );

    expect(candidate.adjustedAPY).toBeGreaterThan(0);
    expect(candidate.operatorFee).toBe(2500);
    expect(candidate.candidateScore.quality).toBe('Avoid');
    expect(candidate.candidateScore.trustLabel).toBe('Provider slots full');
    expect(candidate.candidateScore.reasons).toEqual(expect.arrayContaining([
      '150 slash points',
      'high operator fee',
      'provider slots full',
    ]));
  });

  it('keeps malformed candidate risk evidence reviewable without a NaN score', () => {
    const candidate = buildCandidateRiskContext(
      node({
        total_bond: 'not-a-bond',
        current_award: 'not-an-award',
        slash_points: Number.NaN,
        bond_providers: {
          node_operator_fee: 'not-a-fee',
          providers: [{ bond_address: 'thor1provider', bond: '1000000000' }],
        },
      }),
      'thor1provider',
      100
    );

    expect(Number.isFinite(candidate.candidateScore.score)).toBe(true);
    expect(candidate.candidateScore.quality).toBe('Avoid');
    expect(candidate.candidateScore.reasons).toEqual(expect.arrayContaining([
      'slash data unavailable',
      'operator fee unavailable',
      'bond data unavailable',
    ]));
  });

  it('classifies focused nodes as bonded, candidate, missing, or absent', () => {
    const bonded = position({ nodeAddress: 'thor1bonded', slashPoints: 75 });
    const candidate = node({ node_address: 'thor1candidate' });

    expect(resolveFocusedNodeRiskContext({
      allNodes: [candidate],
      focusedNodeAddress: null,
      maxBondProviders: 100,
      positions: [bonded],
      userAddress: 'thor1provider',
    })).toEqual({ kind: 'none' });

    expect(resolveFocusedNodeRiskContext({
      allNodes: [candidate],
      focusedNodeAddress: 'thor1bonded',
      maxBondProviders: 100,
      positions: [bonded],
      userAddress: 'thor1provider',
    })).toMatchObject({
      kind: 'bonded',
      elementId: 'risk-node-thor1bonded',
      position: bonded,
    });

    expect(resolveFocusedNodeRiskContext({
      allNodes: [candidate],
      focusedNodeAddress: 'thor1candidate',
      maxBondProviders: 100,
      positions: [bonded],
      userAddress: 'thor1provider',
    })).toMatchObject({
      kind: 'candidate',
      node: candidate,
      candidateContext: {
        candidateScore: {
          trustLabel: 'Needs operator whitelist',
        },
      },
    });

    expect(resolveFocusedNodeRiskContext({
      allNodes: [candidate],
      focusedNodeAddress: 'thor1missing',
      maxBondProviders: 100,
      positions: [bonded],
      userAddress: 'thor1provider',
    })).toEqual({
      kind: 'missing',
      nodeAddress: 'thor1missing',
    });

    expect(getRiskNodeElementId('thor1bonded')).toBe('risk-node-thor1bonded');
  });

  it('summarizes portfolio risk counts and status from bond positions', () => {
    const summary = summarizeRiskPositions([
      position({ nodeAddress: 'thor1active', bondAmount: 1000 }),
      position({ nodeAddress: 'thor1standby', bondAmount: 2000, status: 'Standby' }),
      position({ nodeAddress: 'thor1jailed', bondAmount: 3000, isJailed: true }),
      position({
        nodeAddress: 'thor1slash',
        bondAmount: 4000,
        slashPoints: 240,
        yieldGuardFlags: ['highest_slash'],
      }),
      position({
        nodeAddress: 'thor1churn',
        bondAmount: 5000,
        slashPoints: 75,
        yieldGuardFlags: ['lowest_bond'],
      }),
    ]);

    expect(summary).toMatchObject({
      activeCount: 4,
      atRiskCount: 2,
      criticalSlashCount: 1,
      jailedCount: 1,
      slashNodeCount: 2,
      standbyCount: 1,
      statusLabel: 'At Risk',
      totalBonded: 15_000,
      warningSlashCount: 1,
    });
    expect(summary.healthScore).toBeLessThan(50);
  });

  it('models incentive pendulum status and reward split from bond and liquidity totals', () => {
    expect(getIncentivePendulumModel({ totalBonds: 300, totalLiquidity: 100 })).toMatchObject({
      bondToPoolRatio: 3,
      level: 'well-secured',
      lpShare: 25,
      nodeShare: 75,
      progressPercent: 99,
      status: 'Well Secured',
    });

    expect(getIncentivePendulumModel({ totalBonds: 125, totalLiquidity: 100 })).toMatchObject({
      bondToPoolRatio: 1.25,
      level: 'building',
      status: 'Building',
    });

    expect(getIncentivePendulumModel({ totalBonds: 0, totalLiquidity: 100 })).toMatchObject({
      bondToPoolRatio: 0,
      level: 'under-secured',
      lpShare: 100,
      nodeShare: 0,
      progressPercent: 0,
      status: 'Under-secured',
    });
  });

  it('keeps incentive pendulum output finite when network totals are malformed', () => {
    const malformed = getIncentivePendulumModel({
      totalBonds: Number.NaN,
      totalLiquidity: Number.POSITIVE_INFINITY,
    });

    expect(malformed).toMatchObject({
      bondToPoolRatio: 0,
      level: 'under-secured',
      lpShare: 100,
      nodeShare: 0,
      progressPercent: 0,
      status: 'Under-secured',
    });
    expect([
      malformed.bondToPoolRatio,
      malformed.lpShare,
      malformed.nodeShare,
      malformed.progressPercent,
    ].every(Number.isFinite)).toBe(true);
  });
});
