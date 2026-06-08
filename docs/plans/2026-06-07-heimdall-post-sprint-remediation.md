# Heimdall post-sprint remediation plan — 07-06-2026

> **For Hermes:** Use `subagent-driven-development` to implement this plan task-by-task.
> The plan addresses every blocker, important gap, and nice-to-have from
> `docs/plans/2026-06-07-heimdall-comprehensive-review-post-sprint.md`.
> Tasks are bite-sized (2-5 min each), TDD-first where it pays off, and
> end with a release closeout verification.

**Goal:** Close the 5 blockers, 10 important gaps, and 6 nice-to-haves from the
post-sprint review so Heimdall is SEO-ready, a11y-clean, fully testable, and
free of stale plumbing.

**Architecture:**

- Add standard Next.js App Router surfaces: `not-found.tsx`, `error.tsx`,
  `loading.tsx`, `global-error.tsx`, plus per-route skeletons.
- Add SEO: `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`.
- Layer Caddy security headers, fix CORS fallback, add skip-link,
  `prefers-reduced-motion` support.
- Clean repo plumbing: prune 12 stale worktrees, archive
  `deep-research-report.md`, remove `.sisyphus/` and `docs/archive/.DS_Store`.
- Real bug fix: `pools/[pool]/route.ts` `totalPooledRune` field bug.
- Test coverage: lift 37.6% lines to ≥60% lines by adding tests for the
  largest untested files.
- Dependabot auto-PR pipeline.
- Document the public-read-only auth model in AGENTS.md.
- Refresh stale AGENTS.md line counts and add an auth model section.
- Inventory SSH key path: move to vault variable with default.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, Vitest, Playwright,
Ansible, Caddy, GitHub Actions.

---

## Plan review history

| Pass | Verdict | Blocker classes found | Patched | Final |
|------|---------|------------------------|---------|-------|
| 1 | PASS-with-revision | (1) E-1 Step 2 verification described a `next build` failure that does not happen — `NEXT_PUBLIC_USE_MOCK_DATA` is inlined at build time, so a build with the env set *succeeds* and silently produces a mock-data build. (2) F-2 claimed `useRunePrice` falls back to CoinGecko on Midgard failure, but the hook only uses Midgard. Replaced E-1's "verify locally" with a guard-logic shell test, and replaced F-2's CoinGecko fallback test with honest "empty intervals" and "mock mode" cases. | E-1, F-2 | PASS |

(Filled in by the implementer after the first independent review pass.)

---

## Task Map

```
Phase A — Blocker surfaces (A-1..A-5)
Phase B — SEO + Caddy hardening + a11y (B-1..B-6)
Phase C — Real bug fix + CORS fix (C-1..C-2)
Phase D — Repo plumbing cleanup (D-1..D-5)
Phase E — Mock-data CI guard + auth docs (E-1..E-2)
Phase F — Test coverage uplift (F-1..F-4)
Phase G — Dependabot + large-file splits + staleness (G-1..G-4)
Phase H — Release closeout verification (H-1)
```

Total: 29 tasks.

---

## Phase A — Blocker surfaces

### Task A-1: Add root `app/not-found.tsx`

**Files:**
- Create: `src/app/not-found.tsx`
- Test: `e2e/not-found.spec.ts`

**Step 1: Write failing E2E test**

Create `e2e/not-found.spec.ts`:

```ts
import { test, expect } from './fixtures';

test('renders custom 404 page for unknown routes', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /go to home/i })).toBeVisible();
});
```

**Step 2: Run E2E to verify failure**

Run: `npx playwright test e2e/not-found.spec.ts`
Expected: FAIL — heading not found, page is default Next.js 404.

**Step 3: Write the page**

Create `src/app/not-found.tsx`:

```tsx
import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center"
    >
      <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/20">
        <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Page not found
        </h1>
        <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          The route you requested does not exist on Heimdall. Check the URL or
          return to the home page to enter a THORChain address.
        </p>
      </div>
      <Button asChild>
        <Link href="/">
          <Home className="mr-2 h-4 w-4" />
          Go to Home
        </Link>
      </Button>
    </main>
  );
}
```

**Step 4: Verify with E2E + build**

Run: `npm run lint -- --max-warnings=0 && npx playwright test e2e/not-found.spec.ts`
Expected: lint passes, E2E passes.

**Step 5: Commit**

```bash
git add src/app/not-found.tsx e2e/not-found.spec.ts
git commit -m "feat: add custom 404 not-found page"
```

### Task A-2: Add root `app/error.tsx` and `app/global-error.tsx`

**Files:**
- Create: `src/app/error.tsx`
- Create: `src/app/global-error.tsx`
- Test: `e2e/error.spec.ts`

**Step 1: Write failing E2E test**

Create `e2e/error.spec.ts`:

```ts
import { test, expect } from './fixtures';

test('shows custom error UI when a client component throws', async ({ page }) => {
  await page.goto('/?__error=1');
  // The error boundary will render after the test-only path throws
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
});
```

**Step 2: Run E2E to verify failure**

Run: `npx playwright test e2e/error.spec.ts`
Expected: FAIL.

**Step 3: Write the components**

Create `src/app/error.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Heimdall client error:', error);
  }, [error]);

  return (
    <main
      id="main"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4 text-center"
    >
      <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Something went wrong
        </h2>
        <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          Heimdall hit an unexpected error rendering this page. The live
          dashboards are independent; try again or reload.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-zinc-400">digest: {error.digest}</p>
        )}
      </div>
      <Button onClick={() => reset()}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </main>
  );
}
```

Create `src/app/global-error.tsx`:

```tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <main
          id="main"
          className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center"
        >
          <h1 className="text-2xl font-semibold">Heimdall hit a fatal error</h1>
          {error.digest && (
            <p className="font-mono text-xs text-zinc-500">digest: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
```

**Step 4: Verify**

