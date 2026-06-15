import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { __getMockCurrentAwardForTests, useBondPositions } from '../use-bond-positions';
import * as thornode from '@/lib/api/thornode';
import * as midgard from '@/lib/api/midgard';

vi.mock('@/lib/api/thornode');
vi.mock('@/lib/api/midgard');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

const mockNodes = [
  {
    node_address: 'thor1abc123def456',
    status: 'Active',
    pub_key_set: { secp256k1: '03a2bcde3f45678901234567890123456789012345678901234567890123456', ed25519: '02b3e5ef789012345678901234567890123456789012345678901234' },
    validator_cons_pub_key: 'thorvalconspub1zcjduepq2w6r4z2h3ujns3e8qjjjl7r2h9u2d4z2h3ujns3e8qjjjl7r2h9u2d',
    peer_id: '16Uvh8Eh8J3fG3YDCK4f4W2c5b6d7e8f9a0b1c2d3e4f',
    active_block_height: 12345678,
    status_since: 1700000000,
    node_operator_address: 'thor1operator123456789abcdef',
    total_bond: '2507476277808',
    bond_providers: {
      node_operator_fee: '2000',
      providers: [
        { bond_address: 'thor1user123456789abcdef', bond: '1253738138904' },
      ],
    },
    signer_membership: ['02a1bcde3f45678901234567890123456789012345678901234567890123456'],
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '10.0.0.1',
    version: '2.3.0',
    slash_points: 0,
    jail: {},
    current_award: '250000000',
    observe_chains: [{ chain: 'BTC', height: 850000 }],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
  },
  // Second node with DIFFERENT current_award to test per-node APY
  {
    node_address: 'thor1def456ghi789',
    status: 'Active',
    pub_key_set: { secp256k1: '03def45678901234567890123456789012345678901234567890123456789012', ed25519: '02def456789012345678901234567890123456789012345678901234567890' },
    validator_cons_pub_key: 'thorvalconspub1def456789012345678901234567890123456789012345678901234',
    peer_id: '16def456789012345678901234567890123456789012345678901234',
    active_block_height: 12345679,
    status_since: 1700000100,
    node_operator_address: 'thor1operatordef456789012345',
    total_bond: '3000000000000',
    bond_providers: {
      node_operator_fee: '1500',
      providers: [
        { bond_address: 'thor1user123456789abcdef', bond: '1500000000000' },
      ],
    },
    signer_membership: ['02def45678901234567890123456789012345678901234567890123456789012'],
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '10.0.0.2',
    version: '2.3.0',
    slash_points: 0,
    jail: {},
    current_award: '350000000', // Different from node 1
    observe_chains: [{ chain: 'ETH', height: 950000 }],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
  },
];

