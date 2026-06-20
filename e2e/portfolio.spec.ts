import { expect, test, type Page } from './fixtures';

const MOCK_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';
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
    version: '3.19.0',
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

const mockRuneHistoryWithoutTimestamp = {
  meta: {
    startTime: '',
    endTime: '',
    startRunePriceUSD: '1.50',
    endRunePriceUSD: '1.50',
  },
  intervals: [
    {
      startTime: '',
      endTime: '',
      runePriceUSD: '1.50',
    },
  ],
};

function buildFreshRuneHistory() {
  const endSeconds = Math.floor(Date.now() / 1000);
  const startSeconds = endSeconds - 60 * 60;
  const toNanoTimestamp = (seconds: number) => (BigInt(seconds) * 1_000_000_000n).toString();

  return {
    meta: {
      startTime: toNanoTimestamp(startSeconds),
      endTime: toNanoTimestamp(endSeconds),
      startRunePriceUSD: '1.50',
      endRunePriceUSD: '1.50',
    },
    intervals: [
      {
        startTime: toNanoTimestamp(startSeconds),
        endTime: toNanoTimestamp(endSeconds),
        runePriceUSD: '1.50',
      },
    ],
  };
}

function buildHistoricalEntryRuneHistory() {
  return {
    meta: {
      startTime: '1699913600',
      endTime: '1700086400',
      startRunePriceUSD: '0.50',
      endRunePriceUSD: '0.50',
    },
    intervals: [
      {
        startTime: '1699913600',
        endTime: '1700086400',
        runePriceUSD: '0.50',
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

async function setupMocks(page: Page, options: { nodeStatus?: string; freshRuneHistory?: boolean; runeHistoryMissingTimestamp?: boolean; thornodeNodesStatus?: number } = {}) {
  const nodeStatus = options.nodeStatus ?? 'Active';
  const routedNodes = mockNodes.map((node) => ({ ...node, status: nodeStatus }));

  await page.route('**/api/thorchain/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/thorchain/thorchain/nodes') {
      if (options.thornodeNodesStatus && options.thornodeNodesStatus >= 400) {
        await route.fulfill({ status: options.thornodeNodesStatus, json: { error: 'THORNode nodes unavailable' } });
        return;
      }

      await route.fulfill({ json: routedNodes });
      return;
    }

    if (url.pathname === '/api/thorchain/thorchain/constants') {
      await route.fulfill({
        json: {
          int_64_values: { MaxBondProviders: 100 },
          bool_values: {},
          string_values: {},
        },
      });
      return;
    }

    if (url.pathname === '/api/thorchain/thorchain/version') {
      await route.fulfill({ json: { current: '3.19.0', next: '3.19.0', querier: '3.19.0' } });
      return;
    }

    if (/^\/api\/thorchain\/thorchain\/pool\/[^/]+\/liquidity_provider\/[^/]+$/.test(url.pathname)) {
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

    if (url.pathname.startsWith('/api/midgard/v2/thorname/rlookup/')) {
      await route.fulfill({ json: { entry: null } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/network') {
      await route.fulfill({ json: mockNetwork });
      return;
    }

    if (url.pathname === '/api/midgard/v2/bonds/thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz') {
      await route.fulfill({
        json: {
          address: MOCK_ADDRESS,
          totalBonded: '1250000000000',
          nodes: [{ address: mockNodes[0].node_address, bond: '1250000000000', status: nodeStatus }],
        },
      });
      return;
    }

    if (url.pathname === '/api/midgard/v2/actions') {
      await route.fulfill({ json: { actions: [], count: '0' } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/member/thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz') {
      await route.fulfill({ json: mockMemberDetails });
      return;
    }

    if (url.pathname === '/api/midgard/v2/pools') {
      await route.fulfill({ json: mockPools });
      return;
    }

    if (url.pathname === '/api/midgard/v2/history/rune') {
      const from = Number(url.searchParams.get('from'));
      const shouldUseHistoricalEntryWindow = options.freshRuneHistory
        && url.searchParams.has('from')
        && Number.isFinite(from)
        && from < Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

      await route.fulfill({
        json: shouldUseHistoricalEntryWindow
          ? buildHistoricalEntryRuneHistory()
          : options.runeHistoryMissingTimestamp
            ? mockRuneHistoryWithoutTimestamp
            : options.freshRuneHistory
              ? buildFreshRuneHistory()
              : mockRuneHistory,
      });
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
}

test.describe('Portfolio dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);
  });

  test('renders portfolio summary, allocation chart, and quick actions', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Portfolio', exact: true })).toBeVisible();
    const totalBondedSummary = page.getByRole('group', { name: 'Total Bonded summary' });

    await expect(totalBondedSummary).toBeVisible();
    await expect(totalBondedSummary).toContainText('Total Bonded');
    await expect(totalBondedSummary).toContainText(/\u16B1[0-9,.]+/);
    await expect(totalBondedSummary).toContainText(/\$[0-9,.]+ USD/);

    await expect(page.getByText('Asset Allocation', { exact: true })).toBeVisible();
    await expect(page.getByText('Quick Actions')).toBeVisible();
    const sourceHealth = page.getByRole('group', { name: 'Portfolio source health' });
    await expect(sourceHealth).toContainText('Sources responding');
    await expect(sourceHealth).toContainText('Recent Midgard + THORNode checks responded');
    await expect(sourceHealth).not.toContainText('Recent Midgard + THORNode checks succeeded');
    await expect(sourceHealth).not.toContainText('Sources healthy');
    await expect(sourceHealth).not.toContainText('Midgard + THORNode confirmed');
    await expect(page.getByText('Live', { exact: true })).toHaveCount(0);
    const checks = page.getByRole('region', { name: 'Portfolio data checks' });
    await expect(checks).toContainText('Bond exposure');
    await expect(checks).toContainText('1 flagged');
    await expect(checks).toContainText('Review churn, slash, or leaving signals before adding bond');
    await expect(checks).not.toContainText('Bond exposure 1 node');
    await expect(checks).not.toContainText('Source-backed');
    await expect(checks).not.toContainText('Ready');
    await expect(page.getByRole('link', { name: 'Review BOND Memo' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Prepare BOND Memo' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Review UNBOND Memo' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Prepare UNBOND Memo' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'View Risk' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Rewards' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View LP' })).toBeVisible();
  });

  test('does not label malformed RUNE quote freshness as fresh in portfolio data checks', async ({ page }) => {
    await page.unroute('**/api/thorchain/**');
    await page.unroute('**/api/midgard/**');
    await setupMocks(page, { runeHistoryMissingTimestamp: true });
    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);

    const checks = page.getByRole('region', { name: 'Portfolio data checks' });
    const runePriceSummary = page.getByRole('group', { name: 'RUNE Price summary' });

    await expect(checks).toContainText('RUNE price');
    await expect(checks).toContainText('LP valuation');
    await expect(checks).toContainText('Quote stale');
    await expect(checks).toContainText('LP USD values use stale RUNE quote');
    await expect(checks).toContainText('Missing');
    await expect(checks).not.toContainText(/RUNE price\s*Fresh/);
    await expect(page.getByRole('region', { name: 'Portfolio exposure confidence' })).toHaveCount(0);
    await expect(runePriceSummary).toContainText('--');
    await expect(runePriceSummary).not.toContainText('Fresh');
  });

  test('routes header BOND prep to source checks when THORNode /nodes is unavailable', async ({ page, allowApiErrors }) => {
    allowApiErrors(['/api/thorchain/thorchain/nodes']);
    await page.unroute('**/api/thorchain/**');
    await page.unroute('**/api/midgard/**');
    await setupMocks(page, { thornodeNodesStatus: 502 });
    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);

    const transactionActions = page.getByRole('group', { name: 'Portfolio transaction actions' });
    const sourceHealth = page.getByRole('group', { name: 'Portfolio source health' });

    await expect(sourceHealth).toContainText('Sources degraded');
    await expect(transactionActions.getByRole('link', { name: 'Review source checks' })).toHaveAttribute(
      'href',
      `/dashboard?address=${MOCK_ADDRESS}#source-confidence`
    );
    await expect(transactionActions.getByRole('link', { name: 'Review BOND Memo' })).toHaveCount(0);
    await expect(transactionActions.getByRole('link', { name: 'Prepare BOND Memo' })).toHaveCount(0);
    await expect(transactionActions.getByRole('link', { name: 'Review UNBOND Memo' })).toHaveCount(0);
    await expect(transactionActions.getByRole('link', { name: 'Prepare UNBOND Memo' })).toHaveCount(0);
  });

  test('shows an inline bond CSV export failure without opening a browser dialog', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.evaluate(() => {
      URL.createObjectURL = () => {
        throw new Error('blob unavailable');
      };
    });

    await page.getByRole('button', { name: 'Export CSV' }).click();

    const exportAlert = page.locator('[role="alert"]').filter({ hasText: 'Bond CSV export failed' });
    await expect(exportAlert).toContainText('No file was downloaded');
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
    expect(dialogs).toEqual([]);
  });

  test('keeps bond position labels clear on desktop and mobile', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Bonded Positions', exact: true });
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Bonded PositionsBonded Positions', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Explain Bonded Positions', exact: true })).toHaveCount(1);

    const duplicatedLabels = await page.evaluate(() => {
      const bodyText = document.body.textContent?.replace(/\s+/g, '') ?? '';
      return ['BondedPositionsBondedPositions', 'ShareBondShare', 'Est.APYEstimatedAPY'].filter((text) =>
        bodyText.includes(text)
      );
    });
    expect(duplicatedLabels).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await heading.scrollIntoViewIfNeeded();

    const overflowingMobileMetrics = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.md\\:hidden *'))
        .filter((element): element is HTMLElement => element instanceof HTMLElement)
        .filter(
          (element) =>
            element.scrollWidth > element.clientWidth + 2 &&
            getComputedStyle(element).overflowX === 'visible'
        )
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    );
    expect(overflowingMobileMetrics).toEqual([]);
  });

  test('opens the transaction composer in UNBOND review mode', async ({ page }) => {
    await page.unroute('**/api/thorchain/**');
    await page.unroute('**/api/midgard/**');
    await setupMocks(page, { nodeStatus: 'Standby' });
    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);

    await expect(page.getByRole('link', { name: 'Review UNBOND Memo' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Prepare UNBOND Memo' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Review UNBOND Memo' }).click();

    await expect(page).toHaveURL(/\/dashboard\/transactions\?.*action=unbond/);
    await expect(page.getByText('Unbond mode')).toBeVisible();
    await expect(page.getByText('Amount to Unbond')).toBeVisible();
  });

  test('keeps quiet portfolio review feed evidence-limited', async ({ page }) => {
    await page.unroute('**/api/thorchain/**');
    await page.unroute('**/api/midgard/**');
    await setupMocks(page, { nodeStatus: 'Standby' });
    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);

    await expect(page.getByText('Provider review signals')).toBeVisible();
    await page.getByRole('button', { name: 'Show Heimdall insight feed' }).click();
    const emptyFeedState = page.getByRole('status', { name: 'Portfolio review signals empty state' });

    await expect(emptyFeedState).toContainText(
      'No slash, jail, or churn-risk feed items'
    );
    await expect(emptyFeedState).toContainText(
      'Keep using the diagnosis and source checks before acting'
    );
    await expect(page.getByText('No immediate alerts')).toHaveCount(0);
    await expect(page.getByText("Heimdall's Sight")).toHaveCount(0);
  });
});

test.describe('Portfolio source-loaded valuation state', () => {
  test('labels fresh THORNode LP valuation as source-loaded review material', async ({ page }) => {
    await setupMocks(page, { freshRuneHistory: true });
    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);

    const checks = page.getByRole('region', { name: 'Portfolio data checks' });

    await expect(checks).toContainText('LP valuation');
    await expect(checks).toContainText('Source-loaded');
    await expect(checks).toContainText('1 THORNode LP value row loaded for review');
    await expect(checks).not.toContainText('Source-backed');
    await expect(checks).not.toContainText('Ready');
  });
});