Run: `npm run lint -- --max-warnings=0 && npm run typecheck && npx playwright test e2e/error.spec.ts`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/app/error.tsx src/app/global-error.tsx e2e/error.spec.ts
git commit -m "feat: add app-level error and global-error boundaries"
```

### Task A-3: Add per-route `loading.tsx` skeletons

**Files:**
- Create: `src/app/loading.tsx`
- Create: `src/app/dashboard/loading.tsx`
- Create: `src/app/dashboard/portfolio/loading.tsx`
- Create: `src/app/learn/loading.tsx`
- Test: `e2e/loading.spec.ts`

**Step 1: Write failing E2E test**

Create `e2e/loading.spec.ts`:

```ts
import { test, expect } from './fixtures';

test('shows dashboard skeleton before content hydrates', async ({ page }) => {
  // Slow the response so the skeleton is visible
  await page.route('**/api/midgard/**', async (route) => {
    await new Promise((r) => setTimeout(r, 250));
    await route.continue();
  });

  await page.goto('/dashboard/portfolio?address=thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
  await expect(page.getByRole('status', name: /loading dashboard/i })).toBeVisible();
});
```

**Step 2: Verify failure**

Run: `npx playwright test e2e/loading.spec.ts`
Expected: FAIL — no `status` role.

**Step 3: Write skeleton pages**

Create `src/app/loading.tsx`:

```tsx
import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <main
      id="main"
      role="status"
      aria-label="Loading home"
      className="flex min-h-screen items-center justify-center gap-2 text-zinc-500"
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>Loading…</span>
    </main>
  );
}
```

Create `src/app/dashboard/loading.tsx`:

```tsx
import { DashboardLoadingSkeleton } from '@/components/shared/dashboard-loading-skeleton';

export default function DashboardLayoutLoading() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="flex h-screen overflow-hidden bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900"
    >
      <DashboardLoadingSkeleton />
    </div>
  );
}
```

Create `src/components/shared/dashboard-loading-skeleton.tsx`:

```tsx
export function DashboardLoadingSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-6 motion-safe:animate-pulse">
      <div className="h-12 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-32 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
```

Create `src/app/dashboard/portfolio/loading.tsx`:

```tsx
import { DashboardLoadingSkeleton } from '@/components/shared/dashboard-loading-skeleton';

export default function PortfolioLoading() {
  return (
    <div
      role="status"
      aria-label="Loading portfolio"
      className="space-y-6 motion-safe:animate-pulse"
    >
      <DashboardLoadingSkeleton />
    </div>
  );
}
```

Create `src/app/learn/loading.tsx`:

```tsx
import { Loader2 } from 'lucide-react';

export default function LearnLoading() {
  return (
    <main
      id="main"
      role="status"
      aria-label="Loading learn section"
      className="flex min-h-screen items-center justify-center gap-2 text-zinc-500"
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>Loading articles…</span>
    </main>
  );
}
```

**Step 4: Verify**

Run: `npm run lint -- --max-warnings=0 && npm run typecheck && npx playwright test e2e/loading.spec.ts`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/app/loading.tsx src/app/dashboard/loading.tsx src/app/dashboard/portfolio/loading.tsx src/app/learn/loading.tsx src/components/shared/dashboard-loading-skeleton.tsx e2e/loading.spec.ts
git commit -m "feat: add per-route loading skeletons"
```

### Task A-4: Add skip-link to main content

**Files:**
- Modify: `src/app/layout.tsx`
- Test: `e2e/skip-link.spec.ts`

**Step 1: Write failing E2E test**

Create `e2e/skip-link.spec.ts`:

```ts
import { test, expect } from './fixtures';

test('exposes a skip-link to the main element on tab', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: /skip to main content/i });
  await expect(skipLink).toBeFocused();
});
```

**Step 2: Verify failure**

Run: `npx playwright test e2e/skip-link.spec.ts`
Expected: FAIL.

**Step 3: Modify `src/app/layout.tsx`**

Read the file first to find the `<body>` and the page shell. Add a skip-link
as the first child of `<body>`:

```tsx
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
>
  Skip to main content
</a>
```

Also add `id="main"` to the root layout's main wrapper if it exists, or to
the first child of `<body>`. Apply the same `id="main"` to the dashboard
layout's main element and the not-found page from A-1.

**Step 4: Verify**

Run: `npm run lint -- --max-warnings=0 && npx playwright test e2e/skip-link.spec.ts`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/dashboard/layout.tsx src/app/not-found.tsx e2e/skip-link.spec.ts
git commit -m "a11y: add skip-link to main content"
```

### Task A-5: Add `prefers-reduced-motion` support

**Files:**
- Modify: `src/app/globals.css`
- Test: `e2e/reduced-motion.spec.ts`

**Step 1: Write failing E2E test**

Create `e2e/reduced-motion.spec.ts`:

```ts
import { test, expect } from './fixtures';

test('disables pulse animation when prefers-reduced-motion is set', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/dashboard/portfolio?address=thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
  // Skeleton has motion-safe:animate-pulse — under reduced-motion it should NOT be running
  const pulseElements = page.locator('[role="status"][aria-label*="Loading" i]');
  const count = await pulseElements.count();
  if (count > 0) {
    const computed = await pulseElements.first().evaluate((el) => getComputedStyle(el).animationName);
    expect(computed === 'none' || computed === '').toBeTruthy();
  }
  await context.close();
});
```

**Step 2: Verify failure**

Run: `npx playwright test e2e/reduced-motion.spec.ts`
Expected: FAIL.

**Step 3: Update `src/app/globals.css`**

Read the existing globals.css first. Add at the end:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

**Step 4: Convert `animate-pulse` and `animate-spin` to `motion-safe:` variants**

Search and replace in the codebase:
- `animate-pulse` → `motion-safe:animate-pulse` (10+ occurrences)
- `animate-spin` → `motion-safe:animate-spin` (LoadingSkeleton, dashboard shell)

Use `rg -l 'animate-pulse|animate-spin' src/ e2e/` to find files, then patch
each.

**Step 5: Verify**

Run: `npm run lint -- --max-warnings=0 && npm run typecheck && npx playwright test e2e/reduced-motion.spec.ts`
Expected: all pass.

**Step 6: Commit**

```bash
git add -u src/ e2e/reduced-motion.spec.ts
git commit -m "a11y: respect prefers-reduced-motion"
```

---

## Phase B — SEO + Caddy hardening + a11y

### Task B-1: Add `app/sitemap.ts`

**Files:**
- Create: `src/app/sitemap.ts`
- Test: `e2e/seo.spec.ts`

**Step 1: Write failing E2E test**

Create `e2e/seo.spec.ts`:

```ts
import { test, expect } from './fixtures';

