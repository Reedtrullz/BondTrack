import { test, expect } from "./fixtures";

const MOCK_ADDRESS = "thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

test.describe("Portfolio Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Midgard API endpoints
    await page.route("**/api/midgard/**", async (route) => {
      const url = route.request().url();
      
      // Mock bonds endpoint (used by getBondDetails)
      if (url.includes("/bonds/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            nodes: [
              {
                nodeAddress: "thor1node123456789",
                bond: "100000000000",
                status: "Active"
              }
            ],
            totalBonded: "100000000000"
          })
        });
        return;
      }
      
      // Mock member endpoint  
      if (url.includes("/member/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            pools: [],
            runeAddress: MOCK_ADDRESS
          })
        });
        return;
      }
      
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

      if (url.includes("/history/rune")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            meta: {
              startTime: "1699990000000000000",
              endTime: "1700010000000000000",
              startRunePriceUSD: "1.50",
              endRunePriceUSD: "1.50"
            },
            intervals: [
              {
                startTime: "1699990000000000000",
                endTime: "1700010000000000000",
                runePriceUSD: "1.50"
              }
            ]
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
            totalReserve: "20000000000",
            activeNodeCount: "50",
            standbyNodeCount: "10",
            bondMetrics: {
              totalActiveBond: "50000000000",
              averageActiveBond: "1000000000"
            }
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

      if (url.includes("/thorname/rlookup/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ entry: null })
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
      
      // Mock actions endpoint
      if (url.includes("/actions")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ actions: [] })
        });
        return;
      }
      
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: `Unhandled Midgard mock: ${new URL(url).pathname}` })
      });
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

      if (url.includes("/constants")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            int_64_values: { OptimalBondD: 2500000000000 },
            bool_values: {},
            string_values: {}
          })
        });
        return;
      }
      
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: `Unhandled THORChain mock: ${new URL(url).pathname}` })
      });
    });

    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);
  });

  test("displays portfolio summary", async ({ page }) => {
    // Wait for the page to load with mocked data
    await expect(page.getByText("Total Bonded").first()).toBeVisible({ timeout: 10000 });
  });
  
  test("displays bond positions section", async ({ page }) => {
    await expect(page.getByText("Bond Positions").first()).toBeVisible({ timeout: 10000 });
  });
});
