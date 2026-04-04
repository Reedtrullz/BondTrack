import { test, expect } from '@playwright/test';

const MOCK_ADDRESS = 'thor1test123456789abcdefghijklmnop';

test.describe('Overview Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
  });

  test('displays portfolio summary section', async ({ page }) => {
    await expect(page.getByText('Total Bonded').first()).toBeVisible();
    await expect(page.getByText('RUNE Price').first()).toBeVisible();
    await expect(page.getByText('Weighted APY').first()).toBeVisible();
    await expect(page.getByText('Positions').first()).toBeVisible();
  });

  test('displays position table header', async ({ page }) => {
    await expect(page.getByText('Bonded Positions')).toBeVisible();
  });

  test('shows empty state when no positions', async ({ page }) => {
    await expect(page.getByText('No bonded positions found for this address')).toBeVisible();
  });
});

test.describe('Nodes Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/dashboard/nodes?address=${MOCK_ADDRESS}`);
  });

  test('displays nodes page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/nodes/);
  });
});

test.describe('Rewards Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/dashboard/rewards?address=${MOCK_ADDRESS}`);
  });

  test('displays rewards page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/rewards/);
  });

  test('displays earnings table', async ({ page }) => {
    await expect(page.getByText('Earnings History')).toBeVisible();
  });

  test('displays rewards metrics', async ({ page }) => {
    await expect(page.getByText('Per-Churn Reward (est.)')).toBeVisible();
    await expect(page.getByText('Operator Fees (per churn)')).toBeVisible();
  });

  test('displays profit and loss section', async ({ page }) => {
    await expect(page.getByText('Profit & Loss')).toBeVisible();
  });

  test('displays operator fee impact', async ({ page }) => {
    await expect(page.getByText('Operator Fee Impact')).toBeVisible();
  });

  test('displays auto-compound chart', async ({ page }) => {
    await expect(page.getByText('Auto-Compound Growth')).toBeVisible();
  });
});

test.describe('Risk Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/dashboard/risk?address=${MOCK_ADDRESS}`);
  });

  test('displays risk page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/risk/);
  });
});

test.describe('Transactions Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/dashboard/transactions?address=${MOCK_ADDRESS}`);
  });

  test('displays transactions page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
  });
});
