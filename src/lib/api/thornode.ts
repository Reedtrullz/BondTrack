import { fetchThornode } from './client';

export interface BondProviderRaw {
  bond_address: string;
  bond: string;
}

export interface BondProvidersRaw {
  node_operator_fee: string;
  providers: BondProviderRaw[];
}

export interface NodeRaw {
  node_address: string;
  status: string;
  pub_key_set: {
    secp256k1: string;
    ed25519: string;
  };
  validator_cons_pub_key: string;
  peer_id: string;
  active_block_height: number;
  status_since: number;
  node_operator_address: string;
  total_bond: string;
  bond_providers: BondProvidersRaw;
  signer_membership: string[] | null;
  requested_to_leave: boolean;
  forced_to_leave: boolean;
  leave_height: number;
  ip_address: string;
  version: string;
  slash_points: number;
  jail: { release_height: number; reason: string } | Record<string, never>;
  current_award: string;
  observe_chains: { chain: string; height: number }[] | null;
  preflight_status: { status: string; reason: string; code: number };
  maintenance: boolean;
  missing_blocks: number;
}

export interface NetworkConstantsRaw {
  int_64_values: Record<string, number>;
  bool_values: Record<string, boolean>;
  string_values: Record<string, string>;
}

export interface SupplyRaw {
  circulating: number;
  locked: {
    reserve: number;
  };
  total: number;
}

export async function getAllNodes(init?: RequestInit): Promise<NodeRaw[]> {
  return fetchThornode<NodeRaw[]>('/thorchain/nodes', init);
}

export async function getNode(address: string): Promise<NodeRaw> {
  return fetchThornode<NodeRaw>(`/thorchain/node/${address}`);
}

export async function getNetworkConstants(init?: RequestInit): Promise<NetworkConstantsRaw> {
  return fetchThornode<NetworkConstantsRaw>('/thorchain/constants', init);
}

export async function getSupply(): Promise<SupplyRaw> {
  return fetchThornode<SupplyRaw>('/thorchain/supply');
}
