import { test, expect } from './fixtures';
import { mockDashboardApis } from './helpers/dashboard-api-mocks';

const MOCK_ADDRESS = 'thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346';

test.describe('Dashboard redirects', () => {
  test('redirects overview to command center and preserves query params', async ({ page }) => {
    await mockDashboardApis(page, MOCK_ADDRESS);

    await Promise.all([
      page.waitForURL(`/dashboard?address=${MOCK_ADDRESS}`),
      page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`),
    ]);

    await expect(page).toHaveURL(`/dashboard?address=${MOCK_ADDRESS}`);
  });

  test('recovers from overview without an address and preserves query params', async ({ page }) => {
    const apiRequestsBeforeSubmit: string[] = [];

    await page.route('**/api/**', async (route) => {
      apiRequestsBeforeSubmit.push(new URL(route.request().url()).pathname);
      await route.abort('failed');
    });

    await page.goto('/dashboard/overview?view=test123');

    await expect(page).toHaveURL('/dashboard/overview?view=test123');
    const diagnosis = page.getByLabel('Address required diagnosis');
    await expect(diagnosis).toContainText('Address required');
    await expect(diagnosis).toContainText('Choose a watched THORChain address to start triage');
    await expect(page.getByText('Public read-only')).toBeVisible();
    await expect(page.getByText('Freshness after lookup')).toBeVisible();
    await page.waitForTimeout(300);
    expect(apiRequestsBeforeSubmit).toEqual([]);

    await page.unroute('**/api/**');
    await mockDashboardApis(page, MOCK_ADDRESS);

    await page.getByLabel('THORChain address or THORName').fill(MOCK_ADDRESS);
    await page.getByRole('button', { name: 'Lookup' }).click();

    await expect(page).toHaveURL(`/dashboard?view=test123&address=${MOCK_ADDRESS}`);
    await expect(page.getByLabel('Command center diagnosis')).toBeVisible();
  });

  test('dashboard root restores saved address on the command center', async ({ page }) => {
    await mockDashboardApis(page, MOCK_ADDRESS);

    await page.addInitScript(() => {
      localStorage.setItem('BONDTRACK_ADDRESS', 'thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346');
    });

    await Promise.all([
      page.waitForURL('/dashboard?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346'),
      page.goto('/dashboard'),
    ]);

    await expect(page).toHaveURL('/dashboard?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346');
  });

  test('restores saved address without dropping deep-link query params', async ({ page }) => {
    await mockDashboardApis(page, MOCK_ADDRESS);

    await page.addInitScript((address) => {
      localStorage.setItem('BONDTRACK_ADDRESS', address);
    }, MOCK_ADDRESS);

    await page.goto('/dashboard/transactions?action=unbond');
    await expect(page).toHaveURL(`/dashboard/transactions?action=unbond&address=${MOCK_ADDRESS}`);
  });

  test('adds direct dashboard address URLs to recent addresses', async ({ page }) => {
    await mockDashboardApis(page, MOCK_ADDRESS);

    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);

    await expect.poll(async () => (
      page.evaluate(() => JSON.parse(localStorage.getItem('heimdall-watchlist') ?? '[]') as string[])
    )).toContain(MOCK_ADDRESS);
  });
});
