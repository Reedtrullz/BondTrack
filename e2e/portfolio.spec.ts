import { expect, test, type Page } from '@playwright/test';

const MOCK_ADDRESS = 'thor1test123456789abcdefghijklmnop';
const MOCK_SECONDARY_ADDRESS = 'thor1otherprovider123456789abcdef';

const mockNodes = [
  {
    node_address: 'thor1nodeportfolio123456789abcdef',
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
        { bond_address: MOCK_SECONDARY_ADDRESS, bond: '1250000000000' },
      ],
    },
    signer_membership: ['02a1bcde3f45678901234567890123456789012345678901234567890123456'],
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '10.0.0.1',
    version: '2.3.0',
    slash_points: 25,
    jail: {},
    current_award: '250000000',
    observe_chains: [{ chain: 'BTC', height: 850000 }],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
  },
];

const mockMemberDetails = {
  pools: [
    {
      pool: 'BTC.BTC',
      runeAddress: MOCK_ADDRESS,
      assetAddress: 'bc1portfolioasset123456',
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

    if (url.pathname.includes('/api/thorchain/thorchain/pool/') && url.pathname.includes('/liquidity_provider/')) {
      await route.fulfill({
        json: {
          rune_address: MOCK_ADDRESS,
          asset_address: 'bc1portfolioasset123456',
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
      await route.fulfill({ json: { lastThorNode: { height: 12345678 } } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/network') {
      await route.fulfill({ json: mockNetwork });
      return;
    }

    if (url.pathname === '/api/midgard/v2/member/thor1test123456789abcdefghijklmnop') {
      await route.fulfill({ json: mockMemberDetails });
      return;
    }

    if (url.pathname === '/api/midgard/v2/pools') {
      await route.fulfill({ json: mockPools });
      return;
    }

    if (url.pathname === '/api/midgard/v2/history/rune') {
      await route.fulfill({ json: mockRuneHistory });
      return;
    }

    if (url.pathname === '/api/midgard/v2/pools/BTC.BTC/history') {
      await route.fulfill({ json: mockPoolHistory });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled Midgard mock: ${url.pathname}` } });
  });
}

test.describe('Portfolio dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);
  });

  test('renders portfolio summary, allocation chart, and quick actions', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Portfolio/ })).toBeVisible();
    await expect(page.getByText('Total Portfolio Value')).toBeVisible();

    const totalCard = page.getByText('Total Portfolio Value').locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');
    await expect(totalCard).toContainText(/\$[1-9]/);

    await expect(page.getByText('Asset Allocation')).toBeVisible();
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Risk' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Rewards' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View LP' })).toBeVisible();
  });
});
