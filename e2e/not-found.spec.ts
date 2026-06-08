import { test, expect } from './fixtures';

test('renders custom 404 page for unknown routes', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /go to home/i })).toBeVisible();
});