test('serves a valid sitemap.xml', async ({ page }) => {
  const response = await page.goto('/sitemap.xml');
  expect(response?.status()).toBe(200);
  const body = await response!.text();
  expect(body).toContain('<urlset');
  expect(body).toContain('/learn');
  expect(body).toContain('/learn/what-is-thorchain');
});

test('serves a robots.txt that disallows /api', async ({ page }) => {
  const response = await page.goto('/robots.txt');
  expect(response?.status()).toBe(200);
  const body = await response!.text();
  expect(body).toContain('Sitemap:');
  expect(body).toMatch(/Disallow:\s+\/api/);
});
```

**Step 2: Verify failure**

Run: `npx playwright test e2e/seo.spec.ts`
Expected: FAIL — 404.

**Step 3: Write `src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next';
import { articles } from '@/app/learn/articles';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bond.thorchain.no';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const learnArticles = articles.map((article) => ({
    url: `${APP_URL}/learn/${article.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    { url: APP_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${APP_URL}/learn`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...learnArticles,
  ];
}
```

Also extract the `articles` array to `src/app/learn/articles.ts` so both
`learn/page.tsx` and `sitemap.ts` can import it (refactor as part of this
task).

**Step 4: Write `src/app/robots.ts`**

```ts
import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bond.thorchain.no';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard/'] },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
```

**Step 5: Verify**

Run: `npm run lint -- --max-warnings=0 && npm run typecheck && npx playwright test e2e/seo.spec.ts`
Expected: all pass.

**Step 6: Commit**

```bash
git add src/app/sitemap.ts src/app/robots.ts src/app/learn/articles.ts src/app/learn/page.tsx e2e/seo.spec.ts
git commit -m "feat: add sitemap and robots for SEO"
```

### Task B-2: Add `app/manifest.ts` (PWA)

**Files:**
- Create: `src/app/manifest.ts`

**Step 1: Write the file**

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Heimdall — THORChain Dashboard',
    short_name: 'Heimdall',
    description:
      'Real-time THORChain bond provider, node health, LP, and rewards dashboard.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#f59e0b',
    icons: [
      { src: '/file.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
```

**Step 2: Reference in `src/app/layout.tsx` metadata**

In the `metadata` export, add:

```ts
manifest: '/manifest.webmanifest',
```

(Note: Next.js converts `app/manifest.ts` to `/manifest.webmanifest`.)

**Step 3: Verify**

Run: `npm run lint -- --max-warnings=0 && npm run typecheck`
Then in a Playwright smoke:

```ts
// Append to e2e/seo.spec.ts
test('serves a PWA manifest.webmanifest', async ({ page }) => {
  const response = await page.goto('/manifest.webmanifest');
  expect(response?.status()).toBe(200);
  const body = await response!.json();
  expect(body.name).toBe('Heimdall — THORChain Dashboard');
});
```

**Step 4: Commit**

```bash
git add src/app/manifest.ts src/app/layout.tsx e2e/seo.spec.ts
git commit -m "feat: add PWA manifest"
```

### Task B-3: Add Caddyfile security headers

**Files:**
- Modify: `Caddyfile`
- Test: `e2e/security-headers.spec.ts`

**Step 1: Write failing E2E test**

Create `e2e/security-headers.spec.ts`:

```ts
import { test, expect } from './fixtures';

test('api responses include CORS and security headers', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(response.headers()['cache-control']).toContain('no-store');
});
```

**Step 2: Verify failure**

Run: `npx playwright test e2e/security-headers.spec.ts`
Expected: FAIL — missing headers (they come from Next.js, but the test
will pass in production with Caddy only after the Caddyfile change).

**Step 3: Update `Caddyfile`**

```caddyfile
{
  auto_https off
}

bond.thorchain.no {
  reverse_proxy localhost:3001 {
    header_up Host {host}
    header_up X-Real-IP {remote_host}
  }

  header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    X-XSS-Protection "1; mode=block"
    Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
    -Server
  }

  encode zstd gzip
  log {
    output file /var/log/caddy/heimdall.log {
      roll_size 10mb
      roll_keep 5
    }
  }
}
```

**Step 4: Verify**

Run: `npm run lint -- --max-warnings=0 && npx playwright test e2e/security-headers.spec.ts`
Expected: all pass. (The Playwright test runs against the Next.js server,
not Caddy, so it will pass once the Next.js headers are correct. The
Caddyfile change is verified by re-deploying to staging and running a
real `curl -I` against the live site.)

**Step 5: Commit**

```bash
git add Caddyfile e2e/security-headers.spec.ts
git commit -m "ops: add Caddyfile security headers and log rotation"
```

### Task B-4: Fix CORS fallback origin

**Files:**
- Modify: `src/lib/api/cors.ts:29`

**Step 1: Write failing unit test**

Add to `src/lib/api/__tests__/cors.test.ts` (create it if missing):

```ts
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { corsHeaders } from '../cors';

function makeRequest(origin: string | null) {
  const headers = new Headers();
  if (origin) headers.set('origin', origin);
  return new NextRequest('https://bond.thorchain.no/api/health', { headers });
}

describe('corsHeaders', () => {
  it('uses the request origin when allowlisted', () => {
    const result = corsHeaders(makeRequest('https://bond.thorchain.no'));
    expect(result['Access-Control-Allow-Origin']).toBe('https://bond.thorchain.no');
  });

  it('uses "null" for missing origin instead of a default origin', () => {
    const result = corsHeaders(makeRequest(null));
    expect(result['Access-Control-Allow-Origin']).toBe('null');
  });

  it('uses the canonical https fallback for disallowed origins', () => {
    const result = corsHeaders(makeRequest('https://evil.example.com'));
    expect(result['Access-Control-Allow-Origin']).toBe('null');
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/lib/api/__tests__/cors.test.ts`
Expected: FAIL — current implementation returns `'https://thorchain.no'`.

**Step 3: Patch `cors.ts`**

