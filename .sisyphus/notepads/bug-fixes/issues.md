## 2026-04-17 Task: task-1-risk-tvl
- Playwright shows pre-existing console 404s for `/api/midgard/v2/thorname/rlookup/<address>` on addresses without THORName entries. These were present during QA but are unrelated to the TVL fix.

## 2026-04-17 Task: task-2-unbond-leave
- First implementation attempt widened the fetch filters but still mapped every `useBondHistory` action to `BOND`, which would corrupt derived history values.
- `transaction-history.tsx` was updated to fetch `bond,unbond,leave`, but its filter still omitted explicit `unbond` actions, so the user-visible history remained incomplete.
- Browser QA on `/dashboard/transactions` showed `/api/midgard/v2/actions?...type=bond,unbond,leave` returns `502 Bad Gateway`.
- `midgard-openapi.json` documents `bond`, `unbond`, and `leave` under the `txType` query parameter, not the `type` query parameter, so the current fetch contract is wrong.
- After switching to `txType`, browser QA still showed `useBondHistory` requesting `limit=100`, while `midgard-openapi.json` documents a maximum limit of `50`. The page still logs 502s until that over-limit request is fixed.

## 2026-04-17 Task: task-4-dashboard-shell
- First Wave 2 implementation only changed the `useState(Date.now())` initializer to a lazy initializer but left `const elapsed = Date.now() - lastUpdated` in render.
- Targeted ESLint still reports `react-hooks/purity` at `src/components/layout/dashboard-shell.tsx:49`, so Task 4 remains incomplete until that render-time `Date.now()` call is removed.

## 2026-04-17 Task: task-5-lp-data
- I did not find a live LP member address to visually exercise the new `available/staged` mapping on populated cards/rows.
- Browser QA therefore validated the hook change statically plus the LP page empty-state/runtime behavior for a non-LP address, not a populated LP portfolio.
