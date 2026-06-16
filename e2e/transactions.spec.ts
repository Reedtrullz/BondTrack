import { test, expect, type Page } from './fixtures';

const MOCK_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';
const MOCK_NODE = 'thor1qyqszqgpqyqszqgpqyqszqgpqyqszqgp55c9cr';
const WATCHLIST_ADDRESS = 'thor1xekke0x6qu8w7vyhxy99puzu049d3k0pexpr30';
const MOCK_THORNODE_NODES = [
  {
    node_address: MOCK_NODE,
    status: 'Active',
    total_bond: '1000000000000',
    bond_providers: {
      providers: [],
    },
    slash_points: 0,
  },
];

type ElementBox = { x: number; y: number; width: number; height: number } | null;

function boxesIntersect(a: ElementBox, b: ElementBox) {
  return Boolean(
    a &&
      b &&
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
  );
}

async function setupTransactionApiMocks(page: Page) {
  await page.route('**/api/thorchain/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/thorchain/thorchain/nodes') {
      await route.fulfill({ json: MOCK_THORNODE_NODES });
      return;
    }

    if (url.pathname === '/api/thorchain/thorchain/constants') {
      await route.fulfill({
        json: {
          int_64_values: { MaxBondProviders: 100 },
          bool_values: {},
          string_values: {},
        },
      });
      return;
    }

    if (url.pathname === '/api/thorchain/thorchain/version') {
      await route.fulfill({ json: { current: '3.19.0', next: '3.19.0', querier: '3.19.0' } });
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

async function openBondHistoryTab(page: Page) {
  const contextPanel = page.getByLabel('Dashboard address context');

  await expect(contextPanel.getByRole('button', {
    name: `Open dashboard for watched address ${WATCHLIST_ADDRESS}`,
    exact: true,
  })).toBeVisible();

  const historyTab = contextPanel.getByRole('tab', { name: 'Bond history' });
  await expect(historyTab).toBeVisible();
  await expect(historyTab).toBeEnabled();
  await historyTab.click();
  await expect(historyTab).toHaveAttribute('aria-selected', 'true');
  await expect(contextPanel.getByRole('textbox', { name: 'Transaction history address' })).toBeVisible();

  return contextPanel;
}

test.describe('Transaction Composer', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupTransactionApiMocks(page);
    await context.addInitScript((watchlistAddress) => {
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
      window.localStorage.setItem('heimdall-watchlist', JSON.stringify([
        watchlistAddress,
      ]));
    }, WATCHLIST_ADDRESS);
    await page.goto(`/dashboard/transactions?address=${MOCK_ADDRESS}`);
  });

  test('displays BOND and UNBOND mode buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'BOND', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'UNBOND', exact: true })).toBeVisible();
  });

  test('shows transaction safety preflight before the composer', async ({ page }) => {
    const preflight = page.getByLabel('Transaction safety preflight');

    await expect(preflight).toBeVisible();
    await expect(preflight.getByRole('heading', { name: 'Prepare memo first' })).toBeVisible();
    await expect(preflight).toContainText('Memo copy can be prepared without a wallet');
    await expect(preflight).toContainText('Mode');
    await expect(preflight).toContainText('BOND');
    await expect(preflight).toContainText('Wallet');
    await expect(preflight).toContainText('Not connected');
    await expect(preflight).toContainText('Dashboard address');
    await expect(preflight).toContainText('Used only for watched positions and history context');
    await expect(preflight.getByRole('link', { name: 'Open composer' })).toHaveAttribute('href', '#transaction-composer');

    const layout = await page.evaluate(() => {
      const box = (element: Element | null) => {
        const rect = element?.getBoundingClientRect();
        return rect
          ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
          : null;
      };

      return {
        viewportHeight: window.innerHeight,
        preflight: box(document.querySelector('section[aria-label="Transaction safety preflight"]')),
        composer: box(document.querySelector('section[aria-label="Transaction composer"]')),
      };
    });

    expect(layout.preflight).not.toBeNull();
    expect(layout.composer).not.toBeNull();
    expect(layout.preflight!.top).toBeLessThan(layout.composer!.top);
    expect(layout.composer!.top).toBeLessThan(layout.viewportHeight);
  });

  test('keeps mobile transaction preflight and composer entry in the first viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.reload();

    const preflight = page.getByLabel('Transaction safety preflight');
    const sourceConfidence = page.getByRole('region', { name: 'Source confidence' });
    await expect(preflight).toBeVisible();
    await expect(sourceConfidence).toBeVisible();
    await expect(page.getByLabel('Transaction composer')).toBeVisible();
    await expect(preflight.getByRole('link', { name: 'Open composer' })).toBeVisible();

    const layout = await page.evaluate(() => {
      const box = (element: Element | null) => {
        const rect = element?.getBoundingClientRect();
        return rect
          ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
          : null;
      };

      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        title: box(document.querySelector('h1')),
        preflight: box(document.querySelector('section[aria-label="Transaction safety preflight"]')),
        sourceConfidence: box(document.querySelector('section[aria-label="Source confidence"]')),
        composerEntry: box(document.querySelector('section[aria-label="Transaction safety preflight"] a[href="#transaction-composer"]')),
        composer: box(document.querySelector('section[aria-label="Transaction composer"]')),
        context: box(document.querySelector('aside[aria-label="Dashboard address context"]')),
      };
    });

    expect(layout.title).not.toBeNull();
    expect(layout.preflight).not.toBeNull();
    expect(layout.sourceConfidence).not.toBeNull();
    expect(layout.composerEntry).not.toBeNull();
    expect(layout.composer).not.toBeNull();
    expect(layout.context).not.toBeNull();
    expect(layout.preflight!.top).toBeGreaterThan(layout.title!.top);
    expect(layout.preflight!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.sourceConfidence!.top).toBeGreaterThan(layout.preflight!.top);
    expect(layout.sourceConfidence!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.composerEntry!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.composer!.top).toBeGreaterThan(layout.sourceConfidence!.top);
    expect(layout.context!.top).toBeGreaterThan(layout.composer!.top);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  });

  test('warns before UNBOND when no standby node is eligible', async ({ page }) => {
    await page.goto(`/dashboard/transactions?address=${MOCK_ADDRESS}&action=unbond`);

    const preflight = page.getByLabel('Transaction safety preflight');
    await expect(preflight.getByRole('heading', { name: 'No eligible standby node' })).toBeVisible();
    await expect(preflight).toContainText('UNBOND can only proceed from a standby node');
    await expect(preflight).toContainText('UNBOND eligibility');
    await expect(preflight).toContainText('0 standby');
    await expect(preflight).toContainText('Uses a zero-RUNE deposit; amount is encoded in memo base units.');
  });

  test('labels saved addresses as dashboard context, not transaction node inputs', async ({ page }) => {
    const contextPanel = page.getByLabel('Dashboard address context');

    await expect(contextPanel).toBeVisible();
    await expect(contextPanel.getByRole('heading', { name: 'Dashboard address context' })).toBeVisible();
    await expect(contextPanel.getByText('They never fill the BOND/UNBOND node field or memo.')).toBeVisible();
    await expect(contextPanel.getByRole('heading', { name: 'Watched dashboard addresses' })).toBeVisible();
    await expect(contextPanel.getByRole('button', {
      name: `Open dashboard for watched address ${WATCHLIST_ADDRESS}`,
      exact: true,
    })).toBeVisible();
  });

  test('shows Midgard provenance and recent-action scope for bond history', async ({ page }) => {
    const contextPanel = await openBondHistoryTab(page);
    const source = contextPanel.getByLabel('Transaction history source');

    await expect(source).toBeVisible();
    await expect(source).toContainText('Midgard actions');
    await expect(source).toContainText('Shows up to 50 recent Midgard actions and filters to BOND/UNBOND.');
    await expect(source).toContainText('Empty results do not prove older history is absent.');
    await expect(source).toContainText('No matching recent actions returned.');
    await expect(contextPanel).toContainText('No recent BOND/UNBOND actions returned by Midgard for this address');
    await expect(contextPanel).not.toContainText('No BOND/UNBOND transactions found for this address');
  });

  test('labels transaction history amounts with RUNE units', async ({ page }) => {
    await page.route('**/api/midgard/v2/actions**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname !== '/api/midgard/v2/actions') {
        await route.fulfill({ status: 404, json: { error: `Unhandled Midgard actions mock: ${url.pathname}` } });
        return;
      }

      await route.fulfill({
        json: {
          actions: [
            {
              type: 'refund',
              date: '1711860190834567113',
              height: '15341504',
              pools: [],
              memo: '',
              tx: {
                type: 'transfer',
                address: MOCK_ADDRESS,
                coins: [],
                txID: '',
                chain: 'THOR',
                fromAddress: MOCK_ADDRESS,
              },
              status: 'success',
              in: [
                {
                  address: MOCK_ADDRESS,
                  coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
                  txID: '26DC514825C9288925A5CE8C98B159278F94865766425DFDAA07FD19E7574F47',
                },
              ],
              out: [],
              metadata: {
                refund: {
                  memo: `BOND:${MOCK_NODE}`,
                  txType: 'bond',
                  reason: 'mock bond history',
                },
              },
            },
          ],
          count: '1',
        },
      });
    });

    await page.reload();
    const contextPanel = await openBondHistoryTab(page);
    await expect(contextPanel.locator('td').filter({ hasText: '100.00 RUNE' })).toBeVisible();
    await expect(contextPanel.getByText('100.00', { exact: true })).toHaveCount(0);
  });

  test('rejects malformed transaction history lookups before querying Midgard', async ({ page }) => {
    const malformedHistoryRequests: string[] = [];

    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        url.pathname === '/api/midgard/v2/actions' &&
        url.searchParams.get('address') === 'not-a-thor-address'
      ) {
        malformedHistoryRequests.push(request.url());
      }
    });

    await openBondHistoryTab(page);

    const historyInput = page.getByRole('textbox', { name: 'Transaction history address' });
    await historyInput.fill('not-a-thor-address');
    await page.getByRole('button', { name: 'Search transaction history' }).click();

    await expect(page.locator('#transaction-history-address-error')).toContainText(
      'Enter a valid THORChain address before loading history.'
    );
    await expect(historyInput).toHaveAttribute('aria-invalid', 'true');
    expect(malformedHistoryRequests).toEqual([]);
  });

  test('defaults to BOND mode', async ({ page }) => {
    const bondButton = page.getByRole('button', { name: 'BOND', exact: true });
    await expect(bondButton).toHaveClass(/bg-emerald-600/);
  });

  test('does not show validation errors before composer interaction', async ({ page }) => {
    await expect(page.getByText('Node address must be a valid THORChain address')).toBeHidden();
    await expect(page.getByText('Amount must be a positive RUNE value with up to 8 decimals')).toBeHidden();
  });

  test('keeps incomplete memo copy disabled before the node address is valid', async ({ page }) => {
    await expect(page.locator('code')).toHaveText('Enter a valid node address before copying a BOND memo.');
    await expect(page.locator('code')).not.toHaveText('BOND:');
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Copy Memo' })).toBeDisabled();
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

  test('keeps UNBOND memo copy disabled without an eligible bonded node', async ({ page }) => {
    await page.getByRole('button', { name: 'UNBOND', exact: true }).click();
    await page.getByLabel('Node Address').fill(MOCK_NODE);
    await page.getByLabel('Amount to Unbond').fill('10');

    await expect(page.locator('code')).toHaveText('Select an eligible standby node and valid amount before copying an UNBOND memo.');
    await expect(page.getByRole('button', { name: 'Copy Memo' })).toBeDisabled();
  });

  test('copy memo button copies the generated memo and shows success feedback', async ({ page }) => {
    const generatedMemo = `BOND:${MOCK_NODE}`;
    const composer = page.getByLabel('Transaction composer');
    const memo = composer.locator('code');

    await composer.getByLabel('Node Address').fill(MOCK_NODE);
    await expect(memo).toHaveText(generatedMemo);

    const copyMemoButton = composer.getByRole('button', { name: 'Copy Memo', exact: true });
    await expect(copyMemoButton).toBeEnabled();
    await copyMemoButton.click();
    await expect(composer.getByRole('button', { name: 'Memo copied', exact: true })).toBeVisible();
    await expect(composer.locator('#transaction-copy-feedback')).toContainText('Success!');
    await expect(composer.getByText(/Memo copied to your clipboard/i)).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as Window & { __copiedMemoText?: string }).__copiedMemoText)).toBe(generatedMemo);
  });

  test('copy memo failure stays inline and does not pollute the browser console', async ({ page }) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async () => {
            throw new Error('clipboard unavailable');
          },
        },
        configurable: true,
      });
    });
    await page.getByLabel('Node Address').fill(MOCK_NODE);

    await page.getByRole('button', { name: 'Copy Memo' }).click();

    await expect(page.getByRole('button', { name: 'Copy failed' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Copy Failed' })).toBeVisible();
    await expect(page.getByText('Copy failed. Select the memo above and copy it manually.')).toBeVisible();
  });

  test('shows the wallet-required composer blocker when disconnected', async ({ page }) => {
    await page.goto(`/dashboard/transactions?address=${MOCK_ADDRESS}&action=bond&node=${MOCK_NODE}&amount=2`);

    const composer = page.getByLabel('Transaction composer');
    const walletRequired = composer.getByRole('button', { name: 'Wallet required' });

    await expect(page.getByTestId('wallet-connect-button')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Connect Wallet' })).toHaveCount(1);
    await expect(composer.getByRole('button', { name: 'Connect Wallet' })).toHaveCount(0);
    await expect(composer.locator('code')).toHaveText(`BOND:${MOCK_NODE}`);
    await expect(composer.getByRole('button', { name: 'Copy Memo' })).toBeEnabled();
    await expect(walletRequired).toBeVisible();
    await expect(walletRequired).toBeDisabled();
    await expect(walletRequired).toHaveAccessibleDescription(
      'Connect a wallet when you are ready to preview and broadcast. Memo copy is available without a wallet.'
    );
  });

  test('shows payload minimum and wallet-confirmed fee copy without a fixed reserve', async ({ page }) => {
    await expect(page.getByText('Bond payload minimum:')).toBeVisible();
    await expect(page.getByText('1 RUNE')).toBeVisible();
    await expect(page.getByText('Network fees are dynamic and confirmed by the wallet before broadcast.')).toBeVisible();
    await expect(page.getByText('Minimum bond transaction reserve:')).toHaveCount(0);
    await expect(page.getByText('1.02 RUNE')).toHaveCount(0);
  });

  test('keeps mobile compact alerts off transaction action buttons', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate((address) => {
      const now = Date.now();
      localStorage.setItem('heimdall-alerts', JSON.stringify({
        alerts: [
          {
            id: 'mobile-slash-alert',
            type: 'SLASH_INCREASE',
            nodeAddress: 'thor1nodealertmobile00000000000000000000',
            message: 'Node thor1nodealert... slashed: +4 points',
            timestamp: now,
            dismissed: false,
          },
          {
            id: 'mobile-jail-alert',
            type: 'JAIL',
            nodeAddress: 'thor1nodejailmobile000000000000000000000',
            message: 'Node thor1nodejail... has been jailed: missed observation',
            timestamp: now - 60_000,
            dismissed: false,
          },
        ],
        preferences: {
          slashAlerts: true,
          jailAlerts: true,
          churnAlerts: true,
          statusAlerts: true,
        },
      }));
      localStorage.setItem('BONDTRACK_ADDRESS', address);
    }, MOCK_ADDRESS);

    await page.reload();

    const reviewTrigger = page.getByTestId('node-alert-review-trigger');
    const composer = page.getByLabel('Transaction composer');
    const copyMemoButton = composer.getByRole('button', { name: 'Copy Memo' });
    const walletRequiredButton = composer.getByRole('button', { name: 'Wallet required' });
    await expect(page.getByTestId('node-alert-toast-region')).toHaveCount(0);
    await expect(reviewTrigger).toBeVisible();
    await expect(reviewTrigger).toHaveAttribute('data-placement', 'header-action');
    await expect(walletRequiredButton).toBeVisible();

    const triggerBox = await reviewTrigger.boundingBox();
    const copyMemoBox = await copyMemoButton.boundingBox();
    const walletRequiredBox = await walletRequiredButton.boundingBox();

    expect(boxesIntersect(triggerBox, copyMemoBox)).toBe(false);
    expect(boxesIntersect(triggerBox, walletRequiredBox)).toBe(false);
    expect(triggerBox?.width ?? 0).toBeGreaterThanOrEqual(40);
    expect(triggerBox?.height ?? 0).toBeGreaterThanOrEqual(40);

    await reviewTrigger.click();
    const toastRegion = page.getByTestId('node-alert-toast-region');
    await expect(toastRegion).toBeVisible();
    await expect(toastRegion).toHaveAttribute('data-state', 'expanded');
    await expect(toastRegion).toHaveAttribute('data-placement', 'inspection-panel');
    await expect(toastRegion.getByRole('link', {
      name: 'Inspect risk context for Node thor1nodealert... slashed: +4 points',
      exact: true,
    })).toBeVisible();
    await expect(toastRegion.getByRole('link', {
      name: 'Inspect risk context for Node thor1nodejail... has been jailed: missed observation',
      exact: true,
    })).toBeVisible();

    const panelBox = await toastRegion.boundingBox();
    const expandedCopyMemoBox = await copyMemoButton.boundingBox();
    const expandedWalletRequiredBox = await walletRequiredButton.boundingBox();
    const panelPosition = await toastRegion.evaluate((element) => getComputedStyle(element).position);

    expect(boxesIntersect(panelBox, expandedCopyMemoBox)).toBe(false);
    expect(boxesIntersect(panelBox, expandedWalletRequiredBox)).toBe(false);
    expect(panelPosition).toBe('static');
  });

  test('shows wallet-confirmed network fee copy in transaction preview', async ({ page, context }) => {
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
    await page.getByRole('button', { name: 'Review Transaction' }).click();

    await expect(page.getByText('Network Fee', { exact: true })).toBeVisible();
    await expect(page.getByText('Confirmed by wallet/network before broadcast')).toBeVisible();
    await expect(page.getByText('THORChain deposit transaction')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm & Broadcast' })).toBeVisible();
  });

  test('updates transaction preflight after wallet connection', async ({ page, context }) => {
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).keplr = {
        enable: async () => {},
        getChainId: async () => 'thorchain-1',
        getKey: async () => ({ bech32Address: address }),
      };
    }, MOCK_ADDRESS);

    await page.reload();
    await connectMockKeplr(page);

    const preflight = page.getByLabel('Transaction safety preflight');
    await expect(preflight.getByRole('heading', { name: 'Ready to preview' })).toBeVisible();
    await expect(preflight).toContainText('KEPLR connected for preview');
  });

  test('fails closed when /api/thorchain/thorchain/nodes is unavailable during transaction prep', async ({ page, context, allowApiErrors }) => {
    allowApiErrors(['/api/thorchain/thorchain/nodes']);
    await page.route('**/api/thorchain/thorchain/nodes', async (route) => {
      await route.fulfill({
        status: 502,
        json: { error: 'mock THORNode /nodes outage' },
      });
    });
    await context.addInitScript((address) => {
      (window as unknown as Record<string, unknown>).keplr = {
        enable: async () => {},
        getChainId: async () => 'thorchain-1',
        getKey: async () => ({ bech32Address: address }),
      };
    }, MOCK_ADDRESS);

    await page.reload();
    await connectMockKeplr(page);

    const preflight = page.getByLabel('Transaction safety preflight');
    const composer = page.getByLabel('Transaction composer');
    await expect(preflight.getByRole('heading', {
      name: 'Eligibility unavailable',
      exact: true,
    })).toBeVisible({ timeout: 30000 });
    await expect(preflight).toContainText('Source confidence');
    await expect(preflight).toContainText('THORNode positions failed to load. Do not copy, preview, or broadcast until source confidence is fresh.');
    await expect(preflight).toContainText('Source unavailable');
    await expect(preflight).toContainText('THORNode');

    await composer.getByLabel('Node Address').fill(MOCK_NODE);
    await composer.getByLabel('Bond Amount').fill('10');

    await expect(composer.locator('code')).toHaveText('THORNode source confidence must be fresh before copying a BOND memo.');
    await expect(composer.getByText('BOND copy stays disabled until THORNode source confidence is fresh.')).toBeVisible();
    await expect(composer.getByRole('button', { name: 'Copy', exact: true })).toBeDisabled();
    await expect(composer.getByRole('button', { name: 'Copy Memo', exact: true })).toBeDisabled();
    await expect(composer.getByRole('button', { name: 'Review Transaction', exact: true })).toBeDisabled();
    await expect(composer.locator('#transaction-action-guidance')).toContainText('THORNode positions failed to load');
    await expect(page.getByRole('dialog', { name: 'Confirm Transaction' })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as Window & { __copiedMemoText?: string }).__copiedMemoText)).toBeUndefined();

    await page.goto(`/dashboard/transactions?address=${MOCK_ADDRESS}&action=unbond&node=${MOCK_NODE}&amount=10`);
    const unbondComposer = page.getByLabel('Transaction composer');
    await expect(unbondComposer.locator('code')).toHaveText('THORNode source confidence must be fresh before copying an UNBOND memo.');
    await expect(unbondComposer.getByText('UNBOND copy stays disabled until THORNode can prove standby eligibility.')).toBeVisible();
    await expect(unbondComposer.getByRole('button', { name: 'Copy Memo', exact: true })).toBeDisabled();
    await expect(unbondComposer.getByRole('button', { name: 'Review Transaction', exact: true })).toBeDisabled();
  });
});