Change line 29 from:

```ts
'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://thorchain.no',
```

to:

```ts
'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'null',
```

**Step 4: Verify**

Run: `npx vitest run src/lib/api/__tests__/cors.test.ts && npm run lint -- --max-warnings=0`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/lib/api/cors.ts src/lib/api/__tests__/cors.test.ts
git commit -m "fix(api): use 'null' as CORS fallback for missing/disallowed origin"
```

### Task B-5: Add `prefers-reduced-motion` Tailwind variants (already in A-5)

Skipped here; covered in A-5.

### Task B-6: Add `nextjs` metadata base URL

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Add `metadataBase`**

In the existing `metadata` export in `src/app/layout.tsx`, add:

```ts
metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://bond.thorchain.no'),
```

Also add `title.default`, `title.template`, and `description` defaults if
not already present (audit the current file first).

**Step 2: Verify**

Run: `npm run typecheck && npm run build`
Expected: build succeeds, no missing metadataBase warnings.

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: set metadataBase for canonical URL resolution"
```

---

## Phase C — Real bug fix + CORS

### Task C-1: Fix `pools/[pool]/route.ts` `totalPooledRune` field

**Files:**
- Modify: `src/app/api/pools/[pool]/route.ts:78-79`
- Test: `src/app/api/pools/__tests__/route.test.ts` (create or update)

**Step 1: Write failing unit test**

In `src/app/api/pools/__tests__/route.test.ts` (create if missing):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

vi.mock('@/lib/api/midgard', () => ({
  getEarningsHistory: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  getClientIp: () => '127.0.0.1',
  checkRateLimit: () => ({ allowed: true, remaining: 1, resetAt: Date.now() + 60_000 }),
}));

import { getEarningsHistory } from '@/lib/api/midgard';

