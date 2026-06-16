import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IntelligenceFeed } from './intelligence-feed';
import type { BondPosition } from '@/lib/types/node';
import type { NodeRaw } from '@/lib/api/thornode';

function position(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    nodeAddress: 'thor1currentnode0000000000000000000000000000',
    nodeOperatorAddress: 'thor1operator000000000000000000000000000000',
    bondAmount: 50_000,
    bondSharePercent: 50,
    status: 'Active',
    operatorFee: 1_000,
    operatorFeeFormatted: '10.00%',
    netAPY: 12,
    totalBond: 100_000,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '2.3.0',
    requestedToLeave: false,
    ...overrides,
  };
}

function node(overrides: Partial<NodeRaw> = {}): NodeRaw {
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

describe('IntelligenceFeed', () => {
  it('uses evidence-limited language when no portfolio issues are detected', () => {
    render(
      <IntelligenceFeed
        positions={[position()]}
        benchmarks={{
          networkAverageAPY: 10,
          topTierAPY: 12,
          medianAPY: 9,
        }}
        allNodes={[node()]}
        providerAddress="thor1provider0000000000000000000000000000"
      />
    );

    expect(screen.getByText('No immediate alerts')).toBeInTheDocument();
    expect(screen.getByText(/No slash, jail, or churn-risk signals/i)).toBeInTheDocument();
    expect(screen.queryByText(/sees no threats/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/positions are optimal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/certified/i)).not.toBeInTheDocument();
  });

  it('labels yield suggestions as review items instead of direct optimize commands', () => {
    render(
      <IntelligenceFeed
        positions={[position({ netAPY: 5 })]}
        benchmarks={{
          networkAverageAPY: 8,
          topTierAPY: 12,
          medianAPY: 7,
        }}
        allNodes={[
          node({
            node_address: 'thor1candidate00000000000000000000000000',
            slash_points: 0,
            total_bond: '20000000000000',
          }),
        ]}
        providerAddress="thor1provider0000000000000000000000000000"
      />
    );

    const insight = screen.getByText('Yield review').closest('[data-testid="intelligence-item"]');

    expect(insight).not.toBeNull();
    expect(within(insight as HTMLElement).getByRole('link', { name: /Review opportunity/i })).toBeInTheDocument();
    expect(within(insight as HTMLElement).queryByText(/^Optimize$/i)).not.toBeInTheDocument();
  }, 10_000);
});
