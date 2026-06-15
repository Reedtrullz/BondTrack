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
    await expect(page.getByRole('heading', { name: 'Critical actions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Source freshness' })).toBeVisible();
    await expect(page.getByLabel('Supporting metrics')).toBeVisible();
  });

  test('keeps first-viewport triage visible while support feeds are pending', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      supportFeedDelayMs: 15_000,
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    const nextTransaction = page.getByRole('region', { name: 'Next transaction' });

    await expect(diagnosis).toBeVisible();
    await expect(page.getByRole('status', { name: 'Loading command center' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Source freshness' })).toBeVisible();
    await expect(nextTransaction.getByRole('link', { name: 'Open BOND' })).toHaveAttribute(
      'href',
      `/dashboard/transactions?address=${DEFAULT_DASHBOARD_ADDRESS}&action=bond`
    );
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
  });

  test('keeps degraded source consequences actionable on mobile', async ({ page, allowApiErrors }) => {
    allowApiErrors(['/api/midgard/v2/health']);
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      midgardHealthStatus: 404,
    });
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const sourceConfidence = page.getByRole('region', { name: 'Source confidence' });
    const actionQueue = page.getByLabel('Critical actions');
    const sourceImpact = page.getByText(
      'Impact: Do not use reward history, LP performance, or transaction history for final decisions until Midgard recovers.'
    );

    await expect(sourceConfidence).toContainText('1 degraded');
    await expect(actionQueue).toContainText('Midgard is degraded');
    await expect(sourceImpact).toBeVisible();
    await expect(actionQueue.getByRole('link', { name: 'Review source confidence' })).toHaveAttribute(
      'href',
      `/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}#source-confidence`
    );
  });

  test('routes no-bond BOND shortcut to source confidence when THORNode /nodes is unavailable', async ({ page, allowApiErrors }) => {
    allowApiErrors(['/api/thorchain/thorchain/nodes']);
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      thornodeNodesStatus: 502,
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    const nextTransaction = page.getByRole('region', { name: 'Next transaction' });

    await expect(diagnosis.getByText('No Bond', { exact: true })).toBeVisible();
    await expect(diagnosis.getByRole('link', { name: 'Review source confidence' })).toHaveAttribute(
      'href',
      `/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}#source-confidence`
    );
    await expect(nextTransaction.getByRole('link', { name: 'Review source confidence' })).toHaveAttribute(
      'href',
      `/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}#source-confidence`
    );
    await expect(nextTransaction.getByRole('link', { name: 'Open BOND' })).toHaveCount(0);
    await expect(page.getByLabel('Critical actions')).toContainText('THORNode is degraded');
  });

  test('keeps subpage diagnosis headings subordinate to the page title', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);

    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);
    await expect(page.getByLabel('Command center diagnosis').getByRole('heading', { level: 1 })).toBeVisible();

    const pages = [
      { route: '/dashboard/portfolio', title: 'Portfolio', diagnosis: 'Portfolio diagnosis' },
      { route: '/dashboard/nodes', title: 'Nodes', diagnosis: 'Node diagnosis' },
      { route: '/dashboard/rewards', title: 'Rewards', diagnosis: 'Rewards diagnosis' },
      { route: '/dashboard/risk', title: 'Risk', diagnosis: 'Node security diagnosis' },
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

  test('shows rewards data confidence before reward decision tabs', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Rewards', exact: true })).toBeVisible();
    const diagnosis = page.getByLabel('Rewards diagnosis');
    await expect(diagnosis).toContainText('Reward history: Current-only');
    await expect(diagnosis).toContainText('Reward history is current-only');
    await expect(diagnosis.getByRole('button', { name: 'Review data confidence' })).toBeVisible();
    const confidence = page.getByLabel('Rewards data confidence');
    await expect(confidence).toBeVisible();
    await expect(confidence).toContainText('Reward history');
    await expect(confidence).toContainText('APY basis');
    await expect(confidence).toContainText(/Node-level|Network fallback|Unavailable/);
    await expect(confidence).toContainText('RUNE price');
    await expect(confidence).toContainText('Forecast');
    await expect(confidence).toContainText(/Trusted|Current-only|Pending|Degraded/);
    await expect(confidence).toContainText(/Fresh|Stale|Missing/);

    const confidenceY = (await confidence.boundingBox())?.y ?? 9999;
    const returnTabY = (await page.getByRole('tab', { name: 'Return' }).boundingBox())?.y ?? 0;
    expect(confidenceY).toBeLessThan(returnTabY);
  });

  test('keeps rewards data confidence in the first mobile viewport', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Rewards', exact: true })).toBeVisible();
    const diagnosis = page.getByLabel('Rewards diagnosis');
    const confidence = page.getByLabel('Rewards data confidence');
    await expect(diagnosis).toBeVisible();
    await expect(confidence).toBeVisible();

    const layout = await page.evaluate(() => {
      const diagnosis = document.querySelector('section[aria-label="Rewards diagnosis"]');
      const confidence = document.querySelector('section[aria-label="Rewards data confidence"]');
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
        confidence: box(confidence),
        tabs: box(tabs),
        overflowing,
      };
    });

    expect(layout.diagnosis).not.toBeNull();
    expect(layout.confidence).not.toBeNull();
    expect(layout.tabs).not.toBeNull();
    expect(layout.confidence!.top).toBeGreaterThan(layout.diagnosis!.top);
    expect(layout.confidence!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.confidence!.top).toBeLessThan(layout.tabs!.top);
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
    const actionQueue = page.getByLabel('Critical actions');

    await expect(diagnosis.getByRole('link', { name: 'Review slash monitor' })).toHaveAttribute('href', expectedHref);
    await expect(actionQueue.getByRole('link', { name: 'Review slash monitor' })).toHaveAttribute('href', expectedHref);

    await diagnosis.getByRole('link', { name: 'Review slash monitor' }).click();

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
    await expect(diagnosis.getByText('No bonded positions to score')).toBeVisible();
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
    await expect(diagnosis.getByText('Needs Attention', { exact: true })).toBeVisible();
    await expect(diagnosis.getByText('Healthy')).toHaveCount(0);
    await expect(diagnosis.getByRole('heading', {
      level: 1,
      name: 'thor1nod...cdef is Standby',
      exact: true,
    })).toBeVisible();
    await expect(diagnosis.getByText('75/100')).toBeVisible();
  });

  test('shows a useful no-bond diagnosis on the Nodes page', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, { withBondPosition: false });
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'Nodes', exact: true })).toBeVisible();
    await expect(page.getByLabel('Node diagnosis')).toBeVisible();
    await expect(page.getByLabel('Node diagnosis').getByText('No Bond', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Node diagnosis').getByText('No bonded positions detected')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Bond Composer' })).toBeVisible();
    await expect(page.getByText('No bonded nodes tracked')).toBeVisible();
  });

  test('keeps the Nodes comparison table usable without page-level mobile overflow', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { name: 'Node Comparison' })).toBeVisible();

    const layout = await page.evaluate(() => {
      const table = Array.from(document.querySelectorAll('table')).find((candidate) => {
        const text = candidate.textContent ?? '';
        return text.includes('Node Address') && text.includes('Risk Score');
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

    const riskSortButton = page.getByRole('button', { name: 'Sort by Risk Score ascending' });
    await expect(riskSortButton).toBeVisible();
    await riskSortButton.click();
    const activeSort = await page
      .getByRole('button', { name: 'Sort by Risk Score descending' })
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

    await expect(page.getByRole('heading', { name: 'Urgent exception cards' })).toBeVisible();
    await expect(page.getByText('No urgent exception cards to show. Minor slash history and routine node metrics remain visible in the comparison table below.')).toBeVisible();
    await expect(page.locator('[data-urgent-exception="true"]')).toHaveCount(0);
    await expect(page.locator('[data-urgent-exception="false"]')).toContainText('1');
    await expect(page.getByText(/High slash points/i)).toHaveCount(0);
  });

  test('routes urgent Nodes card BOND prep through focused risk review', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      primaryNodeOverrides: {
        slash_points: 275,
      },
    });
    await page.goto(`/dashboard/nodes?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const expectedHref = `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef`;
    const urgentCards = page.getByRole('region', { name: 'Urgent node exception cards' });

    await expect(urgentCards).toBeVisible();
    await expect(urgentCards.getByRole('link', { name: 'Review risk first' })).toHaveAttribute('href', expectedHref);
    await expect(urgentCards).toContainText('Risk review required');
    await expect(page.getByRole('link', { name: 'Prepare BOND Memo' })).toHaveCount(0);

    await urgentCards.getByRole('link', { name: 'Review risk first' }).click();

    await expect(page).toHaveURL(expectedHref);
    await expect(page.getByLabel('Focused node risk context')).toContainText('Slash context');
    await expect(page.getByLabel('Focused node risk context')).toContainText('thor1nodemocked123456789abcdef');
  });

  test('routes health-probe-degraded Nodes card to focused source confidence without losing node data', async ({ page, allowApiErrors }) => {
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
    const urgentCards = page.getByRole('region', { name: 'Urgent node exception cards' });
    const sourceDegradedCard = urgentCards.locator(':scope > div').filter({ hasText: 'thor1nodemocked1...abcdef' });

    await expect(urgentCards).toBeVisible();
    await expect(sourceDegradedCard).toHaveCount(1);
    await expect(sourceDegradedCard).toContainText('Slash Points');
    await expect(sourceDegradedCard).toContainText('150');
    await expect(sourceDegradedCard.getByRole('link', { name: 'Review source confidence', exact: true })).toHaveAttribute('href', expectedRiskHref);
    await expect(sourceDegradedCard.getByRole('link', { name: 'Review risk first', exact: true })).toHaveCount(0);
    await expect(sourceDegradedCard.getByRole('link', { name: 'Prepare UNBOND Memo', exact: true })).toHaveCount(0);
    await expect(sourceDegradedCard).toContainText('Source degraded');
    await expect(sourceDegradedCard).toContainText('THORNode source confidence is degraded');
    await expect(page.getByRole('link', { name: 'Prepare BOND Memo' })).toHaveCount(0);

    await sourceDegradedCard.getByRole('link', { name: 'Review source confidence', exact: true }).click();

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
    await expect(page.getByRole('button', { name: 'Enable browser notifications' })).toHaveCount(0);
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

    await expect(page.getByLabel('Command center diagnosis')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Critical actions' })).toBeVisible();
    await expect(page.getByLabel('Source confidence')).toBeVisible();
    await expect(page.getByLabel('Source confidence')).toContainText('Data source confidence');
    await expect(page.getByLabel('Source confidence')).toContainText(/Fresh|Unknown|Degraded|Stale/);
    await expect(page.getByLabel('Source confidence')).not.toContainText('Live data confidence');

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
        sourceSummary: box(document.querySelector('section[aria-label="Source confidence"]')),
        actions: box(document.querySelector('section[aria-label="Critical actions"]')),
        firstAction: box(document.querySelector('section[aria-label="Critical actions"] article')),
        secondAction: box(document.querySelectorAll('section[aria-label="Critical actions"] article')[1] ?? null),
        metrics: box(document.querySelector('section[aria-label="Supporting metrics"]')),
        details: box(Array.from(document.querySelectorAll('h2')).find((heading) => (
          heading.textContent?.replace(/\s+/g, ' ').trim() === 'Riskiest nodes first'
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
      { route: '/dashboard/risk', label: 'Riskiest actions' },
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
