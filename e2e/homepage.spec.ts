import { test, expect } from './fixtures';
import { DEFAULT_DASHBOARD_ADDRESS, mockDashboardApis } from './helpers/dashboard-api-mocks';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays app title and description', async ({ page }) => {
    const main = page.getByRole('main');
    const lookup = page.getByRole('region', { name: 'Address lookup' });

    await expect(main.getByText('Heimdall', { exact: true })).toBeVisible();
    await expect(main.getByRole('heading', {
      level: 1,
      name: 'THORChain operations console',
      exact: true,
    })).toBeVisible();
    await expect(lookup.getByRole('heading', {
      level: 2,
      name: 'Start with a bond provider address',
      exact: true,
    })).toBeVisible();
  });

  test('displays address input field', async ({ page }) => {
    const input = page.getByPlaceholder('thor1...');
    await expect(input).toBeVisible();
  });

  test('shows trust boundaries instead of marketing feature cards', async ({ page }) => {
    const main = page.getByRole('main');
    const trustPanel = page.getByRole('complementary', {
      name: 'Heimdall trust boundaries',
      exact: true,
    });

    await expect(trustPanel).toContainText('Public on-chain data');
    await expect(trustPanel).toContainText('Stored locally');
    await expect(trustPanel).toContainText('Wallet approval stays external');
    await expect(trustPanel).toContainText('approve only if memo, amount, network, and fee match');
    await expect(trustPanel).not.toContainText('Wallet confirms transactions');
    await expect(main.getByRole('heading', { name: 'Node Health', exact: true })).toHaveCount(0);
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

  test('puts lookup before secondary context', async ({ page }) => {
    const lookup = page.getByLabel('Address lookup');
    const trustPanel = page.getByLabel('Heimdall trust boundaries');

    await expect(lookup).toBeVisible();
    await expect(trustPanel).toBeVisible();

    const lookupBeforeTrust = await lookup.evaluate((element) => {
      const trust = document.querySelector('[aria-label="Heimdall trust boundaries"]');
      return Boolean(
        trust
        && (element.compareDocumentPosition(trust) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    });
    expect(lookupBeforeTrust).toBe(true);
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
    await expect(page.getByRole('button', { name: 'thor1qqq...eyjz', exact: true })).toBeVisible();
  });
});
