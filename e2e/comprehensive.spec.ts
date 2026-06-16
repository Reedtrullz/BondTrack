import { test, expect } from './fixtures';
import { mockDashboardApis } from './helpers/dashboard-api-mocks';

const MOCK_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';

test.describe('Visual Regression - Layout', () => {
  test('homepage renders correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'THORChain operations console' })).toBeVisible();
    await expect(page.getByPlaceholder('thor1...')).toBeVisible();
  });

  test('dashboard portfolio page renders correctly', async ({ page }) => {
    await mockDashboardApis(page, MOCK_ADDRESS);
    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);
    await expect(page.getByRole('group', { name: 'Total Bonded summary' })).toBeVisible();
  });

  test('sidebar is visible on all dashboard pages', async ({ page }) => {
    await mockDashboardApis(page, MOCK_ADDRESS);
    const pages = ['portfolio', 'nodes', 'rewards', 'risk', 'transactions', 'lp'];
    for (const pg of pages) {
      await page.goto(`/dashboard/${pg}?address=${MOCK_ADDRESS}`);
      await expect(page.getByRole('link', { name: 'Heimdall Navigation', exact: true })).toHaveAttribute('href', '/');
    }
  });
});

test.describe('Accessibility', () => {
  test('form inputs have placeholders', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('thor1...');
    await expect(input).toBeVisible();
  });
});

test.describe('Responsive Behavior', () => {
  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'THORChain operations console' })).toBeVisible();
  });

  test('works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'THORChain operations console' })).toBeVisible();
  });

  test('works on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'THORChain operations console' })).toBeVisible();
  });
});

test.describe('API Integration', () => {
  test('handles empty THORNode /nodes responses gracefully', async ({ page }) => {
    await mockDashboardApis(page, MOCK_ADDRESS);
    await page.route('**/api/thorchain/thorchain/nodes', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.getByRole('heading', { level: 1, name: 'Portfolio', exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'No bonded positions detected' })).toBeVisible();
  });

  test('separates THORNode health probes from dashboard node data requests', async ({ page }) => {
    let dataRequestCount = 0;
    let healthProbeCount = 0;

    await mockDashboardApis(page, MOCK_ADDRESS);
    await page.route('**/api/thorchain/thorchain/nodes', async (route) => {
      if (route.request().headers()['x-heimdall-health-probe'] === 'thornode') {
        healthProbeCount++;
      } else {
        dataRequestCount++;
      }
      await route.fallback();
    });

    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Portfolio', exact: true })).toBeVisible({ timeout: 15000 });
    await expect.poll(() => healthProbeCount, { timeout: 10000 }).toBeGreaterThanOrEqual(1);
    await expect.poll(() => dataRequestCount, { timeout: 10000 }).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Edge Cases', () => {
  test('handles very long address input', async ({ page }) => {
    await page.goto('/');
    const longAddress = 'thor1' + 'a'.repeat(100);
    const input = page.getByPlaceholder('thor1...');
    await input.fill(longAddress);
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page.getByText('Enter a valid THORChain address.')).toBeVisible();
  });

  test('handles special characters in address', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('thor1...');
    await input.fill('thor1!@#$%^&*()');
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page.getByText('Enter a valid THORChain address.')).toBeVisible();
  });

  test('handles empty dashboard URL without address', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('handles direct navigation to deep links', async ({ page }) => {
    await mockDashboardApis(page, MOCK_ADDRESS);
    await page.goto(`/dashboard/rewards?address=${MOCK_ADDRESS}`);
    await expect(page).toHaveURL(/\/dashboard\/rewards/);
  });
});
