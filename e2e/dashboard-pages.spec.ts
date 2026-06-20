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
    await page.route("**/api/thorchain/thorchain/nodes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            node_address: "thor1simulatornode0000000000000000000000",
            status: "Active",
            pub_key_set: { secp256k1: "", ed25519: "" },
            validator_cons_pub_key: "",
            peer_id: "",
            active_block_height: 100,
            status_since: 100,
            node_operator_address: "thor1simulatoroperator000000000000000000",
            total_bond: "10000000000000",
            bond_providers: {
              node_operator_fee: "1000",
              providers: [{ bond_address: MOCK_ADDRESS, bond: "10000000000000" }],
            },
            signer_membership: null,
            requested_to_leave: false,
            forced_to_leave: false,
            leave_height: 0,
            ip_address: "",
            version: "3.19.0",
            slash_points: 0,
            jail: {},
            current_award: "0.12",
            observe_chains: null,
            preflight_status: { status: "ready", reason: "", code: 0 },
            maintenance: false,
            missing_blocks: 0,
          },
        ]),
      });
    });

    await page.goto(`/dashboard/simulator?address=${MOCK_ADDRESS}`);

    await expect(page.getByText("Model manual reward scenarios before separately reviewing node risk and wallet safety")).toBeVisible();
    await expect(page.getByText("Test bond strategies and preview the impact on your portfolio")).toHaveCount(0);
    const diagnosis = page.getByLabel("Simulator scenario diagnosis");
    await expect(diagnosis).toContainText("Manual Estimate", { timeout: 10000 });
    await expect(diagnosis).not.toContainText("Estimate Ready");
    await expect(diagnosis).toContainText("Rewards-only projection", { timeout: 10000 });
    await expect(diagnosis).toContainText("Verify node risk before bonding");
    const assumptions = page.getByLabel("Simulation assumptions");
    await expect(assumptions).toContainText("Risk coverage");
    await expect(assumptions).toContainText("Manual APY");
    await expect(assumptions).toContainText("Minimum bond");
    await expect(assumptions).toContainText("Meets active minimum");
    await expect(assumptions).toContainText("threshold only");
    await expect(assumptions).not.toContainText("Meets minimum");
    await expect(assumptions.getByText("Meets active minimum")).toHaveClass(/text-sky-600/);
    await expect(assumptions.getByText("Meets active minimum")).not.toHaveClass(/text-emerald-600/);
    await expect(page.getByRole("button", { name: "Baseline inputs 50% manual APY, 10% operator fee, 90-day window" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reference inputs 65% manual APY, 15% operator fee, 180-day window" })).toBeVisible();
    await expect(page.getByText("Conservative inputs")).toHaveCount(0);
    await expect(page.getByText("Balanced inputs")).toHaveCount(0);
    await expect(page.getByText("Low risk, established nodes, 10% fee")).toHaveCount(0);
    await expect(page.getByText("Moderate risk and return, 15% fee")).toHaveCount(0);
    await expect(page.getByText("Higher APY, newer nodes, 20% fee")).toHaveCount(0);
    const rewardOnlyImpact = page.getByRole("group", { name: "Reward-only impact" });
    await expect(rewardOnlyImpact).toBeVisible();
    await expect(rewardOnlyImpact.getByText("Reward-only impact")).toBeVisible();
    await expect(page.getByText("Impact Preview")).toHaveCount(0);
    const positiveApyDelta = rewardOnlyImpact.getByText(/^\+\d+\.\d{2}%$/);
    await expect(positiveApyDelta).toHaveClass(/text-sky-600/);
    await expect(positiveApyDelta).not.toHaveClass(/text-emerald-600/);
    await expect(rewardOnlyImpact.getByText("Risk check")).toBeVisible();
    await expect(rewardOnlyImpact.getByText("Not modeled")).toBeVisible();
    await expect(rewardOnlyImpact.getByText("Review slash, jail, and churn before acting")).toBeVisible();
    await expect(page.getByText("Projected Health")).toHaveCount(0);

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
