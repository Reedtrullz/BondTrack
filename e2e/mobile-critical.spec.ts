import { expect, test } from './fixtures';
import { DEFAULT_DASHBOARD_ADDRESS, mockDashboardApis } from './helpers/dashboard-api-mocks';

test.describe('Mobile critical release path', () => {
  test('keeps command-center diagnosis, source confidence, and top actions in the mobile viewport', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    const sourceConfidence = page.getByRole('region', { name: 'Source confidence' });
    const actions = page.getByRole('region', { name: 'Provider review queue' });

    await expect(diagnosis).toBeVisible();
    await expect(sourceConfidence).toBeVisible();
    await expect(actions).toBeVisible();
    await expect(sourceConfidence).toContainText('Data source confidence');

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
        diagnosis: box('section[aria-label="Command center diagnosis"]'),
        sourceConfidence: box('section[aria-label="Source confidence"]'),
        actions: box('section[aria-label="Provider review queue"]'),
        firstAction: box('section[aria-label="Provider review queue"] article'),
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
  });

  test('keeps portfolio bond labels readable without mobile overflow', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/portfolio?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const heading = page.getByRole('heading', { name: 'Bonded Positions', exact: true });
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

  test('keeps transaction safety preflight before composer entry on mobile', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/transactions?address=${DEFAULT_DASHBOARD_ADDRESS}&action=bond`);

    const preflight = page.getByLabel('Transaction safety preflight');
    const sourceConfidence = page.getByRole('region', { name: 'Source confidence' });
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
        sourceConfidence: box('section[aria-label="Source confidence"]'),
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

  test('keeps rewards confidence and partial-baseline warning visible before return decisions on mobile', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, { partialBondActions: true });
    await page.goto(`/dashboard/rewards?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Rewards diagnosis');
    const confidence = page.getByLabel('Rewards data confidence');
    const basis = page.getByLabel('PnL calculation basis');
    const cards = page.getByLabel('PnL return cards');

    await expect(diagnosis).toBeVisible();
    await expect(confidence).toBeVisible();
    await expect(confidence).toContainText('Partial');
    await expect(confidence).toContainText('Loaded 50 of 76; auto returns need full history or manual baseline');
    await expect(confidence).toContainText('Tax worksheet');
    await expect(confidence).toContainText('Review');
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
        confidence: box('section[aria-label="Rewards data confidence"]'),
        tabs: box('[role="tablist"]'),
        basis: box('section[aria-label="PnL calculation basis"]'),
      };
    });

    expect(layout.diagnosis).not.toBeNull();
    expect(layout.confidence).not.toBeNull();
    expect(layout.tabs).not.toBeNull();
    expect(layout.basis).not.toBeNull();
    expect(layout.confidence!.top).toBeGreaterThan(layout.diagnosis!.top);
    expect(layout.confidence!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.tabs!.top).toBeGreaterThan(layout.confidence!.top);
    expect(layout.basis!.top).toBeGreaterThan(layout.tabs!.top);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  });
});
