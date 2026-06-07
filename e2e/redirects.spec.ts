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

  test('redirects overview to portfolio with arbitrary query params', async ({ page }) => {
    await Promise.all([
      page.waitForURL('/dashboard/portfolio?address=test123'),
      page.goto('/dashboard/overview?address=test123'),
    ]);

    await expect(page).toHaveURL('/dashboard/portfolio?address=test123');
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
});
