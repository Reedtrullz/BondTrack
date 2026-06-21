import { test, expect, type Page } from './fixtures';

const MOCK_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';

async function setupWalletPageApiMocks(page: Page) {
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

    if (url.pathname === '/api/midgard/v2/network') {
      await route.fulfill({ json: { totalPooledRune: '0', totalBond: '0', activeNodeCount: '0', standbyNodeCount: '0' } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/member/thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz') {
      await route.fulfill({ json: { pools: [], runeAddress: MOCK_ADDRESS } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/pools') {
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === '/api/midgard/v2/history/rune') {
      await route.fulfill({ json: { intervals: [], meta: { startRunePriceUSD: '1.50', endRunePriceUSD: '1.50' } } });
      return;
    }

    if (url.pathname === '/api/midgard/v2/history/earnings') {
      await route.fulfill({ json: { intervals: [], meta: {} } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled Midgard mock: ${url.pathname}` } });
  });

  await page.route('**/api/thorchain/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/thorchain/thorchain/nodes') {
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === '/api/thorchain/thorchain/constants') {
      await route.fulfill({ json: { int_64_values: { MaxBondProviders: 100 }, bool_values: {}, string_values: {} } });
      return;
    }

    if (url.pathname === '/api/thorchain/thorchain/version') {
      await route.fulfill({ json: { current: '3.19.0', next: '3.19.0', querier: '3.19.0' } });
      return;
    }

    if (url.pathname.startsWith('/api/thorchain/cosmos/bank/v1beta1/balances/')) {
      await route.fulfill({ json: { balances: [], pagination: { next_key: null, total: '0' } } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled THORChain mock: ${url.pathname}` } });
  });

  await page.route('**/api/coinapi/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/coinapi/rune-price') {
      await route.fulfill({ json: { price: 1.5 } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled CoinAPI mock: ${url.pathname}` } });
  });

  await page.route('**/api/coingecko/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/coingecko/coins/thorchain/market_chart/range') {
      await route.fulfill({ json: { prices: [[Date.now(), 1.5]] } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unhandled CoinGecko mock: ${url.pathname}` } });
  });
}

