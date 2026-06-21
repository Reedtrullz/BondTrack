import { expect, test, type Page } from './fixtures';

const MOCK_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';
const MOCK_SECONDARY_ADDRESS = 'thor1otherprovider123456789abcdef';
const MOCK_CANDIDATE_ADDRESS = 'thor1candidateaccess123456789abcdef';
const MOCK_STRONG_CANDIDATE_ADDRESS = 'thor1strongcandidate0000000000000000000000';

const mockNodes = [
  {
    node_address: 'thor1noderisk123456789abcdef',
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
    slash_points: 75,
    jail: {},
    current_award: '250000000',
    observe_chains: [{ chain: 'BTC', height: 850000 }],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
  },
];

const mockCandidateNode = {
  node_address: MOCK_CANDIDATE_ADDRESS,
  status: 'Active',
  pub_key_set: {
    secp256k1: '03candidate3f456789012345678901234567890123456789012345678901',
    ed25519: '02candidate78901234567890123456789012345678901234567890123',
  },
  validator_cons_pub_key: 'thorvalconspub1zcjduepqcandidate2h3ujnsn3e8qjjjl7r2h9u2d4',
  peer_id: '16UvhCandidate3fG3YDCK4f4W2c5b6d7e8f9a0b1c2d3e4f',
  active_block_height: 12345678,
  status_since: 1700000000,
  node_operator_address: 'thor1operatorcandidate123456789abcdef',
  total_bond: '1000000000000',
  bond_providers: {
    node_operator_fee: '2500',
    providers: [],
  },
  signer_membership: [],
  requested_to_leave: false,
  forced_to_leave: false,
  leave_height: 0,
  ip_address: '10.0.0.3',
  version: '3.19.0',
  slash_points: 150,
  jail: {},
  current_award: '10000000000',
  observe_chains: [{ chain: 'BTC', height: 850000 }],
  preflight_status: { status: 'ok', reason: '', code: 0 },
  maintenance: false,
  missing_blocks: 0,
};

const mockStrongWhitelistedCandidateNode = {
  ...mockCandidateNode,
  node_address: MOCK_STRONG_CANDIDATE_ADDRESS,
  total_bond: '1000000000000',
  slash_points: 0,
  current_award: '20000000000',
  bond_providers: {
    node_operator_fee: '500',
    providers: [{ bond_address: MOCK_ADDRESS, bond: '0' }],
  },
};

const mockCleanProviderNode = {
  ...mockNodes[0],
  slash_points: 0,
  current_award: '5000000000',
};

const mockLowerBondReferenceNode = {
  ...mockCandidateNode,
  node_address: 'thor1lowbondreference123456789abcdef',
  total_bond: '1000000000000',
  slash_points: 0,
  current_award: '5000000000',
};

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

type RiskMockOptions = {
  network?: typeof mockNetwork;
  nodes?: unknown[];
};

