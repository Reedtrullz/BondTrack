import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  beforeEach(() => {
    allNodesMock[0].total_bond = '100000000000';
    allNodesMock[1].total_bond = '80000000000';
    positionsMock[0].totalBond = 1000;
    positionsMock[0].bondAmount = 100;
  });

  it('compares node total bond against network average and keeps user bond as context', () => {
    render(<NetworkComparisonTable address="thor1bondprovider" />);

    const desktopTable = screen.getByRole('table');
    expect(within(desktopTable).getByText('Node Total Bond')).toBeInTheDocument();
    expect(within(desktopTable).getByText('1,000.00 RUNE')).toBeInTheDocument();
    expect(within(desktopTable).getByText('Your bond: 100.00 RUNE')).toBeInTheDocument();
    expect(within(desktopTable).getByText('900.00 RUNE')).toBeInTheDocument();
    expect(within(desktopTable).getByText('100.00 RUNE (+11.1%)')).toBeInTheDocument();
  });

  it('renders a compact mobile summary with the same comparison facts', () => {
    render(<NetworkComparisonTable address="thor1bondprovider" />);

    const mobileSummary = screen.getByLabelText('Mobile network comparison summary');
    expect(within(mobileSummary).getByText('Node total bond')).toBeInTheDocument();
    expect(within(mobileSummary).getByText('Network average')).toBeInTheDocument();
    expect(within(mobileSummary).getByText('Difference')).toBeInTheDocument();
    expect(within(mobileSummary).getByText('1,000.00 RUNE')).toBeInTheDocument();
    expect(within(mobileSummary).getByText('Your bond: 100.00 RUNE')).toBeInTheDocument();
    expect(within(mobileSummary).getByText('900.00 RUNE')).toBeInTheDocument();
    expect(within(mobileSummary).getByText('100.00 RUNE (+11.1%)')).toBeInTheDocument();
  });

  it('withholds percentage comparison when active network bond averages are unavailable', () => {
    allNodesMock[0].total_bond = '0';
    allNodesMock[1].total_bond = '0';

    render(<NetworkComparisonTable address="thor1bondprovider" />);

    const desktopTable = screen.getByRole('table');
    expect(within(desktopTable).getByText('Network Avg')).toBeInTheDocument();
    expect(within(desktopTable).getByText('--')).toBeInTheDocument();
    expect(within(desktopTable).getByText('Comparison unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/Infinity|NaN|\+0\.0%/)).not.toBeInTheDocument();
  });

  it('excludes malformed active-node bond rows from the network average and labels the partial sample', () => {
    allNodesMock[1].total_bond = 'not-a-number';

    render(<NetworkComparisonTable address="thor1bondprovider" />);

    expect(screen.getByText('Your nodes vs network averages (1 of 2 active nodes with usable bond data)')).toBeInTheDocument();
    expect(screen.getByText('1 active node had unusable bond source data and was excluded from the bond average.')).toBeInTheDocument();

    const desktopTable = screen.getByRole('table');
    expect(within(desktopTable).getAllByText('1,000.00 RUNE').length).toBeGreaterThanOrEqual(2);
    expect(within(desktopTable).getByText('0.00 RUNE (0.0%)')).toBeInTheDocument();
    expect(within(desktopTable).queryByText('500.00 RUNE')).not.toBeInTheDocument();
    expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
  });
});
