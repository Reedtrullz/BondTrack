import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet } from '../use-wallet';

const VALID_WALLET_ADDRESS = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
const VALID_XDEFI_ADDRESS = 'thor1qvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcryqlpe5';
const VALID_VULTISIG_ADDRESS = 'thor1qszqgpqyqszqgpqyqszqgpqyqszqgpqyyscy7g';
const VALID_LEDGER_ADDRESS = 'thor1qvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcryqlpe5';

const ledgerMocks = vi.hoisted(() => ({
  broadcastUnavailableMessage: 'Ledger is connected for THORChain address and balance review only. Heimdall does not broadcast BOND or UNBOND with Ledger until THORChain MsgDeposit signing is hardware-verified.',
  connect: vi.fn(),
  support: {
    supported: false as boolean,
    reason: 'Ledger requires WebHID. Use Chrome, Edge, Brave, or another Chromium browser with WebHID enabled.' as string | null,
  },
}));

const LEDGER_BROADCAST_UNAVAILABLE_MESSAGE = ledgerMocks.broadcastUnavailableMessage;

vi.mock('@/lib/wallet/ledger-thorchain', () => ({
  LEDGER_BROADCAST_UNAVAILABLE_MESSAGE: ledgerMocks.broadcastUnavailableMessage,
  connectLedgerThorchainAddress: ledgerMocks.connect,
  getLedgerBrowserSupport: () => ledgerMocks.support,
}));

