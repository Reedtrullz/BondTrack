import useSWR from 'swr';
import { getHealth, type HealthRaw } from '@/lib/api/midgard';

export function useCurrentBlockHeight() {
  const { data, error, isLoading, mutate } = useSWR<HealthRaw>(
    'current-block-height',
    () => getHealth(),
    {
      refreshInterval: 30_000,
      errorRetryInterval: 5_000,
    }
  );

  return {
    data,
    currentBlockHeight: data?.lastThorNode?.height ?? 0,
    isLoading,
    error,
    mutate,
  };
}