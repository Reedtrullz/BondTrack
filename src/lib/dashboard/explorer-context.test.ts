import { describe, expect, it } from 'vitest';
import type { NodeRaw } from '@/lib/api/thornode';
import { getDefaultCandidateSortOrder } from './node-candidate-sort';
import { buildExplorerPageModel } from './explorer-context';
import { getCandidateBondSourceSafety } from './candidate-bond-source-safety';

function node(overrides: Partial<NodeRaw> = {}): NodeRaw {
  return {
    active_block_height: 123,
    bond_providers: {
      node_operator_fee: '500',
      providers: [],
    },
    current_award: '30000000000',
    forced_to_leave: false,
    ip_address: '127.0.0.1',
    jail: {},
    leave_height: 0,
    maintenance: false,
    missing_blocks: 0,
    node_address: 'thor1candidateclean00000000000000000000000',
    node_operator_address: 'thor1operator0000000000000000000000000000000',
    observe_chains: [],
    peer_id: 'peer',
    preflight_status: { status: 'ok', reason: '', code: 0 },
    pub_key_set: { secp256k1: 'secp', ed25519: 'ed' },
    requested_to_leave: false,
    signer_membership: [],
    slash_points: 0,
    status: 'Active',
    status_since: 123,
    total_bond: '1000000000000',
    validator_cons_pub_key: 'validator',
    version: '3.19.0',
    ...overrides,
  };
}

const freshSourceSafety = getCandidateBondSourceSafety('healthy');

