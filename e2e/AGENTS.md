# E2E Tests — Playwright

Browser-level end-to-end tests for critical user flows.

## STRUCTURE
```
e2e/
├── homepage.spec.ts          # Landing page smoke tests
├── dashboard-navigation.spec.ts  # Sidebar nav + routing
├── dashboard-pages.spec.ts   # Page render smoke checks
├── transactions.spec.ts      # Transaction composer flows
├── wallet.spec.ts            # Wallet connect stubs
└── comprehensive.spec.ts     # Visual/a11y/API edge coverage
```

## CONVENTIONS

**Test style**: `test.describe` + `beforeEach` with direct `page.goto()`. Browser API mocks via `context.addInitScript()`. API failures mocked with `page.route()`.

**Non-standard patterns**: Tests use `page.evaluate()` and `page.waitForTimeout()` for wallet UI interactions instead of pure locator-first patterns.

**Base URL**: `http://localhost:3000` (dev server launched via `npm run dev`).

## COMMANDS
```bash
npm run e2e       # Run all Playwright tests
npm run e2e:ui    # Interactive UI mode
npm run e2e:debug # Debug mode
```

## ANTI-PATTERNS
- Do not rely on `waitForTimeout` for state assertions — prefer explicit locators
- Do not skip wallet mocks in CI — tests run headless without real extensions
