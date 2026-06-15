import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllNodes, type NodeRaw } from '@/lib/api/thornode';
import { useProtocolVersion } from '../use-protocol-version';

vi.mock('@/lib/api/thornode', () => ({
  getAllNodes: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

function makeNode(overrides: Partial<NodeRaw> = {}): NodeRaw {
  return {
    node_address: 'thor1protocolversionnode000000000000000000',
    status: 'Active',
    pub_key_set: { secp256k1: '', ed25519: '' },
    validator_cons_pub_key: '',
    peer_id: '',
    active_block_height: 12345678,
    status_since: 1700000000,
    node_operator_address: 'thor1protocoloperator0000000000000000',
    total_bond: '2500000000000',
    bond_providers: {
      node_operator_fee: '2000',
      providers: [],
    },
    signer_membership: null,
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '',
    version: '1.0.0',
    slash_points: 0,
    jail: {},
    current_award: '250000000',
    observe_chains: null,
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
    ...overrides,
  };
}

describe('useProtocolVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not query THORNode when disabled', () => {
    const { result } = renderHook(() => useProtocolVersion({ enabled: false }), { wrapper });

    expect(result.current.currentVersion).toBeNull();
    expect(result.current.hasUpgrade).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(getAllNodes).not.toHaveBeenCalled();
  });

  it('loads the active node version when enabled', async () => {
    vi.mocked(getAllNodes).mockResolvedValueOnce([
      makeNode({ status: 'Standby', version: '0.99.0' }),
      makeNode({ status: 'Active', version: '1.0.0' }),
    ]);

    const { result } = renderHook(() => useProtocolVersion(), { wrapper });

    await waitFor(() => expect(result.current.currentVersion).toBe('1.0.0'));

    expect(result.current.hasUpgrade).toBe(true);
    expect(getAllNodes).toHaveBeenCalledTimes(1);
  });
});
