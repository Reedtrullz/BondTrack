import useSWR from 'swr';
import { getNetwork, type NetworkRaw } from '@/lib/api/midgard';

export function useNetworkMetrics() {
  const { data, error, isLoading, mutate } = useSWR<NetworkRaw>(
    'network-metrics',
    () => getNetwork(),
    {
      refreshInterval: 60_000,
      errorRetryInterval: 5_000,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