async function openWalletMenu(page: Page) {
  const trigger = page.getByTestId('wallet-connect-button');
  const menuHeading = page.getByText('Select wallet', { exact: true });

  await expect(trigger).toBeVisible();
  await expect(async () => {
    await trigger.click();
    await expect(menuHeading).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

async function chooseWallet(page: Page, wallet: 'keplr' | 'xdefi' | 'vultisig') {
  await page.getByTestId(`wallet-option-${wallet}`).evaluate((element) => {
    (element as HTMLElement).click();
  });
}

async function gotoWalletPage(page: Page) {
  await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
  await expect(page.getByTestId('wallet-connect-button')).toBeVisible();
}

test.describe('Wallet Connection', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupWalletPageApiMocks(page);
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
    });
  });

  test('shows connect wallet button when disconnected', async ({ page }) => {
    await gotoWalletPage(page);
    await expect(page.getByTestId('wallet-connect-button')).toBeVisible();
  });

  test('shows dropdown with all wallet options', async ({ page }) => {
    await gotoWalletPage(page);
    await openWalletMenu(page);

    await expect(page.getByText('No wallet provider was detected in this browser.')).toBeVisible();
    await expect(page.getByTestId('wallet-option-keplr')).toHaveText('Keplr Wallet');
    await expect(page.getByTestId('wallet-option-xdefi')).toHaveText('XDEFI Wallet');
    await expect(page.getByTestId('wallet-option-vultisig')).toHaveText('Vultisig Wallet');
    await expect(page.getByTestId('wallet-option-keplr')).toBeDisabled();
    await expect(page.getByTestId('wallet-option-xdefi')).toBeDisabled();
    await expect(page.getByTestId('wallet-option-vultisig')).toBeDisabled();
  });

  test('displays error message on connection failure', async ({ page, context }) => {
    await context.addInitScript(() => {
      (window as unknown as Record<string, unknown>).keplr = {
        enable: async () => { throw new Error('User rejected'); },
      };
    });

    await gotoWalletPage(page);
    await openWalletMenu(page);
    await chooseWallet(page, 'keplr');

    await expect(page.getByText('User rejected', { exact: true })).toBeVisible();
  });

  test('makes wallet network mismatch recoverable', async ({ page, context }) => {
    const mockAddress = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
    await context.addInitScript((address) => {
      const walletWindow = window as unknown as Window & { __heimdallChainId: string };
      walletWindow.__heimdallChainId = 'cosmoshub-4';
      (window as unknown as Record<string, unknown>).keplr = {
        enable: async () => {},
        getChainId: async () => walletWindow.__heimdallChainId,
        getKey: async () => ({ bech32Address: address }),
      };
    }, mockAddress);

    await gotoWalletPage(page);
    await openWalletMenu(page);
    await chooseWallet(page, 'keplr');

    const mismatch = page.getByTestId('wallet-network-mismatch');
    await expect(mismatch).toContainText('Wallet network mismatch');
    await expect(mismatch).toContainText('Wallet reports cosmoshub-4; THORChain mainnet expects thorchain-1.');
    await expect(mismatch).toContainText('Switch to THORChain mainnet before preview or broadcast.');

    await page.evaluate(() => {
      (window as unknown as Window & { __heimdallChainId: string }).__heimdallChainId = 'thorchain-1';
    });
    await page.getByRole('button', { name: 'Reconnect wallet' }).click();

    await expect(page.getByTestId('wallet-account-menu-button')).toHaveAccessibleName(/Keplr wallet thor1q.*7qn4/);
  });

  test('connects successfully with mocked Keplr', async ({ page, context }) => {
    const mockAddress = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).keplr = {
        enable: async () => {},
        getChainId: async () => 'thorchain-1',
        getKey: async () => ({ bech32Address: address }),
      };
    }, mockAddress);

    await gotoWalletPage(page);
    await openWalletMenu(page);
    await chooseWallet(page, 'keplr');

    await expect(page.getByTestId('wallet-account-menu-button')).toHaveAccessibleName(/Keplr wallet thor1q.*7qn4/);
    await expect(page.getByTestId('wallet-balance-status')).toContainText('Wallet balance:');
    await expect(page.getByTestId('wallet-balance-status')).toContainText('ᚱ0.00');
  });

  test('marks malformed connected-wallet balance unavailable', async ({ page, context }) => {
    const mockAddress = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
    await page.route('**/api/thorchain/cosmos/bank/v1beta1/balances/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname !== `/api/thorchain/cosmos/bank/v1beta1/balances/${mockAddress}`) {
        await route.fulfill({ status: 404, json: { error: `Unhandled wallet balance mock: ${url.pathname}` } });
        return;
      }

      await route.fulfill({
        json: {
          balances: [{ denom: 'rune', amount: 'not-a-rune-base-unit-amount' }],
          pagination: { next_key: null, total: '1' },
        },
      });
    });
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).keplr = {
        enable: async () => {},
        getChainId: async () => 'thorchain-1',
        getKey: async () => ({ bech32Address: address }),
      };
    }, mockAddress);

    await gotoWalletPage(page);
    await openWalletMenu(page);
    await chooseWallet(page, 'keplr');

    await expect(page.getByTestId('wallet-account-menu-button')).toHaveAccessibleName(/Keplr wallet thor1q.*7qn4/);
    await expect(page.getByTestId('wallet-balance-status')).toHaveText('Wallet balance unavailable');
  });

  test('disconnect clears connection state', async ({ page, context }) => {
    const mockAddress = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).keplr = {
        enable: async () => {},
        getChainId: async () => 'thorchain-1',
        getKey: async () => ({ bech32Address: address }),
        disable: async () => {},
      };
    }, mockAddress);

    await gotoWalletPage(page);
    await openWalletMenu(page);
    await chooseWallet(page, 'keplr');
    await expect(page.getByTestId('wallet-account-menu-button')).toBeVisible();

    await page.getByTestId('wallet-account-menu-button').click();
    const walletMenu = page.getByRole('menu', { name: 'Connected wallet actions' });
    await expect(walletMenu).toBeVisible();
    await walletMenu.getByRole('menuitem', { name: 'Disconnect', exact: true }).click();

    await expect(page.getByTestId('wallet-connect-button')).toBeVisible();
  });

  test('connects successfully with mocked XDEFI', async ({ page, context }) => {
    const mockAddress = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).xfi = {
        thorchain: {
          request: async ({ method }: { method: string }) => {
            if (method === 'connect') return address;
            throw new Error(`Unexpected XDEFI method: ${method}`);
          },
        },
      };
    }, mockAddress);

    await gotoWalletPage(page);
    await openWalletMenu(page);
    await chooseWallet(page, 'xdefi');

    await expect(page.getByTestId('wallet-account-menu-button')).toHaveAccessibleName(/XDEFI wallet thor1q.*7qn4/);
  });

  test('connects successfully with mocked Vultisig', async ({ page, context }) => {
    const mockAddress = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).vultisig = {
        thorchain: {
          request: async ({ method }: { method: string }) => {
            if (method === 'connect') return address;
            throw new Error(`Unexpected Vultisig method: ${method}`);
          },
        },
      };
    }, mockAddress);

    await gotoWalletPage(page);
    await openWalletMenu(page);
    await chooseWallet(page, 'vultisig');

    await expect(page.getByTestId('wallet-account-menu-button')).toHaveAccessibleName(/Vultisig wallet thor1q.*7qn4/);
  });

  test('shows correct wallet name when connected with Keplr', async ({ page, context }) => {
    const mockAddress = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).keplr = {
        enable: async () => {},
        getChainId: async () => 'thorchain-1',
        getKey: async () => ({ bech32Address: address }),
      };
    }, mockAddress);

    await gotoWalletPage(page);
    await openWalletMenu(page);
    await chooseWallet(page, 'keplr');
    await page.getByTestId('wallet-account-menu-button').click();

    await expect(page.getByText('Connected with Keplr', { exact: true })).toBeVisible();
  });

  test('shows correct wallet name when connected with XDEFI', async ({ page, context }) => {
    const mockAddress = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).xfi = {
        thorchain: {
          request: async ({ method }: { method: string }) => {
            if (method === 'connect') return address;
            throw new Error(`Unexpected XDEFI method: ${method}`);
          },
        },
      };
    }, mockAddress);

    await gotoWalletPage(page);
    await openWalletMenu(page);
    await chooseWallet(page, 'xdefi');
    await page.getByTestId('wallet-account-menu-button').click();

    await expect(page.getByText('Connected with XDEFI', { exact: true })).toBeVisible();
  });

  test('shows correct wallet name when connected with Vultisig', async ({ page, context }) => {
    const mockAddress = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).vultisig = {
        thorchain: {
          request: async ({ method }: { method: string }) => {
            if (method === 'connect') return address;
            throw new Error(`Unexpected Vultisig method: ${method}`);
          },
        },
      };
    }, mockAddress);

    await gotoWalletPage(page);
    await openWalletMenu(page);
    await chooseWallet(page, 'vultisig');
    await page.getByTestId('wallet-account-menu-button').click();

    await expect(page.getByText('Connected with Vultisig', { exact: true })).toBeVisible();
  });
});
