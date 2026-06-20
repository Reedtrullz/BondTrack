import { expect, test } from './fixtures';
import { DEFAULT_DASHBOARD_ADDRESS, mockDashboardApis } from './helpers/dashboard-api-mocks';

test.describe('Dashboard command center', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'denied'; static requestPermission = async () => 'denied'; },
        writable: true,
      });
    });
  });

  test('lands on the triage-first command center by default', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByLabel('Command center diagnosis')).toBeVisible();
    await expect(page.getByLabel('Command center diagnosis').getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Provider review queue' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Source freshness' })).toBeVisible();
    await expect(page.getByLabel('Supporting metrics')).toBeVisible();
    await expect(page.getByLabel('Supporting metrics')).toContainText('No bond events found in loaded history');
    await expect(page.getByLabel('Supporting metrics')).not.toContainText('Bond events loaded');
  });

  test('keeps first-viewport triage visible while support feeds are pending', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      supportFeedDelayMs: 15_000,
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    const nextTransaction = page.getByRole('region', { name: 'Transaction review' });

    await expect(diagnosis).toBeVisible();
    await expect(page.getByRole('status', { name: 'Loading command center' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Source freshness' })).toBeVisible();
    await expect(nextTransaction).toContainText('Memo review starts here; wallet approval stays external.');
    await expect(nextTransaction).not.toContainText('source-checked bond work');
    await expect(nextTransaction.getByRole('link', { name: 'Review BOND memo' })).toHaveAttribute(
      'href',
      `/dashboard/transactions?address=${DEFAULT_DASHBOARD_ADDRESS}&action=bond`
    );
    await expect(nextTransaction.getByRole('link', { name: 'Open BOND' })).toHaveCount(0);
    await expect(nextTransaction.getByRole('link', { name: 'Review UNBOND memo' })).toHaveCount(0);
  });

  test('uses conservative no-urgent-review copy when current sources show no action items', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      extraNodes: [
        {
          status_since: 1_699_990_000,
          total_bond: '1000000000000',
        },
      ],
      historicalEntryRuneHistory: true,
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    const actionQueue = page.getByLabel('Provider review queue');

    await expect(diagnosis).toContainText('Current source responses do not show an urgent provider action.');
    await expect(diagnosis).toContainText('No urgent review visible');
    await expect(diagnosis.getByRole('link', { name: 'Inspect details' })).toHaveAttribute(
      'href',
      `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}`
    );
    await expect(diagnosis.getByRole('link', { name: 'Review exposure' })).toHaveCount(0);
    await expect(diagnosis).not.toContainText('Current source responses show no provider action needed.');
    await expect(diagnosis).not.toContainText('No provider review needed');
    await expect(actionQueue).toContainText('No urgent provider review visible');
    await expect(actionQueue).toContainText(
      'Current source responses do not show a node, source, or LP issue that needs provider review.'
    );
    await expect(actionQueue).not.toContainText('No provider review needed');
    await expect(actionQueue.locator('article')).toHaveCount(0);
  });

  test('does not nest buttons inside command-center links', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByLabel('Command center diagnosis')).toBeVisible();

    const nestedInteractiveLabels = await page.evaluate(() => (
      Array.from(document.querySelectorAll('main a button, main button a'))
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    ));

    expect(nestedInteractiveLabels).toEqual([]);
  });

  test('labels old RUNE quote confidence as stale instead of fresh', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      runeHistoryNowMs: Date.now() - 3 * 24 * 60 * 60 * 1000,
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const sourceFreshness = page.getByLabel('Source freshness');
    await expect(sourceFreshness).toBeVisible();
    await expect(sourceFreshness).toContainText('RUNE price');
    await expect(sourceFreshness).toContainText('Stale');
    await expect(sourceFreshness).toContainText('Price feed is stale');
    await expect(sourceFreshness).not.toContainText(/RUNE price\s*Fresh/);
    const supportingMetrics = page.getByLabel('Supporting metrics');
    await expect(supportingMetrics).toContainText('$18,750 · stale quote');
    await expect(supportingMetrics).toContainText('1 pool · stale quote');
  });

  test('labels malformed RUNE quote freshness as stale before showing USD metric details', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      runeHistoryMissingTimestamp: true,
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const sourceFreshness = page.getByLabel('Source freshness');
    await expect(sourceFreshness).toBeVisible();
    await expect(sourceFreshness).toContainText('RUNE price');
    await expect(sourceFreshness).toContainText('Stale');
    await expect(sourceFreshness).toContainText('Price feed is stale');
    await expect(sourceFreshness).not.toContainText(/RUNE price\s*Fresh/);

    const supportingMetrics = page.getByLabel('Supporting metrics');
    await expect(supportingMetrics).toContainText('1 pool · stale quote');
  });

  test('labels estimated LP action without trusted historical claims', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      poolHistoryUnavailable: true,
      runeHistoryNowMs: 1_700_000_000_000,
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const actionQueue = page.getByLabel('Provider review queue');
    await expect(actionQueue).toContainText('1 LP position use estimated entry pricing');
    await expect(actionQueue).toContainText(
      'Estimated LP P/L is shown per pool and excluded from aggregate totals that require historical entry prices.'
    );
    await expect(actionQueue).toContainText(
      'Use only source-loaded entry-price rows for aggregate LP performance decisions.'
    );
    await expect(actionQueue).not.toContainText('trusted aggregate totals');
    await expect(actionQueue).not.toContainText('trusted historical values');
  });

  test('labels recent bond history as partial when Midgard reports more actions than loaded', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      partialBondActions: true,
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const supportingMetrics = page.getByLabel('Supporting metrics');
    await expect(supportingMetrics).toContainText('Recent tx');
    await expect(supportingMetrics).toContainText('Partial bond-event window');
    await expect(supportingMetrics).not.toContainText('Bond events loaded');
  });

  test('keeps degraded source consequences actionable on mobile', async ({ page, allowApiErrors }) => {
    allowApiErrors(['/api/midgard/v2/health']);
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      midgardHealthStatus: 404,
    });
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const sourceConfidence = page.getByRole('region', { name: 'Source checks' });
    const actionQueue = page.getByLabel('Provider review queue');
    const sourceImpact = page.getByText(
      'Impact: Do not use reward history, LP performance, or transaction history for final decisions until Midgard recovers.'
    );

    await expect(sourceConfidence).toContainText('1 degraded');
    await expect(actionQueue).toContainText('Midgard is degraded');
    await expect(sourceImpact).toBeVisible();
    await expect(actionQueue.getByRole('link', { name: 'Review source checks' })).toHaveAttribute(
      'href',
      `/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}#source-confidence`
    );
  });

  test('routes no-bond BOND shortcut to source checks when THORNode /nodes is unavailable', async ({ page, allowApiErrors }) => {
    allowApiErrors(['/api/thorchain/thorchain/nodes']);
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      thornodeNodesStatus: 502,
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    const nextTransaction = page.getByRole('region', { name: 'Transaction review' });

    await expect(diagnosis.getByText('No Bond', { exact: true })).toBeVisible();
    await expect(diagnosis).toContainText('wait for the THORNode source check to pass before opening BOND review');
    await expect(diagnosis).not.toContainText('wait for fresh THORNode source confidence');
    await expect(diagnosis.getByRole('link', { name: 'Review source checks' })).toHaveAttribute(
      'href',
      `/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}#source-confidence`
    );
    await expect(nextTransaction.getByRole('link', { name: 'Review source checks' })).toHaveAttribute(
      'href',
      `/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}#source-confidence`
    );
    await expect(nextTransaction.getByRole('link', { name: 'Open BOND' })).toHaveCount(0);
    await expect(nextTransaction.getByRole('link', { name: 'Review BOND memo' })).toHaveCount(0);
    await expect(nextTransaction.getByRole('link', { name: 'Review UNBOND memo' })).toHaveCount(0);
    await expect(page.getByLabel('Provider review queue')).toContainText('THORNode is degraded');
  });

  test('keeps subpage diagnosis headings subordinate to the page title', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);

    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);
    await expect(page.getByLabel('Command center diagnosis').getByRole('heading', { level: 1 })).toBeVisible();

    const pages = [
      { route: '/dashboard/portfolio', title: 'Portfolio', diagnosis: 'Portfolio diagnosis' },
      { route: '/dashboard/nodes', title: 'Nodes', diagnosis: 'Node diagnosis' },
      { route: '/dashboard/rewards', title: 'Rewards', diagnosis: 'Rewards diagnosis' },
      { route: '/dashboard/risk', title: 'Risk', diagnosis: 'Provider risk diagnosis' },
    ];

    for (const pageSpec of pages) {
      await page.goto(`${pageSpec.route}?address=${DEFAULT_DASHBOARD_ADDRESS}`);
      await expect(page.getByRole('heading', { level: 1, name: pageSpec.title, exact: true })).toBeVisible();
      await expect(page.getByLabel(pageSpec.diagnosis).getByRole('heading', { level: 2 })).toBeVisible();

      const visibleH1Text = await page.evaluate(() => (
        Array.from(document.querySelectorAll('h1'))
          .filter((heading) => {
            const rect = heading.getBoundingClientRect();
            const style = getComputedStyle(heading);
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          })
          .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim())
      ));

      expect(visibleH1Text).toEqual([pageSpec.title]);
    }
  });

  test('shows rewards data checks before reward decision tabs', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Rewards', exact: true })).toBeVisible();
    const diagnosis = page.getByLabel('Rewards diagnosis');
    await expect(diagnosis).toContainText('Reward history: Current-only');
    await expect(diagnosis).toContainText('Reward history is current-only');
    await expect(diagnosis).toContainText('use the data checks before relying on return, forecast, or tax outputs');
    await expect(diagnosis).not.toContainText('confidence panel');
    await expect(diagnosis.getByRole('button', { name: 'Review data checks' })).toBeVisible();
    const checks = page.getByLabel('Rewards data checks');
    await expect(checks).toBeVisible();
    await expect(checks).toContainText('Reward history');
    await expect(checks).toContainText('APY basis');
    await expect(checks).toContainText(/Node-level|Network fallback|Unavailable/);
    await expect(checks).toContainText('RUNE price');
    await expect(checks).toContainText('Forecast');
    await expect(checks).toContainText(/Source-loaded|Current-only|Pending|Degraded/);
    await expect(checks).toContainText(/Recent|Stale|Missing/);
    await expect(checks).not.toContainText('Fresh');
    await expect(checks).not.toContainText('Rewards data confidence');
    await expect(checks).not.toContainText('Source-backed');
    await expect(checks).not.toContainText('Trusted');

    const checksY = (await checks.boundingBox())?.y ?? 9999;
    const returnTabY = (await page.getByRole('tab', { name: 'Return' }).boundingBox())?.y ?? 0;
    expect(checksY).toBeLessThan(returnTabY);
  });

  test('calls out capped reward history before return decisions', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, { cappedBondActions: true });
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Rewards', exact: true })).toBeVisible();
    const checks = page.getByLabel('Rewards data checks');
    await expect(checks).toContainText('Reward history');
    await expect(checks).toContainText('Capped');
    await expect(checks).toContainText('Local 1000-action cap reached; set a manual baseline before relying on returns');
    await expect(checks).toContainText('Tax worksheet');
    await expect(checks).toContainText('Local action cap reached; worksheet may omit older bond history');

    const basis = page.getByLabel('PnL calculation basis');
    await expect(basis).toContainText('Initial bond: capped action history');
    await expect(basis).toContainText('Baseline is capped: Heimdall loaded the most recent 1000 BOND/UNBOND actions out of 1001 before the local reward-history cap.');
    await expect(basis).toContainText('Auto return cards are withheld; set a manual initial bond before relying on returns.');

    const returnCards = page.getByLabel('PnL return cards');
    await expect(returnCards).toContainText('Total Return');
    await expect(returnCards).toContainText('N/A');
    expect(await page.getByText('Set manual baseline for capped history').count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByText('Auto return cards are withheld until full history loads or you set a manual initial bond.')).toHaveCount(0);
  });

  test('labels complete reward history as source-loaded review material', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, { completeBondActions: true });
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const checks = page.getByLabel('Rewards data checks');
    await expect(checks).toContainText('Reward history');
    await expect(checks).toContainText('Source-loaded');
    await expect(checks).toContainText('Bond action rows loaded; returns are app-calculated review metrics');
    await expect(checks).toContainText('Tax worksheet');
    await expect(checks).toContainText('Bond history rows available; not filing-ready');
    await expect(checks).not.toContainText('Source-backed');
    await expect(checks).not.toContainText('Trusted');
    await expect(checks).not.toContainText('Ready');
  });

  test('does not confirm rewards no-bond absence when THORNode source check is degraded', async ({ page, allowApiErrors }) => {
    allowApiErrors(['/api/thorchain/thorchain/nodes']);
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      withBondPosition: false,
      thornodeHealthProbeStatus: 502,
    });
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Rewards', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bond position result needs source check', exact: true })).toBeVisible();
    await expect(page.getByText('No active bond-provider position is visible yet, but THORNode confidence has not passed, so do not treat the missing bond position as final.')).toBeVisible();
    await expect(page.getByText('Confirm the address, then wait for the THORNode source check to pass before opening BOND review.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No bonded positions found', exact: true })).toHaveCount(0);
    await expect(page.getByText(/queried successfully/i)).toHaveCount(0);

    const reviewSourceChecks = page.getByRole('button', { name: 'Review source checks', exact: true });
    await expect(reviewSourceChecks).toBeVisible();
    await reviewSourceChecks.click();
    await expect(page).toHaveURL(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}#source-confidence`);
  });

  test('keeps rewards no-position copy scoped to current THORNode source data', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, { withBondPosition: false });
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Rewards', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No active bond-provider position visible', exact: true })).toBeVisible();
    await expect(page.getByText('Current THORNode node data does not show this address as an active bond provider. Treat this as the current source result, not a guarantee about past or pending bond activity.')).toBeVisible();
    await expect(page.getByText('If you intend to add bond, open BOND review after confirming the address and node operator.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No bonded positions found', exact: true })).toHaveCount(0);
    await expect(page.getByText(/queried successfully/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open BOND review', exact: true })).toBeVisible();
  });

  test('keeps rewards data checks fully scannable in the first mobile viewport', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Rewards', exact: true })).toBeVisible();
    const diagnosis = page.getByLabel('Rewards diagnosis');
    const checks = page.getByLabel('Rewards data checks');
    await expect(diagnosis).toBeVisible();
    await expect(checks).toBeVisible();

    const layout = await page.evaluate(() => {
      const diagnosis = document.querySelector('section[aria-label="Rewards diagnosis"]');
      const checks = document.querySelector('section[aria-label="Rewards data checks"]');
      const tabs = document.querySelector('[role="tablist"]');
      const viewportWidth = window.innerWidth;
      const box = (element: Element | null) => {
        const rect = element?.getBoundingClientRect();
        return rect
          ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
          : null;
      };

      const overflowing = Array.from(document.querySelectorAll('main *'))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
        })
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80));

      return {
        viewportHeight: window.innerHeight,
        diagnosis: box(diagnosis),
        checks: box(checks),
        tabs: box(tabs),
        overflowing,
      };
    });

    expect(layout.diagnosis).not.toBeNull();
    expect(layout.checks).not.toBeNull();
    expect(layout.tabs).not.toBeNull();
    expect(layout.checks!.top).toBeGreaterThan(layout.diagnosis!.top);
    expect(layout.checks!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.checks!.bottom).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.checks!.top).toBeLessThan(layout.tabs!.top);
    expect(layout.overflowing).toEqual([]);
  });

  test('withholds reward return totals until a baseline is available', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Rewards', exact: true })).toBeVisible();
    await expect(page.getByText('Profit & Loss', { exact: true })).toBeVisible();
    await expect(page.getByText('Current Bond', { exact: true })).toBeVisible();
    await expect(page.getByText('12500.00', { exact: true })).toBeVisible();
    await expect(page.getByText('Price PnL', { exact: true })).toBeVisible();
    await expect(page.getByText('Total Return', { exact: true })).toBeVisible();

    const pnlBasis = page.getByLabel('PnL calculation basis');
    await expect(pnlBasis).toContainText('Initial bond: missing baseline');
    await expect(pnlBasis).toContainText('Entry price: current price fallback');
    await expect(pnlBasis).toContainText('Current price: current quote');
    await expect(pnlBasis).not.toContainText('Current price: live');

    const withheldReturnLabels = page.getByText('Set initial bond to track');
    expect(await withheldReturnLabels.count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByText('$18,750.00')).toBeVisible();
    await expect(page.getByText('+0.00%')).not.toBeVisible();
  });

  test('frames reward forecasts as explicit scenarios instead of live moon targets', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await page.getByRole('tab', { name: 'Forecast' }).click();
    await expect(page.getByRole('heading', { name: 'Compound Growth Forecast' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Historical blend' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Realistic Mode' })).toHaveCount(0);

    await page.getByRole('button', { name: '$ USD' }).click();
    await expect(page.getByText('Price scenarios:')).toBeVisible();
    await expect(page.getByRole('button', { name: '$1.50 (current quote)' })).toBeVisible();
    await expect(page.getByText('Moon Scenarios:')).toHaveCount(0);
    await expect(page.getByText(/\(Live\)/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Historical blend' }).click();
    await expect(page.getByText(/Using current APY/i)).toBeVisible();
    await expect(page.getByText(/live APY/i)).toHaveCount(0);
  });

  test('drills critical command-center actions into focused node risk context', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      primaryNodeOverrides: {
        slash_points: 275,
      },
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const expectedHref = `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef`;
    const diagnosis = page.getByLabel('Command center diagnosis');
    const actionQueue = page.getByLabel('Provider review queue');

    await expect(diagnosis.getByRole('link', { name: 'Review slash exposure' })).toHaveAttribute('href', expectedHref);
    await expect(actionQueue.getByRole('link', { name: 'Review slash exposure' })).toHaveAttribute('href', expectedHref);

    await diagnosis.getByRole('link', { name: 'Review slash exposure' }).click();

    await expect(page).toHaveURL(expectedHref);
    await expect(page.getByLabel('Focused node risk context')).toBeVisible();
    await expect(page.getByLabel('Focused node risk context')).toContainText('thor1nodemocked123456789abcdef');
    await expect(page.locator('[data-focused-node="true"]')).toContainText('Focused');
  });

  test('labels an address with no bonded nodes as no bond rather than healthy', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, { withBondPosition: false });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    await expect(diagnosis).toBeVisible();
    await expect(diagnosis.getByText('No Bond', { exact: true })).toBeVisible();
    await expect(diagnosis.getByText('Healthy')).toHaveCount(0);
    await expect(diagnosis.getByText('100/100')).toHaveCount(0);
    await expect(diagnosis.getByText('No bonded positions tracked')).toBeVisible();
  });

  test('labels standby bonded nodes as needing attention rather than healthy', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      primaryNodeOverrides: {
        status: 'Standby',
      },
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    await expect(diagnosis).toBeVisible();
    await expect(diagnosis.getByText('Review Needed', { exact: true })).toBeVisible();
    await expect(diagnosis.getByText('Healthy')).toHaveCount(0);
    await expect(diagnosis.getByRole('heading', {
      level: 1,
      name: 'thor1nod...cdef is Standby',
      exact: true,
    })).toBeVisible();
    await expect(diagnosis.getByText(/Review needed .*not in active validator status/i)).toBeVisible();
    await expect(diagnosis.getByText(/Score 75\/100/)).toHaveCount(0);

    const nextTransaction = page.getByRole('region', { name: 'Transaction review' });
    await expect(nextTransaction.getByRole('link', { name: 'Review UNBOND memo' })).toHaveAttribute(
      'href',
      `/dashboard/transactions?address=${DEFAULT_DASHBOARD_ADDRESS}&action=unbond`
    );
  });

  test('shows a useful no-bond diagnosis on the Nodes page', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, { withBondPosition: false });
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'Nodes', exact: true })).toBeVisible();
    await expect(page.getByLabel('Node diagnosis')).toBeVisible();
    await expect(page.getByLabel('Node diagnosis').getByText('No Bond', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Node diagnosis').getByText('No bonded positions detected')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open BOND review' })).toBeVisible();
    await expect(page.getByText('No bonded nodes tracked')).toBeVisible();
    await expect(page.getByText(/current THORNode node data does not show bonded nodes for this address/i)).toBeVisible();
    await expect(page.getByText(/current source result, not proof of address validity or past\/pending bond activity/i)).toBeVisible();
    await expect(page.getByText(/this address is valid/i)).toHaveCount(0);
  });

  test('keeps the Nodes comparison table usable without page-level mobile overflow', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'Node Comparison' })).toBeVisible();

    const layout = await page.evaluate(() => {
      const table = Array.from(document.querySelectorAll('table')).find((candidate) => {
        const text = candidate.textContent ?? '';
        return text.includes('Node Address') && text.includes('Review State');
      });
      const scrollRegion = table?.parentElement ?? null;
      const style = scrollRegion ? getComputedStyle(scrollRegion) : null;

      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        scrollRegion: scrollRegion
          ? {
              clientWidth: scrollRegion.clientWidth,
              overflowX: style?.overflowX,
              scrollWidth: scrollRegion.scrollWidth,
            }
          : null,
      };
    });

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.scrollRegion).not.toBeNull();
    expect(layout.scrollRegion!.scrollWidth).toBeGreaterThan(layout.scrollRegion!.clientWidth);
    expect(['auto', 'scroll']).toContain(layout.scrollRegion!.overflowX);

    const riskSortButton = page.getByRole('button', { name: 'Sort by Review State ascending' });
    await expect(riskSortButton).toBeVisible();
    await riskSortButton.click();
    const activeSort = await page
      .getByRole('button', { name: 'Sort by Review State descending' })
      .evaluate((button) => button.closest('th')?.getAttribute('aria-sort'));
    expect(activeSort).toBe('ascending');
  });

  test('keeps minor slash history out of urgent Nodes exception cards', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      extraNodes: [{}],
      primaryNodeOverrides: {
        slash_points: 1,
      },
    });
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Node diagnosis');
    await expect(diagnosis.getByText('No urgent review', { exact: true })).toBeVisible();
    await expect(diagnosis).toHaveClass(/border-sky-200/);
    await expect(diagnosis).not.toHaveClass(/border-emerald-200/);
    await expect(diagnosis.getByRole('link', { name: 'Inspect details' })).toHaveAttribute(
      'href',
      `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}`
    );
    await expect(diagnosis.getByRole('link', { name: 'Review exposure' })).toHaveCount(0);
    await expect(diagnosis.getByText('Healthy', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Provider review cards' })).toBeVisible();
    await expect(page.getByText('No urgent node exception visible')).toBeVisible();
    await expect(page.getByText(/current THORNode node data does not show jail, elevated slash, churn-risk, or status exceptions/i)).toBeVisible();
    await expect(page.getByText(/routine metrics remain visible below/i)).toBeVisible();
    await expect(page.getByText(/all tracked nodes are active/i)).toHaveCount(0);
    await expect(page.getByText(/clear of churn-risk flags/i)).toHaveCount(0);
    await expect(page.getByText('No provider review cards to show. Minor slash history and routine node metrics remain visible in the comparison table below.')).toBeVisible();
    await expect(page.locator('[data-urgent-exception="true"]')).toHaveCount(0);
    await expect(page.locator('[data-urgent-exception="false"]')).toContainText('1');
    await expect(page.getByText(/High slash exposure/i)).toHaveCount(0);
  });

  test('scopes clean node exposure evidence to current inputs instead of a broad health verdict', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      extraNodes: [{}],
    });
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await page.getByText('All node cards', { exact: true }).click();

    const allNodeCards = page.getByRole('region', { name: 'All node status cards' });
    const evidenceButton = allNodeCards.getByRole('button', {
      name: 'Provider exposure evidence: Current node inputs show no jail, elevated slash, churn, or status issue',
    });
    await expect(evidenceButton).toBeVisible();
    await evidenceButton.focus();

    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toContainText('No urgent review');
    await expect(tooltip).toContainText('Current node inputs show no jail, elevated slash, churn, or status issue');
    await expect(tooltip).not.toContainText('All positions healthy');
    await expect(tooltip).not.toContainText('No exposure issue visible');
    await expect(tooltip).not.toContainText(/\bhealthy\b|\bsafe\b/i);
  });

  test('does not label low-bond churn-risk node cards as clean exposure evidence', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const urgentCards = page.getByRole('region', { name: 'Provider node review cards' });
    const evidenceButton = urgentCards.getByRole('button', {
      name: 'Provider exposure evidence: Churn-risk exposure detected',
    });

    await expect(evidenceButton).toBeVisible();
    await expect(evidenceButton).toContainText('Needs review');
    await evidenceButton.focus();

    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toContainText('Churn-risk exposure detected');
    await expect(tooltip).not.toContainText('No exposure issue visible');
    await expect(tooltip).not.toContainText('All positions healthy');
  });

  test('routes provider-review Nodes card BOND prep through focused risk review', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      primaryNodeOverrides: {
        slash_points: 275,
      },
    });
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const expectedHref = `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef`;
    const urgentCards = page.getByRole('region', { name: 'Provider node review cards' });

    await expect(urgentCards).toBeVisible();
    await expect(urgentCards.getByRole('link', { name: 'Review exposure first' })).toHaveAttribute('href', expectedHref);
    await expect(urgentCards).toContainText('Provider review required');
    await expect(page.getByRole('link', { name: 'Prepare BOND Memo' })).toHaveCount(0);

    await urgentCards.getByRole('link', { name: 'Review exposure first' }).click();

    await expect(page).toHaveURL(expectedHref);
    await expect(page.getByLabel('Focused node risk context')).toContainText('Slash context');
    await expect(page.getByLabel('Focused node risk context')).toContainText('thor1nodemocked123456789abcdef');
  });

  test('routes health-probe-degraded Nodes card to focused source checks without losing node data', async ({ page, allowApiErrors }) => {
    allowApiErrors(['/api/thorchain/thorchain/nodes']);
    const sourceDegradedNodeCardOptions = {
      primaryNodeOverrides: {
        slash_points: 150,
      },
      thornodeHealthProbeStatus: 502,
    };

    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, sourceDegradedNodeCardOptions);
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const expectedRiskHref = `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef#risk-source-confidence`;
    const urgentCards = page.getByRole('region', { name: 'Provider node review cards' });
    const sourceDegradedCard = urgentCards.locator(':scope > div').filter({ hasText: 'thor1nodemocked1...abcdef' });

    await expect(urgentCards).toBeVisible();
    await expect(sourceDegradedCard).toHaveCount(1);
    await expect(sourceDegradedCard).toContainText('Slash Points');
    await expect(sourceDegradedCard).toContainText('150');
    await expect(sourceDegradedCard.getByRole('link', { name: 'Review source checks', exact: true })).toHaveAttribute('href', expectedRiskHref);
    await expect(sourceDegradedCard.getByRole('link', { name: 'Review exposure first', exact: true })).toHaveCount(0);
    await expect(sourceDegradedCard.getByRole('link', { name: 'Prepare UNBOND Memo', exact: true })).toHaveCount(0);
    await expect(sourceDegradedCard).toContainText('Source degraded');
    await expect(sourceDegradedCard).toContainText('THORNode candidate source check is degraded');
    await expect(page.getByRole('link', { name: 'Prepare BOND Memo' })).toHaveCount(0);

    await sourceDegradedCard.getByRole('link', { name: 'Review source checks', exact: true }).click();

    await expect(page).toHaveURL(expectedRiskHref);
    await expect(page.locator('#risk-source-confidence')).toBeVisible();
    await expect(page.getByLabel('Focused node risk context')).toContainText('thor1nodemocked123456789abcdef');
  });

  test('keeps Network Comparison data available on mobile', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await page.getByRole('heading', { name: 'Network Comparison' }).scrollIntoViewIfNeeded();

    await expect(page.getByRole('heading', { name: 'Network Comparison' })).toBeVisible();
    const mobileSummary = page.getByLabel('Mobile network comparison summary');
    await expect(mobileSummary).toBeVisible();
    await expect(mobileSummary).toContainText('Node total bond');
    await expect(mobileSummary).toContainText('Network average');
    await expect(mobileSummary).toContainText('Difference');
  });

  test('keeps the notification nudge out of the primary diagnosis area', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    const nudge = page.getByTestId('notification-permission-nudge');
    await expect(diagnosis).toBeVisible();
    await expect(nudge).toBeVisible();
    await expect(nudge).toHaveAttribute('data-placement', 'header-action');
    await expect(nudge).toContainText('Alerts blocked');
    await expect(nudge.getByRole('link', { name: 'Open notification settings' })).toHaveAttribute(
      'href',
      `/dashboard/settings/notifications?address=${DEFAULT_DASHBOARD_ADDRESS}`
    );
    await expect(nudge.getByRole('button', { name: 'Retry' })).toHaveCount(0);

    const diagnosisBox = await diagnosis.boundingBox();
    const nudgeBox = await nudge.boundingBox();
    expect(diagnosisBox).not.toBeNull();
    expect(nudgeBox).not.toBeNull();
    if (diagnosisBox && nudgeBox) {
      const overlaps =
        diagnosisBox.x < nudgeBox.x + nudgeBox.width &&
        diagnosisBox.x + diagnosisBox.width > nudgeBox.x &&
        diagnosisBox.y < nudgeBox.y + nudgeBox.height &&
        diagnosisBox.y + diagnosisBox.height > nudgeBox.y;
      expect(overlaps).toBe(false);
      expect(nudgeBox.height).toBeLessThanOrEqual(36);
      expect(nudgeBox.y + nudgeBox.height).toBeLessThan(diagnosisBox.y);
    }

    const overlappingNavigation = await page.evaluate(() => {
      const nudge = document.querySelector('[data-testid="notification-permission-nudge"]');
      const nudgeBox = nudge?.getBoundingClientRect();
      if (!nudgeBox) {
        return [];
      }

      return Array.from(document.querySelectorAll('a[aria-label^="Navigate to"]'))
        .filter((link) => {
          const box = link.getBoundingClientRect();
          return (
            box.left < nudgeBox.right &&
            box.right > nudgeBox.left &&
            box.top < nudgeBox.bottom &&
            box.bottom > nudgeBox.top
          );
        })
        .map((link) => link.getAttribute('aria-label'));
    });

    expect(overlappingNavigation).toEqual([]);
  });

  test('keeps the notification nudge hidden at standard desktop width', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByLabel('Command center diagnosis')).toBeVisible();
    await expect(page.getByTestId('notification-permission-nudge')).toBeHidden();

    const layout = await page.evaluate(() => {
      const diagnosis = document.querySelector('section[aria-label="Command center diagnosis"]');
      const nudge = document.querySelector('[data-testid="notification-permission-nudge"]');
      const diagnosisBox = diagnosis?.getBoundingClientRect();
      const nudgeBox = nudge?.getBoundingClientRect();

      return {
        diagnosisTop: diagnosisBox?.top ?? null,
        nudgeDisplay: nudge ? getComputedStyle(nudge).display : null,
        nudgeHeight: nudgeBox?.height ?? null,
      };
    });

    expect(layout.nudgeDisplay).toBe('none');
    expect(layout.nudgeHeight).toBe(0);
    expect(layout.diagnosisTop).not.toBeNull();
    expect(layout.diagnosisTop!).toBeLessThan(120);
  });

  test('lets notification settings own permission guidance without the global nudge', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/settings/notifications?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'Notification Preferences' })).toBeVisible();
    await expect(page.getByTestId('notification-permission-nudge')).toHaveCount(0);
    await expect(page.getByText('Browser notifications blocked in this browser')).toBeVisible();
    await expect(page.getByTestId('browser-notification-blocked-guidance')).toContainText('Browser setting required');
    await expect(page.getByTestId('browser-notification-scope')).toContainText('Open-tab fallback');
    const backgroundStatus = page.getByTestId('background-notification-status');
    await expect(backgroundStatus).toContainText('Background push unavailable');
    await expect(backgroundStatus).toContainText('Server setup required');
    await expect(backgroundStatus.getByRole('button', { name: 'Enable background push' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Enable browser notifications' })).toHaveCount(0);
  });

  test('blocks background push enablement when browser permission is denied', async ({ context, page }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'PushManager', {
        configurable: true,
        value: function PushManager() {},
      });
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistration: async () => null,
          register: async () => ({
            pushManager: {
              getSubscription: async () => null,
            },
          }),
        },
      });
    });

    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.route('**/api/notifications/status**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname !== '/api/notifications/status') {
        await route.fulfill({ status: 404, json: { error: `Unhandled notification status mock: ${url.pathname}` } });
        return;
      }

      await route.fulfill({
        json: {
          configured: true,
          monitor: {
            checkedSubscriptionCount: 0,
            expiredSubscriptionCount: 0,
            failedSubscriptionCount: 0,
            lastCheckedAt: null,
            staleAfterMs: 300_000,
            staleSubscriptionCount: 0,
            uncheckedSubscriptionCount: 0,
          },
          publicKey: 'test-public-key',
          reason: null,
          subscriptionCount: 0,
        },
      });
    });

    await page.goto(`/dashboard/settings/notifications?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const backgroundStatus = page.getByTestId('background-notification-status');
    await expect(backgroundStatus).toContainText('Browser notification permission blocked.');
    await expect(backgroundStatus).toContainText(
      'Allow notifications for this site in your browser settings before enabling closed-tab provider exposure alerts.'
    );
    await expect(backgroundStatus).toContainText('Browser setting required');
    await expect(backgroundStatus.getByRole('button', { name: 'Enable background push' })).toHaveCount(0);
  });

  test('labels configured but unsubscribed background push as available, not active', async ({ context, page }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
      });
      Object.defineProperty(window, 'PushManager', {
        configurable: true,
        value: function PushManager() {},
      });
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistration: async () => ({
            pushManager: {
              getSubscription: async () => null,
            },
          }),
          register: async () => ({
            pushManager: {
              getSubscription: async () => null,
            },
          }),
        },
      });
    });

    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.route('**/api/notifications/status**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname !== '/api/notifications/status') {
        await route.fulfill({ status: 404, json: { error: `Unhandled notification status mock: ${url.pathname}` } });
        return;
      }

      await route.fulfill({
        json: {
          configured: true,
          monitor: {
            checkedSubscriptionCount: 0,
            expiredSubscriptionCount: 0,
            failedSubscriptionCount: 0,
            lastCheckedAt: null,
            staleAfterMs: 300_000,
            staleSubscriptionCount: 0,
            uncheckedSubscriptionCount: 0,
          },
          publicKey: 'test-public-key',
          reason: null,
          subscriptionCount: 0,
        },
      });
    });

    await page.goto(`/dashboard/settings/notifications?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const backgroundStatus = page.getByTestId('background-notification-status');
    await expect(backgroundStatus).toContainText('Background push available.');
    await expect(backgroundStatus).toContainText(
      'Enable browser push to create a subscription; closed-tab provider alerts are not active until this browser is subscribed and the server monitor checks it.'
    );
    await expect(backgroundStatus).not.toContainText('Background delivery ready.');
    await expect(backgroundStatus).not.toContainText('Background delivery active.');
    await expect(backgroundStatus).not.toContainText(/proven/i);
    await expect(backgroundStatus.getByRole('button', { name: 'Enable background push' })).toBeEnabled();
  });

  test('labels subscribed background push as unproven before the server monitor checks it', async ({ context, page }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
      });
      const pushSubscription = {
        endpoint: 'https://push.example.test/subscription/1',
        toJSON: () => ({
          endpoint: 'https://push.example.test/subscription/1',
          expirationTime: null,
          keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        }),
        unsubscribe: async () => true,
      };

      Object.defineProperty(window, 'PushManager', {
        configurable: true,
        value: function PushManager() {},
      });
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistration: async () => ({
            pushManager: {
              getSubscription: async () => pushSubscription,
            },
          }),
          register: async () => ({
            pushManager: {
              getSubscription: async () => pushSubscription,
            },
          }),
        },
      });
    });

    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.route('**/api/notifications/status**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname !== '/api/notifications/status') {
        await route.fulfill({ status: 404, json: { error: `Unhandled notification status mock: ${url.pathname}` } });
        return;
      }

      await route.fulfill({
        json: {
          configured: true,
          monitor: {
            checkedSubscriptionCount: 0,
            failedSubscriptionCount: 0,
            lastCheckedAt: null,
            uncheckedSubscriptionCount: 1,
          },
          publicKey: 'test-public-key',
          reason: null,
          subscriptionCount: 1,
        },
      });
    });
    await page.goto(`/dashboard/settings/notifications?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const backgroundStatus = page.getByTestId('background-notification-status');
    await expect(backgroundStatus).toContainText('Background subscription pending verification.');
    await expect(backgroundStatus).not.toContainText('Background delivery active.');
    await expect(backgroundStatus).toContainText('Server subscriptions for this address: 1');
    await expect(backgroundStatus.getByTestId('background-monitor-confidence')).toContainText('Monitor confidence');
    await expect(backgroundStatus.getByTestId('background-monitor-confidence')).toContainText(
      'Awaiting first server monitor check'
    );
    await expect(backgroundStatus.getByTestId('background-monitor-confidence')).toContainText(
      'Closed-tab delivery is subscribed, but not proven yet.'
    );
  });

  test('warns when closed-tab monitor confidence is stale', async ({ context, page }) => {
    const lastCheckedAt = Date.now() - 60 * 60 * 1000;

    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
      });
      const pushSubscription = {
        endpoint: 'https://push.example.test/subscription/1',
        toJSON: () => ({
          endpoint: 'https://push.example.test/subscription/1',
          expirationTime: null,
          keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        }),
        unsubscribe: async () => true,
      };

      Object.defineProperty(window, 'PushManager', {
        configurable: true,
        value: function PushManager() {},
      });
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistration: async () => ({
            pushManager: {
              getSubscription: async () => pushSubscription,
            },
          }),
          register: async () => ({
            pushManager: {
              getSubscription: async () => pushSubscription,
            },
          }),
        },
      });
    });

    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.route('**/api/notifications/status**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname !== '/api/notifications/status') {
        await route.fulfill({ status: 404, json: { error: `Unhandled notification status mock: ${url.pathname}` } });
        return;
      }

      await route.fulfill({
        json: {
          configured: true,
          monitor: {
            checkedSubscriptionCount: 1,
            failedSubscriptionCount: 0,
            lastCheckedAt,
            staleAfterMs: 300_000,
            staleSubscriptionCount: 1,
            uncheckedSubscriptionCount: 0,
          },
          publicKey: 'test-public-key',
          reason: null,
          subscriptionCount: 1,
        },
      });
    });
    await page.goto(`/dashboard/settings/notifications?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const backgroundStatus = page.getByTestId('background-notification-status');
    await expect(backgroundStatus).toContainText('Background monitor stale.');
    await expect(backgroundStatus).not.toContainText('Background delivery active.');
    await expect(backgroundStatus.getByTestId('background-monitor-confidence')).toContainText(
      'Last server monitor check is stale'
    );
    await expect(backgroundStatus.getByTestId('background-monitor-confidence')).toContainText(
      'Closed-tab delivery may be delayed until the monitor catches up.'
    );
  });

  test('warns when the stored background push subscription has expired', async ({ context, page }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
      });
      const pushSubscription = {
        endpoint: 'https://push.example.test/subscription/expired',
        toJSON: () => ({
          endpoint: 'https://push.example.test/subscription/expired',
          expirationTime: Date.now() - 1_000,
          keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        }),
        unsubscribe: async () => true,
      };

      Object.defineProperty(window, 'PushManager', {
        configurable: true,
        value: function PushManager() {},
      });
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistration: async () => ({
            pushManager: {
              getSubscription: async () => pushSubscription,
            },
          }),
          register: async () => ({
            pushManager: {
              getSubscription: async () => pushSubscription,
            },
          }),
        },
      });
    });

    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.route('**/api/notifications/status**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname !== '/api/notifications/status') {
        await route.fulfill({ status: 404, json: { error: `Unhandled notification status mock: ${url.pathname}` } });
        return;
      }

      await route.fulfill({
        json: {
          configured: true,
          monitor: {
            checkedSubscriptionCount: 0,
            expiredSubscriptionCount: 1,
            failedSubscriptionCount: 0,
            lastCheckedAt: null,
            staleAfterMs: 300_000,
            staleSubscriptionCount: 0,
            uncheckedSubscriptionCount: 0,
          },
          publicKey: 'test-public-key',
          reason: null,
          subscriptionCount: 0,
        },
      });
    });
    await page.goto(`/dashboard/settings/notifications?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const backgroundStatus = page.getByTestId('background-notification-status');
    await expect(backgroundStatus).toContainText('Background subscription expired.');
    await expect(backgroundStatus).toContainText(
      'Re-enable browser push to restore closed-tab provider exposure alerts.'
    );
    await expect(backgroundStatus).not.toContainText('Background delivery active.');
    await expect(backgroundStatus.getByRole('button', { name: 'Enable background push' })).toBeEnabled();
  });

  test('keeps mobile live alerts compact until the operator opens review', async ({ context, page }) => {
    await context.addInitScript((address) => {
      const now = Date.now();
      localStorage.setItem('heimdall-alerts', JSON.stringify({
        alerts: Array.from({ length: 5 }, (_, index) => ({
          id: `active-alert-${index}`,
          type: index === 1 ? 'JAIL' : 'SLASH_INCREASE',
          nodeAddress: `thor1nodecompact${index}00000000000000000000`,
          message: index === 1
            ? `Node thor1nodecompact${index}... has been jailed: missed observation`
            : `Node thor1nodecompact${index}... slashed: +${index + 1} points`,
          timestamp: now - index * 60_000,
          dismissed: false,
        })),
        preferences: {
          slashAlerts: true,
          jailAlerts: true,
          churnAlerts: true,
          statusAlerts: true,
        },
      }));
      localStorage.setItem('BONDTRACK_ADDRESS', address);
    }, DEFAULT_DASHBOARD_ADDRESS);

    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/settings/notifications?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const reviewTrigger = page.getByTestId('node-alert-review-trigger');
    await expect(page.getByTestId('node-alert-toast-region')).toHaveCount(0);
    await expect(reviewTrigger).toBeVisible();
    await expect(reviewTrigger).toHaveAttribute('data-placement', 'header-action');
    await expect(reviewTrigger).toHaveAttribute('aria-expanded', 'false');

    const compactState = await page.evaluate(() => {
      const reviewButton = document.querySelector('[data-testid="node-alert-review-trigger"]');
      const reviewButtonBox = reviewButton?.getBoundingClientRect();

      return {
        reviewButtonHeight: reviewButtonBox?.height ?? 0,
        reviewButtonWidth: reviewButtonBox?.width ?? 0,
        viewportWidth: window.innerWidth,
        fixedRegionCount: document.querySelectorAll('[data-testid="node-alert-toast-region"]').length,
      };
    });

    expect(compactState.fixedRegionCount).toBe(0);
    expect(compactState.reviewButtonWidth).toBeGreaterThanOrEqual(40);
    expect(compactState.reviewButtonHeight).toBeGreaterThanOrEqual(40);
    expect(compactState.reviewButtonWidth).toBeLessThan(compactState.viewportWidth * 0.4);

    await reviewTrigger.click();

    const toastRegion = page.getByTestId('node-alert-toast-region');
    await expect(toastRegion).toBeVisible();
    await expect(toastRegion).toHaveAttribute('data-state', 'expanded');
    await expect(toastRegion).toHaveAttribute('data-placement', 'inspection-panel');
    await expect(toastRegion.getByTestId('node-alert-toast-item')).toHaveCount(5);
    await expect(toastRegion.getByRole('link', {
      name: 'Inspect risk context for Node thor1nodecompact1... has been jailed: missed observation',
      exact: true,
    })).toBeVisible();
    await expect(toastRegion.getByRole('link', {
      name: 'Inspect risk context for Node thor1nodecompact4... slashed: +5 points',
      exact: true,
    })).toBeVisible();

    const expandedState = await toastRegion.evaluate((region) => ({
      position: getComputedStyle(region).position,
      width: region.getBoundingClientRect().width,
      viewportWidth: window.innerWidth,
    }));

    expect(expandedState.position).toBe('static');
    expect(expandedState.width).toBeLessThanOrEqual(expandedState.viewportWidth);
  });

  test('keeps dismissed alert history recoverable in notification settings', async ({ context, page }) => {
    await context.addInitScript((address) => {
      localStorage.setItem('heimdall-alerts', JSON.stringify({
        alerts: [
          {
            id: 'active-slash',
            type: 'SLASH_INCREASE',
            nodeAddress: 'thor1nodeactivehistory000000000000000000',
            message: 'Node thor1nodeactive... slashed: +4 points',
            timestamp: Date.now() - 60_000,
            dismissed: false,
          },
          {
            id: 'dismissed-jail',
            type: 'JAIL',
            nodeAddress: 'thor1nodedismissedhistory000000000000000',
            message: 'Node thor1nodedismissed... has been jailed: missed observation',
            timestamp: Date.now() - 120_000,
            dismissed: true,
          },
        ],
        preferences: {
          slashAlerts: true,
          jailAlerts: true,
          churnAlerts: true,
          statusAlerts: true,
        },
      }));
      localStorage.setItem('BONDTRACK_ADDRESS', address);
    }, DEFAULT_DASHBOARD_ADDRESS);

    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/settings/notifications?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const history = page.getByTestId('local-alert-history');
    await expect(history).toBeVisible();
    await expect(history).toContainText('Active');
    await expect(history).toContainText('Dismissed');
    await expect(history).toContainText('Node thor1nodeactive... slashed: +4 points');
    await expect(history).toContainText('Node thor1nodedismissed... has been jailed: missed observation');
    const dismissedJailRow = history
      .getByTestId('local-alert-history-row')
      .filter({ hasText: 'Node thor1nodedismissed... has been jailed: missed observation' });

    await expect(dismissedJailRow).toHaveAttribute('data-alert-type', 'JAIL');
    await expect(dismissedJailRow.getByRole('link', { name: 'Inspect risk context for Jail alert' })).toHaveAttribute(
      'href',
      `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodedismissedhistory000000000000000`
    );

    await dismissedJailRow.getByRole('button', { name: 'Show again' }).click();
    await expect(history.getByRole('button', { name: 'Show again' })).toHaveCount(0);
    await expect(page.getByTestId('node-alert-toast-region')).toHaveCount(0);
    await page.getByTestId('node-alert-review-trigger').click();
    const toastRegion = page.getByTestId('node-alert-toast-region');
    await expect(toastRegion).toBeVisible();
    await expect(toastRegion).toHaveAttribute('data-state', 'expanded');
    await expect(toastRegion).toHaveAttribute('data-placement', 'inspection-panel');
    await expect(toastRegion.getByRole('link', {
      name: 'Inspect risk context for Node thor1nodedismissed... has been jailed: missed observation',
    })).toHaveAttribute(
      'href',
      `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodedismissedhistory000000000000000`
    );

    await history.getByRole('button', { name: 'Clear history' }).click();
    await expect(history).toContainText('No local alert history yet');
  });

  test('shows diagnosis and top actions before detailed cards on mobile', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const sourceConfidence = page.getByRole('region', { name: 'Source checks' });
    await expect(page.getByLabel('Command center diagnosis')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Provider review queue' })).toBeVisible();
    await expect(sourceConfidence).toBeVisible();
    await expect(sourceConfidence).toContainText('Data source checks');
    await expect(sourceConfidence).not.toContainText('Data source confidence');
    await expect(sourceConfidence).toContainText('Checks responding');
    await expect(sourceConfidence).not.toContainText('No source issues');
    await expect(sourceConfidence).not.toContainText('All fresh');
    await expect(sourceConfidence).toContainText(/Responding|Unknown|Degraded|Stale/);
    await expect(sourceConfidence).not.toContainText('Fresh');
    await expect(sourceConfidence).not.toContainText('Live data confidence');

    const layout = await page.evaluate(() => {
      const box = (element: Element | null) => {
        const rect = element?.getBoundingClientRect();
        return rect
          ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
          : null;
      };

      return {
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        diagnosis: box(document.querySelector('section[aria-label="Command center diagnosis"]')),
        sourceSummary: box(document.querySelector('section[aria-label="Source checks"]')),
        actions: box(document.querySelector('section[aria-label="Provider review queue"]')),
        firstAction: box(document.querySelector('section[aria-label="Provider review queue"] article')),
        secondAction: box(document.querySelectorAll('section[aria-label="Provider review queue"] article')[1] ?? null),
        metrics: box(document.querySelector('section[aria-label="Supporting metrics"]')),
        details: box(Array.from(document.querySelectorAll('h2')).find((heading) => (
          heading.textContent?.replace(/\s+/g, ' ').trim() === 'Provider exposure first'
        )) ?? null),
      };
    });

    expect(layout.diagnosis).not.toBeNull();
    expect(layout.actions).not.toBeNull();
    expect(layout.sourceSummary).not.toBeNull();
    expect(layout.firstAction).not.toBeNull();
    expect(layout.secondAction).not.toBeNull();
    expect(layout.metrics).not.toBeNull();
    expect(layout.details).not.toBeNull();
    expect(layout.sourceSummary!.top).toBeGreaterThan(layout.diagnosis!.top);
    expect(layout.sourceSummary!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.actions!.top).toBeGreaterThan(layout.sourceSummary!.top);
    expect(layout.actions!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.firstAction!.height).toBeLessThan(130);
    expect(layout.secondAction!.top).toBeGreaterThan(layout.firstAction!.top);
    expect(layout.actions!.top).toBeLessThan(layout.metrics!.top);
    expect(layout.metrics!.top).toBeLessThan(layout.details!.top);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  });

  test('keeps node and risk exception queues in the first mobile viewport', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 390, height: 740 });

    for (const pageSpec of [
      { route: '/dashboard/nodes', label: 'Node exceptions' },
      { route: '/dashboard/risk', label: 'Provider exposure review' },
    ]) {
      await page.goto(`${pageSpec.route}?address=${DEFAULT_DASHBOARD_ADDRESS}`);
      await expect(page.getByRole('heading', { name: pageSpec.label })).toBeVisible();

      const layout = await page.evaluate((label) => {
        const actionHeading = Array.from(document.querySelectorAll('h2')).find((heading) => (
          heading.textContent?.replace(/\s+/g, ' ').trim() === label
        ));
        const diagnosis = document.querySelector('section[aria-label$="diagnosis"]');
        const actionSection = actionHeading?.closest('section') ?? null;
        const box = (element: Element | null) => {
          const rect = element?.getBoundingClientRect();
          return rect
            ? { top: rect.top, bottom: rect.bottom, width: rect.width }
            : null;
        };

        return {
          viewportHeight: window.innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          diagnosis: box(diagnosis),
          actionSection: box(actionSection),
        };
      }, pageSpec.label);

      expect(layout.diagnosis).not.toBeNull();
      expect(layout.actionSection).not.toBeNull();
      expect(layout.actionSection!.top).toBeGreaterThan(layout.diagnosis!.top);
      expect(layout.actionSection!.top).toBeLessThan(layout.viewportHeight);
      expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    }
  });
});
