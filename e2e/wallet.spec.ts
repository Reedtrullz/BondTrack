import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const MOCK_ADDRESS = 'thor1test123456789abcdefghijklmnop';

async function clickWalletButton(page: Page) {
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const walletBtn = buttons.find(b => b.textContent?.includes('Connect Wallet'));
    if (walletBtn) {
      (walletBtn as HTMLElement).click();
    }
  });
  await page.waitForTimeout(500);
}

async function clickWalletOption(page: Page, name: string) {
  await page.evaluate((optionName) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const optionBtn = buttons.find(b => b.textContent?.includes(optionName));
    if (optionBtn) {
      (optionBtn as HTMLElement).click();
    }
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
      (window as unknown as Record<string, unknown>).keplr = {
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
      (window as unknown as Record<string, unknown>).keplr = {
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
      (window as unknown as Record<string, unknown>).keplr = {
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
    await page.getByRole('button', { name: 'Disconnect' }).first().click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Connect Wallet' }).first()).toBeVisible();
  });

  test('connects successfully with mocked XDEFI', async ({ page, context }) => {
    const mockAddress = 'thor1mockaddress123456789abcdefghijk';
    await context.addInitScript((address) => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; },
        writable: true,
      });
      (window as unknown as Record<string, unknown>).xfi = {
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
      (window as unknown as Record<string, unknown>).vultisig = {
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
      (window as unknown as Record<string, unknown>).keplr = {
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
      (window as unknown as Record<string, unknown>).xfi = {
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
      (window as unknown as Record<string, unknown>).vultisig = {
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
