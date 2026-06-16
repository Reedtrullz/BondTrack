# E2E Tests — Playwright

Browser-level end-to-end tests for critical user flows. The suite currently has 20 specs; keep this structure block representative rather than treating it as an exhaustive inventory.

## STRUCTURE
```
e2e/
├── homepage.spec.ts              # Landing page smoke tests
├── command-center.spec.ts        # Default /dashboard triage experience
├── dashboard-navigation.spec.ts  # Sidebar nav + routing
├── dashboard-pages.spec.ts       # Page render smoke checks
├── portfolio.spec.ts             # Portfolio page + bond display
├── transactions.spec.ts          # Transaction composer flows
├── mobile-critical.spec.ts       # Focused phone-width release smoke checks
├── wallet.spec.ts                # Wallet connect stubs
├── risk-security.spec.ts         # Risk + network security panels
├── lp-il.spec.ts                 # LP positions + IL calculator
├── tax-export.spec.ts            # Tax CSV export flow
├── api-health.spec.ts            # API health/edge-case coverage
├── redirects.spec.ts             # Redirect/routing coverage
├── seo.spec.ts                   # Sitemap/robots/manifest identity checks
└── comprehensive.spec.ts         # Visual/a11y/API edge coverage
... plus explorer, API guard, changelog, settings, learn, LP, nodes, rewards, and other focused provider-safety specs.
```

## CONVENTIONS

**Test style**: `test.describe` + `beforeEach` with direct `page.goto()`. Browser API mocks via `context.addInitScript()`. API failures mocked with `page.route()`.

**Non-standard patterns**: Tests use `page.evaluate()` and `page.waitForTimeout()` for wallet UI interactions instead of pure locator-first patterns.

**Base URL**: `http://localhost:3000` (production build launched via the standalone artifact: `node .next/standalone/server.js` after copying `public/` and `.next/static/` into `.next/standalone/`).

**Production E2E**: Playwright boots a production build before running tests. `webServer.command` runs `npm run build` and then `npm start`; `npm start` prepares the standalone artifact's `public/` and `.next/static/` directories, then starts `node .next/standalone/server.js`. The 180s timeout accommodates the build. `PLAYWRIGHT_REUSE_SERVER=true` allows local re-runs to skip the build when a server is already running. CI leaves that unset so the build always runs fresh. The default config includes Desktop Chrome plus a focused `mobile-critical` project for command center, portfolio, and transaction safety coverage.

**Mocking**: Most specs mock API routes inline with `page.route()` and fixture objects. Broad dashboard smoke specs can use `helpers/dashboard-api-mocks.ts`. Wallet tests use `context.addInitScript()` to inject `window.keplr`/`window.xfi` shims.

**API failures**: Same-origin `/api/*` 4xx/5xx responses fail tests by default. Use the `allowApiErrors([...])` fixture only in tests that intentionally assert error UI, and keep the allowlist path-specific.

**Selectors**: Prefer semantic locators (`getByRole`, `getByLabel`, `getByPlaceholder`) scoped to the named region, landmark, card, table, tab panel, or toast under test. For duplicate text, first narrow the surface with a role/label/test id or `filter({ has: ... })`, then assert exact text within that scope. If the UI has no stable user-facing anchor, add an accessible name or a focused `data-testid` to the product surface instead of relying on broad page-level matches.

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
- Prefer semantic selectors that reflect the public read-only UI: `getByRole(..., { name })`, `getByLabel(...)`, and locators scoped through named regions, tab panels, menus, dialogs, or dashboard panels
- Do not use broad `.first()`, `.nth()`, or `.last()` to silence duplicate text/role matches. Narrow by accessible role/name/level, `{ exact: true }`, a scoped `getByLabel(...)` parent, or `filter({ hasText })` first
- `.first()`/`.nth()`/`.last()` are allowed only inside a scoped repeated collection when ordering is the behavior under test; leave an `e2e-selector-order-ok: <reason>` comment explaining the exception. Do not bypass this with computed access such as `locator['first']()`
- Use `{ exact: true }` for page/title headings and compact repeated labels/buttons when partial matches could pass against duplicate or concatenated UI copy
