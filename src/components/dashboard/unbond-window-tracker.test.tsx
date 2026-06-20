import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UnbondWindowTracker } from './unbond-window-tracker';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { useNetworkConstants } from '@/lib/hooks/use-network-constants';
import type { NodeRaw } from '@/lib/api/thornode';
import type { BondPosition } from '@/lib/types/node';

vi.mock('@/lib/hooks/use-all-nodes', () => ({
  useAllNodes: vi.fn(),
}));

vi.mock('@/lib/hooks/use-network-constants', () => ({
  useNetworkConstants: vi.fn(),
}));

const mockUseAllNodes = vi.mocked(useAllNodes);
const mockUseNetworkConstants = vi.mocked(useNetworkConstants);

const basePosition: BondPosition = {
  nodeAddress: 'thor1unbondwindow000000000000000000000001',
  nodeOperatorAddress: 'thor1operator000000000000000000000000001',
  bondAmount: 50_000,
  bondSharePercent: 100,
  status: 'Standby',
  operatorFee: 500,
  operatorFeeFormatted: '5.0%',
  netAPY: 0,
  totalBond: 50_000,
  slashPoints: 0,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '3.19.0',
  requestedToLeave: false,
};

function node(overrides: Partial<NodeRaw> = {}): NodeRaw {
  return {
    node_address: 'thor1unbondwindow000000000000000000000001',
    status: 'Standby',
    pub_key_set: { secp256k1: '', ed25519: '' },
    validator_cons_pub_key: '',
    peer_id: '',
    active_block_height: 123,
    status_since: 100,
    node_operator_address: 'thor1operator000000000000000000000000001',
    total_bond: '5000000000000',
    bond_providers: {
      node_operator_fee: '500',
      providers: [{ bond_address: 'thor1provider000000000000000000000000001', bond: '5000000000000' }],
    },
    signer_membership: ['thorpub1signer'],
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '',
    version: '3.19.0',
    slash_points: 0,
    jail: {},
    current_award: '0',
    observe_chains: null,
    preflight_status: { status: 'ready', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
    ...overrides,
  };
}

describe('UnbondWindowTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllNodes.mockReturnValue({
      data: [node()],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    mockUseNetworkConstants.mockReturnValue({
      constants: { last_observed_height: 12_345_678 },
      error: undefined,
      isLoading: false,
    });
  });

  it('labels eligible standby nodes as an informational window state, not a green unbond recommendation', () => {
    render(<UnbondWindowTracker positions={[basePosition]} />);

    expect(screen.queryByText('Can Unbond')).not.toBeInTheDocument();
    expect(screen.queryByText('Open')).not.toBeInTheDocument();

    const summary = screen.getByText('Window Open').parentElement as HTMLElement;
    expect(within(summary).getByText('1')).toBeInTheDocument();
    expect(summary).toHaveClass('bg-sky-50');
    expect(summary).not.toHaveClass('bg-emerald-50');

    const rowState = screen.getByText('Window open').parentElement as HTMLElement;
    expect(rowState).toHaveClass('text-sky-700');
    expect(rowState).not.toHaveClass('text-emerald-600');
    expect(screen.queryByText(/unbond window opens on next churn/i)).not.toBeInTheDocument();
    expect(screen.getByText(/window status updates after churn/i)).toBeInTheDocument();
    expect(screen.getByText(/wallet confirmation is still required/i)).toBeInTheDocument();
  });

  it('labels active nodes as a neutral closed window state without red danger treatment', () => {
    const activeNodeAddress = 'thor1activenode0000000000000000000000001';
    mockUseAllNodes.mockReturnValue({
      data: [
        node({
          node_address: activeNodeAddress,
          status: 'Active',
        }),
      ],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(
      <UnbondWindowTracker
        positions={[
          {
            ...basePosition,
            nodeAddress: activeNodeAddress,
            status: 'Active',
          },
        ]}
      />
    );

    const activeSummary = screen.getAllByText('Active')[0].parentElement as HTMLElement;
    expect(within(activeSummary).getByText('1')).toBeInTheDocument();

    const closedSummary = screen.getByText('Window Closed').parentElement as HTMLElement;
    expect(within(closedSummary).getByText('1')).toBeInTheDocument();
    expect(closedSummary).toHaveClass('bg-zinc-100');
    expect(closedSummary).not.toHaveClass('bg-red-50');

    expect(screen.queryByText('Window open')).not.toBeInTheDocument();
    expect(screen.queryByText('Locked')).not.toBeInTheDocument();

    const rowState = screen.getByText('Window closed').parentElement as HTMLElement;
    expect(rowState).toHaveClass('text-zinc-600');
    expect(rowState).not.toHaveClass('text-red-500');
  });

  it('labels standby nodes without signer membership as signer unavailable, not locked', () => {
    const unsignedStandbyAddress = 'thor1unsignedstandby0000000000000000001';
    mockUseAllNodes.mockReturnValue({
      data: [
        node({
          node_address: unsignedStandbyAddress,
          signer_membership: [],
        }),
      ],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(
      <UnbondWindowTracker
        positions={[
          {
            ...basePosition,
            nodeAddress: unsignedStandbyAddress,
            status: 'Standby',
          },
        ]}
      />
    );

    const closedSummary = screen.getByText('Window Closed').parentElement as HTMLElement;
    expect(within(closedSummary).getByText('1')).toBeInTheDocument();
    expect(closedSummary).not.toHaveClass('bg-red-50');

    expect(screen.queryByText('Locked')).not.toBeInTheDocument();

    const rowState = screen.getByText('No signer').parentElement as HTMLElement;
    expect(rowState).toHaveClass('text-amber-700');
    expect(rowState).not.toHaveClass('text-red-500');
  });
});
