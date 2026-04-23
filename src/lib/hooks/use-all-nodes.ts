import useSWR from 'swr';
import { getAllNodes, type NodeRaw } from '@/lib/api/thornode';

export function useAllNodes() {
  const { data, error, isLoading, mutate } = useSWR<NodeRaw[]>(
    'nodes',
    () => getAllNodes(),
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
