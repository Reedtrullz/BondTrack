import { expect, test, type Page } from './fixtures';

const MOCK_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';

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

const mixedConfidenceMemberDetails = {
  pools: [
    mockMemberDetails.pools[0],
    {
      pool: 'ETH.ETH',
      runeAddress: MOCK_ADDRESS,
      assetAddress: '0xportfolioasset123456',
      liquidityUnits: '900',
      runeDeposit: '4000000000',
      assetDeposit: '200000000',
      runeAdded: '4000000000',
      assetAdded: '200000000',
      runePending: '0',
      assetPending: '0',
      runeWithdrawn: '0',
      assetWithdrawn: '0',
      dateFirstAdded: '1700000000000000000',
      dateLastAdded: '1700500000000000000',
    },
    {
      pool: 'GAIA.ATOM',
      runeAddress: MOCK_ADDRESS,
      assetAddress: 'cosmos1portfolioasset123456',
      liquidityUnits: '700',
      runeDeposit: '3000000000',
      assetDeposit: '0',
      runeAdded: '3000000000',
      assetAdded: '0',
      runePending: '0',
      assetPending: '0',
      runeWithdrawn: '0',
      assetWithdrawn: '0',
      dateFirstAdded: '1700000000000000000',
      dateLastAdded: '1700500000000000000',
    },
  ],
};

const emptyMemberDetails = {
  pools: [],
};

