import { test, expect } from "@playwright/test";

const MOCK_ADDRESS = "thor1test123456789abcdefghijklmnop";

test.describe("Portfolio Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/portfolio?address=" + MOCK_ADDRESS);
  });

  test("displays portfolio summary", async ({ page }) => {
    await expect(page.getByText("Total Bonded")).toBeVisible();
  });
});
