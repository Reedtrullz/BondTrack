import { test, expect, type Page } from './fixtures';

const MOCK_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
const MOCK_NODE = 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245';

async function setupTransactionApiMocks(page: Page) {
  await page.route('**/api/thorchain/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/thorchain/thorchain/nodes') {
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === '/api/thorchain/thorchain/constants') {
      await route.fulfill({
        json: {
          int_64_values: { OptimalBondD: 2500000000000 },
          bool_values: {},
          string_values: {},
        },
      });
      return;
    }

    if (url.pathname.startsWith('/api/thorchain/cosmos/bank/v1beta1/balances/')) {
      await route.fulfill({ json: { balances: [{ denom: 'rune', amount: '125000000000' }] } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled THORChain mock: ${url.pathname}` } });
  });

  await page.route('**/api/midgard/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/midgard/v2/health') {
      await route.fulfill({ json: { lastThorNode: { height: 12345678 } } });
      return;
    }

    if (url.pathname.startsWith('/api/midgard/v2/thorname/rlookup/')) {
      await route.fulfill({ json: { entry: null } });
      return;
    }

    if (url.pathname === `/api/midgard/v2/bonds/${MOCK_ADDRESS}`) {
      await route.fulfill({ json: { address: MOCK_ADDRESS, totalBonded: '0', nodes: [] } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/actions') {
      await route.fulfill({ json: { actions: [], count: '0' } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled Midgard mock: ${url.pathname}` } });
  });
}

async function connectMockKeplr(page: Page) {
  await page.getByTestId('wallet-connect-button').click();
  await page.getByTestId('wallet-option-keplr').evaluate((element) => {
    (element as HTMLElement).click();
  });
  await expect(page.getByTestId('wallet-account-menu-button')).toBeVisible();
}

test.describe('Transaction Composer', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupTransactionApiMocks(page);
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'denied'; static requestPermission = async () => 'denied'; },
        writable: true,
      });
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            (window as Window & { __copiedMemoText?: string }).__copiedMemoText = text;
          },
        },
        configurable: true,
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

  test('does not show validation errors before composer interaction', async ({ page }) => {
    await expect(page.getByText('Node address must be a valid THORChain address')).toBeHidden();
    await expect(page.getByText('Amount must be a positive RUNE value with up to 8 decimals')).toBeHidden();
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

  test('copy memo button copies the generated memo and shows success feedback', async ({ page }) => {
    await page.getByLabel('Node Address').fill(MOCK_NODE);
    const generatedMemo = await page.locator('code').textContent();
    expect(generatedMemo).toBe(`BOND:${MOCK_NODE}`);

    await page.getByRole('button', { name: 'Copy Memo' }).click();
    await expect(page.getByRole('button', { name: 'Memo copied' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Success!' })).toBeVisible();
    await expect(page.getByText(/Memo copied to your clipboard/i)).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as Window & { __copiedMemoText?: string }).__copiedMemoText)).toBe(generatedMemo);
  });

  test('shows Connect Wallet prompt when disconnected', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Connect Wallet' }).nth(1)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect Wallet' }).nth(1)).toBeDisabled();
  });

  test('shows minimum bond info', async ({ page }) => {
    await expect(page.getByText('1.02 RUNE')).toBeVisible();
  });

  test('shows wallet-estimated network fee copy in transaction preview', async ({ page, context }) => {
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).keplr = {
        enable: async () => {},
        getChainId: async () => 'thorchain-1',
        getKey: async () => ({ bech32Address: address }),
      };
    }, MOCK_ADDRESS);

    await page.reload();
    await connectMockKeplr(page);
    await page.getByLabel('Node Address').fill(MOCK_NODE);
    await page.getByLabel('Bond Amount').fill('10');
    await page.getByRole('button', { name: 'Sign & Broadcast' }).click();

    await expect(page.getByText('Network Fee')).toBeVisible();
    await expect(page.getByText('Estimated by wallet before broadcast')).toBeVisible();
    await expect(page.getByText('THORChain deposit transaction')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm & Broadcast' })).toBeVisible();
  });
});
