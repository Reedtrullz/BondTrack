import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NetworkComparisonTable } from './network-comparison-table';
import type { NodeRaw } from '@/lib/api/thornode';
import type { BondPosition } from '@/lib/types/node';

const allNodesMock: NodeRaw[] = [
  {
    node_address: 'thor1nodeone000000000000000000000000000001',
    status: 'Active',
    pub_key_set: { secp256k1: 'secp', ed25519: 'ed' },
    validator_cons_pub_key: 'validator-1',
    peer_id: 'peer-1',
    active_block_height: 100,
    status_since: 1,
    node_operator_address: 'thor1operator1',
    total_bond: '100000000000',
    bond_providers: {
      node_operator_fee: '500',
      providers: [{ bond_address: 'thor1bondprovider', bond: '10000000000' }],
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
  },
  {
    node_address: 'thor1nodetwo000000000000000000000000000002',
    status: 'Active',
    pub_key_set: { secp256k1: 'secp', ed25519: 'ed' },
    validator_cons_pub_key: 'validator-2',
    peer_id: 'peer-2',
    active_block_height: 100,
    status_since: 1,
    node_operator_address: 'thor1operator2',
    total_bond: '80000000000',
    bond_providers: {
      node_operator_fee: '500',
      providers: [{ bond_address: 'thor1otherprovider', bond: '8000000000' }],
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
  },
];

const positionsMock: BondPosition[] = [
  {
    nodeAddress: 'thor1nodeone000000000000000000000000000001',
    nodeOperatorAddress: 'thor1operator1',
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
  },
];

vi.mock('@/lib/hooks/use-all-nodes', () => ({
  useAllNodes: () => ({ data: allNodesMock, isLoading: false }),
}));

vi.mock('@/lib/hooks/use-bond-positions', () => ({
  useBondPositions: () => ({ positions: positionsMock, isLoading: false }),
}));

describe('NetworkComparisonTable', () => {
  it('compares node total bond against network average and keeps user bond as context', () => {
    render(<NetworkComparisonTable address="thor1bondprovider" />);

    expect(screen.getByText('Node Total Bond')).toBeInTheDocument();
    expect(screen.getByText('1,000.00 RUNE')).toBeInTheDocument();
    expect(screen.getByText('Your bond: 100.00 RUNE')).toBeInTheDocument();
    expect(screen.getByText('900.00 RUNE')).toBeInTheDocument();
    expect(screen.getByText('100.00 RUNE (+11.1%)')).toBeInTheDocument();
  });
});
