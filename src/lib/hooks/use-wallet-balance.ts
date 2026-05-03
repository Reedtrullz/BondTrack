import useSWR from 'swr';
import { fetchThornode } from '@/lib/api/client';
import { runeToNumber } from '@/lib/utils/formatters';

interface BalanceResponse {
  balances: Array<{
    denom: string;
    amount: string;
  }>;
}

export function useWalletBalance(address: string | null) {
  const { data, error, isLoading } = useSWR(
    address ? ['wallet-balance', address] : null,
    () => fetchThornode<BalanceResponse>(`/cosmos/bank/v1beta1/balances/${address}`),
    {
      refreshInterval: 60_000,
      errorRetryInterval: 5000,
    }
  );

  if (error || !data) {
    return { balance: null, isLoading };
  }

  const runeBalance = data.balances.find((b) => b.denom === 'rune');
  const balance = runeBalance ? runeToNumber(runeBalance.amount) : null;

  return {
    balance,
    isLoading,
  };
}
