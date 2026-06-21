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

  test("withholds simulator reward projections for impossible operator fees", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/simulator?address=${MOCK_ADDRESS}`);

    await page.getByLabel("Operator Fee (bps)").fill("12000");

    const diagnosis = page.getByLabel("Simulator scenario diagnosis");
    const assumptions = page.getByLabel("Simulation assumptions");
    const inlineFeeError = page.getByText("Operator fee cannot exceed 10,000 bps (100%).");

    await expect(diagnosis).toContainText("Operator fee input is impossible");
    await expect(diagnosis).toContainText("Operator fee must be between 0% and 100%");
    await expect(diagnosis.getByRole("link", { name: "Fix operator fee" })).toHaveAttribute("href", "#simulator-inputs");
    await expect(assumptions).toContainText("Fee input");
    await expect(assumptions).toContainText("Invalid");
    await expect(assumptions).toContainText("0% to 100% only");
    await expect(page.getByLabel("Operator Fee (bps)")).toHaveAttribute("aria-invalid", "true");
    await expect(inlineFeeError).toBeVisible();
    await expect(page.getByText("Fix operator fee before Heimdall will calculate reward estimates.")).toBeVisible();
    await expect(page.getByText("Est. Daily Reward")).toHaveCount(0);
    await expect(page.getByText("Est. Total Reward")).toHaveCount(0);
    await expect(page.getByText(/-\d+\.\d+ RUNE/)).toHaveCount(0);

    const layout = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom } : null;
      };

      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        feeInput: box("#simulator-operator-fee"),
        feeError: box("#simulator-operator-fee-error"),
      };
    });

    expect(layout.feeInput).not.toBeNull();
    expect(layout.feeError).not.toBeNull();
    expect(layout.feeError!.bottom).toBeLessThan(layout.feeInput!.top);
    expect(layout.feeError!.top).toBeGreaterThanOrEqual(0);
    expect(layout.feeInput!.top).toBeLessThan(layout.viewportHeight);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  });

  test("withholds simulator reward projections for missing APY and fee inputs", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/simulator?address=${MOCK_ADDRESS}`);

    const diagnosis = page.getByLabel("Simulator scenario diagnosis");
    const assumptions = page.getByLabel("Simulation assumptions");
    const apyInput = page.getByLabel("Est. Network APY (%)");
    const feeInput = page.getByLabel("Operator Fee (bps)");

    await apyInput.fill("");

    await expect(diagnosis).toContainText("Network APY input is missing");
    await expect(diagnosis.getByRole("link", { name: "Enter APY estimate" })).toHaveAttribute("href", "#simulator-inputs");
    await expect(assumptions).toContainText("Missing APY");
    await expect(assumptions).toContainText("Enter estimated APY");
    await expect(apyInput).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Enter an estimated network APY before calculating reward estimates.")).toBeVisible();
    await expect(page.getByText("Enter estimated network APY before Heimdall will calculate reward estimates.")).toBeVisible();
    await expect(page.getByText("Est. Daily Reward")).toHaveCount(0);
    await expect(page.getByText("Est. Total Reward")).toHaveCount(0);

    const missingApyLayout = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom } : null;
      };

      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        apyInput: box("#simulator-network-apy"),
        apyError: box("#simulator-network-apy-error"),
      };
    });

    expect(missingApyLayout.apyInput).not.toBeNull();
    expect(missingApyLayout.apyError).not.toBeNull();
    expect(missingApyLayout.apyError!.bottom).toBeLessThan(missingApyLayout.apyInput!.top);
    expect(missingApyLayout.documentWidth).toBeLessThanOrEqual(missingApyLayout.viewportWidth + 1);

    await apyInput.fill("0");
    await expect(apyInput).toHaveAttribute("aria-invalid", "false");
    await expect(page.getByText("Est. Daily Reward")).toBeVisible();

    await feeInput.fill("");

    await expect(diagnosis).toContainText("Operator fee input is missing");
    await expect(diagnosis.getByRole("link", { name: "Enter operator fee" })).toHaveAttribute("href", "#simulator-inputs");
    await expect(assumptions).toContainText("Fee input");
    await expect(assumptions).toContainText("Missing");
    await expect(assumptions).toContainText("Enter 0% to 100%");
    await expect(feeInput).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Enter an operator fee between 0 and 10,000 bps.")).toBeVisible();
    await expect(page.getByText("Enter operator fee before Heimdall will calculate reward estimates.")).toBeVisible();
    await expect(page.getByText("Est. Daily Reward")).toHaveCount(0);
    await expect(page.getByText("Est. Total Reward")).toHaveCount(0);

    const missingFeeLayout = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom } : null;
      };

      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        feeInput: box("#simulator-operator-fee"),
        feeError: box("#simulator-operator-fee-error"),
      };
    });

    expect(missingFeeLayout.feeInput).not.toBeNull();
    expect(missingFeeLayout.feeError).not.toBeNull();
    expect(missingFeeLayout.feeError!.bottom).toBeLessThan(missingFeeLayout.feeInput!.top);
    expect(missingFeeLayout.documentWidth).toBeLessThanOrEqual(missingFeeLayout.viewportWidth + 1);

    await feeInput.fill("0");
    await expect(feeInput).toHaveAttribute("aria-invalid", "false");
    await expect(page.getByText("Est. Daily Reward")).toBeVisible();
  });
});
