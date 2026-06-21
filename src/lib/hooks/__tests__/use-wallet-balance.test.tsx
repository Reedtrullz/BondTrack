import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchThornode } from '@/lib/api/client';
import { useWalletBalance } from '../use-wallet-balance';

vi.mock('@/lib/api/client', () => ({
  fetchThornode: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe('useWalletBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the root Cosmos bank balance path and converts rune base units to RUNE', async () => {
    const address = 'thor1validbalanceaddress1234567890abcdef';
    vi.mocked(fetchThornode).mockResolvedValueOnce({
      balances: [
        { denom: 'rune', amount: '1234567890' },
        { denom: 'other', amount: '9999999999' },
      ],
    });

    const { result } = renderHook(() => useWalletBalance(address), { wrapper });

    await waitFor(() => {
      expect(result.current.balance).toBe(12.3456789);
      expect(result.current.status).toBe('available');
    });

    expect(fetchThornode).toHaveBeenCalledWith(`/cosmos/bank/v1beta1/balances/${address}`);
    expect(fetchThornode).not.toHaveBeenCalledWith(expect.stringContaining('/thorchain/cosmos/'));
    expect(result.current.isLoading).toBe(false);
  });

  it('treats a missing RUNE denom as a zero connected-wallet balance', async () => {
    const address = 'thor1zerobalanceaddress1234567890abcdef';
    vi.mocked(fetchThornode).mockResolvedValueOnce({
      balances: [
        { denom: 'other', amount: '9999999999' },
      ],
    });

    const { result } = renderHook(() => useWalletBalance(address), { wrapper });

    await waitFor(() => {
      expect(result.current.balance).toBe(0);
      expect(result.current.status).toBe('available');
    });
  });

  it('marks malformed wallet RUNE balances unavailable instead of turning them into zero', async () => {
    const address = 'thor1malformedbalanceaddress1234567890abcdef';
    vi.mocked(fetchThornode).mockResolvedValueOnce({
      balances: [
        { denom: 'rune', amount: 'not-a-rune-base-unit-amount' },
      ],
    });

    const { result } = renderHook(() => useWalletBalance(address), { wrapper });

    await waitFor(() => {
      expect(result.current.balance).toBeNull();
      expect(result.current.status).toBe('unavailable');
    });
  });

  it('marks wallet balance source failures unavailable', async () => {
    const address = 'thor1failedbalanceaddress1234567890abcdef';
    vi.mocked(fetchThornode).mockRejectedValueOnce(new Error('THORNode balance unavailable'));

    const { result } = renderHook(() => useWalletBalance(address), { wrapper });

    await waitFor(() => {
      expect(result.current.balance).toBeNull();
      expect(result.current.status).toBe('unavailable');
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  it('does not request a balance when no wallet address is available', () => {
    const { result } = renderHook(() => useWalletBalance(null), { wrapper });

    expect(fetchThornode).not.toHaveBeenCalled();
    expect(result.current.balance).toBeNull();
    expect(result.current.status).toBe('idle');
  });
});
