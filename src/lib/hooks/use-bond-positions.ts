import useSWR from 'swr';
import { getAllNodes, type NodeRaw } from '@/lib/api/thornode';
import { extractBondPositions, type BondPosition } from '@/lib/types/node';

export function useBondPositions(address: string | null) {
  const { data, error, isLoading, mutate } = useSWR<NodeRaw[]>(
    'nodes',
    () => getAllNodes(),
    { 
      refreshInterval: 60_000,
      errorRetryInterval: 5000,
    }
  );

  const positions: BondPosition[] = data && address
    ? extractBondPositions(data, address)
    : [];

  return {
    positions,
    isLoading,
    error,
    mutate,
  };
}
