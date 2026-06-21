import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNodeRankings } from '../use-node-rankings';
import { useAllNodes } from '../use-all-nodes';
import type { BondPosition } from '@/lib/types/node';
import type { NodeRaw } from '@/lib/api/thornode';

vi.mock('../use-all-nodes', () => ({
  useAllNodes: vi.fn(),
}));

const mockUseAllNodes = vi.mocked(useAllNodes);

function node(overrides: Partial<NodeRaw> = {}): NodeRaw {
  return {
    node_address: 'thor1node',
    status: 'Active',
    pub_key_set: { secp256k1: 'secp', ed25519: 'ed' },
    validator_cons_pub_key: 'validator',
    peer_id: 'peer',
    active_block_height: 100,
    status_since: 1,
    node_operator_address: 'thor1operator',
    total_bond: '100000000000',
    bond_providers: {
      node_operator_fee: '500',
      providers: [{ bond_address: 'thor1provider', bond: '10000000000' }],
    },
    signer_membership: null,
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '127.0.0.1',
    version: '1.0.0',
    slash_points: 0,
    jail: {},
    current_award: '0',
    observe_chains: null,
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
    ...overrides,
  };
}

function position(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    nodeAddress: 'thor1watchedlowbond',
    nodeOperatorAddress: 'thor1operator',
    bondAmount: 100,
    bondSharePercent: 10,
    status: 'Active',
    operatorFee: 500,
    operatorFeeFormatted: '5.00%',
    netAPY: 0,
    totalBond: 1000,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '1.0.0',
    requestedToLeave: false,
    ...overrides,
  };
}

describe('useNodeRankings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes unusable active-node bond rows from churn rank denominators', () => {
    mockUseAllNodes.mockReturnValue({
      data: [
        node({
          node_address: 'thor1highbond',
          total_bond: '200000000000',
        }),
        node({
          node_address: 'thor1watchedlowbond',
          total_bond: '100000000000',
        }),
        node({
          node_address: 'thor1malformedbond',
          total_bond: 'not-a-number',
        }),
      ],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => useNodeRankings([position()]));

    expect(result.current).toEqual([
      expect.objectContaining({
        nodeAddress: 'thor1watchedlowbond',
        rank: 2,
        totalNodes: 2,
        percentile: 0,
        isAtRisk: true,
        excludedActiveNodeCount: 1,
      }),
    ]);
  });
});
