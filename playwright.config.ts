import { defineConfig, devices } from '@playwright/test';

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
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && rm -rf .next/standalone/public .next/standalone/.next/static && mkdir -p .next/standalone/.next && cp -R public .next/standalone/public && cp -R .next/static .next/standalone/.next/static && PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    timeout: 180000,
  },
});