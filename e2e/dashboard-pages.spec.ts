import { test, expect } from "@playwright/test";

const MOCK_ADDRESS = "thor1test123456789abcdefghijklmnop";

test.describe("Portfolio Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Midgard API endpoints
    await page.route("**/api/midgard/**", async (route) => {
      const url = route.request().url();
      
      // Mock earnings endpoint
      if (url.includes("/history/earnings")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            intervals: [],
            summary: { totalFees: "0", bondRewards: "0", poolRewards: "0" }
          })
        });
        return;
      }
      
      // Mock bonds endpoint
      if (url.includes("/bonds/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            pools: [],
            bondAmount: "0",
            bondShare: "0"
          })
        });
        return;
      }
      
      // Mock network endpoint
      if (url.includes("/network")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            totalPooledRune: "100000000000",
            totalBond: "50000000000",
            totalReserve: "20000000000"
          })
        });
        return;
      }
      
      // Mock health endpoint
      if (url.includes("/health")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            lastThorNode: { height: 1000 }
          })
        });
        return;
      }
      
      // Mock pools endpoint
      if (url.includes("/pools")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([])
        });
        return;
      }
      
      // Default: pass through
      await route.continue();
    });

    // Mock CoinAPI/RUNE price
    await page.route("**/api/coinapi/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ price: 1.50 })
      });
    });

    // Mock THORNode API
    await page.route("**/api/thorchain/**", async (route) => {
      const url = route.request().url();
      
      if (url.includes("/nodes")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([])
        });
        return;
      }
      
      await route.continue();
    });

    await page.goto("/dashboard/portfolio?address=" + MOCK_ADDRESS);
  });

  test("displays portfolio summary", async ({ page }) => {
    await expect(page.getByText("Total Bonded")).toBeVisible();
  });
});