describe('useBondPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(midgard.getHealth).mockResolvedValue({ lastThorNode: { height: 12345678 } });
  });

  it('returns empty positions when address is null', async () => {
    const { result } = renderHook(() => useBondPositions(null), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.positions).toEqual([]);
    expect(thornode.getAllNodes).not.toHaveBeenCalled();
    expect(midgard.getHealth).not.toHaveBeenCalled();
  });

  it('returns empty positions when user has no bonds', async () => {
    vi.mocked(thornode.getAllNodes).mockResolvedValueOnce(mockNodes as unknown as thornode.NodeRaw[]);
    vi.mocked(midgard.getHealth).mockResolvedValueOnce({ lastThorNode: { height: 12345678 } });

    const { result } = renderHook(() => useBondPositions('thor1noBondsHere'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.positions).toEqual([]);
  });
  it('extracts bond positions for user address', async () => {
    vi.mocked(thornode.getAllNodes).mockResolvedValueOnce(mockNodes as unknown as thornode.NodeRaw[]);
    vi.mocked(midgard.getHealth).mockResolvedValueOnce({ lastThorNode: { height: 12345678 } });

    const { result } = renderHook(() => useBondPositions('thor1user123456789abcdef'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // User has bonds in 2 nodes
    expect(result.current.positions.length).toBe(2);
    expect(result.current.positions[0].nodeAddress).toBe('thor1abc123def456');
    expect(result.current.positions[0].status).toBe('Active');
    expect(result.current.positions[1].nodeAddress).toBe('thor1def456ghi789');
    expect(result.current.positions[1].status).toBe('Active');
  });

  it('does not request stale OptimalBondD constants for bond position risk flags', async () => {
    vi.mocked(thornode.getAllNodes).mockResolvedValueOnce(mockNodes as unknown as thornode.NodeRaw[]);
    vi.mocked(thornode.getNetworkConstants).mockResolvedValueOnce({
      int_64_values: { OptimalBondD: 2507476277808 },
      bool_values: {},
      string_values: {},
    });
    vi.mocked(midgard.getHealth).mockResolvedValueOnce({ lastThorNode: { height: 12345678 } });

    const { result } = renderHook(() => useBondPositions('thor1user123456789abcdef'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(thornode.getNetworkConstants).not.toHaveBeenCalled();
    expect(result.current.positions[0].yieldGuardFlags).not.toContain('overbonded');
  });

  it('handles error state', async () => {
    vi.mocked(thornode.getAllNodes).mockRejectedValueOnce(new Error('API error'));
    vi.mocked(midgard.getHealth).mockResolvedValueOnce({ lastThorNode: { height: 12345678 } });

    const { result } = renderHook(() => useBondPositions('thor1user123456789abcdef'), { wrapper });
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
    
    expect(result.current.positions).toEqual([]);
  });

  // NEW TEST: Verify per-node APY uses node.current_award
  it('calculates per-node APY using node.current_award', async () => {
    vi.mocked(thornode.getAllNodes).mockResolvedValueOnce(mockNodes as unknown as thornode.NodeRaw[]);
    vi.mocked(midgard.getHealth).mockResolvedValueOnce({ lastThorNode: { height: 12345678 } });

    const { result } = renderHook(() => useBondPositions('thor1user123456789abcdef'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Node 1 has current_award: '250000000'
    // APY should be calculated from this value, not a flat network rate
    expect(result.current.positions[0].netAPY).toBeGreaterThan(0);
    expect(result.current.positions[0].netAPY).toBeLessThan(100); // Reasonable APY range
  });

  // NEW TEST: Verify different nodes get different APYs
  it('returns different APYs for nodes with different current_award', async () => {
    vi.mocked(thornode.getAllNodes).mockResolvedValueOnce(mockNodes as unknown as thornode.NodeRaw[]);
    vi.mocked(midgard.getHealth).mockResolvedValueOnce({ lastThorNode: { height: 12345678 } });

    const { result } = renderHook(() => useBondPositions('thor1user123456789abcdef'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // User has bonds in both nodes (same address)
    // Node 1: current_award: '250000000'
    // Node 2: current_award: '350000000'
    // They should have DIFFERENT APY values
    const node1 = result.current.positions.find(p => p.nodeAddress === 'thor1abc123def456');
    const node2 = result.current.positions.find(p => p.nodeAddress === 'thor1def456ghi789');
    
    // Both should exist
    expect(node1).toBeDefined();
    expect(node2).toBeDefined();
    
    // APYs should be different (different current_award)
    if (node1 && node2) {
      expect(node1.netAPY).not.toBe(node2.netAPY);
    }
  });

  it('derives mock current_award from intended APY instead of total bond size', () => {
    expect(__getMockCurrentAwardForTests({ netAPY: 0.125 })).toBe('0.125');
    expect(__getMockCurrentAwardForTests({ netAPY: 12.5 })).toBe('0.125');
    expect(Number(__getMockCurrentAwardForTests({ netAPY: 0.125 }))).toBeLessThan(1e7);
  });
});
