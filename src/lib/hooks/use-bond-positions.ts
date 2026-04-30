import useSWR from 'swr';
import { getAllNodes, type NodeRaw } from '@/lib/api/thornode';
import { getNetworkConstants } from '@/lib/api/thornode';
import { extractBondPositions, type BondPosition, type YieldGuardFlag } from '@/lib/types/node';
import { getHealth } from '@/lib/api/midgard';
import { NETWORK } from '@/lib/config';
import { runeToNumber } from '@/lib/utils/formatters';
import { MOCK_BOND_POSITIONS, isDevelopmentMode } from '../mock-data';

function buildMockNodes(address: string | null): NodeRaw[] {
  const bondAddress = address ?? 'thor1mockbondaddress000000000000000000000000';

  return MOCK_BOND_POSITIONS.map((position, index) => {
    const totalBond = typeof position.bondAmount === 'string' ? position.bondAmount : String(position.bondAmount);

    return {
      node_address: position.nodeAddress,
      status: position.status,
      pub_key_set: { secp256k1: '', ed25519: '' },
      validator_cons_pub_key: '',
      peer_id: '',
      active_block_height: 1234567,
      status_since: 1234500 - index * 100,
      node_operator_address: `thor1mockoperator${index + 1}`,
      total_bond: totalBond,
      bond_providers: {
        node_operator_fee: String(position.operatorFee),
        providers: [{ bond_address: bondAddress, bond: totalBond }],
      },
      signer_membership: null,
      requested_to_leave: false,
      forced_to_leave: false,
      leave_height: 0,
      ip_address: '',
      version: 'v1.0.0',
      slash_points: position.slashPoints,
      jail: {},
      current_award: String(BigInt(totalBond) / 10n),
      observe_chains: null,
      preflight_status: { status: 'ready', reason: '', code: 0 },
      maintenance: false,
      missing_blocks: 0,
    };
  });
}

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
  const minBond = Math.min(...activeNodes.map(n => runeToNumber(n.total_bond)));
  const oldestStatusSince = Math.min(...activeNodes.map(n => n.status_since));

  for (const pos of positions) {
    const nodeFlags: YieldGuardFlag[] = [];
    const node = allNodes.find(n => n.node_address === pos.nodeAddress);
    if (!node || node.status !== 'Active') continue;

    const totalBond = runeToNumber(node.total_bond);
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
  const useMockData = isDevelopmentMode();
  const mockNodes = useMockData ? buildMockNodes(address) : null;

  const { data: nodes, error, isLoading, mutate } = useSWR<NodeRaw[]>(
    useMockData ? null : 'nodes',
    () => getAllNodes(),
    { 
      refreshInterval: NETWORK.REFRESH_INTERVALS.bondPositions,
      errorRetryInterval: 5000,
    }
  );

  const { data: constants } = useSWR(
    useMockData ? null : address ? 'network-constants' : null,
    () => getNetworkConstants(),
    { revalidateOnFocus: false, refreshInterval: NETWORK.REFRESH_INTERVALS.price }
  );

  const { data: healthData } = useSWR(
    useMockData ? null : 'health',
    () => getHealth(),
    { refreshInterval: NETWORK.REFRESH_INTERVALS.health }
  );

  const currentBlockHeight = useMockData
    ? 1234567
    : healthData?.lastThorNode?.height ?? nodes?.[0]?.active_block_height ?? 0;

  const positions: BondPosition[] = (useMockData ? mockNodes : nodes) && address
    ? extractBondPositions(useMockData ? mockNodes! : nodes!, address, currentBlockHeight)
    : [];

  const optimalBond = useMockData
    ? runeToNumber('1000000000')
    : constants?.int_64_values?.OptimalBondD
    ? runeToNumber(String(constants.int_64_values.OptimalBondD))
    : null;

  const allNodes = useMockData ? mockNodes ?? [] : nodes ?? [];
  const yieldGuardFlags = getYieldGuardFlags(positions, allNodes, optimalBond);

  const positionsWithFlags = positions.map(pos => ({
    ...pos,
    yieldGuardFlags: yieldGuardFlags.get(pos.nodeAddress) || [],
  }));

  return {
    positions: positionsWithFlags,
    isLoading: useMockData ? false : isLoading,
    error: useMockData ? undefined : error,
    mutate,
  };
}
