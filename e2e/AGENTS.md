# E2E Tests — Playwright

Browser-level end-to-end tests for critical user flows.

## STRUCTURE
```
e2e/
├── homepage.spec.ts              # Landing page smoke tests
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
└── comprehensive.spec.ts         # Visual/a11y/API edge coverage
```

## CONVENTIONS

**Test style**: `test.describe` + `beforeEach` with direct `page.goto()`. Browser API mocks via `context.addInitScript()`. API failures mocked with `page.route()`.

**Non-standard patterns**: Tests use `page.evaluate()` and `page.waitForTimeout()` for wallet UI interactions instead of pure locator-first patterns.

**Base URL**: `http://localhost:3000` (production build launched via `npm run build && npm start`).

**Production E2E**: Playwright boots a production build before running tests. `webServer.command` is `npm run build && npm start` with a 180s timeout to accommodate the build. `reuseExistingServer: !process.env.CI` allows local re-runs to skip the build when a server is already running. In CI the build always runs fresh.

**Mocking**: Most specs mock API routes inline with `page.route()` and fixture objects. Wallet tests use `context.addInitScript()` to inject `window.keplr`/`window.xfi` shims.

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
