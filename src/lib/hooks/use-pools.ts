import useSWR from 'swr';
import { getPools, type PoolDetailRaw } from '@/lib/api/midgard';

export function usePools() {
  const { data, error, isLoading, mutate } = useSWR<PoolDetailRaw[]>(
    'pools',
    () => getPools(),
    {
      refreshInterval: 60_000,
      errorRetryInterval: 5_000,
    }
  );

  return {
    pools: data ?? [],
    error: error ? 'Failed to load pools' : null,
    isLoading,
    mutate,
  };
}
