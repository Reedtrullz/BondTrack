import { test, expect } from './fixtures';

const MOCK_ADDRESS = 'thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346';

test.describe('Dashboard redirects', () => {
  test('redirects overview to portfolio and preserves query params', async ({ page }) => {
    await Promise.all([
      page.waitForURL(`/dashboard/portfolio?address=${MOCK_ADDRESS}`),
      page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`),
    ]);

    await expect(page).toHaveURL(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);
  });

  test('shows the address-required state for overview without an address', async ({ page }) => {
    await page.goto('/dashboard/overview?view=test123');

    await expect(page).toHaveURL('/dashboard/overview?view=test123');
    await expect(page.getByText('Enter an address to get started')).toBeVisible();
  });

  test('redirects dashboard root to portfolio', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('dashboard-address', 'thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346');
    });

    await Promise.all([
      page.waitForURL('/dashboard/portfolio?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346'),
      page.goto('/dashboard'),
    ]);

    await expect(page).toHaveURL('/dashboard/portfolio?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346');
  });

  test('restores saved address without dropping deep-link query params', async ({ page }) => {
    await page.addInitScript((address) => {
      localStorage.setItem('BONDTRACK_ADDRESS', address);
    }, MOCK_ADDRESS);

    await page.goto('/dashboard/transactions?action=unbond');
    await expect(page).toHaveURL(`/dashboard/transactions?action=unbond&address=${MOCK_ADDRESS}`);
  });
});
