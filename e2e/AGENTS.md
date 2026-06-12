# E2E Tests — Playwright

Browser-level end-to-end tests for critical user flows.

## STRUCTURE
```
e2e/
├── homepage.spec.ts              # Landing page smoke tests
├── command-center.spec.ts        # Default /dashboard triage experience
├── dashboard-navigation.spec.ts  # Sidebar nav + routing
├── dashboard-pages.spec.ts       # Page render smoke checks
├── portfolio.spec.ts             # Portfolio page + bond display
├── transactions.spec.ts          # Transaction composer flows
├── wallet.spec.ts                # Wallet connect stubs
├── risk-security.spec.ts         # Risk + network security panels
├── lp-il.spec.ts                 # LP positions + IL calculator
├── tax-export.spec.ts            # Tax CSV export flow
├── api-health.spec.ts            # API health/edge-case coverage
├── redirects.spec.ts             # Redirect/routing coverage
├── seo.spec.ts                   # Sitemap/robots/manifest identity checks
└── comprehensive.spec.ts         # Visual/a11y/API edge coverage
```

## CONVENTIONS

**Test style**: `test.describe` + `beforeEach` with direct `page.goto()`. Browser API mocks via `context.addInitScript()`. API failures mocked with `page.route()`.

**Non-standard patterns**: Tests use `page.evaluate()` and `page.waitForTimeout()` for wallet UI interactions instead of pure locator-first patterns.

**Base URL**: `http://localhost:3000` (production build launched via the standalone artifact: `node .next/standalone/server.js` after copying `public/` and `.next/static/` into `.next/standalone/`).

**Production E2E**: Playwright boots a production build before running tests. `webServer.command` runs `npm run build` and then `npm start`; `npm start` prepares the standalone artifact's `public/` and `.next/static/` directories, then starts `node .next/standalone/server.js`. The 180s timeout accommodates the build. `PLAYWRIGHT_REUSE_SERVER=true` allows local re-runs to skip the build when a server is already running. CI leaves that unset so the build always runs fresh.

**Mocking**: Most specs mock API routes inline with `page.route()` and fixture objects. Broad dashboard smoke specs can use `helpers/dashboard-api-mocks.ts`. Wallet tests use `context.addInitScript()` to inject `window.keplr`/`window.xfi` shims.

**API failures**: Same-origin `/api/*` 4xx/5xx responses fail tests by default. Use the `allowApiErrors([...])` fixture only in tests that intentionally assert error UI, and keep the allowlist path-specific.

## COMMANDS
```bash
npm run e2e       # Run all Playwright tests
npm run e2e:ui    # Interactive UI mode
npm run e2e:debug # Debug mode
```

## ANTI-PATTERNS
- Do not rely on `waitForTimeout` for state assertions — prefer explicit locators
- Do not skip wallet mocks in CI — tests run headless without real extensions
- Do not use fragile XPath locators — use semantic text/role locators
- Use `.first()` when text locators match multiple elements
- Use `{ exact: true }` for heading matches to avoid partial matches
