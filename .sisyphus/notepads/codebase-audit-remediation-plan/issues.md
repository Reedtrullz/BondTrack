
- Browser QA for the rewards route is currently blocked by a real `RewardsPage` hook-order error (`Rendered more hooks than during the previous render`) when exercising mocked route/address changes. This must be fixed before end-to-end verification of PnL route-state behavior can be trusted.

- 2026-04-18 audit: 6 pre-existing failures remain in `use-watchlist.test.ts` (5) and `fee-calculations.test.ts` (1). These are not caused by the churn-out-risk work.
  - `use-watchlist` failures are stale fixtures: the tests use short mock addresses like `thor1abc123`, but the hook now sanitizes storage and rejects invalid THORChain addresses before state is persisted/returned.
  - `fee-calculations` failure is an expectation mismatch: the test treats `operatorFee: 2.0` as a scenario that should cap at 100%, but the utility interprets operator fees as basis points and returns `0.02%` for that input.
  - Action: keep as known issues for now and fix the tests/fixtures later so the baseline matches production validation rules.

- 2026-04-18 follow-up: fixed `use-watchlist.test.ts` by installing a stateful in-memory `localStorage` mock in the test and updating fixtures to valid THORChain-style addresses so the hook’s lazy initializer can read pre-seeded storage during render.

- 2026-04-18 remediation: removed duplicate raw Midgard interface declarations from `src/lib/api/midgard.ts` and deleted the unused legacy wallet hook at `src/hooks/use-wallet.ts`. Build verification passed after cleanup.

- 2026-04-18 remediation: fixed silent storage failures in `use-watchlist.ts`, `use-alerts.ts`, and `use-pending-transactions.ts` by logging `localStorage` read/write errors with `console.error` while keeping hook behavior unchanged. Production build passed after the change.