describe('buildExplorerPageModel', () => {
  it('scores active candidates and ranks quality ahead of APY-only upside', () => {
    const model = buildExplorerPageModel({
      address: 'thor1provider',
      allNodes: [
        node({
          node_address: 'thor1clean',
          bond_providers: {
            node_operator_fee: '500',
            providers: [{ bond_address: 'thor1provider', bond: '100000000' }],
          },
          current_award: '30000000000',
          slash_points: 0,
        }),
        node({
          node_address: 'thor1highslash',
          bond_providers: {
            node_operator_fee: '500',
            providers: [{ bond_address: 'thor1provider', bond: '100000000' }],
          },
          current_award: '90000000000',
          slash_points: 240,
        }),
        node({
          node_address: 'thor1standby',
          status: 'Standby',
        }),
      ],
      feeFilter: 'all',
      focusedNodeAddress: null,
      maxBondProviders: 100,
      sourceSafety: freshSourceSafety,
      sortField: 'quality',
      sortOrder: getDefaultCandidateSortOrder('quality'),
    });

    expect(model.nodesWithAPY.map((candidate) => candidate.node_address)).toEqual([
      'thor1clean',
      'thor1highslash',
    ]);
    expect(model.sortedNodes.map((candidate) => candidate.node_address)).toEqual([
      'thor1clean',
      'thor1highslash',
    ]);
    expect(model.sortedNodes[1].adjustedAPY).toBeGreaterThan(model.sortedNodes[0].adjustedAPY);
    expect(model.sortedNodes[1].candidateScore.reasons).toContain('240 slash points');
    expect(model.qualityCounts).toEqual({ Strong: 1, Watch: 0, Avoid: 1 });
    expect(model.directBondCount).toBe(1);
    expect(model.decision).toEqual(expect.objectContaining({
      action: 'prepare-bond',
      candidate: expect.objectContaining({ node_address: 'thor1clean' }),
      severity: 'healthy',
      statusLabel: 'Ready',
      topRisk: 'Strong direct-bond candidate available',
    }));
    expect(model.decision.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Visible candidates', value: '2' }),
      expect.objectContaining({ label: 'Direct bond', value: '1' }),
      expect.objectContaining({ label: 'Top score', value: expect.stringMatching(/\/100$/) }),
    ]));
  });

  it('withholds BOND prep when a strong whitelisted candidate lacks fresh THORNode confidence', () => {
    const model = buildExplorerPageModel({
      address: 'thor1provider',
      allNodes: [
        node({
          node_address: 'thor1clean',
          bond_providers: {
            node_operator_fee: '500',
            providers: [{ bond_address: 'thor1provider', bond: '100000000' }],
          },
          current_award: '30000000000',
          slash_points: 0,
        }),
      ],
      feeFilter: 'all',
      focusedNodeAddress: null,
      maxBondProviders: 100,
      sourceSafety: {
        canPrepareBond: false,
        detail: 'THORNode source confidence is degraded. Treat candidate status and provider capacity as unverified before preparing any BOND memo.',
        severity: 'warning',
        statusLabel: 'Source degraded',
        title: 'Wait for source confidence',
        value: 'THORNode degraded',
      },
      sortField: 'quality',
      sortOrder: getDefaultCandidateSortOrder('quality'),
    });

    expect(model.directBondCount).toBe(1);
    expect(model.decision).toEqual(expect.objectContaining({
      action: 'review-source',
      candidate: expect.objectContaining({ node_address: 'thor1clean' }),
      severity: 'warning',
      statusLabel: 'Source degraded',
      topRisk: 'Source confidence must refresh before bond prep',
    }));
    expect(model.decision.diagnosis).toContain('confirmed provider access');
    expect(model.decision.diagnosis).toContain('THORNode source confidence is degraded');
    expect(model.decision.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Direct bond',
        value: '1',
        detail: 'Source confidence required first',
      }),
    ]));
  });

  it('defaults omitted source safety to source review instead of BOND prep', () => {
    const model = buildExplorerPageModel({
      address: 'thor1provider',
      allNodes: [
        node({
          node_address: 'thor1clean',
          bond_providers: {
            node_operator_fee: '500',
            providers: [{ bond_address: 'thor1provider', bond: '100000000' }],
          },
          current_award: '30000000000',
          slash_points: 0,
        }),
      ],
      feeFilter: 'all',
      focusedNodeAddress: null,
      maxBondProviders: 100,
      sortField: 'quality',
      sortOrder: getDefaultCandidateSortOrder('quality'),
    });

    expect(model.directBondCount).toBe(1);
    expect(model.decision).toEqual(expect.objectContaining({
      action: 'review-source',
      candidate: expect.objectContaining({ node_address: 'thor1clean' }),
      severity: 'info',
      statusLabel: 'Source pending',
      topRisk: 'Source confidence must refresh before bond prep',
    }));
    expect(model.decision.diagnosis).toContain('THORNode source confidence has not completed yet');
  });

  it('keeps focused-node context even when the fee filter hides the card', () => {
    const model = buildExplorerPageModel({
      address: 'thor1provider',
      allNodes: [
        node({
          node_address: 'thor1highfee',
          bond_providers: {
            node_operator_fee: '2500',
            providers: [{ bond_address: 'thor1provider', bond: '100000000' }],
          },
        }),
        node({
          node_address: 'thor1lowfee',
          bond_providers: {
            node_operator_fee: '500',
            providers: [{ bond_address: 'thor1provider', bond: '100000000' }],
          },
        }),
      ],
      feeFilter: 'low',
      focusedNodeAddress: 'thor1highfee',
      maxBondProviders: 100,
      sortField: 'quality',
      sortOrder: 'desc',
    });

    expect(model.sortedNodes.map((candidate) => candidate.node_address)).toEqual(['thor1lowfee']);
    expect(model.focusedCandidate?.node_address).toBe('thor1highfee');
    expect(model.isFocusedCandidateVisible).toBe(false);
  });

  it('turns an empty filtered view into a show-all-fees decision', () => {
    const model = buildExplorerPageModel({
      address: 'thor1provider',
      allNodes: [
        node({
          node_address: 'thor1highfee',
          bond_providers: {
            node_operator_fee: '2500',
            providers: [{ bond_address: 'thor1provider', bond: '100000000' }],
          },
        }),
      ],
      feeFilter: 'low',
      focusedNodeAddress: null,
      maxBondProviders: 100,
      sortField: 'quality',
      sortOrder: 'desc',
    });

    expect(model.sortedNodes).toEqual([]);
    expect(model.nodesWithAPY).toHaveLength(1);
    expect(model.decision).toEqual(expect.objectContaining({
      action: 'show-all-fees',
      diagnosis: '1 active candidate exists, but the current filters hide it. Show all fees before drawing a conclusion.',
      severity: 'info',
      statusLabel: 'Filtered',
      topRisk: 'Filters hide every candidate',
    }));
  });

  it('counts direct-bond candidates only when the watched address has capacity trust', () => {
    const model = buildExplorerPageModel({
      address: 'thor1provider',
      allNodes: [
        node({
          node_address: 'thor1available',
          bond_providers: {
            node_operator_fee: '500',
            providers: [{ bond_address: 'thor1provider', bond: '100000000' }],
          },
        }),
        node({
          node_address: 'thor1full',
          bond_providers: {
            node_operator_fee: '500',
            providers: [{ bond_address: 'thor1other', bond: '100000000' }],
          },
        }),
      ],
      feeFilter: 'all',
      focusedNodeAddress: null,
      maxBondProviders: 1,
      sortField: 'quality',
      sortOrder: 'desc',
    });

    expect(model.directBondCount).toBe(1);
    expect(model.sortedNodes.find((candidate) => candidate.node_address === 'thor1available')?.candidateScore.capacityTrust).toBe('available');
    expect(model.sortedNodes.find((candidate) => candidate.node_address === 'thor1full')?.candidateScore.capacityTrust).toBe('full');
  });

  it('keeps malformed candidate source metrics reviewable without a NaN score', () => {
    const model = buildExplorerPageModel({
      address: 'thor1provider',
      allNodes: [
        node({
          node_address: 'thor1malformed',
          bond_providers: {
            node_operator_fee: 'not-a-fee',
            providers: [{ bond_address: 'thor1provider', bond: '100000000' }],
          },
          current_award: 'not-an-award',
          slash_points: Number.NaN,
          total_bond: 'not-a-bond',
        }),
      ],
      feeFilter: 'all',
      focusedNodeAddress: 'thor1malformed',
      maxBondProviders: 100,
      sortField: 'quality',
      sortOrder: 'desc',
    });

    const candidate = model.focusedCandidate;

    expect(candidate).toBeDefined();
    expect(Number.isFinite(candidate?.candidateScore.score)).toBe(true);
    expect(candidate?.candidateScore.quality).toBe('Avoid');
    expect(candidate?.candidateScore.reasons).toEqual(expect.arrayContaining([
      'slash data unavailable',
      'operator fee unavailable',
      'bond data unavailable',
    ]));
    expect(model.directBondCount).toBe(0);
    expect(model.decision).toEqual(expect.objectContaining({
      action: 'review-risk',
      candidate: expect.objectContaining({ node_address: 'thor1malformed' }),
      severity: 'critical',
      statusLabel: 'Avoid',
      topRisk: 'Do not prepare a BOND from this set',
    }));
  });
});