describe('useWallet', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    ledgerMocks.connect.mockReset();
    ledgerMocks.support = {
      supported: false,
      reason: 'Ledger requires WebHID. Use Chrome, Edge, Brave, or another Chromium browser with WebHID enabled.',
    };
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

      await waitFor(() => expect(result.current.availableWallets).toContain('keplr'));
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

    expect(result.current.availableWallets).toEqual([]);
  });

  it('detects Keplr wallet when installed', () => {
    (window as unknown as Record<string, unknown>).keplr = { enable: vi.fn() };
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toEqual(['keplr']);
  });

  it('detects XDEFI wallet when installed', () => {
    (window as unknown as Record<string, unknown>).xfi = { thorchain: { request: vi.fn() } };
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toEqual(['xdefi']);
  });

  it('detects multiple injected wallets instead of hiding later providers', () => {
    (window as unknown as Record<string, unknown>).keplr = { enable: vi.fn() };
    (window as unknown as Record<string, unknown>).xfi = { thorchain: { request: vi.fn() } };
    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toEqual(['keplr', 'xdefi']);
  });

  it('detects Ledger when WebHID is available', () => {
    ledgerMocks.support = { supported: true, reason: null };

    const { result } = renderHook(() => useWallet());

    expect(result.current.availableWallets).toEqual(['ledger']);
    expect(result.current.walletOptions.find((option) => option.type === 'ledger')).toEqual({
      type: 'ledger',
      detected: true,
      connectable: true,
      capability: 'address-only',
      unavailableReason: null,
    });
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
    const request = vi.fn().mockResolvedValue({ accounts: [{ address: VALID_VULTISIG_ADDRESS }] });
    (window as unknown as Record<string, unknown>).vultisig = {
      thorchain: {
        request,
      },
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('vultisig');
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.address).toBe(VALID_VULTISIG_ADDRESS);
    expect(result.current.walletType).toBe('vultisig');
    expect(request).toHaveBeenCalledWith({ method: 'request_accounts' });
  });

  it('falls back to the legacy Vultisig connect method when request_accounts is unsupported', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'request_accounts') {
        const error = new Error('Unsupported method');
        (error as Error & { code?: number }).code = 4200;
        throw error;
      }
      if (method === 'get_accounts') {
        const error = new Error('Unsupported method');
        (error as Error & { code?: number }).code = 4200;
        throw error;
      }
      if (method === 'connect') return VALID_VULTISIG_ADDRESS;
      throw new Error(`Unexpected Vultisig method: ${method}`);
    });
    (window as unknown as Record<string, unknown>).thorchain = { request };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('vultisig');
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.address).toBe(VALID_VULTISIG_ADDRESS);
    expect(result.current.walletType).toBe('vultisig');
    expect(request).toHaveBeenNthCalledWith(1, { method: 'request_accounts' });
    expect(request).toHaveBeenNthCalledWith(2, { method: 'get_accounts' });
    expect(request).toHaveBeenNthCalledWith(3, { method: 'connect' });
  });

  it('uses connected Vultisig accounts before falling back to legacy connect when request_accounts is unsupported', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'request_accounts') {
        const error = new Error('Unsupported method');
        (error as Error & { code?: number }).code = 4200;
        throw error;
      }
      if (method === 'get_accounts') return [VALID_VULTISIG_ADDRESS];
      throw new Error(`Unexpected Vultisig method: ${method}`);
    });
    (window as unknown as Record<string, unknown>).thorchain = { request };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('vultisig');
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.address).toBe(VALID_VULTISIG_ADDRESS);
    expect(result.current.walletType).toBe('vultisig');
    expect(request).toHaveBeenNthCalledWith(1, { method: 'request_accounts' });
    expect(request).toHaveBeenNthCalledWith(2, { method: 'get_accounts' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('prompts legacy Vultisig connect when passive account lookup returns no account', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'request_accounts') {
        const error = new Error('Unsupported method');
        (error as Error & { code?: number }).code = 4200;
        throw error;
      }
      if (method === 'get_accounts') return [];
      if (method === 'connect') return VALID_VULTISIG_ADDRESS;
      throw new Error(`Unexpected Vultisig method: ${method}`);
    });
    (window as unknown as Record<string, unknown>).thorchain = { request };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('vultisig');
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.address).toBe(VALID_VULTISIG_ADDRESS);
    expect(request).toHaveBeenNthCalledWith(1, { method: 'request_accounts' });
    expect(request).toHaveBeenNthCalledWith(2, { method: 'get_accounts' });
    expect(request).toHaveBeenNthCalledWith(3, { method: 'connect' });
  });

  it('clears connected Vultisig state when the extension emits a disconnect event', async () => {
    const handlers = new Map<string, Set<() => void>>();
    const on = vi.fn((event: string, handler: () => void) => {
      handlers.set(event, new Set([...(handlers.get(event) ?? []), handler]));
    });
    const off = vi.fn((event: string, handler: () => void) => {
      handlers.get(event)?.delete(handler);
    });
    const request = vi.fn().mockResolvedValue({ accounts: [{ address: VALID_VULTISIG_ADDRESS }] });
    (window as unknown as Record<string, unknown>).vultisig = {
      thorchain: { request, on, off },
    };

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('vultisig');
    });
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    await waitFor(() => expect(handlers.has('DISCONNECT')).toBe(true));

    act(() => {
      handlers.get('DISCONNECT')?.forEach((handler) => handler());
    });

    await waitFor(() => expect(result.current.isConnected).toBe(false));
    expect(result.current.address).toBeNull();
    expect(result.current.walletType).toBeNull();
    expect(result.current.error).toBe('Vultisig disconnected. Reconnect before preview or broadcast.');
    expect(on).toHaveBeenCalledWith('DISCONNECT', expect.any(Function));
    expect(on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(off).toHaveBeenCalledWith('DISCONNECT', expect.any(Function));
    expect(off).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('connects Ledger for address review without enabling Heimdall broadcast', async () => {
    ledgerMocks.support = { supported: true, reason: null };
    ledgerMocks.connect.mockResolvedValue({
      address: VALID_LEDGER_ADDRESS,
      appVersion: '2.0.0',
      compressedPublicKey: new Uint8Array(33),
    });

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('ledger');
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.address).toBe(VALID_LEDGER_ADDRESS);
    expect(result.current.walletType).toBe('ledger');
    expect(result.current.canBroadcastTransactions).toBe(false);
    expect(result.current.walletBroadcastUnavailableReason).toBe(LEDGER_BROADCAST_UNAVAILABLE_MESSAGE);
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
