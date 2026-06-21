import useSWR from 'swr';
import { fetchThornode } from '@/lib/api/client';

interface BalanceResponse {
  balances: Array<{
    denom: string;
    amount: string;
  }>;
}

export type WalletBalanceStatus = 'idle' | 'loading' | 'available' | 'unavailable';

export interface WalletBalanceState {
  balance: number | null;
  isLoading: boolean;
  status: WalletBalanceStatus;
  error: unknown;
}

function parseRuneBalanceAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  try {
    const value = Number(BigInt(trimmed)) / 100_000_000;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function useWalletBalance(address: string | null): WalletBalanceState {
  const { data, error, isLoading } = useSWR(
    address ? ['wallet-balance', address] : null,
    () => fetchThornode<BalanceResponse>(`/cosmos/bank/v1beta1/balances/${address}`),
    {
      refreshInterval: 60_000,
      errorRetryInterval: 5000,
    }
  );

  if (!address) {
    return { balance: null, isLoading: false, status: 'idle', error: null };
  }

  if (error) {
    return { balance: null, isLoading, status: 'unavailable', error };
  }

  if (!data) {
    return {
      balance: null,
      isLoading,
      status: isLoading ? 'loading' : 'unavailable',
      error: null,
    };
  }

  const runeBalance = data.balances.find((b) => b.denom === 'rune');
  const balance = runeBalance ? parseRuneBalanceAmount(runeBalance.amount) : 0;

  if (balance === null) {
    return { balance: null, isLoading, status: 'unavailable', error: null };
  }

  return {
    balance,
    isLoading,
    status: 'available',
    error: null,
  };
}
