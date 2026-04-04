import { test, expect } from '@playwright/test';

const MOCK_ADDRESS = 'thor1test123456789abcdefghijklmnop';

test.describe('Transaction Composer', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'denied'; static requestPermission = async () => 'denied'; },
        writable: true,
      });
    });
    await page.goto(`/dashboard/transactions?address=${MOCK_ADDRESS}`);
  });

  test('displays BOND and UNBOND mode buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'BOND', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'UNBOND', exact: true })).toBeVisible();
  });

  test('defaults to BOND mode', async ({ page }) => {
    const bondButton = page.getByRole('button', { name: 'BOND', exact: true });
    await expect(bondButton).toHaveClass(/bg-emerald-600/);
  });

  test('switches to UNBOND mode', async ({ page }) => {
    await page.getByRole('button', { name: 'UNBOND', exact: true }).click();
    await expect(page.getByText('Amount to Unbond')).toBeVisible();
  });

  test('generates correct BOND memo', async ({ page }) => {
    const nodeInput = page.getByPlaceholder('thor1...');
    await nodeInput.fill('thor1abc123def456789');
    await expect(page.locator('code').filter({ hasText: 'BOND:thor1abc123def456789' })).toBeVisible();
  });

  test('generates correct UNBOND memo with amount', async ({ page }) => {
    await page.getByRole('button', { name: 'UNBOND', exact: true }).click();
    const nodeInput = page.getByPlaceholder('thor1...');
    await nodeInput.fill('thor1abc123def456789');
    const amountInput = page.getByPlaceholder('0');
    await amountInput.fill('1000');
    await expect(page.locator('code').filter({ hasText: 'UNBOND:thor1abc123def456789:1000' })).toBeVisible();
  });

  test('copy memo button works', async ({ page }) => {
    const nodeInput = page.getByPlaceholder('thor1...');
    await nodeInput.fill('thor1abc123def456789');
    await page.getByRole('button', { name: 'Copy Memo' }).click();
    const copyButton = page.getByRole('button', { name: 'Copy Memo' });
    await expect(copyButton).toBeVisible();
  });

  test('shows Connect Wallet prompt when disconnected', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Connect Wallet' }).nth(1)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect Wallet' }).nth(1)).toBeDisabled();
  });

  test('shows minimum bond info', async ({ page }) => {
    await expect(page.getByText('1.02 RUNE')).toBeVisible();
  });
});
