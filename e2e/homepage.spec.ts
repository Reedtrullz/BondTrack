import { test, expect } from './fixtures';
import { DEFAULT_DASHBOARD_ADDRESS, mockDashboardApis } from './helpers/dashboard-api-mocks';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays app title and description', async ({ page }) => {
    await expect(page.getByText('Heimdall').first()).toBeVisible();
    await expect(page.getByText('Monitor your bond provider positions')).toBeVisible();
  });

  test('displays address input field', async ({ page }) => {
    const input = page.getByPlaceholder('thor1...');
    await expect(input).toBeVisible();
  });

  test('displays feature cards', async ({ page }) => {
    await expect(page.getByText('Node Health').first()).toBeVisible();
    await expect(page.getByText('Earnings').first()).toBeVisible();
    await expect(page.getByText('Risk Alerts').first()).toBeVisible();
    await expect(page.getByText('Transactions').first()).toBeVisible();
  });

  test('shows Lookup button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Lookup' })).toBeVisible();
  });

  test('validates address starting with thor1', async ({ page }) => {
    const input = page.getByPlaceholder('thor1...');
    await input.fill('invalid123');
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page.getByText('Address must start with thor1 or tthor1.')).toBeVisible();
  });

  test('validates address length', async ({ page }) => {
    const input = page.getByPlaceholder('thor1...');
    await input.fill('thor1short');
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page.getByText('Enter a valid THORChain address.')).toBeVisible();
  });

  test('displays Shield icon', async ({ page }) => {
    const icon = page.locator('svg').first();
    await expect(icon).toBeVisible();
  });

  test('adds successful lookups to recent addresses', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);

    await page.getByPlaceholder('thor1...').fill(DEFAULT_DASHBOARD_ADDRESS);
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard\\?address=${DEFAULT_DASHBOARD_ADDRESS}`));

    await expect.poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('heimdall-watchlist') ?? '[]') as string[])
    ).toEqual([DEFAULT_DASHBOARD_ADDRESS]);

    await page.evaluate(() => localStorage.removeItem('BONDTRACK_ADDRESS'));
    await page.addInitScript(() => {
      localStorage.removeItem('BONDTRACK_ADDRESS');
    });
    await page.goto('/');

    await expect(page.getByText('Recent Addresses', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'thor1qqq...qqqq', exact: true })).toBeVisible();
  });
});
