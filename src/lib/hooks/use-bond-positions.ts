import useSWR from 'swr';
import { getAllNodes, type NodeRaw } from '@/lib/api/thornode';
import { getHealth } from '@/lib/api/midgard';
import { extractBondPositions, type BondPosition, type YieldGuardFlag } from '@/lib/types/node';
import { NETWORK } from '@/lib/config';
import { rawRuneToPositiveDisplayNumber } from '@/lib/utils/formatters';
import {
  MOCK_ACTIVE_OPERATOR_ADDRESS,
  MOCK_BOND_POSITIONS,
  MOCK_PROVIDER_ADDRESS,
  MOCK_STANDBY_OPERATOR_ADDRESS,
  isDevelopmentMode,
} from '../mock-data';

function getMockCurrentAward(position: { netAPY: number }): string {
  const apyDecimal = position.netAPY > 1 ? position.netAPY / 100 : position.netAPY;
  return String(apyDecimal);
}

export function __getMockCurrentAwardForTests(position: { netAPY: number }): string {
  return getMockCurrentAward(position);
}

function buildMockNodes(address: string | null): NodeRaw[] {
  const bondAddress = address ?? MOCK_PROVIDER_ADDRESS;
  const operatorAddresses = [MOCK_ACTIVE_OPERATOR_ADDRESS, MOCK_STANDBY_OPERATOR_ADDRESS];

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
      node_operator_address: operatorAddresses[index] ?? MOCK_ACTIVE_OPERATOR_ADDRESS,
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
      current_award: getMockCurrentAward(position),
      observe_chains: null,
      preflight_status: { status: 'ready', reason: '', code: 0 },
      maintenance: false,
      missing_blocks: 0,
    };
  });
}

function getYieldGuardFlags(
  positions: BondPosition[],
  allNodes: NodeRaw[]
): Map<string, YieldGuardFlag[]> {
  const flags = new Map<string, YieldGuardFlag[]>();
  if (positions.length === 0 || allNodes.length === 0) return flags;

  const activeNodes = allNodes.filter((n) => n.status === 'Active');
  if (activeNodes.length === 0) return flags;

  const maxSlash = Math.max(...activeNodes.map((n) => n.slash_points));
  const usableBondByNodeAddress = new Map(
    activeNodes
      .map((node) => [node.node_address, rawRuneToPositiveDisplayNumber(node.total_bond)] as const)
      .filter((entry): entry is readonly [string, number] => entry[1] !== null)
  );
  const usableBondValues = [...usableBondByNodeAddress.values()];
  const minBond = usableBondValues.length > 0 ? Math.min(...usableBondValues) : null;
  const oldestStatusSince = Math.min(...activeNodes.map((n) => n.status_since));

  for (const pos of positions) {
    const nodeFlags: YieldGuardFlag[] = [];
    const node = allNodes.find((n) => n.node_address === pos.nodeAddress);
    if (!node || node.status !== 'Active') continue;

    const totalBond = usableBondByNodeAddress.get(node.node_address);
    if (node.slash_points >= maxSlash && maxSlash > 0) {
      nodeFlags.push('highest_slash');
    }
    if (totalBond !== undefined && minBond !== null && totalBond <= minBond) {
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
  const shouldFetchLiveData = Boolean(address) && !useMockData;
  const mockNodes = useMockData && address ? buildMockNodes(address) : null;

  const { data: nodes, error, isLoading, mutate } = useSWR<NodeRaw[]>(
    shouldFetchLiveData ? 'nodes' : null,
    () => getAllNodes(),
    {
      refreshInterval: NETWORK.REFRESH_INTERVALS.bondPositions,
      errorRetryInterval: 5000,
    }
  );

  const { data: healthData, error: healthError, isLoading: healthLoading } = useSWR(
    shouldFetchLiveData ? 'health' : null,
    () => getHealth(),
    { refreshInterval: NETWORK.REFRESH_INTERVALS.health }
  );

  const currentBlockHeight = useMockData
    ? 1234567
    : healthData?.lastThorNode?.height;
  const hasTrustedCurrentHeight = useMockData || (
    typeof currentBlockHeight === 'number' &&
    Number.isFinite(currentBlockHeight) &&
    currentBlockHeight > 0
  );
  const trustedCurrentBlockHeight = hasTrustedCurrentHeight && typeof currentBlockHeight === 'number'
    ? currentBlockHeight
    : null;

  const positions: BondPosition[] = (useMockData ? mockNodes : nodes) && address && trustedCurrentBlockHeight !== null
    ? extractBondPositions(useMockData ? mockNodes! : nodes!, address, trustedCurrentBlockHeight)
    : [];

  const allNodes = useMockData ? mockNodes ?? [] : nodes ?? [];
  const yieldGuardFlags = getYieldGuardFlags(positions, allNodes);

  const positionsWithFlags = positions.map((pos) => ({
    ...pos,
    yieldGuardFlags: yieldGuardFlags.get(pos.nodeAddress) || [],
  }));

  return {
    positions: positionsWithFlags,
    isLoading: shouldFetchLiveData ? isLoading || healthLoading : false,
    error: useMockData ? undefined : error || healthError,
    mutate,
  };
}
