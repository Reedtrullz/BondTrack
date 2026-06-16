import { test, expect } from "./fixtures";

const MOCK_ADDRESS = "thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz";

test.describe("Portfolio Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Midgard API endpoints
    await page.route("**/api/midgard/**", async (route) => {
      const url = new URL(route.request().url());
      
      // Mock bonds endpoint (used by getBondDetails)
      if (url.pathname.startsWith("/api/midgard/v2/bonds/")) {
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
      if (url.pathname === `/api/midgard/v2/member/${MOCK_ADDRESS}`) {
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
      if (url.pathname === "/api/midgard/v2/history/earnings") {
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

      if (url.pathname === "/api/midgard/v2/history/rune") {
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
      if (url.pathname === "/api/midgard/v2/network") {
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
      if (url.pathname === "/api/midgard/v2/health") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            lastThorNode: { height: 1000 }
          })
        });
        return;
      }

      if (url.pathname.startsWith("/api/midgard/v2/thorname/rlookup/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ entry: null })
        });
        return;
      }
      
      // Mock pools endpoint
      if (url.pathname === "/api/midgard/v2/pools") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([])
        });
        return;
      }
      
      // Mock actions endpoint
      if (url.pathname === "/api/midgard/v2/actions") {
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
        body: JSON.stringify({ error: `Unhandled Midgard mock: ${url.pathname}` })
      });
    });

    // Mock CoinAPI/RUNE price
    await page.route("**/api/coinapi/**", async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname !== "/api/coinapi/rune-price") {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: `Unhandled CoinAPI mock: ${url.pathname}` })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ price: 1.50 })
      });
    });

    // Mock THORNode API
    await page.route("**/api/thorchain/**", async (route) => {
      const url = new URL(route.request().url());
      
      if (url.pathname === "/api/thorchain/thorchain/nodes") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([])
        });
        return;
      }

      if (url.pathname === "/api/thorchain/thorchain/constants") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            int_64_values: { MaxBondProviders: 100 },
            bool_values: {},
            string_values: {}
          })
        });
        return;
      }

      if (url.pathname === "/api/thorchain/thorchain/version") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ current: "3.19.0", next: "3.19.0", querier: "3.19.0" })
        });
        return;
      }
      
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: `Unhandled THORChain mock: ${url.pathname}` })
      });
    });

    await page.goto(`/dashboard/portfolio?address=${MOCK_ADDRESS}`);
  });

  test("displays portfolio summary", async ({ page }) => {
    const totalBondedSummary = page.getByRole("group", { name: "Total Bonded summary" });

    await expect(totalBondedSummary).toBeVisible({ timeout: 10000 });
    await expect(totalBondedSummary).toContainText("Total Bonded");
    await expect(totalBondedSummary).toContainText(/\u16B10.00/);
  });
  
  test("displays bond positions section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "No Bonded Positions", exact: true })).toBeVisible();
  });

  test("keeps simulator diagnosis and assumptions before raw inputs", async ({ page }) => {
    await page.goto(`/dashboard/simulator?address=${MOCK_ADDRESS}`);

    const diagnosis = page.getByLabel("Simulator scenario diagnosis");
    await expect(diagnosis).toContainText("Rewards-only projection", { timeout: 10000 });
    await expect(diagnosis).toContainText("Verify node risk before bonding");
    await expect(page.getByLabel("Simulation assumptions")).toContainText("Risk coverage");

    const diagnosisBeforeInput = await diagnosis.evaluate((element) => {
      const firstInput = document.querySelector("#simulator-bond-amount");
      return Boolean(
        firstInput
        && (element.compareDocumentPosition(firstInput) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    });
    expect(diagnosisBeforeInput).toBe(true);
  });
});