const malformedAmountMemberDetails = {
  pools: [
    {
      ...mockMemberDetails.pools[0],
      runeDeposit: 'not-a-rune-deposit',
      assetDeposit: 'not-an-asset-deposit',
      runeAdded: 'not-added-rune',
      assetAdded: 'not-added-asset',
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

const mixedConfidencePools = [
  ...mockPools,
  {
    asset: 'ETH.ETH',
    volume24h: '700000000',
    assetDepth: '400000000000',
    runeDepth: '200000000000',
    assetPrice: '0.75',
    assetPriceUSD: '0.75',
    annualPercentageRate: '0.095',
    poolAPY: '9.5',
    earnings: '0',
    earningsAnnualAsPercentOfDepth: '0',
    lpLuvi: '0',
    saversAPR: '0',
    status: 'available',
    liquidityUnits: '900',
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
  {
    asset: 'GAIA.ATOM',
    volume24h: '500000000',
    assetDepth: '300000000000',
    runeDepth: '150000000000',
    assetPrice: '0.75',
    assetPriceUSD: '0.75',
    annualPercentageRate: '0.08',
    poolAPY: '8',
    earnings: '0',
    earningsAnnualAsPercentOfDepth: '0',
    lpLuvi: '0',
    saversAPR: '0',
    status: 'available',
    liquidityUnits: '700',
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

function buildMockRuneHistoryWithoutTimestamp() {
  return {
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
}

function buildHistoricalRuneHistory(fromSeconds: number, toSeconds: number) {
  const startMs = fromSeconds * 1000;
  const endMs = toSeconds * 1000;
  const startTime = toMidgardNanoseconds(startMs);
  const endTime = toMidgardNanoseconds(endMs);

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

function buildInvalidHistoricalRuneHistory(fromSeconds: number, toSeconds: number) {
  const startMs = fromSeconds * 1000;
  const endMs = toSeconds * 1000;
  const startTime = toMidgardNanoseconds(startMs);
  const endTime = toMidgardNanoseconds(endMs);

  return {
    meta: {
      startTime,
      endTime,
      startRunePriceUSD: '0',
      endRunePriceUSD: '0',
    },
    intervals: [
      {
        startTime,
        endTime,
        runePriceUSD: 'not-a-price',
      },
    ],
  };
}

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

type LpMockScenario = 'historical' | 'mixed-confidence' | 'current-only' | 'redeem-degraded' | 'external-price-fallback' | 'malformed-amounts' | 'empty';

async function setupMocks(
  page: Page,
  scenario: LpMockScenario = 'historical',
  options: { runeHistoryMissingTimestamp?: boolean } = {}
) {
  await page.route('**/api/thorchain/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/thorchain/thorchain/nodes') {
      await route.fulfill({ json: [] });
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

    const liquidityProviderPath = url.pathname.match(
      /^\/api\/thorchain\/thorchain\/pool\/([^/]+)\/liquidity_provider\/[^/]+$/
    );
    if (liquidityProviderPath) {
      if (scenario === 'redeem-degraded') {
        await route.fulfill({ json: null });
        return;
      }

      const pool = liquidityProviderPath[1];
      if (scenario === 'malformed-amounts') {
        await route.fulfill({
          json: {
            rune_address: MOCK_ADDRESS,
            asset_address: 'bc1portfolioasset123456',
            rune_deposit_value: 'not-a-rune-deposit-value',
            asset_deposit_value: 'not-an-asset-deposit-value',
            rune_redeem_value: 'not-a-rune-redeem-value',
            asset_redeem_value: 'not-an-asset-redeem-value',
            units: '1000',
            pending_rune: '0',
            pending_asset: '0',
            last_add_height: 12340000,
            last_withdraw_height: 0,
          },
        });
        return;
      }

      await route.fulfill({
        json: {
          rune_address: MOCK_ADDRESS,
          asset_address: pool === 'GAIA.ATOM' ? 'cosmos1portfolioasset123456' : pool === 'ETH.ETH' ? '0xportfolioasset123456' : 'bc1portfolioasset123456',
          rune_deposit_value: pool === 'GAIA.ATOM' ? '3000000000' : pool === 'ETH.ETH' ? '4000000000' : '5000000000',
          asset_deposit_value: pool === 'GAIA.ATOM' ? '0' : pool === 'ETH.ETH' ? '200000000' : '250000000',
          rune_redeem_value: pool === 'GAIA.ATOM' ? '3150000000' : pool === 'ETH.ETH' ? '4200000000' : '5250000000',
          asset_redeem_value: pool === 'GAIA.ATOM' ? '100000000' : pool === 'ETH.ETH' ? '210000000' : '260000000',
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

    if (url.pathname === '/api/midgard/v2/member/thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz') {
      await route.fulfill({
        json: scenario === 'empty'
          ? emptyMemberDetails
          : scenario === 'malformed-amounts'
            ? malformedAmountMemberDetails
          : scenario === 'mixed-confidence'
            ? mixedConfidenceMemberDetails
            : mockMemberDetails,
      });
      return;
    }

    if (url.pathname === '/api/midgard/v2/pools') {
      await route.fulfill({ json: scenario === 'mixed-confidence' ? mixedConfidencePools : mockPools });
      return;
    }

    if (url.pathname === '/api/midgard/v2/history/rune') {
      const fromParam = url.searchParams.get('from');
      const toParam = url.searchParams.get('to');
      const fromSeconds = fromParam === null ? Number.NaN : Number(fromParam);
      const toSeconds = toParam === null ? Number.NaN : Number(toParam);
      await route.fulfill({
        json: Number.isFinite(fromSeconds) && Number.isFinite(toSeconds)
          ? scenario === 'current-only'
            ? { meta: {}, intervals: [] }
            : scenario === 'external-price-fallback'
            ? buildInvalidHistoricalRuneHistory(fromSeconds, toSeconds)
            : buildHistoricalRuneHistory(fromSeconds, toSeconds)
          : options.runeHistoryMissingTimestamp
            ? buildMockRuneHistoryWithoutTimestamp()
            : buildMockRuneHistory(),
      });
      return;
    }

    if (url.pathname === '/api/midgard/v2/pools/BTC.BTC/history') {
      await route.fulfill({ json: mockPoolHistory });
      return;
    }

    if (scenario === 'mixed-confidence' && (
      url.pathname === '/api/midgard/v2/pools/ETH.ETH/history' ||
      url.pathname === '/api/midgard/v2/pools/GAIA.ATOM/history'
    )) {
      await route.fulfill({ json: { intervals: [] } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled Midgard mock: ${url.pathname}` } });
  });

  await page.route('**/api/coingecko/**', async (route) => {
    const url = new URL(route.request().url());

    if (scenario === 'external-price-fallback' && url.pathname === '/api/coingecko/coins/thorchain/market_chart/range') {
      await route.fulfill({
        json: {
          prices: [
            [1700000000000, 1.5],
          ],
        },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled CoinGecko mock: ${url.pathname}` } });
  });
}

test.describe('LP IL dashboard', () => {
  test('frames the missing-address shell without wallet or LP source overclaims', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto('/dashboard/lp');

    await expect(page.getByLabel('Address required diagnosis')).toContainText('Choose a watched THORChain address to start triage');
    await expect(page.getByText(/wallet connection is only needed later for wallet-presented transaction review/i)).toBeVisible();
    await expect(page.getByText(/transaction confirmation/i)).toHaveCount(0);
    await expect(page.getByText(/source-backed liquidity positions/i)).toHaveCount(0);
    await expect(page.getByText(/inspect live liquidity positions/i)).toHaveCount(0);
  });

  test('shows the IL column and at least one row', async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/dashboard/lp?address=${MOCK_ADDRESS}`);

    // The LP page heading is "LP Positions" (h1). Use exact match to avoid matching other headings.
    await expect(page.getByRole('heading', { name: 'LP Positions', exact: true })).toBeVisible();
    const diagnosis = page.getByLabel('LP performance diagnosis');
    await expect(diagnosis).toContainText('Inputs loaded');
    await expect(diagnosis).toHaveClass(/border-sky-200/);
    await expect(diagnosis).not.toHaveClass(/border-emerald-200/);
    await expect(diagnosis).toContainText('LP review inputs loaded');
    await expect(diagnosis).toContainText('app-calculated review metrics, not source-confirmed balances');
    await expect(diagnosis).not.toContainText('LP performance uses source-backed pricing');
    await expect(diagnosis).not.toContainText('Source-backed');
    await expect(diagnosis.getByRole('button', { name: 'Review positions' })).toBeVisible();
    await expect(diagnosis).not.toContainText('Trusted');
    await expect(diagnosis.getByText('LP vs HODL', { exact: true })).toBeVisible();
    await expect(diagnosis).toContainText('LP value minus HODL value for historical positions');
    await expect(page.getByText('Total Impermanent Loss')).toHaveCount(0);
    // Check for impermanent loss section - may not be visible if no IL data, so check for IL Calculator tab instead.
    // The IL Calculator tab should be present.
    await page.getByRole('tab', { name: 'IL Calculator', exact: true }).click();
    await expect(page.getByText('Impermanent Loss Calculator')).toBeVisible();
    await expect(page.getByLabel('IL estimate assumptions')).toContainText('Manual estimate');
    await expect(page.getByLabel('IL estimate assumptions')).toContainText('50/50 formula');
    await expect(page.getByLabel('IL estimate result')).toContainText('Estimated, not source-confirmed');
    await expect(page.getByLabel('IL estimate result')).toContainText('Review before withdrawing');
    // Check that at least one pool is displayed (BTC.BTC) - look for text in the page.
    await page.getByRole('tab', { name: 'My Positions (1)', exact: true }).click();
    const positionsPanel = page.getByRole('tabpanel', { name: 'My Positions (1)' });
    await expect(positionsPanel.getByRole('link', { name: 'BTC.BTC', exact: true })).toBeVisible();
  });

  test('marks malformed LP source amounts unavailable instead of zero balances', async ({ page }) => {
    await setupMocks(page, 'malformed-amounts');
    await page.goto(`/dashboard/lp?address=${MOCK_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'LP Positions', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'RUNE Deposited metric', exact: true })).toContainText('--');
    await expect(page.getByRole('group', { name: 'BTC Deposited metric', exact: true })).toContainText('--');
    await expect(page.getByRole('group', { name: 'Claimable RUNE metric', exact: true })).toContainText('--');
    await expect(page.getByRole('group', { name: 'Claimable BTC metric', exact: true })).toContainText('--');

    const visibleText = await page.locator('body').innerText();
    expect(visibleText).not.toMatch(/ᚱ0\.00|NaN|Infinity/);
    expect(visibleText).not.toMatch(/BTC Deposited\s+0\.00|Claimable BTC\s+0\.00/);
  });

  test('keeps source-loaded LP data-check evidence readable on mobile', async ({ page }) => {
    await setupMocks(page, 'historical');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dashboard/lp?address=${MOCK_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'LP Positions', exact: true })).toBeVisible();
    const diagnosis = page.getByLabel('LP performance diagnosis');
    const confidence = page.getByLabel('LP data checks');

    await expect(diagnosis).toContainText('Inputs loaded');
    await expect(diagnosis).toHaveClass(/border-sky-200/);
    await expect(diagnosis).not.toHaveClass(/border-emerald-200/);
    await expect(confidence).toContainText('Historical entry pricing loaded');
    await expect(confidence).toContainText('Updated');

    const lpEvidenceLayout = await page.evaluate(() => {
      const confidencePanel = document.querySelector('section[aria-label="LP data checks"]');
      const elements = confidencePanel ? Array.from(confidencePanel.querySelectorAll('*')) : [];
      const timestampDetail = elements.find((element) => element.textContent?.trim().startsWith('Updated '));
      const historicalDetail = elements.find((element) => element.textContent?.trim() === 'Historical entry pricing loaded');
      const viewportWidth = window.innerWidth;
      const box = (element: Element | undefined | null) => {
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom, width: rect.width } : null;
      };
      const overflowing = Array.from(document.querySelectorAll('main *'))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
        })
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80));

      return {
        confidence: box(confidencePanel),
        historicalBox: box(historicalDetail),
        historicalClass: historicalDetail?.getAttribute('class') ?? '',
        historicalDetail: historicalDetail?.textContent?.trim() ?? '',
        timestampBox: box(timestampDetail),
        timestampClass: timestampDetail?.getAttribute('class') ?? '',
        timestampDetail: timestampDetail?.textContent?.trim() ?? '',
        viewportHeight: window.innerHeight,
        overflowing,
      };
    });

    expect(lpEvidenceLayout.confidence).not.toBeNull();
    expect(lpEvidenceLayout.confidence!.top).toBeLessThan(lpEvidenceLayout.viewportHeight);
    expect(lpEvidenceLayout.timestampBox).not.toBeNull();
    expect(lpEvidenceLayout.timestampBox!.bottom).toBeLessThanOrEqual(lpEvidenceLayout.viewportHeight);
    expect(lpEvidenceLayout.historicalBox).not.toBeNull();
    expect(lpEvidenceLayout.historicalBox!.bottom).toBeLessThanOrEqual(lpEvidenceLayout.viewportHeight);
    expect(lpEvidenceLayout.timestampDetail).toContain('Updated');
    expect(lpEvidenceLayout.timestampClass).not.toContain('line-clamp-1');
    expect(lpEvidenceLayout.historicalDetail).toBe('Historical entry pricing loaded');
    expect(lpEvidenceLayout.historicalClass).not.toContain('line-clamp-1');
    expect(lpEvidenceLayout.overflowing).toEqual([]);
  });

  test('shows an inline LP CSV export failure without opening a browser dialog', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.addInitScript(() => {
      URL.createObjectURL = () => {
        throw new Error('blob unavailable');
      };
    });
    await setupMocks(page);
    await page.goto(`/dashboard/lp?address=${MOCK_ADDRESS}`);

    await page.getByRole('tab', { name: 'Position CSV', exact: true }).click();
    const csvPanel = page.getByRole('tabpanel', { name: 'Position CSV' });
    await csvPanel.getByRole('button', { name: 'Export CSV (1 positions)', exact: true }).click();

    await expect(csvPanel.getByRole('alert')).toContainText('LP CSV export failed');
    await expect(csvPanel.getByRole('alert')).toContainText('No file was downloaded');
    await expect(csvPanel.getByRole('button', { name: 'Export CSV (1 positions)', exact: true })).toBeEnabled();
    expect(dialogs).toEqual([]);
  });

  test('labels aggregate LP performance exclusions for mixed pricing checks', async ({ page }) => {
    await setupMocks(page, 'mixed-confidence');
    await page.goto(`/dashboard/lp?address=${MOCK_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'LP Positions', exact: true })).toBeVisible();
    const diagnosis = page.getByLabel('LP performance diagnosis');
    await expect(diagnosis).toContainText('Current-only: 1');
    await expect(diagnosis).toContainText('1 current-only LP position history unavailable');
    await expect(diagnosis.getByRole('button', { name: 'Review LP checks' })).toBeVisible();
    await expect(diagnosis.getByText('Current value includes all pools; 1 estimated position and 1 current-only position need source check review')).toBeVisible();
    await expect(diagnosis.getByText(/from historical positions; 1 estimated position and 1 current-only position excluded/)).toHaveCount(2);
  });

  test('withholds aggregate LP performance review without decision-ready copy when history is unavailable', async ({ page }) => {
    await setupMocks(page, 'current-only');
    await page.goto(`/dashboard/lp?address=${MOCK_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'LP Positions', exact: true })).toBeVisible();
    const diagnosis = page.getByLabel('LP performance diagnosis');
    await expect(diagnosis).toContainText('Current-only: 1');
    await expect(diagnosis).toContainText('1 current-only LP position history unavailable');
    await expect(diagnosis.getByText('Historical entry pricing required for aggregate performance review')).toHaveCount(2);
    await expect(diagnosis).not.toContainText(/decision-ready|\bready\b|\bsafe\b/i);
  });

  test('labels CoinGecko historical RUNE fallback as estimated LP performance', async ({ page }) => {
    await setupMocks(page, 'external-price-fallback');
    await page.goto(`/dashboard/lp?address=${MOCK_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'LP Positions', exact: true })).toBeVisible();
    const diagnosis = page.getByLabel('LP performance diagnosis');
    await expect(diagnosis).toContainText('Estimated values: 1');
    await expect(diagnosis).toContainText('1 LP position uses estimated entry pricing');
    await expect(diagnosis).toContainText('estimated performance stays out of aggregate P/L');
    await expect(diagnosis).not.toContainText('LP performance uses source-backed pricing');
    await expect(page.getByText('external CoinGecko quote')).toBeVisible();
  });

  test('labels malformed current RUNE quote freshness as unverified for LP values', async ({ page }) => {
    await setupMocks(page, 'historical', { runeHistoryMissingTimestamp: true });
    await page.goto(`/dashboard/lp?address=${MOCK_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'LP Positions', exact: true })).toBeVisible();
    const diagnosis = page.getByLabel('LP performance diagnosis');
    await expect(diagnosis).toContainText('RUNE price: Unverified');
    await expect(diagnosis).toContainText('RUNE price checks are unverified');
    await expect(diagnosis).toContainText('Current value uses an unverified RUNE price');

    const confidence = page.getByLabel('LP data checks');
    await expect(confidence).toContainText('RUNE price');
    await expect(confidence).toContainText('Unverified');
    await expect(confidence).toContainText('Quote loaded without freshness');
    // e2e-selector-order-ok: verifies degraded check cards sort ahead of healthy cards
    const firstConfidenceCard = confidence.locator('.grid > div').first();
    await expect(firstConfidenceCard).toContainText('RUNE price');
    await expect(firstConfidenceCard).toContainText('Unverified');
    await expect(confidence).not.toContainText('RUNE price Stale');
    await expect(confidence).not.toContainText('RUNE price Fresh');
  });

  test('shows LP check details before an empty current-source claim on mobile', async ({ page }) => {
    await setupMocks(page, 'empty');
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/lp?address=${MOCK_ADDRESS}`);

    const emptyHeading = page.getByRole('heading', { name: 'No current LP positions shown' });
    const confidence = page.getByLabel('LP data checks');
    await expect(emptyHeading).toBeVisible();
    await expect(confidence).toBeVisible();
    await expect(confidence).toContainText('RUNE price');
    await expect(confidence).toContainText('Not used');
    await expect(page.getByText('Midgard member lookup returned no active LP pools for this address.')).toBeVisible();
    await expect(page.getByText('Treat this as the current source result, not proof of past liquidity activity or pending changes.')).toBeVisible();
    await expect(page.getByText(/address is valid/i)).toHaveCount(0);
    await expect(page.getByText(/successful member lookup/i)).toHaveCount(0);

    const layout = await page.evaluate(() => {
      const emptyHeading = Array.from(document.querySelectorAll('h3')).find((heading) =>
        heading.textContent?.includes('No current LP positions shown')
      );
      const confidence = document.querySelector('section[aria-label="LP data checks"]');
      const viewportWidth = window.innerWidth;
      const box = (element: Element | null) => {
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom, width: rect.width } : null;
      };

      const overflowing = Array.from(document.querySelectorAll('main *'))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
        })
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80));

      return {
        empty: box(emptyHeading ?? null),
        confidence: box(confidence),
        viewportHeight: window.innerHeight,
        overflowing,
      };
    });

    expect(layout.empty).not.toBeNull();
    expect(layout.confidence).not.toBeNull();
    expect(layout.confidence!.top).toBeLessThan(layout.empty!.top);
    expect(layout.confidence!.bottom).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.empty!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.overflowing).toEqual([]);
  });

  test('keeps degraded redeem quote checks before LP details on mobile', async ({ page }) => {
    await setupMocks(page, 'redeem-degraded');
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/lp?address=${MOCK_ADDRESS}`);

    const diagnosis = page.getByLabel('LP performance diagnosis');
    const confidence = page.getByLabel('LP data checks');

    await expect(diagnosis).toContainText('Redeem quotes: Degraded');
    await expect(diagnosis).toContainText('treat withdrawable amounts as estimated');
    await expect(diagnosis.getByRole('button', { name: 'Review LP checks' })).toBeVisible();
    await expect(confidence).toContainText('Redeem quotes');
    await expect(confidence).toContainText('1 derived position redeem quote');
    await expect(page.getByText('Estimated withdrawable RUNE')).toBeVisible();
    await expect(page.getByText('Claimable RUNE')).toHaveCount(0);

    const layout = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom, width: rect.width } : null;
      };

      const overflowing = Array.from(document.querySelectorAll('main *'))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
        })
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80));

      return {
        diagnosis: box('section[aria-label="LP performance diagnosis"]'),
        confidence: box('section[aria-label="LP data checks"]'),
        tabs: box('[role="tablist"]'),
        viewportHeight: window.innerHeight,
        viewportWidth,
        documentWidth: document.documentElement.scrollWidth,
        overflowing,
      };
    });

    expect(layout.diagnosis).not.toBeNull();
    expect(layout.confidence).not.toBeNull();
    expect(layout.tabs).not.toBeNull();
    expect(layout.confidence!.top).toBeGreaterThan(layout.diagnosis!.top);
    expect(layout.confidence!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.confidence!.top).toBeLessThan(layout.tabs!.top);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.overflowing).toEqual([]);
  });
});
