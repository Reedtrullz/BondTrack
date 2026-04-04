import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { useBondPositions } from '../use-bond-positions';
import * as thornode from '@/lib/api/thornode';

vi.mock('@/lib/api/thornode');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

const mockNodes = [
  {
    node_address: 'thor1abc123def456',
    status: 'Active',
    pub_key_set: { secp256k1: '03a2bcde3f45678901234567890123456789012345678901234567890123456', ed25519: '02b3e5ef789012345678901234567890123456789012345678901234567890123' },
    validator_cons_pub_key: 'thorvalconspub1zcjduepq2w6r4z2h3ujnsn3e8qjjjl7r2h9u2d4z2h3ujnsn3e8qjjjl7r2h9u2d',
    peer_id: '16Uvh8Eh8J3fG3YDCK4f4W2c5b6d7e8f9a0b1c2d3e4f',
    active_block_height: 12345678,
    status_since: 1700000000000000000,
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
];

describe('useBondPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty positions when address is null', () => {
    const { result } = renderHook(() => useBondPositions(null), { wrapper });

    expect(result.current.positions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns empty positions when user has no bonds', async () => {
    vi.mocked(thornode.getAllNodes).mockResolvedValueOnce(mockNodes as any);

    const { result } = renderHook(() => useBondPositions('thor1noBondsHere'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.positions).toEqual([]);
  });

  it('extracts bond positions for user address', async () => {
    vi.mocked(thornode.getAllNodes).mockResolvedValueOnce(mockNodes as any);

    const { result } = renderHook(() => useBondPositions('thor1user123456789abcdef'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.positions.length).toBe(1);
    expect(result.current.positions[0].nodeAddress).toBe('thor1abc123def456');
    expect(result.current.positions[0].status).toBe('Active');
  });

  it('handles error state', async () => {
    vi.mocked(thornode.getAllNodes).mockRejectedValueOnce(new Error('API error'));

    const { result } = renderHook(() => useBondPositions('thor1user123456789abcdef'), { wrapper });
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
    
    expect(result.current.positions).toEqual([]);
  });
});
