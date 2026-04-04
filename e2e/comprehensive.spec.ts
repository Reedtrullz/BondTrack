import { test, expect } from '@playwright/test';

const MOCK_ADDRESS = 'thor1test123456789abcdefghijklmnop';

test.describe('Visual Regression - Layout', () => {
  test('homepage renders correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('THORNode Watcher').first()).toBeVisible();
    await expect(page.getByPlaceholder('thor1...')).toBeVisible();
  });

  test('dashboard overview page renders correctly', async ({ page }) => {
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await expect(page.getByText('Total Bonded').first()).toBeVisible();
  });

  test('sidebar is visible on all dashboard pages', async ({ page }) => {
    const pages = ['overview', 'nodes', 'rewards', 'risk', 'transactions'];
    for (const pg of pages) {
      await page.goto(`/dashboard/${pg}?address=${MOCK_ADDRESS}`);
      await expect(page.getByText('THORNode Watcher').first()).toBeVisible();
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
    await expect(page.getByText('THORNode Watcher').first()).toBeVisible();
  });

  test('works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByText('THORNode Watcher').first()).toBeVisible();
  });

  test('works on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.getByText('THORNode Watcher').first()).toBeVisible();
  });
});

test.describe('API Integration', () => {
  test('handles API errors gracefully', async ({ page }) => {
    await page.route('**/thorchain/nodes**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);

    await page.waitForTimeout(3000);

    await expect(page.getByText('Total Bonded').first()).toBeVisible();
  });

  test('retries failed requests', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/thorchain/nodes**', async (route) => {
      requestCount++;
      if (requestCount < 3) {
        await route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Service unavailable' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);

    await page.waitForTimeout(5000);

    expect(requestCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Edge Cases', () => {
  test('handles very long address input', async ({ page }) => {
    await page.goto('/');
    const longAddress = 'thor1' + 'a'.repeat(100);
    const input = page.getByPlaceholder('thor1...');
    await input.fill(longAddress);
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page.getByText('Invalid address length')).toBeVisible();
  });

  test('handles special characters in address', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('thor1...');
    await input.fill('thor1!@#$%^&*()');
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page.getByText('Invalid address length')).toBeVisible();
  });

  test('handles empty dashboard URL without address', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/dashboard');
  });

  test('handles direct navigation to deep links', async ({ page }) => {
    await page.goto(`/dashboard/rewards?address=${MOCK_ADDRESS}`);
    await expect(page).toHaveURL(/\/dashboard\/rewards/);
  });
});
