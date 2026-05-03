import useSWR from 'swr';
import { getAllNodes, type NodeRaw } from '@/lib/api/thornode';
import { MOCK_NODES, isDevelopmentMode } from '../mock-data';

function buildMockNodes(): NodeRaw[] {
  return MOCK_NODES.map((node, index) => ({
    node_address: node.address,
    status: node.status,
    pub_key_set: { secp256k1: '', ed25519: '' },
    validator_cons_pub_key: '',
    peer_id: '',
    active_block_height: 1234567,
    status_since: 1234500 - index * 100,
    node_operator_address: `thor1mockoperator${index + 1}`,
    total_bond: node.bond,
    bond_providers: {
      node_operator_fee: String(node.operatorFee),
      providers: [{ bond_address: `thor1mockbond${index + 1}`, bond: node.bond }],
    },
    signer_membership: null,
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '',
    version: 'v1.0.0',
    slash_points: node.slashPoints,
    jail: {},
    current_award: '0',
    observe_chains: null,
    preflight_status: { status: 'ready', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
  }));
}

export function useAllNodes() {
  const useMockData = isDevelopmentMode();
  const { data, error, isLoading, mutate } = useSWR<NodeRaw[]>(
    useMockData ? null : 'nodes',
    () => getAllNodes(),
    {
      refreshInterval: 60_000,
      errorRetryInterval: 5_000,
    }
  );

  return {
    data: useMockData ? buildMockNodes() : data,
    error: useMockData ? undefined : error,
    isLoading: useMockData ? false : isLoading,
    mutate,
  };
}