describe('GET /api/pools/[pool]', () => {
  beforeEach(() => {
    vi.mocked(getEarningsHistory).mockReset();
  });

  it('returns network total pooled RUNE, not a single pool\'s liquidity fees', async () => {
    vi.mocked(getEarningsHistory).mockResolvedValue({
      meta: {
        startTime: '0',
        endTime: '1',
        liquidityFees: '0',
        blockRewards: '0',
        earnings: '0',
        bondingEarnings: '5000000000000',
        liquidityEarnings: '0',
        avgNodeCount: '0',
        runePriceUSD: '0',
        pools: [
          { pool: 'BTC.BTC', assetLiquidityFees: '1', runeLiquidityFees: '1', totalLiquidityFeesRune: '100', saverEarning: '0', rewards: '0', earnings: '0' },
          { pool: 'ETH.ETH', assetLiquidityFees: '1', runeLiquidityFees: '1', totalLiquidityFeesRune: '200', saverEarning: '0', rewards: '0', earnings: '0' },
        ],
      },
      intervals: [],
    });

    const request = new Request('https://bond.thorchain.no/api/pools/BTC.BTC');
    const response = await GET(request as any, { params: Promise.resolve({ pool: 'BTC.BTC' }) });
    const body = await response.json();

    // The route should now return the network-level totals, not the first pool's liquidity fees.
    // We expect: totalPooledRune comes from getNetwork(), totalNetworkBond from bondingEarnings.
    expect(body.totalPooledRune).not.toBe('100');
    expect(body.totalPooledRune).not.toBe('1');
    expect(body.totalNetworkBond).toBe('5000000000000');
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/app/api/pools/__tests__/route.test.ts`
Expected: FAIL — `totalPooledRune` is `'100'` (first pool's `totalLiquidityFeesRune`).

**Step 3: Patch the route**

Replace the import line and the response body:

```ts
import { getEarningsHistory, getNetwork } from '@/lib/api/midgard';
```

Then in the response:

```ts
const network = await getNetwork();

return NextResponse.json({
  pool,
  meta: poolData,
  intervals: poolIntervals,
  totalPooledRune: network.totalPooledRune,
  totalNetworkBond: earnings.meta.bondingEarnings,
}, { headers: noStorePrivateHeaders(request) });
```

**Step 4: Verify**

Run: `npx vitest run src/app/api/pools/__tests__/route.test.ts && npm run lint -- --max-warnings=0 && npm run typecheck`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/app/api/pools/[pool]/route.ts src/app/api/pools/__tests__/route.test.ts
git commit -m "fix(api): return network total pooled RUNE in /api/pools/[pool]"
```

### Task C-2: Rename `parsedActions.pools` to `affectedPools`

**Files:**
- Modify: `src/app/api/address/[address]/route.ts:99`
- Test: existing `src/app/api/address/[address]/route.test.ts` (if present; otherwise add minimal test)

**Step 1: Write failing unit test**

If `src/app/api/address/[address]/route.test.ts` doesn't exist, create it:

```ts
import { describe, it, expect, vi } from 'vitest';
import { GET } from '../route';

vi.mock('@/lib/api/midgard', () => ({
  getBondDetails: vi.fn(),
  getActions: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  getClientIp: () => '127.0.0.1',
  checkRateLimit: () => ({ allowed: true, remaining: 1, resetAt: Date.now() + 60_000 }),
}));

import { getBondDetails, getActions } from '@/lib/api/midgard';

describe('GET /api/address/[address]', () => {
  it('renames action.pools to action.affectedPools to avoid LP pool confusion', async () => {
    vi.mocked(getBondDetails).mockResolvedValue({
      address: 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      totalBonded: '0',
      nodes: [],
    } as any);
    vi.mocked(getActions).mockResolvedValue({
      actions: [
        {
          type: 'bond',
          date: '1700000000000000000',
          pools: ['BTC.BTC'],
          memo: 'BOND:thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
          tx: { coins: [{ asset: 'THOR.RUNE', amount: '100000000' }], txID: 'tx-1', address: 'thor1sender' },
          status: 'success',
        } as any,
      ],
      count: '1',
    } as any);

    const request = new Request('https://bond.thorchain.no/api/address/thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
    const response = await GET(request as any, { params: Promise.resolve({ address: 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq' }) });
    const body = await response.json();
    expect(body.actions[0]).toHaveProperty('affectedPools');
    expect(body.actions[0]).not.toHaveProperty('pools');
  });
});
```

**Step 2: Verify failure**

Run: `npx vitest run src/app/api/address/[address]/route.test.ts`
Expected: FAIL.

**Step 3: Patch `route.ts`**

Change line 99 from:

```ts
pools: action.pools || []
```

to:

```ts
affectedPools: action.pools || []
```

**Step 4: Search for downstream consumers**

Run: `rg "actions\[0\]\.pools|actions\.pools" src/ e2e/ 2>/dev/null || grep -rn 'actions\[0\]\.pools\|actions\.pools' src/ e2e/`

If any consumers exist, update them in the same task. If none, proceed.

**Step 5: Verify**

Run: `npx vitest run src/app/api/address/[address]/route.test.ts && npm run typecheck`
Expected: all pass.

**Step 6: Commit**

```bash
git add src/app/api/address/[address]/route.ts src/app/api/address/[address]/route.test.ts
git commit -m "refactor(api): rename action.pools to action.affectedPools"
```

---

## Phase D — Repo plumbing cleanup

### Task D-1: Prune 12 stale worktrees

**Files:**
- (no files — git worktree commands only)

**Step 1: List worktrees**

```bash
git worktree list
```

**Step 2: Remove all 12 stale worktrees**

```bash
git worktree remove --force /Users/reidar/Projectos/.delegate-worktrees/Heimdall-delegate-a003-a062-20260607-0533/a058-proxy-helper
git worktree remove --force /Users/reidar/Projectos/.delegate-worktrees/Heimdall-delegate-a003-a062-20260607-0533/api-security-routes
git worktree remove --force /Users/reidar/Projectos/.delegate-worktrees/Heimdall-delegate-a003-a062-20260607-0533/financial-lp-data
git worktree remove --force /Users/reidar/Projectos/.delegate-worktrees/Heimdall-delegate-a003-a062-20260607-0533/financial-lp-data-integrated
git worktree remove --force /Users/reidar/Projectos/.delegate-worktrees/Heimdall-delegate-a003-a062-20260607-0533/gates-wallet-e2e
git worktree remove --force /Users/reidar/Projectos/.delegate-worktrees/Heimdall-delegate-a003-a062-20260607-0533/gates-wallet-e2e-integrated
git worktree remove --force /Users/reidar/Projectos/.delegate-worktrees/Heimdall-delegate-a003-a062-20260607-0533/maintainability-performance
git worktree remove --force /Users/reidar/Projectos/.delegate-worktrees/Heimdall-delegate-a003-a062-20260607-0533/release-governance-docs
git worktree remove --force /Users/reidar/Projectos/.delegate-worktrees/Heimdall-delegate-a003-a062-20260607-0533/ux-a11y-product-trust
git worktree remove --force /Users/reidar/Projectos/.delegate-worktrees/Heimdall-delegate-a003-a062-20260607-0533/ux-a11y-product-trust-integrated
git worktree remove --force /Users/reidar/Projectos/.remediation-worktrees/Heimdall-2026-06-portfolio-gaps
```

**Step 3: Prune and delete branch refs**

```bash
git worktree prune
git branch -D $(git branch | grep -E 'delegate/|remediation/2026-06-portfolio-gaps' || true)
```

**Step 4: Verify**

```bash
git worktree list
```

Expected: only `/Users/reidar/Projectos/Heimdall` remains.

**Step 5: Commit (no source changes, but if `.git/worktrees/...` files were touched, no commit needed)**

No commit required.

### Task D-2: Move `.sisyphus/` to `.gitignore`

**Files:**
- Modify: `.gitignore`
- Modify: `git rm -r --cached .sisyphus`

**Step 1: Add `.sisyphus/` to `.gitignore`**

Append to `.gitignore`:

```
# Machine-generated evidence (not source of truth)
.sisyphus/
```

**Step 2: Remove from index but keep on disk**

```bash
git rm -r --cached .sisyphus
```

**Step 3: Verify**

```bash
git status
```

Expected: `.sisyphus/` is untracked, files still on disk.

**Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: stop tracking .sisyphus/ machine-generated evidence"
```

### Task D-3: Remove `docs/archive/.DS_Store`

**Files:**
- Modify: `.gitignore`
- `git rm --cached docs/archive/.DS_Store`

**Step 1: Add `.DS_Store` to `.gitignore`**

Append to `.gitignore`:

```
.DS_Store
```

**Step 2: Remove from index**

```bash
git rm --cached docs/archive/.DS_Store
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: stop tracking .DS_Store"
```

### Task D-4: Archive `deep-research-report.md`

**Files:**
- Move: `deep-research-report.md` → `docs/archive/2026-06-07-deep-research-report.md`
- Modify: `README.md` and `AGENTS.md` to link to it (or delete it if no longer relevant)

**Step 1: Move the file**

```bash
git mv deep-research-report.md docs/archive/2026-06-07-deep-research-report.md
```

**Step 2: Add a one-line citation in AGENTS.md**

In `AGENTS.md`, near the "Where things live" section, add:

```markdown
| Research artifacts | `docs/archive/2026-06-07-deep-research-report.md` (one-off) |
```

**Step 3: Verify**

```bash
git status
ls deep-research-report.md  # should not exist
```

**Step 4: Commit**

```bash
git add -u
git commit -m "chore: archive deep-research-report.md"
```

### Task D-5: Refresh stale AGENTS.md line counts

**Files:**
- Modify: `src/lib/transactions/AGENTS.md` and any other stale counts

**Step 1: Run file-line diff**

```bash
for f in src/lib/transactions/bond.ts src/lib/api/midgard.ts src/lib/api/proxy.ts src/lib/utils/tax-export.ts; do
  echo "wc -l $f"
  wc -l "$f"
done
```

**Step 2: Update any line counts in AGENTS.md files**

In `src/lib/transactions/AGENTS.md`:
- `bond.ts (310 lines, 12 exports, 14 functions)` → match actual

In `src/lib/api/AGENTS.md`:
- `midgard.ts` reference: match actual
- `client.ts (base fetch + retry)` and other counts: match actual

In `AGENTS.md`:
- File/line counts in "Project structure" comment: match actual

**Step 3: Verify**

```bash
npm run typecheck
```

**Step 4: Commit**

```bash
git add -u
git commit -m "docs: refresh AGENTS.md line counts to match post-sprint reality"
```

---

## Phase E — Mock-data CI guard + auth docs

### Task E-1: Add CI guard against `NEXT_PUBLIC_USE_MOCK_DATA=true`

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Add CI guard**

In the "Unit tests" job (or the build job), add a step **before** `npm run build`:

```yaml
- name: Assert production builds never use mock data
  run: |
    if [ "${NEXT_PUBLIC_USE_MOCK_DATA:-}" = "true" ]; then
      echo "::error::NEXT_PUBLIC_USE_MOCK_DATA must not be 'true' in production builds"
      exit 1
    fi
    echo "Mock data guard passed"
```

**Step 2: Verify locally — guard logic, not a build failure**

The env var is inlined at build time, so a `next build` with
`NEXT_PUBLIC_USE_MOCK_DATA=true` *succeeds* and produces a build that
silently uses mock data. The guard's purpose is to fail the CI workflow
*before* such a build runs. Verify the guard logic in isolation:

```bash
NEXT_PUBLIC_USE_MOCK_DATA=true bash -c '
  if [ "${NEXT_PUBLIC_USE_MOCK_DATA}" = "true" ]; then
    echo "GUARD: would fail (correct)"; exit 1
  fi
  echo "GUARD: passed (wrong)"
'
```

Expected exit code: 1 with "GUARD: would fail (correct)" printed.

Then with the env unset:

```bash
bash -c '
  if [ "${NEXT_PUBLIC_USE_MOCK_DATA:-}" = "true" ]; then
    echo "GUARD: would fail (wrong)"; exit 1
  fi
  echo "GUARD: passed (correct)"
'
```

Expected exit code: 0 with "GUARD: passed (correct)" printed.

**Step 3: Verify CI**

Open a draft PR with a temporary workflow that sets the env, observe the
guard step fail. Then revert.

**Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: fail build if NEXT_PUBLIC_USE_MOCK_DATA is set"
```

### Task E-2: Document the public-read-only auth model

**Files:**
- Modify: `AGENTS.md`

**Step 1: Add "Public read-only API" section**

In `AGENTS.md`, after the "Deployment" section, add:

```markdown
## API access model

Heimdall is a **public read-only** dashboard. There is no auth.

- All `/api/*` routes accept any client IP. The Caddy proxy and Next.js
  routes do not require a session, token, or API key.
- Address-bound data (`/api/address/[address]`, `/api/pools/[pool]`,
  `/api/tax-report`) is publicly queryable for any THORChain address. This
  is intentional: the dashboard's purpose is to surface on-chain facts.
- CoinAPI is the only third-party with a server-side secret
  (`COINAPI_KEY`). It is used only for historical RUNE price enrichment;
  absence of the key is a 503 from `/api/coinapi/rune-price`, not a
  user-facing failure.
- If a future feature requires per-user data (e.g. personalised watchlists
  across devices), add a separate auth layer (Auth.js or an external IdP)
  and document it here before shipping.
```

**Step 2: Verify**

```bash
npm run lint -- --max-warnings=0
```

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document Heimdall's public read-only API access model"
```

---

## Phase F — Test coverage uplift

### Task F-1: Test `use-lp-positions.ts` state machine

**Files:**
- Test: `src/lib/hooks/__tests__/use-lp-positions.test.ts` (already 484 lines, add focused tests)

**Step 1: Write failing tests for the `getLpErrorState` branches**

Append to the existing test file:

```ts
describe('getLpErrorState (via useLpPositions error states)', () => {
  it('returns "empty" for 404 member lookup', async () => {
    // ...mounts the hook and stubs fetchMidgard to return a 404 for /v2/member/...
  });
  it('returns "error" with upstream-failure copy for 5xx member lookup', async () => {
    // ...mounts the hook and stubs fetchMidgard to return 502
  });
  it('returns "error" with price-feed copy for /v2/history/rune 5xx', async () => {
    // ...mounts the hook and stubs fetchMidgard to return 500
  });
});
```

(Use the existing test pattern from this file as a template — it already
exercises `buildMockNodes`, `validatePoolHistory`, etc.)

**Step 2: Run tests to verify failure**

Run: `npx vitest run src/lib/hooks/__tests__/use-lp-positions.test.ts`
Expected: any of the new cases fail.

**Step 3: Implement (likely no code change — only tests)**

The error-state code in `use-lp-positions.ts` is already there. Add test
assertions for the state transitions.

**Step 4: Verify**

Run: `npx vitest run src/lib/hooks/__tests__/use-lp-positions.test.ts`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/lib/hooks/__tests__/use-lp-positions.test.ts
git commit -m "test: add error-state coverage for use-lp-positions"
```

### Task F-2: Test `use-earnings.ts` and `use-rune-price.ts` error branches

**Files:**
- Test: extend `src/lib/hooks/__tests__/use-earnings.test.ts` and `use-rune-price.test.ts` (if missing, create)

**Step 1: Write failing tests**

For `use-earnings.test.ts` (extend existing):

```ts
it('surfaces upstream 502 as a thrown error', async () => {
  // Stub getEarningsHistory to throw "API error: 502"
  // Render the hook; expect error
});

it('degrades to mock data in development mode (NEXT_PUBLIC_USE_MOCK_DATA=true)', () => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_DATA', 'true');
  // Render the hook; expect data equal to MOCK_EARNINGS_HISTORY
});
```

For `use-rune-price.test.ts` (extend or create):

```ts
it('returns 0 price and undefined error when Midgard returns no intervals', async () => {
  // Stub getRunePriceHistory to resolve with empty intervals
  // Render the hook; expect price === 0, error === undefined
});

it('degrades to mock price in development mode (NEXT_PUBLIC_USE_MOCK_DATA=true)', () => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_DATA', 'true');
  // Render the hook; expect price === MOCK_RUNE_PRICE
});
```

**Step 2: Verify failure**

Run: `npx vitest run src/lib/hooks/__tests__/use-earnings.test.ts src/lib/hooks/__tests__/use-rune-price.test.ts`
Expected: new tests fail.

**Step 3: Implement (likely no code change)**

The hooks already have the fall-back logic. Add assertions for each branch.

**Step 4: Verify**

Run: `npx vitest run src/lib/hooks/__tests__/use-earnings.test.ts src/lib/hooks/__tests__/use-rune-price.test.ts`
Expected: all pass.

**Step 5: Commit**

```bash
git add -u src/lib/hooks/__tests__/
git commit -m "test: add error-branch and fallback coverage to SWR hooks"
```

### Task F-3: Test `dashboard/risk/page.tsx` widgets

**Files:**
- Test: `src/app/dashboard/risk/__tests__/page.test.tsx` (create)

**Step 1: Write failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import RiskPage from '../page';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('address=thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'),
  usePathname: () => '/dashboard/risk',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe('Risk dashboard', () => {
  it('renders the network security card and ratio badge', async () => {
    render(<RiskPage />);
    expect(await screen.findByText(/network security/i)).toBeInTheDocument();
  });
});
```

**Step 2: Verify failure**

Run: `npx vitest run src/app/dashboard/risk/__tests__/page.test.tsx`
Expected: FAIL.

**Step 3: Iterate**

Follow the existing test pattern from `e2e/risk-security.spec.ts` for
selector strategy. Iterate until tests pass.

**Step 4: Verify**

Run: `npx vitest run src/app/dashboard/risk/__tests__/page.test.tsx`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/app/dashboard/risk/__tests__/page.test.tsx
git commit -m "test: add risk-dashboard widget coverage"
```

### Task F-4: Lift coverage threshold to 60% lines

**Files:**
- Modify: `vitest.config.ts`

**Step 1: Run coverage to confirm current state**

```bash
npm run test:coverage
```

Expected: ~37-40% lines, ~31% branches.

**Step 2: Raise the threshold to 60/45/45/60 (lines/branches/functions/statements)**

Edit `vitest.config.ts` thresholds:

```ts
thresholds: {
  lines: 60,
  functions: 45,
  branches: 45,
  statements: 60,
  'src/lib/transactions/bond.ts': { lines: 70, functions: 70, branches: 60, statements: 70 },
  'src/lib/api/client.ts': { lines: 60, functions: 60, branches: 50, statements: 60 },
  'src/app/api/health/route.ts': { lines: 80, functions: 80, branches: 50, statements: 80 },
  'src/app/api/pools/[pool]/route.ts': { lines: 70, functions: 70, branches: 60, statements: 70 },
  'src/app/api/address/[address]/route.ts': { lines: 70, functions: 70, branches: 60, statements: 70 },
},
```

**Step 3: Run coverage to verify**

```bash
npm run test:coverage
```

Expected: threshold met or exceeded. If not, add tests to the lowest-covered
files (use `coverage/coverage-summary.json` to identify them).

**Step 4: Commit**

```bash
git add vitest.config.ts
git commit -m "test: raise coverage threshold to 60% lines, 45% branches"
```

---

## Phase G — Dependabot + large-file splits + staleness

### Task G-1: Enable Dependabot security updates

**Files:**
- Create: `.github/dependabot.yml`

**Step 1: Write the config**

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "security"
    groups:
      production-dependencies:
        dependency-type: "production"
      development-dependencies:
        dependency-type: "development"
```

**Step 2: Verify**

```bash
gh api repos/Reedtrullz/Heimdall/contents/.github/dependabot.yml 2>&1 | head
```

(Or just commit and let GitHub validate on push.)

**Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: enable Dependabot for npm weekly security updates"
```

### Task G-2: Extract `bond-memo.ts` (pure) from `bond.ts`

**Files:**
- Create: `src/lib/transactions/bond-memo.ts`
- Modify: `src/lib/transactions/bond.ts` to import from `bond-memo.ts`
- Test: existing `bond.test.ts` should continue passing

**Step 1: Read `bond.ts` to identify pure functions**

The pure functions are: `validateThorAddress`, `validateBondAmount`,
`validateUnbondAmount`, `parseRuneAmountToBaseUnits`,
`getWalletDepositAmountBaseUnits`, `generateBondMemo`,
`generateUnbondMemo`.

**Step 2: Create `src/lib/transactions/bond-memo.ts`**

Move the above functions (and any helpers they need) into the new file.
Update imports in `bond.ts` to re-export them or import them.

**Step 3: Verify tests pass**

Run: `npx vitest run src/lib/transactions/bond.test.ts && npm run typecheck && npm run lint -- --max-warnings=0`
Expected: all pass.

**Step 4: Commit**

```bash
git add src/lib/transactions/bond.ts src/lib/transactions/bond-memo.ts
git commit -m "refactor: extract pure bond memo helpers into bond-memo.ts"
```

### Task G-3: Refactor `use-lp-positions.ts` caches into a module-level factory

**Files:**
- Modify: `src/lib/hooks/use-lp-positions.ts`
- Test: existing tests should pass

**Step 1: Extract `historicalRunePriceCache` and `historicalPoolHistoryCache`**

Move the two `Map<...>` declarations and their getter functions
(`getCachedHistoricalRunePrice`, `getCachedPoolHistoryAtTimestamp`,
`clearLpHistoricalCaches`) into a new module:

`src/lib/hooks/lp-historical-cache.ts`:

```ts
import { getHistoricalRunePrice, getPoolHistoryAtTimestamp, type PoolHistoryEntry } from '@/lib/api/midgard';

const SECONDS_PER_DAY = 86400;

const historicalRunePriceCache = new Map<number, Promise<number | null>>();
const historicalPoolHistoryCache = new Map<string, Promise<PoolHistoryEntry | null>>();

export function historicalDayKey(timestamp: number): number {
  return Math.floor(timestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;
}

export function getCachedHistoricalRunePrice(timestamp: number): Promise<number | null> {
  // ... same as before ...
}

export function getCachedPoolHistoryAtTimestamp(pool: string, timestamp: number): Promise<PoolHistoryEntry | null> {
  // ... same as before ...
}

export function clearLpHistoricalCaches(): void {
  historicalRunePriceCache.clear();
  historicalPoolHistoryCache.clear();
}
```

Update `use-lp-positions.ts` to import from this module.

**Step 2: Verify tests pass**

Run: `npx vitest run src/lib/hooks/__tests__/use-lp-positions.test.ts && npm run typecheck`
Expected: all pass.

**Step 3: Commit**

```bash
git add src/lib/hooks/use-lp-positions.ts src/lib/hooks/lp-historical-cache.ts
git commit -m "refactor: extract LP historical price cache into a dedicated module"
```

### Task G-4: Refactor `dashboard/risk/page.tsx` into smaller widgets

**Files:**
- Create: `src/components/dashboard/risk-*.tsx` (split widgets)
- Modify: `src/app/dashboard/risk/page.tsx` to compose them
- Test: existing `e2e/risk-security.spec.ts` must continue passing

**Step 1: Identify widgets**

Read `src/app/dashboard/risk/page.tsx`. Likely widgets:
- `RiskGauge` (network security gauge)
- `RiskExposureSummary`
- `RiskHeatmap`
- `NodeRiskList`

**Step 2: Extract each widget into `src/components/dashboard/risk-<name>.tsx`**

Move JSX + types for each section. Page becomes a composition root.

**Step 3: Verify**

Run: `npm run typecheck && npm run lint -- --max-warnings=0 && npx playwright test e2e/risk-security.spec.ts`
Expected: all pass.

**Step 4: Commit**

```bash
git add src/app/dashboard/risk/page.tsx src/components/dashboard/risk-*.tsx
git commit -m "refactor: split dashboard/risk/page.tsx into widget components"
```

---

## Phase H — Release closeout verification

### Task H-1: Full release closeout (final)

**Files:** (no source changes; verification only)

**Step 1: Verify committed tree is clean**

```bash
cd /Users/reidar/Projectos/Heimdall
git status --short --branch
git log -5 --oneline
```

Expected: clean tree, latest commit = final remediation commit, branch
ahead of `origin/master` by N commits.

**Step 2: Run full local release gate**

```bash
source ~/.nvm/nvm.sh && nvm use 22
rm -rf .next
npm run typecheck && \
  npm run lint -- --max-warnings=0 && \
  npm test && \
  npm run build && \
  npm run e2e
git diff --check
```

Expected: all pass, record exact counts.

**Step 3: Sync Obsidian notes**

Append a new section to `/Users/reidar/Obsidian/Hermes/Hermes/Personal/Projects/Heimdall.md`
and `/Users/reidar/Obsidian/Hermes/Hermes/Daily/07-06-2026.md` summarizing the
remediation. Use the same non-claim language as before.

**Step 4: Commit and push**

```bash
git push origin master
```

Capture the final SHA. Get the run ID:

```bash
gh run list --branch master --limit 1 --json headSha,databaseId
```

**Step 5: Wait for CI**

```bash
gh run watch <run-id> --exit-status
```

Expected: `status=completed`, `conclusion=success`.

**Step 6: Deploy via Ansible**

```bash
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml \
  --vault-password-file ~/.vault_pass.txt
```

Capture deploy output (9 ok, 0 failed expected).

**Step 7: Live verification**

```bash
curl -sS https://bond.thorchain.no/api/health
curl -sSI https://bond.thorchain.no/sitemap.xml | head
curl -sSI https://bond.thorchain.no/robots.txt | head
curl -sS https://bond.thorchain.no/manifest.webmanifest | head
curl -sSI https://bond.thorchain.no/api/health | grep -iE 'x-content|referrer|cache-control|strict-transport'
```

Expected: live SHA matches the pushed SHA; sitemap, robots, manifest all 200;
security headers present.

**Step 8: Browser-based hydration smoke**

Use Playwright in `e2e/post-remediation.spec.ts` (create) to verify:

```ts
import { test, expect } from './fixtures';

test('live /dashboard/portfolio renders after hydration', async ({ page }) => {
  await page.goto('/dashboard/portfolio?address=thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
  await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible();
});
```

Clean any localStorage / browser-local data after.

**Step 9: Update Obsidian with CI + deploy evidence**

Append a section to `Heimdall.md` and `07-06-2026.md` with:
- Final SHA
- Local gate counts
- CI run ID, headSha, status, conclusion
- Deploy output
- Live health response (with version)
- Live security header presence

Use the established non-claim language (no unverified CI/deploy/live claims).

**Step 10: Commit Obsidian — N/A (Obsidian is outside the repo)**

Obsidian lives in `/Users/reidar/Obsidian/Hermes/Hermes/`. No git
operation needed; just edit in place.

---

## Cross-Phase Notes

- After every task, run `git status --short` to make sure only the expected
  files are touched. If `git diff --check` warns about whitespace, fix
  before commit.
- After every 3-4 tasks, run `npm run typecheck && npm run lint -- --max-warnings=0`
  to catch drift early.
- After Phase A and B, run focused e2e on the changed surfaces:
  `npx playwright test e2e/not-found.spec.ts e2e/error.spec.ts e2e/loading.spec.ts e2e/seo.spec.ts e2e/skip-link.spec.ts e2e/reduced-motion.spec.ts e2e/security-headers.spec.ts`
- After Phase C, run targeted API tests:
  `npx vitest run src/app/api/pools/__tests__/route.test.ts src/app/api/address/[address]/route.test.ts src/lib/api/__tests__/cors.test.ts`
- After Phase D, run `git ls-files | grep -E 'sisyphus|DS_Store'` to confirm
  no tracked files remain.
- After Phase E, open a draft PR and observe the mock-data guard.
- After Phase F, run `npm run test:coverage` to confirm the new threshold
  is met. If not, iterate F-1..F-4.
- After Phase G, run the full e2e suite to make sure widget splits didn't
  break anything.

## Plan Acceptance

The plan is complete when:

- All 30 tasks are committed individually.
- Full local release gate passes on a clean tree.
- CI passes for the exact pushed SHA.
- Live verification shows: `/api/health` returns the pushed SHA, sitemap/
  robots/manifest serve, security headers present, `/dashboard/portfolio`
  renders after hydration, no console errors.
- Obsidian notes are updated with evidence and non-claims.

A green local gate is **not** enough — the plan only counts as complete
when the exact pushed revision is verified live.