async function setupMocks(page: Page, options: RiskMockOptions = {}) {
  const nodes = options.nodes ?? [...mockNodes, mockCandidateNode, mockStrongWhitelistedCandidateNode];
  const network = options.network ?? mockNetwork;

  await page.route('**/api/thorchain/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/thorchain/thorchain/nodes') {
      await route.fulfill({ json: nodes });
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
      await route.fulfill({ json: network });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled Midgard mock: ${url.pathname}` } });
  });
}

test.describe('Risk dashboard empty queue', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, { nodes: [mockCleanProviderNode, mockLowerBondReferenceNode] });
    await page.goto(`/dashboard/risk?address=${MOCK_ADDRESS}`);
  });

  test('frames an empty risk queue as current source visibility instead of all-clear copy', async ({ page }) => {
    const riskQueue = page.getByLabel('Provider exposure review');

    await expect(riskQueue).toBeVisible();
    await expect(riskQueue).toContainText('0 visible');
    await expect(riskQueue).not.toContainText('0 open');
    await expect(riskQueue).toContainText('No current risk item visible');
    await expect(riskQueue).toContainText(
      'Current source checks show no jail, slash exposure, churn-risk, or source-check issue. Keep source freshness in view before acting.'
    );
    await expect(riskQueue).not.toContainText('Risk queue is clear');
    await expect(riskQueue).not.toContainText('No jail, slash exposure, churn-risk, or source-check issue is visible now.');
  });

  test('keeps clean focused alert drilldowns neutral instead of green-ready', async ({ page }) => {
    await page.goto(`/dashboard/risk?address=${MOCK_ADDRESS}&node=thor1noderisk123456789abcdef`);

    const focusedContext = page.getByLabel('Focused node risk context');
    const primaryAction = focusedContext.getByTestId('focused-bonded-primary-action');
    const primaryButton = focusedContext.getByTestId('focused-bonded-primary-button');
    const inlineEvidence = focusedContext.getByTestId('focused-bonded-inline-evidence');
    const nodeContext = focusedContext.getByText('Node context');

    await expect(focusedContext).toBeVisible();
    await expect(primaryAction).toContainText('Review node evidence');
    await expect(primaryAction).toContainText('No current slash, jail, or blocking churn flag is visible');
    await expect(primaryAction).not.toContainText('No immediate bonded-node action is required');
    await expect(primaryAction).toHaveClass(/border-sky-200/);
    await expect(primaryAction).not.toHaveClass(/border-emerald-200/);
    await expect(primaryButton).toHaveClass(/bg-sky-600/);
    await expect(primaryButton).not.toHaveClass(/bg-emerald-600/);
    await expect(inlineEvidence).toContainText('flags Oldest');
    await expect(inlineEvidence).not.toContainText('no risk flags');
    await expect(nodeContext).toHaveClass(/text-sky-700/);
    await expect(nodeContext).not.toHaveClass(/text-emerald-700/);
  });
});

test.describe('Risk dashboard network security details', () => {
  test('discloses unusable active-node bond rows in effective security', async ({ page }) => {
    await setupMocks(page, {
      nodes: [
        mockCleanProviderNode,
        {
          ...mockLowerBondReferenceNode,
          node_address: 'thor1malformedbondreference123456789',
          total_bond: 'not-a-number',
        },
      ],
    });
    await page.goto(`/dashboard/risk?address=${MOCK_ADDRESS}&node=thor1noderisk123456789abcdef`);

    await page
      .getByLabel('Focused node risk context')
      .getByTestId('focused-bonded-primary-button')
      .click();

    const riskDetails = page.locator('#risk-details');
    await expect(riskDetails.getByRole('heading', { name: 'Incentive Pendulum' })).toBeVisible();
    await expect(riskDetails).toContainText('Effective Security Sample');
    await expect(riskDetails).toContainText(
      '1 active node had unusable bond source data and was excluded from effective security.'
    );
    await expect(riskDetails).toContainText(
      'Effective security sample = bottom 2/3 active nodes with usable bond data.'
    );
    const effectiveSecurityMetric = riskDetails.getByRole('group', { name: 'Effective Security Sample' });
    await expect(effectiveSecurityMetric).toContainText('25.0K RUNE');
    await expect(effectiveSecurityMetric).not.toContainText('0.00 RUNE');
  });
});

test.describe('Risk dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/dashboard/risk?address=${MOCK_ADDRESS}`);
  });

  test('renders the network security card and ratio badge', async ({ page }) => {
    const diagnosis = page.getByLabel('Provider risk diagnosis');
    await expect(diagnosis).toBeVisible();
    await expect(diagnosis.getByRole('link', { name: 'Review slash exposure' })).toHaveAttribute(
      'href',
      `/dashboard/risk?address=${MOCK_ADDRESS}&node=thor1noderisk123456789abcdef`
    );
    await expect(page.getByRole('button', { name: 'Show Details' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Provider exposure review' })).toBeVisible();
    const riskSummary = page.getByLabel('Risk summary');
    const securityGauge = page.getByRole('region', { name: 'Network security bond-to-pool gauge' });

    await expect(riskSummary.getByLabel('Provider exposure status')).toHaveText('Review Needed');
    await expect(securityGauge).toBeVisible();
    await expect(securityGauge.getByRole('heading', { name: 'Bond-to-Pool Gauge' })).toBeVisible();
    await expect(securityGauge).toContainText('Midgard reading');
    await expect(securityGauge).toContainText('freshness shown in source status');
    await expect(page.getByText('Live network', { exact: true })).toHaveCount(0);
    await expect(securityGauge).toContainText('Network in range');
    await expect(securityGauge).toContainText('Bond buffer in range');
    await expect(securityGauge).toContainText('Network-level bond coverage, not a provider safety verdict');
    await expect(securityGauge).not.toContainText(/\bhealthy\b|well secured|\bsafe\b|provider in range/i);
    await expect(securityGauge.getByLabel('Bond-to-pool ratio')).toHaveText('2.50x');

    await expect(securityGauge.getByText('Network in range', { exact: true })).toHaveClass(/bg-sky-50/);
    await expect(securityGauge.getByText('Network in range', { exact: true })).not.toHaveClass(/bg-emerald-50/);
    await expect(securityGauge.getByLabel('Bond-to-pool ratio')).toHaveClass(/text-sky-600/);
    await expect(securityGauge.getByLabel('Bond-to-pool ratio')).not.toHaveClass(/text-emerald-600/);
  });

  test('labels churn non-risk nodes as outside the review band without safe copy', async ({ page }) => {
    await page.getByLabel('Provider risk diagnosis').getByRole('link', { name: 'Review slash exposure' }).click();

    const focusedContext = page.getByLabel('Focused node risk context');
    await expect(focusedContext).toBeVisible();
    await expect(focusedContext).toContainText('Next action');
    await focusedContext.getByTestId('focused-bonded-primary-button').click();

    await expect(page.getByRole('heading', { name: 'Churn-Out Risk', exact: true })).toBeVisible();
    await expect(page.getByText('Outside Review Band')).toBeVisible();
    await expect(page.getByText('Outside Band', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Safe', { exact: true })).toHaveCount(0);
  });

  test('keeps the mobile risk diagnosis and summary from duplicating labels or overflowing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel('Provider risk diagnosis')).toBeVisible();
    await expect(page.getByLabel('Provider risk diagnosis')).toContainText('Provider risk');

    const duplicatedLabelChunks = await page.evaluate(() => {
      const bodyText = document.body.textContent?.replace(/\s+/g, '') ?? '';
      return ['RiskAtRiskRisk', 'RiskRisk'].filter((chunk) => bodyText.includes(chunk));
    });
    expect(duplicatedLabelChunks).toEqual([]);

    const riskSummary = page.getByLabel('Risk summary');
    await expect(riskSummary).toBeVisible();
    const overflowingSummaryItems = await riskSummary.evaluate((summary) =>
      Array.from(summary.querySelectorAll('*'))
        .filter((element): element is HTMLElement => element instanceof HTMLElement)
        .filter(
          (element) =>
            element.clientWidth > 0 &&
            element.scrollWidth > element.clientWidth + 2 &&
            getComputedStyle(element).overflowX === 'visible'
        )
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    );
    expect(overflowingSummaryItems).toEqual([]);
  });

  test('keeps risk radar accessibility data from creating hidden horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel('Provider risk diagnosis')).toBeVisible();

    const radarAccessibilityLayout = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const radarTables = Array.from(
        document.querySelectorAll('[role="table"][aria-label^="Risk radar metrics"]')
      );
      const overflowing = radarTables
        .flatMap((table) => [table, ...Array.from(table.querySelectorAll('*'))])
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
        })
        .map((element) => ({
          role: element.getAttribute('role'),
          text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80),
          width: Math.round(element.getBoundingClientRect().width),
        }));

      return {
        tableCount: radarTables.length,
        overflowing,
      };
    });

    expect(radarAccessibilityLayout.tableCount).toBeGreaterThan(0);
    expect(radarAccessibilityLayout.overflowing).toEqual([]);
  });

  test('withholds risk diagnosis while THORNode positions are loading', async ({ page }) => {
    let releaseNodes!: () => void;
    const nodesGate = new Promise<void>((resolve) => {
      releaseNodes = resolve;
    });

    await page.route('**/api/thorchain/thorchain/nodes', async (route) => {
      await nodesGate;
      await route.fulfill({ json: mockNodes });
    });

    await page.goto(`/dashboard/risk?address=${MOCK_ADDRESS}&node=thor1noderisk123456789abcdef`);

    const loadingState = page.getByRole('status', { name: 'Loading risk analysis' });
    await expect(loadingState).toContainText('Waiting for THORNode bond positions');
    await expect(page.getByLabel('Provider risk diagnosis')).toHaveCount(0);
    await expect(page.getByText('No bonded positions detected')).toHaveCount(0);

    releaseNodes();
    const focusedContext = page.getByLabel('Focused node risk context');
    await expect(page.getByLabel('Provider risk diagnosis')).toBeVisible();
    await expect(focusedContext).toContainText('Alert context');
  });

  test('shows focused node context when opened from an alert drilldown', async ({ page }) => {
    await page.goto(`/dashboard/risk?address=${MOCK_ADDRESS}&node=thor1noderisk123456789abcdef`);

    const focusedContext = page.getByLabel('Focused node risk context');
    const primaryAction = focusedContext.getByTestId('focused-bonded-primary-action');
    const inlineEvidence = focusedContext.getByTestId('focused-bonded-inline-evidence');
    const primaryButton = focusedContext.getByTestId('focused-bonded-primary-button');
    const metricDetails = focusedContext.getByTestId('focused-bonded-metric-details');
    const metrics = focusedContext.getByTestId('focused-bonded-metrics');

    await expect(focusedContext).toBeVisible();
    await expect(focusedContext).toContainText('Alert context');
    await expect(focusedContext).toContainText('thor1noderisk123456789abcdef');
    await expect(primaryAction).toContainText('Review slash exposure');
    await expect(primaryAction).toContainText('Slash exposure is elevated.');
    await expect(inlineEvidence).toContainText('THORNode: status Active');
    await expect(inlineEvidence).toContainText('slash 75');
    await expect(inlineEvidence).toContainText('flags Oldest');
    await expect(primaryButton).toContainText('Review slash exposure');
    await expect(metricDetails).toContainText('Operational details');
    await expect(metricDetails).toContainText('Active · Slash 75 · Flags Oldest');
    await expect(metrics).not.toBeVisible();

    const focusedRow = page.locator('[data-focused-node="true"]');
    await expect(focusedRow).toBeVisible();
    await expect(focusedRow).toContainText('Focused');
    await expect(page.getByLabel('Provider exposure review')).toHaveCount(0);
    await expect(page.getByLabel('Other provider reviews')).toHaveCount(0);

    await primaryButton.click();

    await expect(primaryButton).toContainText('Hide risk details');
    await expect(page.getByRole('heading', { name: 'Slash Point Monitor' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Churn-Out Risk' })).toBeVisible();
  });

  test('shows provider-access action before focused candidate metrics on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dashboard/risk?address=${MOCK_ADDRESS}&node=${MOCK_CANDIDATE_ADDRESS}`);

    const focusedContext = page.getByLabel('Focused node risk context');
    const primaryAction = focusedContext.getByTestId('focused-risk-primary-action');
    const inlineEvidence = focusedContext.getByTestId('focused-risk-inline-evidence');
    const primaryLink = focusedContext.getByTestId('focused-risk-primary-link');
    const candidateEvidence = focusedContext.getByTestId('focused-risk-score-evidence');
    const metricDetails = focusedContext.getByTestId('focused-risk-metric-details');
    const metrics = focusedContext.getByTestId('focused-risk-candidate-metrics');

    await expect(focusedContext).toContainText('Provider access review');
    await expect(focusedContext).toContainText('Avoid candidate');
    await expect(focusedContext).not.toContainText(/\d+\/100/);
    await expect(primaryAction).toContainText('Ask operator to add provider');
    await expect(primaryAction).toContainText('Do not bond until THORNode lists this address as a bond provider.');
    await expect(primaryAction).not.toContainText(/whitelist|whitelisted/i);
    await expect(inlineEvidence).toContainText('THORNode: All candidate inputs present.');
    await expect(inlineEvidence).toContainText('Capacity: Provider not listed by THORNode.');
    await expect(primaryLink).toContainText('Compare alternatives');
    await expect(primaryLink).toHaveAttribute(
      'href',
      `/dashboard/explorer?address=${MOCK_ADDRESS}&node=${MOCK_CANDIDATE_ADDRESS}`
    );
    await expect(candidateEvidence).toContainText('Candidate evidence · THORNode');
    await expect(candidateEvidence).toContainText('Watched address is not listed as a THORNode bond provider.');
    await expect(metricDetails).toContainText('Operational details');
    await expect(metricDetails).toContainText('Provider not listed by THORNode · Slash 150 · Fee 25.0%');
    await expect(metrics).not.toBeVisible();
    await expect(page.getByLabel('Provider exposure review')).toHaveCount(0);
    const otherQueue = page.getByLabel('Other provider reviews');
    await expect(otherQueue).toBeVisible();
    await expect(otherQueue).toContainText('thor1nod...cdef has elevated slash exposure');

    const closedLayout = await page.evaluate(() => {
      const rectFor = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect
          ? {
              bottom: Math.round(rect.bottom),
              top: Math.round(rect.top),
            }
          : null;
      };
      const viewportWidth = window.innerWidth;
      const overflowing = Array.from(document.querySelectorAll('body *'))
        .filter((element): element is HTMLElement => element instanceof HTMLElement)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
        })
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? element.tagName);

      return {
        action: rectFor('[data-testid="focused-risk-primary-action"]'),
        details: rectFor('[data-testid="focused-risk-metric-details"]'),
        inlineEvidence: rectFor('[data-testid="focused-risk-inline-evidence"]'),
        focusedContext: rectFor('[data-testid="focused-risk-context"]'),
        primaryLink: rectFor('[data-testid="focused-risk-primary-link"]'),
        overflowing,
        viewportHeight: window.innerHeight,
      };
    });

    expect(closedLayout.focusedContext).not.toBeNull();
    expect(closedLayout.action).not.toBeNull();
    expect(closedLayout.inlineEvidence).not.toBeNull();
    expect(closedLayout.details).not.toBeNull();
    expect(closedLayout.primaryLink).not.toBeNull();
    expect(closedLayout.primaryLink!.top).toBeLessThanOrEqual(closedLayout.action!.top);
    expect(closedLayout.action!.top).toBeLessThanOrEqual(closedLayout.inlineEvidence!.top);
    expect(closedLayout.inlineEvidence!.top).toBeLessThan(closedLayout.details!.top);
    expect(closedLayout.primaryLink!.top).toBeLessThan(closedLayout.viewportHeight);
    expect(closedLayout.primaryLink!.bottom).toBeLessThan(closedLayout.viewportHeight);
    expect(closedLayout.action!.top).toBeLessThan(closedLayout.viewportHeight);
    expect(closedLayout.overflowing).toEqual([]);

    await metricDetails.locator('summary').click();

    await expect(metrics).toBeVisible();
    const openOverflow = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      return Array.from(document.querySelectorAll('body *'))
        .filter((element): element is HTMLElement => element instanceof HTMLElement)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
        })
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? element.tagName);
    });
    expect(openOverflow).toEqual([]);
  });

  test('frames strong whitelisted focused candidates as review states before BOND memo review', async ({ page }) => {
    await page.goto(`/dashboard/risk?address=${MOCK_ADDRESS}&node=${MOCK_STRONG_CANDIDATE_ADDRESS}`);

    const focusedContext = page.getByLabel('Focused node risk context');
    const primaryAction = focusedContext.getByTestId('focused-risk-primary-action');
    const primaryLink = focusedContext.getByTestId('focused-risk-primary-link');

    await expect(focusedContext).toBeVisible();
    await expect(focusedContext).toContainText('Strong candidate');
    await expect(focusedContext).not.toContainText(/\d+\/100/);
    await expect(primaryAction).toContainText('Review before BOND memo');
    await expect(primaryAction).toContainText('Candidate evidence and THORNode-listed provider access support reviewing a BOND memo');
    await expect(primaryAction).not.toContainText('Candidate evidence and provider access support reviewing a BOND memo');
    await expect(primaryAction).toContainText('not a safety guarantee');
    await expect(primaryAction).not.toContainText('memo prep');
    await expect(primaryAction).not.toContainText('Watched address is already listed as a provider and the candidate score is strong.');
    await expect(primaryAction).not.toContainText('Ready');
    await expect(primaryLink).toContainText('Review BOND memo');
    await expect(primaryLink).toHaveAttribute(
      'href',
      `/dashboard/transactions?address=${MOCK_ADDRESS}&action=bond&node=${MOCK_STRONG_CANDIDATE_ADDRESS}`
    );
    await expect(focusedContext.getByRole('link', { name: 'Prepare BOND memo' })).toBeHidden();
    await expect(focusedContext.getByTestId('focused-risk-inline-evidence')).toContainText(
      'THORNode: All candidate inputs present. Capacity: Provider listed by THORNode.'
    );
  });

  test('keeps mobile alert drilldowns diagnosis-first with source checks visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dashboard/risk?address=${MOCK_ADDRESS}&node=thor1noderisk123456789abcdef`);

    const diagnosis = page.getByLabel('Provider risk diagnosis');
    const sourceConfidence = page.getByRole('region', { name: 'Source checks' });
    const focusedContext = page.getByLabel('Focused node risk context');
    const primaryAction = focusedContext.getByTestId('focused-bonded-primary-action');
    const inlineEvidence = focusedContext.getByTestId('focused-bonded-inline-evidence');
    const metricDetails = focusedContext.getByTestId('focused-bonded-metric-details');
    const metrics = focusedContext.getByTestId('focused-bonded-metrics');

    await expect(diagnosis).toBeVisible();
    await expect(sourceConfidence).toBeVisible();
    await expect(sourceConfidence).toContainText('THORNode');
    await expect(sourceConfidence).toContainText('Midgard');
    await expect(focusedContext).toBeVisible();
    await expect(primaryAction).toContainText('Review slash exposure');
    await expect(inlineEvidence).toContainText('THORNode: status Active');
    await expect(inlineEvidence).toContainText('Midgard: block height feeds jail and churn timing.');
    await expect(metricDetails).toContainText('Operational details');
    await expect(metrics).not.toBeVisible();

    const layout = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect
          ? { top: rect.top, bottom: rect.bottom, height: rect.height }
          : null;
      };

      return {
        viewportHeight: window.innerHeight,
        diagnosis: box('section[aria-label="Provider risk diagnosis"]'),
        sourceConfidence: box('section[aria-label="Source checks"]'),
        focusedContext: box('section[aria-label="Focused node risk context"]'),
        focusedAction: box('[data-testid="focused-bonded-primary-action"]'),
        focusedButton: box('[data-testid="focused-bonded-primary-button"]'),
        focusedEvidence: box('[data-testid="focused-bonded-inline-evidence"]'),
        focusedDetails: box('[data-testid="focused-bonded-metric-details"]'),
        overflowing: Array.from(document.querySelectorAll('body *'))
          .filter((element): element is HTMLElement => element instanceof HTMLElement)
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1);
          })
          .map((element) => element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? element.tagName),
      };
    });

    expect(layout.diagnosis).not.toBeNull();
    expect(layout.sourceConfidence).not.toBeNull();
    expect(layout.focusedContext).not.toBeNull();
    expect(layout.focusedAction).not.toBeNull();
    expect(layout.focusedButton).not.toBeNull();
    expect(layout.focusedEvidence).not.toBeNull();
    expect(layout.focusedDetails).not.toBeNull();
    expect(layout.diagnosis!.top).toBeLessThan(layout.sourceConfidence!.top);
    expect(layout.sourceConfidence!.top).toBeLessThan(layout.focusedContext!.top);
    expect(layout.focusedButton!.top).toBeLessThanOrEqual(layout.focusedAction!.top);
    expect(layout.focusedAction!.top).toBeLessThanOrEqual(layout.focusedEvidence!.top);
    expect(layout.focusedEvidence!.top).toBeLessThan(layout.focusedDetails!.top);
    expect(layout.diagnosis!.bottom).toBeLessThan(layout.viewportHeight);
    expect(layout.sourceConfidence!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.focusedButton!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.focusedButton!.bottom).toBeLessThan(layout.viewportHeight);
    expect(layout.focusedAction!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.overflowing).toEqual([]);
  });
});
