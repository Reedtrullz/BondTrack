import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllNodes, getThorchainVersion, type NodeRaw } from '@/lib/api/thornode';
import { useProtocolVersion } from '../use-protocol-version';

vi.mock('@/lib/api/thornode', () => ({
  getAllNodes: vi.fn(),
  getThorchainVersion: vi.fn(),
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
    vi.mocked(getThorchainVersion).mockResolvedValue({
      current: '3.19.0',
      next: '3.19.0',
      querier: '3.19.0',
    });
  });

  it('does not query THORNode when disabled', () => {
    const { result } = renderHook(() => useProtocolVersion({ enabled: false }), { wrapper });

    expect(result.current.currentVersion).toBeNull();
    expect(result.current.latestVersion).toBeNull();
    expect(result.current.hasUpgrade).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(getAllNodes).not.toHaveBeenCalled();
    expect(getThorchainVersion).not.toHaveBeenCalled();
  });

  it('compares the active node version against live THORNode version data', async () => {
    vi.mocked(getAllNodes).mockResolvedValueOnce([
      makeNode({ status: 'Standby', version: '3.18.0' }),
      makeNode({ status: 'Active', version: '3.18.0' }),
    ]);

    const { result } = renderHook(() => useProtocolVersion(), { wrapper });

    await waitFor(() => expect(result.current.currentVersion).toBe('3.18.0'));

    expect(result.current.latestVersion).toBe('3.19.0');
    expect(result.current.hasUpgrade).toBe(true);
    expect(getAllNodes).toHaveBeenCalledTimes(1);
    expect(getThorchainVersion).toHaveBeenCalledWith({ cache: 'no-store', retry: false });
  });

  it('does not warn when the active node already matches the live THORNode version', async () => {
    vi.mocked(getAllNodes).mockResolvedValueOnce([
      makeNode({ status: 'Active', version: '3.19.0' }),
    ]);

    const { result } = renderHook(() => useProtocolVersion(), { wrapper });

    await waitFor(() => expect(result.current.currentVersion).toBe('3.19.0'));

    expect(result.current.latestVersion).toBe('3.19.0');
    expect(result.current.hasUpgrade).toBe(false);
  });

  it('does not fall back to a hardcoded protocol version when THORNode version is unavailable', async () => {
    vi.mocked(getAllNodes).mockResolvedValueOnce([
      makeNode({ status: 'Active', version: '3.18.0' }),
    ]);
    vi.mocked(getThorchainVersion).mockRejectedValueOnce(new Error('version unavailable'));

    const { result } = renderHook(() => useProtocolVersion(), { wrapper });

    await waitFor(() => expect(result.current.currentVersion).toBe('3.18.0'));

    expect(result.current.latestVersion).toBeNull();
    expect(result.current.hasUpgrade).toBe(false);
  });
});
