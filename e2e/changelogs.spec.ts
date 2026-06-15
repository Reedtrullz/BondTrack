import { expect, test } from './fixtures';
import { DEFAULT_DASHBOARD_ADDRESS, mockDashboardApis } from './helpers/dashboard-api-mocks';

test.describe('Protocol changelog', () => {
  test('shows operational impact summary in the first mobile viewport', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/changelogs?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const summary = page.getByLabel('Changelog operational impact summary');

    await expect(summary).toContainText('Latest in archive');
    await expect(summary).toContainText('Solana unhalted, EVM chains bug, ADR-23 passed');
    await expect(summary).toContainText('Operator impact');
    await expect(summary).toContainText('Upgrade required');
    await expect(summary).not.toContainText('Latest Release');
    await expect(summary).not.toContainText('v3.16');
    const summaryBox = await summary.boundingBox();

    expect(summaryBox).not.toBeNull();
    expect(summaryBox?.y ?? 9999).toBeLessThan(420);

    await expect(page.getByTestId('changelog-mobile-filter-toggle')).toBeVisible();
    await expect(page.getByTestId('changelog-type-filters')).toBeHidden();

    const hasDocumentOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasDocumentOverflow).toBe(false);
  });

  test('opens mobile impact filters without a horizontal filter rail', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/changelogs?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const mobileFilterToggle = page.getByTestId('changelog-mobile-filter-toggle');
    const filterGroup = page.getByTestId('changelog-type-filters');

    await expect(filterGroup).toBeHidden();
    await expect(mobileFilterToggle).toHaveAttribute('aria-expanded', 'false');

    await mobileFilterToggle.click();

    await expect(mobileFilterToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(filterGroup).toBeVisible();

    for (const label of ['Operator Impact', 'LP Impact', 'Chain Halt', 'Upgrade Required']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Operator Impact' }).click();

    const summary = page.getByLabel('Changelog operational impact summary');
    await expect(summary).toContainText('Filtered view');
    await expect(summary).toContainText('Operator Impact');
    await expect(summary).toContainText('matching updates');
    await expect.poll(async () => {
      const box = await summary.boundingBox();
      return box ? Math.round(box.y) : -9999;
    }).toBeGreaterThanOrEqual(0);

    const filterRailOverflow = await filterGroup.evaluate((element) => (
      element.scrollWidth > element.clientWidth + 1
    ));
    expect(filterRailOverflow).toBe(false);
  });

  test('restores saved expanded months without hydration warnings', async ({ context, page }) => {
    await context.addInitScript(() => {
      localStorage.setItem('changelogs-expanded', JSON.stringify(['mar-2026', 'feb-2026']));
    });

    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto(`/dashboard/changelogs?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const latestUpdate = page.getByRole('button', {
      name: 'Solana unhalted, EVM chains bug, ADR-23 passed Mar 2026',
      exact: true,
    });

    await expect(latestUpdate).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Update v3.16', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ADR-022 Per Block Swap Scoring', exact: true })).toBeVisible();
  });

  test('restores a saved dashboard address after hydration without warnings', async ({ context, page }) => {
    await context.addInitScript((address) => {
      localStorage.setItem('BONDTRACK_ADDRESS', address);
    }, DEFAULT_DASHBOARD_ADDRESS);

    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto('/dashboard/changelogs');

    await expect(page).toHaveURL(`/dashboard/changelogs?address=${DEFAULT_DASHBOARD_ADDRESS}`);
    await expect(page.getByRole('heading', { name: 'Protocol Changelog' })).toBeVisible();
  });
});
