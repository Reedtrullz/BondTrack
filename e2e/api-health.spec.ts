import { expect, test, type Page } from './fixtures';

const MOCK_ADDRESS = 'thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346';

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
      providers: [{ bond_address: MOCK_ADDRESS, bond: '2500000000000' }],
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

async function setupPortfolioMocks(
  page: Page,
  options: { midgardHealthStatus?: number; thornodeHealthStatus?: number }
) {
  await page.route('**/api/midgard/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/midgard/v2/health') {
      if (options.midgardHealthStatus) {
        await route.fulfill({ status: options.midgardHealthStatus, json: { error: 'Health check failed' } });
        return;
      }

      await route.fulfill({ json: { lastThorNode: { height: 12345678 } } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/network') {
      await route.fulfill({ json: mockNetwork });
      return;
    }

    if (url.pathname === '/api/midgard/v2/member/thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346') {
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

  await page.route('**/api/thorchain/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/thorchain/thorchain/nodes') {
      if (options.thornodeHealthStatus) {
        await route.fulfill({ status: options.thornodeHealthStatus, json: { error: 'Health check failed' } });
        return;
      }

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
}

async function gotoPortfolio(page: Page) {
  await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);
}

async function waitForApiHealthResponse(page: Page, path: string, status: number) {
  await page.waitForResponse(
    (response) => new URL(response.url()).pathname === path && response.status() === status
  );
}

test.describe('API health banner', () => {
  test('shows Midgard error message when /api/midgard fails with 502', async ({ page }) => {
    await setupPortfolioMocks(page, { midgardHealthStatus: 502 });
    await gotoPortfolio(page);
    await waitForApiHealthResponse(page, '/api/midgard/v2/health', 502);

    const banner = page.getByTestId('api-health-banner');
    await expect(banner).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('api-health-banner-midgard-message')).toContainText(
      'Midgard API is temporarily unavailable — some data may be stale'
    );
  });

  test('shows THORNode error message when /api/thorchain fails with 500', async ({ page }) => {
    await setupPortfolioMocks(page, { thornodeHealthStatus: 500 });
    await gotoPortfolio(page);
    await waitForApiHealthResponse(page, '/api/thorchain/thorchain/nodes', 500);

    const banner = page.getByTestId('api-health-banner');
    await expect(banner).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('api-health-banner-thornode-message')).toContainText(
      'THORNode API is temporarily unavailable — some data may be stale'
    );
  });

  test('hides the banner when both APIs are healthy', async ({ page }) => {
    await setupPortfolioMocks(page, {});
    await gotoPortfolio(page);
    await waitForApiHealthResponse(page, '/api/midgard/v2/health', 200);
    await waitForApiHealthResponse(page, '/api/thorchain/thorchain/nodes', 200);

    await expect(page.getByTestId('api-health-banner')).toHaveCount(0);
  });

  test('dismisses the banner after an error state', async ({ page }) => {
    await setupPortfolioMocks(page, { midgardHealthStatus: 502 });
    await gotoPortfolio(page);
    await waitForApiHealthResponse(page, '/api/midgard/v2/health', 502);

    const banner = page.getByTestId('api-health-banner');
    await expect(banner).toBeVisible({ timeout: 15000 });

    await page.getByTestId('api-health-banner-dismiss').click();

    await expect(banner).toHaveCount(0);
  });
});
