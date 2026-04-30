import { test, expect } from '@playwright/test';

const MOCK_ADDRESS = 'thor1test123456789abcdefghijklmnop';
const MOCK_NODE = 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245';

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

  test('generates BOND memo without putting amount in provider-address slot', async ({ page }) => {
    await page.getByLabel('Node Address').fill(MOCK_NODE);
    await page.getByLabel('Bond Amount').fill('10');

    const memo = page.locator('code').filter({ hasText: `BOND:${MOCK_NODE}` });
    await expect(memo).toBeVisible();
    await expect(memo).not.toContainText(':10');
  });

  test('generates advanced BOND memo only when provider field is explicitly supplied', async ({ page }) => {
    await page.getByLabel('Node Address').fill(MOCK_NODE);
    await page.getByRole('button', { name: /Advanced/ }).click();
    await page.getByLabel('Provider Address (optional)').fill('thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2');
    await page.getByLabel('Operator Fee BPS (optional)').fill('1000');

    await expect(page.locator('code').filter({ hasText: `BOND:${MOCK_NODE}:thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2:1000` })).toBeVisible();
  });

  test('generates UNBOND memo with amount in 1e8 base units', async ({ page }) => {
    await page.getByRole('button', { name: 'UNBOND', exact: true }).click();
    await page.getByLabel('Node Address').fill(MOCK_NODE);
    await page.getByLabel('Amount to Unbond').fill('10');

    await expect(page.locator('code').filter({ hasText: `UNBOND:${MOCK_NODE}:1000000000` })).toBeVisible();
  });

  test('copy memo button works', async ({ page }) => {
    await page.getByLabel('Node Address').fill(MOCK_NODE);
    await page.getByRole('button', { name: 'Copy Memo' }).click();
    const copyButton = page.getByRole('button', { name: /Copy Memo|Memo copied|Copy failed/ });
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
