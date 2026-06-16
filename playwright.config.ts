import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const serverUrl = process.env.PLAYWRIGHT_WEBSERVER_URL ?? baseURL;
const serverPort = process.env.PLAYWRIGHT_PORT ?? (new URL(serverUrl).port || '3000');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/playwright/junit.xml' }],
  ],
  timeout: 30000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /.*mobile-critical\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-critical',
      testMatch: /.*mobile-critical\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npm run build && PORT=${serverPort} HOSTNAME=0.0.0.0 npm start`,
    url: serverUrl,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    timeout: 180000,
  },
});
