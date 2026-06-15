import { describe, expect, it } from 'vitest';

import { analyzeBondOptimization } from './bond-optimizer';
import type { BondPosition } from '@/lib/types/node';
import type { NodeRaw } from '@/lib/api/thornode';
import type { YieldBenchmarks } from './yield-benchmarks';

function position(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    nodeAddress: 'thor1currentnode0000000000000000000000000000',
    nodeOperatorAddress: 'thor1operator000000000000000000000000000000',
    bondAmount: 50_000,
    bondSharePercent: 50,
    status: 'Active',
    operatorFee: 1_000,
    operatorFeeFormatted: '10.00%',
    netAPY: 5,
    totalBond: 100_000,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '2.3.0',
    requestedToLeave: false,
    ...overrides,
  };
}

function node(overrides: Partial<NodeRaw>): NodeRaw {
  return {
    node_address: 'thor1node000000000000000000000000000000000',
    status: 'Active',
    pub_key_set: {
      secp256k1: 'secp256k1',
      ed25519: 'ed25519',
    },
    validator_cons_pub_key: 'validator',
    peer_id: 'peer',
    active_block_height: 1,
    status_since: 1,
    node_operator_address: 'thor1operator000000000000000000000000000000',
    total_bond: '10000000000000',
    bond_providers: {
      node_operator_fee: '1000',
      providers: [],
    },
    signer_membership: [],
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '127.0.0.1',
    version: '2.3.0',
    slash_points: 0,
    jail: {},
    current_award: '100000000',
    observe_chains: [],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
    ...overrides,
  };
}

const benchmarks: YieldBenchmarks = {
  networkAverageAPY: 8,
  topTierAPY: 12,
  medianAPY: 7,
};

describe('analyzeBondOptimization', () => {
  it('prefers a low-slash active target over a higher-slash candidate', () => {
    const suggestions = analyzeBondOptimization(
      [position()],
      benchmarks,
      [
        node({
          node_address: 'thor1dangerhighslash0000000000000000000000',
          slash_points: 250,
          total_bond: '20000000000000',
        }),
        node({
          node_address: 'thor1cleanlowrisk000000000000000000000000',
          slash_points: 0,
          total_bond: '15000000000000',
        }),
      ]
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestedNodeAddress).toBe('thor1cleanlowrisk000000000000000000000000');
    expect(suggestions[0].reason).toMatch(/risk-screened/i);
  });

  it('withholds optimization suggestions when no risk-screened target is available', () => {
    const suggestions = analyzeBondOptimization(
      [position()],
      benchmarks,
      [
        node({
          node_address: 'thor1jailedtarget0000000000000000000000000',
          status: 'Active',
          jail: { release_height: 99_999_999, reason: 'slash' },
          slash_points: 0,
        }),
        node({
          node_address: 'thor1slashytarget0000000000000000000000000',
          status: 'Active',
          slash_points: 350,
        }),
        node({
          node_address: 'thor1standbytarget000000000000000000000000',
          status: 'Standby',
          slash_points: 0,
        }),
      ]
    );

    expect(suggestions).toEqual([]);
  });
});
