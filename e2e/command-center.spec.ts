import { expect, test } from './fixtures';
import { DEFAULT_DASHBOARD_ADDRESS, mockDashboardApis } from './helpers/dashboard-api-mocks';

test.describe('Dashboard command center', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'denied'; static requestPermission = async () => 'denied'; },
        writable: true,
      });
    });
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS);
  });

  test('lands on the triage-first command center by default', async ({ page }) => {
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByLabel('Command center diagnosis')).toBeVisible();
    await expect(page.getByLabel('Command center diagnosis').getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Critical actions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Source freshness' })).toBeVisible();
    await expect(page.getByLabel('Supporting metrics')).toBeVisible();
  });

  test('keeps the notification nudge out of the primary diagnosis area', async ({ page }) => {
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const diagnosis = page.getByLabel('Command center diagnosis');
    const nudge = page.getByTestId('notification-permission-nudge');
    await expect(diagnosis).toBeVisible();
    await expect(nudge).toBeVisible();

    const diagnosisBox = await diagnosis.boundingBox();
    const nudgeBox = await nudge.boundingBox();
    expect(diagnosisBox).not.toBeNull();
    expect(nudgeBox).not.toBeNull();
    if (diagnosisBox && nudgeBox) {
      const overlaps =
        diagnosisBox.x < nudgeBox.x + nudgeBox.width &&
        diagnosisBox.x + diagnosisBox.width > nudgeBox.x &&
        diagnosisBox.y < nudgeBox.y + nudgeBox.height &&
        diagnosisBox.y + diagnosisBox.height > nudgeBox.y;
      expect(overlaps).toBe(false);
    }
  });

  test('shows diagnosis and top actions before detailed cards on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByLabel('Command center diagnosis')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Critical actions' })).toBeVisible();
    await expect(page.getByText(/Fresh|Unknown|Degraded|Stale/).first()).toBeVisible();

    const diagnosisY = (await page.getByLabel('Command center diagnosis').boundingBox())?.y ?? 0;
    const detailY = (await page.getByRole('heading', { name: 'Riskiest nodes first' }).boundingBox())?.y ?? 9999;
    expect(diagnosisY).toBeLessThan(detailY);
  });
});
