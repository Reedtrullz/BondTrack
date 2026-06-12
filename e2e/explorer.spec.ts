import { expect, test } from './fixtures';
import { DEFAULT_DASHBOARD_ADDRESS, mockDashboardApis } from './helpers/dashboard-api-mocks';

test.describe('Node explorer', () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
  });

  test('ranks candidates by quality and blocks quick bonding for avoid-rated nodes', async ({ page }) => {
    await page.goto(`/dashboard/explorer?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByText('Rank bond candidates by quality, slash history, operator fee, and capacity trust')).toBeVisible();
    await expect(page.getByText('No bond-ready candidates in the current filter')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Low Slash' })).toBeVisible();
    await expect(page.getByText(/Avoid · \d+\/100/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Review risk first' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quick Bond' })).toBeHidden();
  });
});
