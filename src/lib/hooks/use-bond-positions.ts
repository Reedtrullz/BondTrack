import useSWR from 'swr';
import { getAllNodes, type NodeRaw } from '@/lib/api/thornode';
import { getNetworkConstants } from '@/lib/api/thornode';
import { extractBondPositions, type BondPosition } from '@/lib/types/node';

export type YieldGuardFlag = 'overbonded' | 'highest_slash' | 'lowest_bond' | 'oldest' | 'leaving';

function getYieldGuardFlags(
  positions: BondPosition[],
  allNodes: NodeRaw[],
  optimalBond: number | null
): Map<string, YieldGuardFlag[]> {
  const flags = new Map<string, YieldGuardFlag[]>();
  if (positions.length === 0 || allNodes.length === 0) return flags;

  const activeNodes = allNodes.filter(n => n.status === 'Active');
  if (activeNodes.length === 0) return flags;

  const maxSlash = Math.max(...activeNodes.map(n => n.slash_points));
  const minBond = Math.min(...activeNodes.map(n => Number(n.total_bond)));
  const oldestStatusSince = Math.min(...activeNodes.map(n => n.status_since));

  for (const pos of positions) {
    const nodeFlags: YieldGuardFlag[] = [];
    const node = allNodes.find(n => n.node_address === pos.nodeAddress);
    if (!node || node.status !== 'Active') continue;

    const totalBond = Number(node.total_bond);
    if (optimalBond && totalBond >= optimalBond) {
      nodeFlags.push('overbonded');
    }
    if (node.slash_points >= maxSlash && maxSlash > 0) {
      nodeFlags.push('highest_slash');
    }
    if (totalBond <= minBond) {
      nodeFlags.push('lowest_bond');
    }
    if (node.status_since <= oldestStatusSince) {
      nodeFlags.push('oldest');
    }
    if (node.requested_to_leave) {
      nodeFlags.push('leaving');
    }

    if (nodeFlags.length > 0) {
      flags.set(pos.nodeAddress, nodeFlags);
    }
  }

  return flags;
}

export function useBondPositions(address: string | null) {
  const { data: nodes, error, isLoading, mutate } = useSWR<NodeRaw[]>(
    'nodes',
    () => getAllNodes(),
    { 
      refreshInterval: 60_000,
      errorRetryInterval: 5000,
    }
  );

  const { data: constants } = useSWR(
    'network-constants',
    () => getNetworkConstants(),
    { revalidateOnFocus: false, refreshInterval: 300_000 }
  );

  const positions: BondPosition[] = nodes && address
    ? extractBondPositions(nodes, address)
    : [];

  const optimalBond = constants?.int_64_values?.OptimalBondD
    ? Number(constants.int_64_values.OptimalBondD) / 1e8
    : null;

  const yieldGuardFlags = getYieldGuardFlags(positions, nodes || [], optimalBond);

  const positionsWithFlags = positions.map(pos => ({
    ...pos,
    yieldGuardFlags: yieldGuardFlags.get(pos.nodeAddress) || [],
  }));

  return {
    positions: positionsWithFlags,
    isLoading,
    error,
    mutate,
  };
}
