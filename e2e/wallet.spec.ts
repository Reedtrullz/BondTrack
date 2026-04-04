import { test, expect } from '@playwright/test';

const MOCK_ADDRESS = 'thor1test123456789abcdefghijklmnop';

async function clickWalletButton(page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const walletBtn = buttons.find(b => b.textContent.includes('Connect Wallet'));
    if (walletBtn) walletBtn.click();
  });
  await page.waitForTimeout(500);
}

async function clickWalletOption(page, name) {
  await page.evaluate((walletName) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const option = buttons.find(b => b.textContent.includes(walletName));
    if (option) {
      option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  }, name);
  await page.waitForTimeout(500);
}

async function clickDropdownItem(page, name) {
  await page.evaluate((n) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes(n));
    if (btn) btn.click();
  }, name);
  await page.waitForTimeout(500);
}

test.describe('Wallet Connection', () => {
  test('shows connect wallet button when disconnected', async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
    });
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await expect(page.getByRole('button', { name: 'Connect Wallet' }).first()).toBeVisible();
  });

  test('shows dropdown with all wallet options', async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
    });
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await clickWalletButton(page);
    await expect(page.getByText('Select wallet')).toBeVisible();
    await expect(page.getByText('Keplr Wallet')).toBeVisible();
    await expect(page.getByText('XDEFI Wallet')).toBeVisible();
    await expect(page.getByText('Vultisig Wallet')).toBeVisible();
  });

  test('displays error message on connection failure', async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
      (window as any).keplr = {
        enable: async () => { throw new Error('User rejected'); },
      };
    });
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await clickWalletButton(page);
    await clickWalletOption(page, 'Keplr Wallet');
    await page.waitForTimeout(2000);
    const hasError = await page.evaluate(() => {
      return document.body.textContent?.includes('rejected') || false;
    });
    expect(hasError).toBe(true);
  });

  test('connects successfully with mocked Keplr', async ({ page, context }) => {
    const mockAddress = 'thor1mockaddress123456789abcdefghijk';
    await context.addInitScript((address) => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
      (window as any).keplr = {
        enable: async () => {},
        getChainId: async () => 'thorchain-mainnet-v1',
        getKey: async () => ({ bech32Address: address }),
      };
    }, mockAddress);
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await clickWalletButton(page);
    await clickWalletOption(page, 'Keplr Wallet');
    await expect(page.locator(`text=${mockAddress.slice(0, 6)}`)).toBeVisible({ timeout: 5000 });
  });

  test('disconnect clears connection state', async ({ page, context }) => {
    const mockAddress = 'thor1mockaddress123456789abcdefghijk';
    await context.addInitScript((address) => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
      (window as any).keplr = {
        enable: async () => {},
        getChainId: async () => 'thorchain-mainnet-v1',
        getKey: async () => ({ bech32Address: address }),
        disable: async () => {},
      };
    }, mockAddress);
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await clickWalletButton(page);
    await clickWalletOption(page, 'Keplr Wallet');
    await expect(page.locator(`text=${mockAddress.slice(0, 6)}`)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const disconnectBtn = buttons.find(b => b.textContent.includes('Disconnect'));
      if (disconnectBtn) disconnectBtn.click();
    });
    await page.waitForTimeout(1000);
    const hasConnectBtn = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Connect Wallet'));
    });
    expect(hasConnectBtn).toBe(true);
  });

  test('connects successfully with mocked XDEFI', async ({ page, context }) => {
    const mockAddress = 'thor1mockaddress123456789abcdefghijk';
    await context.addInitScript((address) => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
      (window as any).xfi = {
        thorchain: {
          request: async ({ method }: { method: string }) => {
            if (method === 'connect') return address;
            return null;
          },
        },
      };
    }, mockAddress);
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await clickWalletButton(page);
    await clickWalletOption(page, 'XDEFI Wallet');
    await expect(page.locator(`text=${mockAddress.slice(0, 6)}`)).toBeVisible({ timeout: 5000 });
  });

  test('connects successfully with mocked Vultisig', async ({ page, context }) => {
    const mockAddress = 'thor1mockaddress123456789abcdefghijk';
    await context.addInitScript((address) => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
      (window as any).vultisig = {
        thorchain: {
          request: async ({ method }: { method: string }) => {
            if (method === 'connect') return address;
            return null;
          },
        },
      };
    }, mockAddress);
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await clickWalletButton(page);
    await clickWalletOption(page, 'Vultisig Wallet');
    await expect(page.locator(`text=${mockAddress.slice(0, 6)}`)).toBeVisible({ timeout: 5000 });
  });

  test('shows correct wallet name when connected with Keplr', async ({ page, context }) => {
    const mockAddress = 'thor1mockaddress123456789abcdefghijk';
    await context.addInitScript((address) => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
      (window as any).keplr = {
        enable: async () => {},
        getChainId: async () => 'thorchain-mainnet-v1',
        getKey: async () => ({ bech32Address: address }),
      };
    }, mockAddress);
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await clickWalletButton(page);
    await clickWalletOption(page, 'Keplr Wallet');
    await expect(page.locator(`text=${mockAddress.slice(0, 6)}`)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('...'));
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    const hasKeplrText = await page.evaluate(() => {
      return document.body.textContent?.includes('Keplr') || false;
    });
    expect(hasKeplrText).toBe(true);
  });

  test('shows correct wallet name when connected with XDEFI', async ({ page, context }) => {
    const mockAddress = 'thor1mockaddress123456789abcdefghijk';
    await context.addInitScript((address) => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
      (window as any).xfi = {
        thorchain: {
          request: async ({ method }: { method: string }) => {
            if (method === 'connect') return address;
            return null;
          },
        },
      };
    }, mockAddress);
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await clickWalletButton(page);
    await clickWalletOption(page, 'XDEFI Wallet');
    await expect(page.locator(`text=${mockAddress.slice(0, 6)}`)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('...'));
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    const hasXdefiText = await page.evaluate(() => {
      return document.body.textContent?.includes('XDEFI') || false;
    });
    expect(hasXdefiText).toBe(true);
  });

  test('shows correct wallet name when connected with Vultisig', async ({ page, context }) => {
    const mockAddress = 'thor1mockaddress123456789abcdefghijk';
    await context.addInitScript((address) => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
      (window as any).vultisig = {
        thorchain: {
          request: async ({ method }: { method: string }) => {
            if (method === 'connect') return address;
            return null;
          },
        },
      };
    }, mockAddress);
    await page.goto(`/dashboard/overview?address=${MOCK_ADDRESS}`);
    await clickWalletButton(page);
    await clickWalletOption(page, 'Vultisig Wallet');
    await expect(page.locator(`text=${mockAddress.slice(0, 6)}`)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('...'));
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    const hasVultisigText = await page.evaluate(() => {
      return document.body.textContent?.includes('Vultisig') || false;
    });
    expect(hasVultisigText).toBe(true);
  });
});
