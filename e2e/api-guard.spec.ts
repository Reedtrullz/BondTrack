import { expect, test } from './fixtures';
import { DEFAULT_DASHBOARD_ADDRESS, mockDashboardApis } from './helpers/dashboard-api-mocks';

test.describe('E2E API guard', () => {
  test('fails closed on unallowlisted same-origin API errors', async ({ page }) => {
    await page.route('**/api/__guard_probe', async (route) => {
      await route.fulfill({ status: 503, json: { error: 'guard probe' } });
    });

    await page.goto('/');
    const probe = await page.evaluate(async () => {
      const response = await fetch('/api/__guard_probe');
      return { body: await response.json(), status: response.status };
    });

    expect(probe).toEqual({ body: { error: 'guard probe' }, status: 503 });
    test.fail(true, 'The shared fixture should fail this test after an unallowlisted /api response.');
  });

  test('does not let string allowlists match sibling API paths', async ({ page, allowApiErrors }) => {
    allowApiErrors(['/api/tax-report']);

    await page.route('**/api/tax-report-extra', async (route) => {
      await route.fulfill({ status: 503, json: { error: 'wrong sibling path' } });
    });

    await page.goto('/');
    const probe = await page.evaluate(async () => {
      const response = await fetch('/api/tax-report-extra');
      return { body: await response.json(), status: response.status };
    });

    expect(probe).toEqual({ body: { error: 'wrong sibling path' }, status: 503 });
    test.fail(true, 'The exact string allowlist must not cover /api/tax-report-extra.');
  });

  test('mockDashboardApis fails closed for unhandled CoinAPI paths', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto('/');
    const probe = await page.evaluate(async () => {
      const response = await fetch('/api/coinapi/not-real');
      return { body: await response.json(), status: response.status };
    });

    expect(probe).toEqual({
      body: { error: 'Unhandled CoinAPI mock: /api/coinapi/not-real' },
      status: 404,
    });
    test.fail(true, 'Unhandled CoinAPI helper paths should return a failing same-origin API response.');
  });

  test('mockDashboardApis fails closed for unhandled THORChain paths', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto('/');
    const probe = await page.evaluate(async () => {
      const response = await fetch('/api/thorchain/not-real');
      return { body: await response.json(), status: response.status };
    });

    expect(probe).toEqual({
      body: { error: 'Unhandled THORChain mock: /api/thorchain/not-real' },
      status: 404,
    });
    test.fail(true, 'Unhandled THORChain helper paths should return a failing same-origin API response.');
  });

  test('mockDashboardApis fails closed for unhandled Midgard paths', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto('/');
    const probe = await page.evaluate(async () => {
      const response = await fetch('/api/midgard/not-real');
      return { body: await response.json(), status: response.status };
    });

    expect(probe).toEqual({
      body: { error: 'Unhandled Midgard mock: /api/midgard/not-real' },
      status: 404,
    });
    test.fail(true, 'Unhandled Midgard helper paths should return a failing same-origin API response.');
  });

  test('mockDashboardApis fails closed for unhandled CoinGecko paths', async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
    await page.goto('/');
    const probe = await page.evaluate(async () => {
      const response = await fetch('/api/coingecko/not-real');
      return { body: await response.json(), status: response.status };
    });

    expect(probe).toEqual({
      body: { error: 'Unhandled CoinGecko mock: /api/coingecko/not-real' },
      status: 404,
    });
    test.fail(true, 'Unhandled CoinGecko helper paths should return a failing same-origin API response.');
  });
});
