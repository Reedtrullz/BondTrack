import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet } from '../use-wallet';

describe('useWallet', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as any).keplr;
    delete (window as any).xfi;
  });

  it('returns initial disconnected state', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.walletType).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('detects no wallet when none installed', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toBeNull();
  });

  it('detects Keplr wallet when installed', () => {
    (window as any).keplr = { enable: vi.fn() };
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toBe('keplr');
  });

  it('detects XDEFI wallet when installed', () => {
    (window as any).xfi = { thorchain: { request: vi.fn() } };
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toBe('xdefi');
  });

  it('prioritizes Keplr over XDEFI', () => {
    (window as any).keplr = { enable: vi.fn() };
    (window as any).xfi = { thorchain: { request: vi.fn() } };
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toBe('keplr');
  });

  it('connects with Keplr wallet', async () => {
    const mockAddress = 'thor1test123456789abcdef';
    (window as any).keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-mainnet-v1'),
      getKey: vi.fn().mockResolvedValue({ bech32Address: mockAddress }),
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('keplr');
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.address).toBe(mockAddress);
    expect(result.current.walletType).toBe('keplr');
  });

  it('connects with XDEFI wallet', async () => {
    const mockAddress = 'thor1xdefi123456789abcdef';
    (window as any).xfi = {
      thorchain: {
        request: vi.fn().mockResolvedValue(mockAddress),
      },
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('xdefi');
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.address).toBe(mockAddress);
    expect(result.current.walletType).toBe('xdefi');
  });

  it('disconnects and clears state', async () => {
    const mockAddress = 'thor1test123456789abcdef';
    (window as any).keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-mainnet-v1'),
      getKey: vi.fn().mockResolvedValue({ bech32Address: mockAddress }),
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('keplr');
    });
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.walletType).toBeNull();
  });

  it('handles network mismatch', async () => {
    const mockAddress = 'thor1test123456789abcdef';
    (window as any).keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-stagenet-v2'),
      getKey: vi.fn().mockResolvedValue({ bech32Address: mockAddress }),
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('keplr');
    });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isNetworkMismatch).toBe(true);
  });

  it('handles connection error', async () => {
    (window as any).keplr = {
      enable: vi.fn().mockRejectedValue(new Error('User rejected')),
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('keplr');
    });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.isConnected).toBe(false);
  });
});
