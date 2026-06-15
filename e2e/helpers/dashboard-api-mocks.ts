import type { Page } from '../fixtures';

export const DEFAULT_DASHBOARD_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

const mockNodes = [
  {
    node_address: 'thor1nodemocked123456789abcdef',
    status: 'Active',
    pub_key_set: {
      secp256k1: '03a2bcde3f45678901234567890123456789012345678901234567890123456',
      ed25519: '02b3e5ef789012345678901234567890123456789012345678901234567890123',
    },
    validator_cons_pub_key: 'thorvalconspub1zcjduepq2w6r4z2h3ujnsn3e8qjjjl7r2h9u2d4z2h3ujnsn3e8qjjjl7r2h9u2d',
    peer_id: '16Uvh8Eh8J3fG3YDCK4f4W2c5b6d7e8f9a0b1c2d3e4f',
    active_block_height: 12345678,
    status_since: 1700000000,
    node_operator_address: 'thor1operatormocked123456789abcdef',
    total_bond: '2500000000000',
    bond_providers: {
      node_operator_fee: '2000',
      providers: [{ bond_address: DEFAULT_DASHBOARD_ADDRESS, bond: '1250000000000' }],
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
    observe_chains: [{ chain: 'BTC', height: 850000 }],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
  },
];

const mockNetwork = {
  activeBonds: ['150000000000000', '100000000000000'],
  activeNodeCount: '2',
  standbyBonds: ['50000000000000'],
  standbyNodeCount: '1',
  totalPooledRune: '100000000000000',
  totalReserve: '45000000000000',
  bondMetrics: {
    totalActiveBond: '200000000000000',
    totalStandbyBond: '50000000000000',
    averageActiveBond: '105000000000000',
    averageStandbyBond: '50000000000000',
    medianActiveBond: '105000000000000',
    minimumActiveBond: '100000000000000',
    maximumActiveBond: '110000000000000',
    bondHardCap: '110000000000000',
  },
  bondingAPY: '0.25',
  liquidityAPY: '0.15',
  blockRewards: {
    blockReward: '14000',
    bondReward: '14000',
    poolReward: '0',
  },
  nextChurnHeight: '25700000',
  poolActivationCountdown: '28800',
};

const mockPools = [
  {
    asset: 'BTC.BTC',
    volume24h: '900000000',
    assetDepth: '500000000000',
    runeDepth: '250000000000',
    assetPrice: '0.75',
    assetPriceUSD: '0.75',
    annualPercentageRate: '0.125',
    poolAPY: '12.5',
    earnings: '0',
    earningsAnnualAsPercentOfDepth: '0',
    lpLuvi: '0',
    saversAPR: '0',
    status: 'available',
    liquidityUnits: '1000',
    synthUnits: '0',
    synthSupply: '0',
    units: '0',
    nativeDecimal: '8',
    saversUnits: '0',
    saversDepth: '0',
    totalCollateral: '0',
    totalDebtTor: '0',
    saversYieldShare: '0',
    depthPlus2Percent: '0',
    depthMinus2Percent: '0',
  },
];

function toMidgardNanoseconds(ms: number): string {
  return String(BigInt(ms) * 1_000_000n);
}

function buildMockRuneHistory(nowMs = Date.now()) {
  const startTime = toMidgardNanoseconds(nowMs - 60 * 60 * 1000);
  const endTime = toMidgardNanoseconds(nowMs);

  return {
    meta: {
      startTime,
      endTime,
      startRunePriceUSD: '1.50',
      endRunePriceUSD: '1.50',
    },
    intervals: [
      {
        startTime,
        endTime,
        runePriceUSD: '1.50',
      },
    ],
  };
}

const mockEarningsHistory = {
  meta: {
    startTime: '1699990000000000000',
    endTime: '1700010000000000000',
    liquidityFees: '100000000',
    blockRewards: '50000000',
    earnings: '150000000',
    bondingEarnings: '50000000',
    liquidityEarnings: '100000000',
    avgNodeCount: '2',
    runePriceUSD: '1.50',
    pools: [],
  },
  intervals: [
    {
      startTime: '1699990000000000000',
      endTime: '1700010000000000000',
      liquidityFees: '100000000',
      blockRewards: '50000000',
      earnings: '150000000',
      bondingEarnings: '50000000',
      liquidityEarnings: '100000000',
      avgNodeCount: '2',
      runePriceUSD: '1.50',
      pools: [],
    },
  ],
};

const mockPoolHistory = {
  intervals: [
    {
      startTime: '1699990000',
      endTime: '1700010000',
      runeDepth: '250000000000',
      assetDepth: '500000000000',
      liquidityUnits: '1000',
      synthSupply: '0',
      synthDepth: '0',
      lpUnits: '0',
      membersCount: '1',
      status: 'available',
    },
  ],
};

interface MockDashboardApisOptions {
  extraNodes?: Partial<(typeof mockNodes)[number]>[];
  withBondPosition?: boolean;
  primaryNodeOverrides?: Partial<(typeof mockNodes)[number]>;
  runeHistoryNowMs?: number;
  midgardHealthStatus?: number;
  thornodeHealthProbeStatus?: number;
  thornodeNodesStatus?: number;
  supportFeedDelayMs?: number;
}

function getHealthProbeTarget(pageRouteRequestHeaders: Record<string, string>): string | undefined {
  // Health probes and node data share /nodes; this keeps source confidence degradable without hiding cards.
  return pageRouteRequestHeaders['x-heimdall-health-probe'];
}

export async function mockDashboardApis(
  page: Page,
  address = DEFAULT_DASHBOARD_ADDRESS,
  options: MockDashboardApisOptions = {}
) {
  const withBondPosition = options.withBondPosition ?? true;
  const primaryNode = {
    ...mockNodes[0],
    ...options.primaryNodeOverrides,
    bond_providers: {
      ...mockNodes[0].bond_providers,
      ...options.primaryNodeOverrides?.bond_providers,
    },
  };
  const extraNodes = (options.extraNodes ?? []).map((nodeOverrides, index) => {
    const { bond_providers: bondProviderOverrides, ...restOverrides } = nodeOverrides;

    return {
      ...mockNodes[0],
      node_address: `thor1extramocknode${index}000000000000000000000`,
      node_operator_address: `thor1extraoperatormock${index}000000000000000`,
      slash_points: 0,
      status_since: mockNodes[0].status_since + index + 1,
      total_bond: '1500000000000',
      ...restOverrides,
      bond_providers: {
        ...mockNodes[0].bond_providers,
        providers: [],
        ...bondProviderOverrides,
      },
    };
  });
  const routedNodes = withBondPosition
    ? [primaryNode, ...extraNodes]
    : [{
        ...primaryNode,
        bond_providers: {
          ...primaryNode.bond_providers,
          providers: [],
        },
      }, ...extraNodes];
  const delaySupportFeed = () => (
    options.supportFeedDelayMs
      ? new Promise((resolve) => setTimeout(resolve, options.supportFeedDelayMs))
      : Promise.resolve()
  );

  await page.route('**/api/thorchain/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/thorchain/thorchain/nodes') {
      if (
        getHealthProbeTarget(route.request().headers()) === 'thornode'
        && options.thornodeHealthProbeStatus
        && options.thornodeHealthProbeStatus >= 400
      ) {
        await route.fulfill({
          status: options.thornodeHealthProbeStatus,
          json: { error: 'Mock THORNode health-probe failure' },
        });
        return;
      }

      if (options.thornodeNodesStatus && options.thornodeNodesStatus >= 400) {
        await route.fulfill({
          status: options.thornodeNodesStatus,
          json: { error: 'Mock THORNode /nodes failure' },
        });
        return;
      }

      await route.fulfill({
        json: routedNodes,
      });
      return;
    }

    if (url.pathname === '/api/thorchain/thorchain/constants') {
      await route.fulfill({
        json: {
          int_64_values: { MaxBondProviders: 100, MinimumBondInRune: 30000000000000 },
          bool_values: {},
          string_values: {},
        },
      });
      return;
    }

    if (url.pathname === `/api/thorchain/cosmos/bank/v1beta1/balances/${address}`) {
      await route.fulfill({ json: { balances: [{ denom: 'rune', amount: '125000000000' }] } });
      return;
    }

    if (/^\/api\/thorchain\/thorchain\/pool\/[^/]+\/liquidity_provider\/[^/]+$/.test(url.pathname)) {
      await route.fulfill({
        json: {
          rune_address: address,
          asset_address: 'bc1mockasset123456',
          rune_deposit_value: '5000000000',
          asset_deposit_value: '250000000',
          rune_redeem_value: '5250000000',
          asset_redeem_value: '260000000',
          units: '1000',
          pending_rune: '0',
          pending_asset: '0',
          last_add_height: 12340000,
          last_withdraw_height: 0,
        },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled THORChain mock: ${url.pathname}` } });
  });

  await page.route('**/api/midgard/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/midgard/v2/health') {
      if (options.midgardHealthStatus && options.midgardHealthStatus >= 400) {
        await route.fulfill({
          status: options.midgardHealthStatus,
          json: { error: 'Mock Midgard health failure' },
        });
        return;
      }

      await route.fulfill({ json: { lastThorNode: { height: 12345678 } } });
      return;
    }

    if (url.pathname.startsWith('/api/midgard/v2/thorname/rlookup/')) {
      await route.fulfill({ json: { entry: null } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/network') {
      await delaySupportFeed();
      await route.fulfill({ json: mockNetwork });
      return;
    }

    if (url.pathname === `/api/midgard/v2/bonds/${address}`) {
      await route.fulfill({
        json: {
          address,
          totalBonded: withBondPosition ? '1250000000000' : '0',
          nodes: withBondPosition
            ? [{ address: routedNodes[0].node_address, bond: '1250000000000', status: routedNodes[0].status }]
            : [],
        },
      });
      return;
    }

    if (url.pathname === `/api/midgard/v2/member/${address}`) {
      await delaySupportFeed();
      await route.fulfill({
        json: {
          pools: [
            {
              pool: 'BTC.BTC',
              runeAddress: address,
              assetAddress: 'bc1mockasset123456',
              liquidityUnits: '1000',
              runeDeposit: '5000000000',
              assetDeposit: '250000000',
              runeAdded: '5000000000',
              assetAdded: '250000000',
              runePending: '0',
              assetPending: '0',
              runeWithdrawn: '0',
              assetWithdrawn: '0',
              dateFirstAdded: '1700000000000000000',
              dateLastAdded: '1700500000000000000',
            },
          ],
        },
      });
      return;
    }

    if (url.pathname === '/api/midgard/v2/actions') {
      await route.fulfill({ json: { actions: [], count: '0' } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/pools') {
      await delaySupportFeed();
      await route.fulfill({ json: mockPools });
      return;
    }

    if (url.pathname === '/api/midgard/v2/history/rune') {
      await delaySupportFeed();
      await route.fulfill({ json: buildMockRuneHistory(options.runeHistoryNowMs) });
      return;
    }

    if (url.pathname === '/api/midgard/v2/history/earnings') {
      await route.fulfill({ json: mockEarningsHistory });
      return;
    }

    if (url.pathname === '/api/midgard/v2/pools/BTC.BTC/history') {
      await route.fulfill({ json: mockPoolHistory });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled Midgard mock: ${url.pathname}` } });
  });

  await page.route('**/api/coinapi/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/coinapi/rune-price') {
      await route.fulfill({ json: { price: 1.5 } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled CoinAPI mock: ${url.pathname}` } });
  });

  await page.route('**/api/coingecko/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/coingecko/coins/thorchain/market_chart/range') {
      await route.fulfill({ json: { prices: [[Date.now(), 1.5]] } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled CoinGecko mock: ${url.pathname}` } });
  });
}
