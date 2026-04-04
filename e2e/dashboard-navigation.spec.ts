import { test, expect } from '@playwright/test';

const MOCK_ADDRESS = 'thor1test123456789abcdefghijklmnop';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
  });

  test('displays dashboard shell with sidebar', async ({ page }) => {
    await expect(page.getByText('THORNode Watcher').first()).toBeVisible();
  });

  test('sidebar contains all navigation links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nodes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Rewards' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Risk' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Transactions' })).toBeVisible();
  });

  test('navigates to Overview page', async ({ page }) => {
    await page.getByRole('link', { name: 'Overview' }).click();
    await expect(page).toHaveURL(/\/dashboard\/overview/);
  });

  test('navigates to Nodes page', async ({ page }) => {
    await page.getByRole('link', { name: 'Nodes' }).click();
    await expect(page).toHaveURL(/\/dashboard\/nodes/);
  });

  test('navigates to Rewards page', async ({ page }) => {
    await page.getByRole('link', { name: 'Rewards' }).click();
    await expect(page).toHaveURL(/\/dashboard\/rewards/);
  });

  test('navigates to Risk page', async ({ page }) => {
    await page.getByRole('link', { name: 'Risk' }).click();
    await expect(page).toHaveURL(/\/dashboard\/risk/);
  });

  test('navigates to Transactions page', async ({ page }) => {
    await page.getByRole('link', { name: 'Transactions' }).click();
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
  });

  test('highlights active page in sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Risk' }).click();
    await expect(page).toHaveURL(/\/dashboard\/risk/);
    const riskLink = page.getByRole('link', { name: 'Risk' });
    await expect(riskLink).toBeVisible();
  });

  test('displays wallet connect button in header', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Connect Wallet' }).first()).toBeVisible();
  });
});
