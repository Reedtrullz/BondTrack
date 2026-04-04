import { test, expect } from '@playwright/test';

const MOCK_ADDRESS = 'thor1test123456789abcdefghijklmnop';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays app title and description', async ({ page }) => {
    await expect(page.getByText('THORNode Watcher').first()).toBeVisible();
    await expect(page.getByText('Monitor your bond provider positions')).toBeVisible();
  });

  test('displays address input field', async ({ page }) => {
    const input = page.getByPlaceholder('thor1...');
    await expect(input).toBeVisible();
  });

  test('displays three feature cards', async ({ page }) => {
    await expect(page.getByText('Real-time Monitoring').first()).toBeVisible();
    await expect(page.getByText('Rewards Tracking').first()).toBeVisible();
    await expect(page.getByText('Risk Alerts').first()).toBeVisible();
  });

  test('shows Lookup button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Lookup' })).toBeVisible();
  });

  test('validates address starting with thor1', async ({ page }) => {
    const input = page.getByPlaceholder('thor1...');
    await input.fill('invalid123');
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page.getByText('Address must start with "thor1"')).toBeVisible();
  });

  test('validates address length', async ({ page }) => {
    const input = page.getByPlaceholder('thor1...');
    await input.fill('thor1short');
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page.getByText('Invalid address length')).toBeVisible();
  });

  test('displays Shield icon', async ({ page }) => {
    const icon = page.locator('svg').first();
    await expect(icon).toBeVisible();
  });
});
