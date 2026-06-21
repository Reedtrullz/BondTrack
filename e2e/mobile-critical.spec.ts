import { expect, test } from './fixtures';
import { DEFAULT_DASHBOARD_ADDRESS, mockDashboardApis } from './helpers/dashboard-api-mocks';

test.describe('Mobile critical release path', () => {
  test('shows degraded sidebar source checks while another probe is still pending', async ({ page, allowApiErrors }) => {
    allowApiErrors(['/api/thorchain/thorchain/nodes']);
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      midgardHealthDelayMs: 5_000,
      thornodeHealthProbeStatus: 503,
    });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await page.getByRole('button', { name: 'Open dashboard navigation', exact: true }).click();
    const navigation = page.getByRole('dialog', { name: 'Heimdall', exact: true });

    await expect(navigation).toContainText('Source checks degraded');
    await expect(navigation).toContainText('One recent check is retrying');
    await expect(navigation).not.toContainText('Source checks pending');
  });

  test('keeps command-center diagnosis, source checks, and top actions in the mobile viewport', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    const sourceConfidence = page.getByRole('region', { name: 'Source checks' });
    const actions = page.getByRole('region', { name: 'Provider review queue' });
    const compactSourceStatus = page.getByTestId('source-freshness-compact');

    await expect(compactSourceStatus).toContainText('Sources responding');
    await expect(compactSourceStatus).not.toContainText('Sources checked');
    await expect(compactSourceStatus).not.toContainText('Sources synced');
    await expect(diagnosis).toBeVisible();
    await expect(sourceConfidence).toBeVisible();
    await expect(actions).toBeVisible();
    await expect(sourceConfidence).toContainText('Data source checks');
    await expect(sourceConfidence).not.toContainText('Data source confidence');
    await expect(sourceConfidence).toContainText('Checks responding');
    await expect(sourceConfidence).not.toContainText('No source issues');
    await expect(sourceConfidence).not.toContainText('All fresh');

    const layout = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
      };
      const sourceStatusOverflow = Array.from(
        document.querySelectorAll('section[aria-label="Source checks"] [data-testid="source-status-label"]')
      )
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            text: element.textContent?.replace(/\s+/g, ' ').trim(),
            clipped: rect.width > 0 && element.scrollWidth > element.clientWidth + 1,
          };
        })
        .filter((entry) => entry.clipped)
        .map((entry) => entry.text);

      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        diagnosis: box('section[aria-label="Command center diagnosis"]'),
        sourceConfidence: box('section[aria-label="Source checks"]'),
        actions: box('section[aria-label="Provider review queue"]'),
        firstAction: box('section[aria-label="Provider review queue"] article'),
        sourceStatusOverflow,
      };
    });

    expect(layout.diagnosis).not.toBeNull();
    expect(layout.sourceConfidence).not.toBeNull();
    expect(layout.actions).not.toBeNull();
    expect(layout.firstAction).not.toBeNull();
    expect(layout.sourceConfidence!.top).toBeGreaterThan(layout.diagnosis!.top);
    expect(layout.sourceConfidence!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.actions!.top).toBeGreaterThan(layout.sourceConfidence!.top);
    expect(layout.actions!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.firstAction!.height).toBeLessThan(140);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.sourceStatusOverflow).toEqual([]);
  });

  test('keeps portfolio bond labels readable without mobile overflow', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/portfolio?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Portfolio', exact: true })).toBeVisible();

    const heading = page.getByRole('heading', { name: 'Bonded Positions', exact: true });
    const checks = page.getByRole('region', { name: 'Portfolio data checks' });

    const initialLayout = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
      };

      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        diagnosis: box('section[aria-label="Portfolio diagnosis"]'),
        checks: box('section[aria-label="Portfolio data checks"]'),
        actions: box('section[aria-label="Next portfolio actions"]'),
      };
    });

    expect(initialLayout.diagnosis).not.toBeNull();
    expect(initialLayout.checks).not.toBeNull();
    expect(initialLayout.actions).not.toBeNull();
    expect(initialLayout.checks!.top).toBeGreaterThan(initialLayout.diagnosis!.top);
    expect(initialLayout.checks!.top).toBeLessThan(initialLayout.viewportHeight);
    expect(initialLayout.checks!.bottom).toBeLessThanOrEqual(initialLayout.viewportHeight);
    expect(initialLayout.actions!.top).toBeGreaterThan(initialLayout.checks!.top);
    expect(initialLayout.documentWidth).toBeLessThanOrEqual(initialLayout.viewportWidth + 1);

    await expect(checks).toBeVisible();
    await expect(checks).toContainText('RUNE price');
    await expect(checks).toContainText('LP valuation');
    await expect(checks).not.toContainText('Portfolio exposure confidence');
    await expect(page.getByRole('region', { name: 'Portfolio exposure confidence' })).toHaveCount(0);
    await expect(heading).toBeVisible();
    await expect(page.getByRole('button', { name: 'Explain Bonded Positions', exact: true })).toHaveCount(1);

    const mobileOverflow = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      overflowingMetricText: Array.from(document.querySelectorAll('.md\\:hidden *'))
        .filter((element): element is HTMLElement => element instanceof HTMLElement)
        .filter((element) => (
          element.scrollWidth > element.clientWidth + 2
          && getComputedStyle(element).overflowX === 'visible'
        ))
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
    }));

    expect(mobileOverflow.documentWidth).toBeLessThanOrEqual(mobileOverflow.viewportWidth + 1);
    expect(mobileOverflow.overflowingMetricText).toEqual([]);
  });

  test('keeps flagged portfolio action detail visible in compact mobile data checks', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      primaryNodeOverrides: { requested_to_leave: true },
    });
    await page.goto(`/dashboard/portfolio?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const checks = page.getByRole('region', { name: 'Portfolio data checks' });
    const flaggedDetail = checks.getByText('Review churn, slash, or leaving signals before adding bond', { exact: true });

    await expect(checks).toBeVisible();
    await expect(checks).toContainText('1 flagged');
    await expect(flaggedDetail).toBeVisible();

    const detailLayout = await flaggedDetail.evaluate((element) => {
      const section = element.closest('section');
      const rect = element.getBoundingClientRect();
      const sectionRect = section?.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return {
        display: style.display,
        visibility: style.visibility,
        height: rect.height,
        sectionBottom: sectionRect?.bottom ?? 0,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(detailLayout.display).not.toBe('none');
    expect(detailLayout.visibility).not.toBe('hidden');
    expect(detailLayout.height).toBeGreaterThan(0);
    expect(detailLayout.sectionBottom).toBeLessThanOrEqual(detailLayout.viewportHeight);
    expect(detailLayout.documentWidth).toBeLessThanOrEqual(detailLayout.viewportWidth + 1);
  });

  test('keeps source-loaded portfolio evidence visible in compact mobile data checks', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      historicalEntryRuneHistory: true,
    });
    await page.goto(`/dashboard/portfolio?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const checks = page.getByRole('region', { name: 'Portfolio data checks' });
    const lpDetail = checks.getByText('1 THORNode LP value row loaded for review', { exact: true });
    const runeDetail = checks.getByText('$1.50 quote loaded', { exact: true });

    await expect(checks).toBeVisible();
    await expect(checks).toContainText('Source-loaded');
    await expect(lpDetail).toBeVisible();
    await expect(runeDetail).toBeVisible();

    const detailLayout = await lpDetail.evaluate((element) => {
      const section = element.closest('section');
      const rect = element.getBoundingClientRect();
      const sectionRect = section?.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return {
        display: style.display,
        visibility: style.visibility,
        height: rect.height,
        sectionBottom: sectionRect?.bottom ?? 0,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(detailLayout.display).not.toBe('none');
    expect(detailLayout.visibility).not.toBe('hidden');
    expect(detailLayout.height).toBeGreaterThan(0);
    expect(detailLayout.sectionBottom).toBeLessThanOrEqual(detailLayout.viewportHeight);
    expect(detailLayout.documentWidth).toBeLessThanOrEqual(detailLayout.viewportWidth + 1);
  });

  test('keeps transaction safety preflight before composer entry on mobile', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/transactions?address=${DEFAULT_DASHBOARD_ADDRESS}&action=bond`);

    const preflight = page.getByLabel('Transaction safety preflight');
    const sourceConfidence = page.getByRole('region', { name: 'Transaction source checks' });
    const composer = page.getByLabel('Transaction composer');

    await expect(preflight).toBeVisible();
    await expect(sourceConfidence).toBeVisible();
    await expect(composer).toBeVisible();
    await expect(preflight.getByRole('link', { name: 'Open composer' })).toBeVisible();

    const layout = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
      };

      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        preflight: box('section[aria-label="Transaction safety preflight"]'),
        sourceConfidence: box('section[aria-label="Transaction source checks"]'),
        composer: box('section[aria-label="Transaction composer"]'),
        composerEntry: box('section[aria-label="Transaction safety preflight"] a[href="#transaction-composer"]'),
      };
    });

    expect(layout.preflight).not.toBeNull();
    expect(layout.sourceConfidence).not.toBeNull();
    expect(layout.composer).not.toBeNull();
    expect(layout.composerEntry).not.toBeNull();
    expect(layout.sourceConfidence!.top).toBeGreaterThan(layout.preflight!.top);
    expect(layout.composerEntry!.bottom).toBeLessThan(layout.viewportHeight);
    expect(layout.composer!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  });

  test('keeps pending transaction source checks fully scannable on mobile', async ({ page, allowApiErrors }) => {
    allowApiErrors(['/api/thorchain/thorchain/nodes']);
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      thornodeHealthProbeStatus: 502,
    });
    await page.goto(`/dashboard/transactions?address=${DEFAULT_DASHBOARD_ADDRESS}&action=bond`);

    const preflight = page.getByLabel('Transaction safety preflight');
    const sourceChecks = page.getByRole('region', { name: 'Transaction source checks' });

    await expect(preflight).toContainText('Source check degraded');
    await expect(sourceChecks).toBeVisible();

    const layout = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
      };

      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        preflight: box('section[aria-label="Transaction safety preflight"]'),
        sourceChecks: box('section[aria-label="Transaction source checks"]'),
      };
    });

    expect(layout.preflight).not.toBeNull();
    expect(layout.sourceChecks).not.toBeNull();
    expect(layout.sourceChecks!.top).toBeGreaterThan(layout.preflight!.top);
    expect(layout.sourceChecks!.bottom).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  });

  test('keeps rewards data checks and partial-baseline warning visible before return decisions on mobile', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, { partialBondActions: true });
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Rewards diagnosis');
    const checks = page.getByLabel('Rewards data checks');
    const basis = page.getByLabel('PnL calculation basis');
    const cards = page.getByLabel('PnL return cards');

    await expect(diagnosis).toBeVisible();
    await expect(checks).toBeVisible();
    await expect(checks).toContainText('Partial');
    await expect(checks).toContainText('Loaded 50 of 76; auto returns need full history or manual baseline');
    await expect(checks).toContainText('Tax worksheet');
    await expect(checks).toContainText('Review');
    await expect(checks).not.toContainText('Rewards data confidence');
    await expect(basis).toBeVisible();
    await expect(basis).toContainText('Initial bond: partial action history');
    await expect(basis).toContainText('Auto return cards are withheld until full history loads or you set a manual initial bond.');
    await expect(cards).toContainText('Total Return');
    await expect(cards).toContainText('N/A');

    const layout = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
      };

      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        diagnosis: box('section[aria-label="Rewards diagnosis"]'),
        checks: box('section[aria-label="Rewards data checks"]'),
        tabs: box('[role="tablist"]'),
        basis: box('section[aria-label="PnL calculation basis"]'),
      };
    });

    expect(layout.diagnosis).not.toBeNull();
    expect(layout.checks).not.toBeNull();
    expect(layout.tabs).not.toBeNull();
    expect(layout.basis).not.toBeNull();
    expect(layout.checks!.top).toBeGreaterThan(layout.diagnosis!.top);
    expect(layout.checks!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.tabs!.top).toBeGreaterThan(layout.checks!.top);
    expect(layout.basis!.top).toBeGreaterThan(layout.tabs!.top);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  });
});
