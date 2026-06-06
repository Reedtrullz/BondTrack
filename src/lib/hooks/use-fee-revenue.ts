import useSWR from 'swr';
import { getFeeRevenue, type FeeRevenueRaw } from '@/lib/api/midgard';

export function useFeeRevenue() {
  const { data, error, isLoading, mutate } = useSWR<FeeRevenueRaw>(
    'fee-revenue',
    () => getFeeRevenue(),
    {
      refreshInterval: 300_000,
      errorRetryInterval: 5_000,
    }
  );

  return {
    feeRevenue: data ?? null,
    error: error ? 'Failed to load fee revenue' : null,
    isLoading,
    mutate,
  };
}
