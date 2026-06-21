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
      severity: 'info',
      statusLabel: 'Candidate Review',
      topRisk: 'Strong candidate still needs wallet review',
    }));
    expect(model.decision.diagnosis).toContain('strongest visible candidate with the watched provider listed by THORNode');
    expect(model.decision.diagnosis).toContain('not a safety guarantee');
    expect(model.decision.diagnosis).toContain('Reconfirm the wallet preview before signing');
    expect(model.decision.diagnosis).not.toContain('confirmed provider access');
    expect(model.decision.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Visible candidates', value: '2' }),
      expect.objectContaining({ label: 'Direct bond', value: '1' }),
      expect.objectContaining({
        label: 'Top candidate',
        value: 'Strong',
        detail: expect.stringContaining('Strong 1'),
      }),
    ]));
    expect(model.decision.metrics.map((metric) => metric.value)).not.toContainEqual(expect.stringMatching(/\d+\/100/));
  });

  it('withholds BOND review when a strong listed-provider candidate lacks a current THORNode source check', () => {
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
        detail: 'THORNode candidate source check is degraded. Treat candidate status and provider capacity as unverified before reviewing or copying any BOND memo.',
        severity: 'warning',
        statusLabel: 'Source degraded',
        title: 'Wait for source check',
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
      topRisk: 'Wait for THORNode source check before reviewing any BOND memo',
    }));
    expect(model.decision.diagnosis).toContain('lists the watched address as a bond provider');
    expect(model.decision.diagnosis).toContain('THORNode candidate source check is degraded');
    expect(model.decision.diagnosis).toContain('before reviewing or copying any BOND memo');
    expect(model.decision.diagnosis).not.toContain('confirmed provider access');
    expect(model.decision.diagnosis).not.toContain('before preparing any BOND memo');
    expect(model.decision.diagnosis).not.toContain('fresh enough');
    expect(model.decision.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Direct bond',
        value: '1',
        detail: 'THORNode source check required first',
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
      topRisk: 'Wait for THORNode source check before reviewing any BOND memo',
    }));
    expect(model.decision.diagnosis).toContain('THORNode candidate source check has not completed yet');
    expect(model.decision.diagnosis).toContain('before reviewing or copying any BOND memo');
    expect(model.decision.diagnosis).not.toContain('before preparing any BOND memo');
    expect(model.decision.diagnosis).not.toContain('fresh source check');
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
      topRisk: 'No BOND candidate is review-ready',
    }));
  });
});
