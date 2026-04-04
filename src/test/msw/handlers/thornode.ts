import { http, HttpResponse } from 'msw';
import { NodeRaw, NetworkConstantsRaw } from '@/lib/api/thornode';

const mockNodes: NodeRaw[] = [
  {
    node_address: 'thor1abc123def456',
    status: 'Active',
    pub_key_set: {
      secp256k1: '03a2bcde3f45678901234567890123456789012345678901234567890123456',
      ed25519: '02b3e5ef789012345678901234567890123456789012345678901234567890123',
    },
    validator_cons_pub_key: 'thorvalconspub1zcjduepq2w6r4z2h3ujnsn3e8qjjjl7r2h9u2d4z2h3ujnsn3e8qjjjl7r2h9u2d',
    peer_id: '16Uvh8Eh8J3fG3YDCK4f4W2c5b6d7e8f9a0b1c2d3e4f',
    active_block_height: 12345678,
    status_since: 1700000000000000000,
    node_operator_address: 'thor1operator123456789abcdef',
    total_bond: '2507476277808',
    bond_providers: {
      node_operator_fee: '2000',
      providers: [
        {
          bond_address: 'thor1provider123456789abcdef',
          bond: '1253738138904',
        },
        {
          bond_address: 'thor1provider2abcdef123456789',
          bond: '1253738138904',
        },
      ],
    },
    signer_membership: ['02a1bcde3f45678901234567890123456789012345678901234567890123456'],
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '10.0.0.1',
    version: '2.3.0',
    slash_points: 0,
    jail: {},
    current_award: '250000000',
    observe_chains: [
      { chain: 'BTC', height: 850000 },
      { chain: 'ETH', height: 19000000 },
    ],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
  },
  {
    node_address: 'thor1def456abc789',
    status: 'Active',
    pub_key_set: {
      secp256k1: '04f5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
      ed25519: '05a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
    },
    validator_cons_pub_key: 'thorvalconspub1abc123def45678901234567890123456789012345678901234567890abcdef',
    peer_id: '16Uvh8Eh8J3fG3YDCK4f4W2c5b6d7e8f9a0b1c2d3e4f',
    active_block_height: 12345675,
    status_since: 1695000000000000000,
    node_operator_address: 'thor1operator2abcdef123456',
    total_bond: '1805423456789',
    bond_providers: {
      node_operator_fee: '1500',
      providers: [
        {
          bond_address: 'thor1provider3abcdef123456789',
          bond: '1805423456789',
        },
      ],
    },
    signer_membership: null,
    requested_to_leave: true,
    forced_to_leave: false,
    leave_height: 12500000,
    ip_address: '10.0.0.2',
    version: '2.3.0',
    slash_points: 5,
    jail: {},
    current_award: '180000000',
    observe_chains: [
      { chain: 'BTC', height: 850001 },
      { chain: 'ETH', height: 19000100 },
    ],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 2,
  },
  {
    node_address: 'thor1ghi789jkl012',
    status: 'Jailed',
    pub_key_set: {
      secp256k1: '06b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
      ed25519: '07c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7',
    },
    validator_cons_pub_key: 'thorvalconspub1xyz789abc012345678901234567890123456789012345678901234567890abc',
    peer_id: '16Uvh8Eh8J3fG3YDCK4f4W2c5b6d7e8f9a0b1c2d3e4f',
    active_block_height: 12340000,
    status_since: 1680000000000000000,
    node_operator_address: 'thor1operator3abcdef123456',
    total_bond: '500000000000',
    bond_providers: {
      node_operator_fee: '1000',
      providers: [
        {
          bond_address: 'thor1provider4abcdef123456789',
          bond: '500000000000',
        },
      ],
    },
    signer_membership: ['03d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c'],
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '10.0.0.3',
    version: '2.2.0',
    slash_points: 50,
    jail: {
      release_height: 12400000,
      reason: 'failed to observe chain: BTC',
    },
    current_award: '0',
    observe_chains: null,
    preflight_status: { status: 'failed', reason: 'Node is jailed', code: 3 },
    maintenance: false,
    missing_blocks: 20,
  },
];

const mockConstants: NetworkConstantsRaw = {
  int_64_values: {
    'BondReward': 250000000,
    'DoubleSignMaxAge': 24,
    'EmissionCurve': 600000000,
    'MaxActiveNodes': 100,
    'MinBondDrop': 10000000000,
    'MinNodes': 4,
    'OldCertificateRetention': 86400,
    'SlashingPeriod': 86400,
  },
  bool_values: {
    'AreFundsMigrating': false,
    'Churning': true,
    'ForbiddenPubKeys': false,
    'LPDexAggSwap': false,
    'LiquidityLock': false,
    'NetworkDisableInteraction': false,
  },
  string_values: {
    'DefaultPoolStatus': 'enabled',
    'EventThrottle': '1s',
    'MaxSwapsPerBlock': '100',
    'Version': '2.3.0',
  },
};

const mockBalances = {
  balances: [
    {
      address: 'thor1provider123456789abcdef',
      coins: [
        {
          denom: 'rune',
          amount: '1253738138904',
        },
      ],
    },
  ],
};

export const thornodeHandlers = [
  http.get('/thorchain/nodes', () => {
    return HttpResponse.json<NodeRaw[]>(mockNodes);
  }),

  http.get('/thorchain/node/:address', ({ params }) => {
    const { address } = params;
    const node = mockNodes.find((n) => n.node_address === address);

    if (!node) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json<NodeRaw>(node);
  }),

  http.get('/thorchain/constants', () => {
    return HttpResponse.json<NetworkConstantsRaw>(mockConstants);
  }),

  http.get('/cosmos/bank/balances/:address', ({ params }) => {
    const { address } = params;

    return HttpResponse.json({
      balances: [
        {
          address: address as string,
          coins: [
            {
              denom: 'rune',
              amount: '1000000000000',
            },
          ],
        },
      ],
    });
  }),
];
