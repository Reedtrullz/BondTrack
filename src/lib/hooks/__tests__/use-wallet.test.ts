import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet } from '../use-wallet';

const VALID_WALLET_ADDRESS = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
const VALID_XDEFI_ADDRESS = 'thor1qvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcryqlpe5';
const VALID_VULTISIG_ADDRESS = 'thor1qszqgpqyqszqgpqyqszqgpqyqszqgpqyyscy7g';

describe('useWallet', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
delete (window as unknown as Record<string, unknown>).keplr;
delete (window as unknown as Record<string, unknown>).xfi;
delete (window as unknown as Record<string, unknown>).vultisig;
delete (window as unknown as Record<string, unknown>).thorchain;
  });

  it('returns initial disconnected state', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.walletType).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('keeps the wallet shell usable when browser storage is unavailable', async () => {
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    (window as unknown as Record<string, unknown>).keplr = { enable: vi.fn() };

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage denied');
      },
    });

    try {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => expect(result.current.availableWallets).toBe('keplr'));
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeNull();
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
    }
  });

  it('detects no wallet when none installed', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toBeNull();
  });

  it('detects Keplr wallet when installed', () => {
    (window as unknown as Record<string, unknown>).keplr = { enable: vi.fn() };
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toBe('keplr');
  });

  it('detects XDEFI wallet when installed', () => {
    (window as unknown as Record<string, unknown>).xfi = { thorchain: { request: vi.fn() } };
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toBe('xdefi');
  });

  it('prioritizes Keplr over XDEFI', () => {
    (window as unknown as Record<string, unknown>).keplr = { enable: vi.fn() };
    (window as unknown as Record<string, unknown>).xfi = { thorchain: { request: vi.fn() } };
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toBe('keplr');
  });

  it('connects with Keplr wallet', async () => {
    (window as unknown as Record<string, unknown>).keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-1'),
      getKey: vi.fn().mockResolvedValue({ bech32Address: VALID_WALLET_ADDRESS }),
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('keplr');
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.address).toBe(VALID_WALLET_ADDRESS);
    expect(result.current.walletType).toBe('keplr');
  });

  it('refreshes the connected Keplr account when the wallet key store changes', async () => {
    const getKey = vi.fn()
      .mockResolvedValueOnce({ bech32Address: VALID_WALLET_ADDRESS })
      .mockResolvedValueOnce({ bech32Address: VALID_XDEFI_ADDRESS });
    (window as unknown as Record<string, unknown>).keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-1'),
      getKey,
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('keplr');
    });
    await waitFor(() => expect(result.current.address).toBe(VALID_WALLET_ADDRESS));

    await act(async () => {
      window.dispatchEvent(new Event('keplr_keystorechange'));
    });

    await waitFor(() => expect(result.current.address).toBe(VALID_XDEFI_ADDRESS));
    expect(result.current.isConnected).toBe(true);
    expect(result.current.walletType).toBe('keplr');
    expect(getKey).toHaveBeenCalledTimes(2);
  });

  it('clears a stale Keplr signer when account refresh fails after a key store change', async () => {
    const getKey = vi.fn()
      .mockResolvedValueOnce({ bech32Address: VALID_WALLET_ADDRESS })
      .mockRejectedValueOnce(new Error('Keplr account unavailable'));
    (window as unknown as Record<string, unknown>).keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-1'),
      getKey,
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('keplr');
    });
    await waitFor(() => expect(result.current.address).toBe(VALID_WALLET_ADDRESS));

    await act(async () => {
      window.dispatchEvent(new Event('keplr_keystorechange'));
    });

    await waitFor(() => expect(result.current.isConnected).toBe(false));
    expect(result.current.address).toBeNull();
    expect(result.current.walletType).toBeNull();
    expect(result.current.error).toBe(
      'Keplr account changed, but Heimdall could not refresh the signer. Reconnect wallet before preview or broadcast.'
    );
    expect(getKey).toHaveBeenCalledTimes(2);
  });

  it('connects with XDEFI wallet', async () => {
    (window as unknown as Record<string, unknown>).xfi = {
      thorchain: {
        request: vi.fn().mockResolvedValue({ address: VALID_XDEFI_ADDRESS }),
      },
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('xdefi');
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.address).toBe(VALID_XDEFI_ADDRESS);
    expect(result.current.walletType).toBe('xdefi');
  });

  it('rejects wallet addresses that fail THORChain checksum validation', async () => {
    (window as unknown as Record<string, unknown>).xfi = {
      thorchain: {
        request: vi.fn().mockResolvedValue('thor1xdefi123456789abcdef'),
      },
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('xdefi');
    });

    await waitFor(() => expect(result.current.error).toBe('XDEFI returned an invalid THORChain mainnet address'));
    expect(result.current.isConnected).toBe(false);
  });

  it('connects with Vultisig wallet from account-shaped results', async () => {
    (window as unknown as Record<string, unknown>).vultisig = {
      thorchain: {
        request: vi.fn().mockResolvedValue({ accounts: [{ address: VALID_VULTISIG_ADDRESS }] }),
      },
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('vultisig');
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.address).toBe(VALID_VULTISIG_ADDRESS);
    expect(result.current.walletType).toBe('vultisig');
  });

  it('disconnects and clears state', async () => {
    (window as unknown as Record<string, unknown>).keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-1'),
      getKey: vi.fn().mockResolvedValue({ bech32Address: VALID_WALLET_ADDRESS }),
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
    (window as unknown as Record<string, unknown>).keplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getChainId: vi.fn().mockResolvedValue('thorchain-stagenet-v2'),
      getKey: vi.fn().mockResolvedValue({ bech32Address: VALID_WALLET_ADDRESS }),
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
    (window as unknown as Record<string, unknown>).keplr = {
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
