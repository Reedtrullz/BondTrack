import { expect, test, type Page } from './fixtures';

const MOCK_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

const mockNodes = [
  {
    node_address: 'thor1noderewards123456789abcdef',
    status: 'Active',
    pub_key_set: {
      secp256k1: '03a2bcde3f45678901234567890123456789012345678901234567890123456',
      ed25519: '02b3e5ef789012345678901234567890123456789012345678901234567890123',
    },
    validator_cons_pub_key: 'thorvalconspub1zcjduepq2w6r4z2h3ujnsn3e8qjjjl7r2h9u2d4z2h3ujnsn3e8qjjjl7r2h9u2d',
    peer_id: '16Uvh8Eh8J3fG3YDCK4f4W2c5b6d7e8f9a0b1c2d3e4f',
    active_block_height: 12345678,
    status_since: 1700000000,
    node_operator_address: 'thor1operator123456789abcdef',
    total_bond: '2500000000000',
    bond_providers: {
      node_operator_fee: '2000',
      providers: [
        { bond_address: MOCK_ADDRESS, bond: '1250000000000' },
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
    observe_chains: [{ chain: 'BTC', height: 850000 }],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
  },
];

const mockBondDetails = {
  address: MOCK_ADDRESS,
  totalBonded: '2500000000000',
  nodes: [{ address: 'thor1noderewards123456789abcdef', bond: '2500000000000', status: 'Active' }],
};

const makeAction = (type: 'bond' | 'unbond', amount: string, date: string) => ({
  type,
  date,
  height: '12345678',
  pools: ['THOR.RUNE'],
  memo: type === 'bond' ? 'BOND:thor1node' : 'UNBOND:thor1node',
  tx: {
    type,
    address: MOCK_ADDRESS,
    coins: [{ asset: 'THOR.RUNE', amount }],
    txID: `${type}-tx`,
    chain: 'THOR',
    fromAddress: MOCK_ADDRESS,
  },
  status: 'success',
  in: type === 'bond' ? [{ address: MOCK_ADDRESS, coins: [{ asset: 'THOR.RUNE', amount }], txID: `${type}-tx` }] : undefined,
  out: type === 'unbond' ? [{ address: MOCK_ADDRESS, coins: [{ asset: 'THOR.RUNE', amount }], txID: `${type}-tx` }] : undefined,
  metadata: type === 'bond'
    ? { bond: { memo: 'BOND:thor1node', nodeAddress: 'thor1noderewards123456789abcdef' } }
    : { refund: { memo: 'UNBOND:thor1node', txType: 'unbond' } },
});

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

const mockRuneHistory = {
  meta: {
    startTime: '1699990000000000000',
    endTime: '1700010000000000000',
    startRunePriceUSD: '1.50',
    endRunePriceUSD: '1.50',
  },
  intervals: [
    {
      startTime: '1699990000000000000',
      endTime: '1700010000000000000',
      runePriceUSD: '1.50',
    },
  ],
};

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

async function setupMocks(page: Page) {
  await page.route('**/api/thorchain/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/thorchain/thorchain/nodes') {
      await route.fulfill({ json: mockNodes });
      return;
    }

    if (url.pathname === '/api/thorchain/thorchain/constants') {
      await route.fulfill({
        json: {
          int_64_values: { OptimalBondD: 2500000000000 },
          bool_values: {},
          string_values: {},
        },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled THORChain mock: ${url.pathname}` } });
  });

  await page.route('**/api/midgard/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/midgard/v2/health') {
      await route.fulfill({ json: { lastThorNode: { height: 12345678 } } });
      return;
    }

    if (url.pathname.startsWith('/api/midgard/v2/thorname/rlookup/')) {
      await route.fulfill({ json: { entry: null } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/network') {
      await route.fulfill({ json: mockNetwork });
      return;
    }

    if (url.pathname === '/api/midgard/v2/bonds/thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq') {
      await route.fulfill({ json: mockBondDetails });
      return;
    }

    if (url.pathname === '/api/midgard/v2/actions') {
      const actionType = url.searchParams.get('type') || url.searchParams.get('txType');
      const actions = actionType === 'unbond'
        ? [makeAction('unbond', '500000000000', '1700500000000000000')]
        : [makeAction('bond', '1250000000000', '1700000000000000000')];

      await route.fulfill({ json: { actions, count: String(actions.length) } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/history/rune') {
      await route.fulfill({ json: mockRuneHistory });
      return;
    }

    if (url.pathname === '/api/midgard/v2/history/earnings') {
      await route.fulfill({ json: mockEarningsHistory });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled Midgard mock: ${url.pathname}` } });
  });
}

test.describe('Tax export flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/dashboard/rewards?address=${MOCK_ADDRESS}`);
  });

  test('opens the tax report modal from the export button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Rewards' })).toBeVisible();
    await page.getByRole('tab', { name: 'Tax' }).click();
    await expect(page.getByRole('heading', { name: 'Tax-ready reward export' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export Tax Report' })).toBeVisible();

    await page.getByRole('button', { name: 'Export Tax Report' }).click();

    await expect(page.locator('input[type="date"]')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Download CSV' })).toBeVisible();
  });
});
