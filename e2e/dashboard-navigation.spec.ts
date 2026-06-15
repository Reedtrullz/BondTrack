import { test, expect, type Page } from './fixtures';
import { mockDashboardApis } from './helpers/dashboard-api-mocks';

const MOCK_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

function sidebarLink(page: Page, label: string) {
  return page.getByRole('link', { name: `Navigate to ${label} page` });
}

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardApis(page, MOCK_ADDRESS);
    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);
  });

  test('displays dashboard shell with sidebar', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Heimdall Navigation' })).toHaveAttribute('href', '/');
    await expect(sidebarLink(page, 'Portfolio')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Refresh dashboard data' })).toBeVisible();
  });

  test('sidebar contains all navigation links', async ({ page }) => {
    await expect(sidebarLink(page, 'Command Center')).toBeVisible();
    await expect(sidebarLink(page, 'Portfolio')).toBeVisible();
    await expect(sidebarLink(page, 'Nodes')).toBeVisible();
    await expect(sidebarLink(page, 'Rewards')).toBeVisible();
    await expect(sidebarLink(page, 'LP Status')).toBeVisible();
    await expect(sidebarLink(page, 'Risk')).toBeVisible();
    await expect(sidebarLink(page, 'Transactions')).toBeVisible();
    await expect(sidebarLink(page, 'Changelogs')).toBeVisible();
  });

  test('navigates to Portfolio page', async ({ page }) => {
    await sidebarLink(page, 'Portfolio').click();
    await expect(page).toHaveURL(/\/dashboard\/portfolio/);
  });

  test('navigates to Command Center page', async ({ page }) => {
    await sidebarLink(page, 'Command Center').click();
    await expect(page).toHaveURL(/\/dashboard\?address=/);
    await expect(page.getByLabel('Command center diagnosis')).toBeVisible();
  });

  test('navigates to Nodes page', async ({ page }) => {
    await sidebarLink(page, 'Nodes').click();
    await expect(page).toHaveURL(/\/dashboard\/nodes/);
  });

  test('navigates to Rewards page', async ({ page }) => {
    await sidebarLink(page, 'Rewards').click();
    await expect(page).toHaveURL(/\/dashboard\/rewards/);
  });

  test('navigates to Risk page', async ({ page }) => {
    await sidebarLink(page, 'Risk').click();
    await expect(page).toHaveURL(/\/dashboard\/risk/);
  });

  test('navigates to Transactions page', async ({ page }) => {
    await sidebarLink(page, 'Transactions').click();
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
  });

  test('highlights active page in sidebar', async ({ page }) => {
    await sidebarLink(page, 'Risk').click();
    await expect(page).toHaveURL(/\/dashboard\/risk/);
    const riskLink = sidebarLink(page, 'Risk');
    await expect(riskLink).toBeVisible();
  });

  test('displays wallet connect button in header', async ({ page }) => {
    const walletConnect = page.getByTestId('wallet-connect-button');

    await expect(walletConnect).toBeVisible();
    await expect(walletConnect).toBeEnabled();
    await expect(walletConnect).toHaveAccessibleName('Connect Wallet');
  });
});
