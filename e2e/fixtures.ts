import { expect, test as base } from '@playwright/test';
import type { ConsoleMessage, Page, Request, TestInfo } from '@playwright/test';

const CONSOLE_ERROR_ALLOWLIST: RegExp[] = [
  /Failed to load resource: the server responded with a status of 404.*favicon/i,
  /ResizeObserver loop completed with undelivered notifications/i,
];
const API_HTTP_STATUS_CONSOLE_ERROR = /Failed to load resource: the server responded with a status of [45]\d\d/i;
const PAGE_404_CONSOLE_ERROR = /Failed to load resource: the server responded with a status of 404/i;

function isSameOriginApiRequest(requestOrUrl: Request | string): boolean {
  const rawUrl = typeof requestOrUrl === 'string' ? requestOrUrl : requestOrUrl.url();
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

  try {
    const url = new URL(rawUrl, baseUrl);
    const base = new URL(baseUrl);
    return url.origin === base.origin && url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

function isPage404Navigation(requestOrUrl: Request | string): boolean {
  const rawUrl = typeof requestOrUrl === 'string' ? requestOrUrl : requestOrUrl.url();
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

  try {
    const url = new URL(rawUrl, baseUrl);
    const base = new URL(baseUrl);
    return url.origin === base.origin && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/_next/');
  } catch {
    return false;
  }
}

function isAllowedConsoleError(message: ConsoleMessage): boolean {
  const text = message.text();
  if (API_HTTP_STATUS_CONSOLE_ERROR.test(text) && isSameOriginApiRequest(message.location().url)) {
    return true;
  }

  if (PAGE_404_CONSOLE_ERROR.test(text) && isPage404Navigation(message.location().url)) {
    return true;
  }

  return CONSOLE_ERROR_ALLOWLIST.some((pattern) => pattern.test(text));
}

async function recordFailure(testInfo: TestInfo, label: string, details: string) {
  await testInfo.attach(label, {
    body: details,
    contentType: 'text/plain',
  });
}

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, run, testInfo) => {
    const failures: string[] = [];

    page.on('pageerror', (error) => {
      failures.push(`pageerror: ${error.stack ?? error.message}`);
    });

    page.on('console', (message) => {
      if (message.type() === 'error' && !isAllowedConsoleError(message)) {
        failures.push(`console.error: ${message.text()}`);
      }
    });

    page.on('requestfailed', (request) => {
      if (request.failure()?.errorText === 'net::ERR_ABORTED') {
        return;
      }

      if (isSameOriginApiRequest(request)) {
        failures.push(
          `failed same-origin API request: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown error'})`
        );
      }
    });

    await run(page);

    if (failures.length > 0) {
      const details = failures.join('\n\n');
      await recordFailure(testInfo, 'unexpected-browser-failures', details);
      throw new Error(details);
    }
  },
});

export { expect };
export type { Page } from '@playwright/test';
