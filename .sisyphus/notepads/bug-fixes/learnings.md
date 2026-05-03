## 2026-04-17 Task: initialization
- `formatRuneFromNumber(num)` already converts a RUNE-unit number into raw 1e8 units and then calls `formatRuneAmount`; never wrap its result in `formatRuneAmount` again.
- Existing UI pattern for values already divided to RUNE units is `formatRuneAmount(String(Math.floor(value * 1e8)))` (see `transaction-history.tsx` and `pnl-dashboard.tsx`).
- `getActions(address, limit, type?)` only exposes a single optional `type` string parameter in `src/lib/api/midgard.ts`; call sites may need either a comma-separated string or a no-filter fetch with client-side filtering.
- `src/components/dashboard/transaction-history.tsx` also hardcodes `getActions(..., 'bond')`, so transaction completeness may need matching treatment beyond the hook fix.
- LP UI components expect status values limited to `'active' | 'standby' | 'jailed' | 'at-risk'`, while Midgard pool data exposes a raw string `status` field that will need mapping.

## 2026-04-17 Task: task-1-risk-tvl
- Verified in-browser on `http://127.0.0.1:3000/dashboard/risk?address=thor1456ja57j5wasf23mhgjpskq8mwhxzxejplh0z5` that the Risk Summary Banner now renders `89402370.74 TVL`, confirming the banner no longer double-divides the network liquidity value.

## 2026-04-17 Task: task-2-unbond-leave
- Updated `use-bond-history.ts:28` and `transaction-history.tsx:66` to fetch `bond,unbond,leave` instead of just `bond`.
- Midgard `/v2/actions` supports comma-separated type values, so `bond,unbond,leave` is a valid query parameter.
- Updated `parseActions` filter in `transaction-history.tsx` to include 'leave' type (mapped to 'UNBOND' client type).

## 2026-04-17 Task: task-2-final
- Midgard `bond/unbond/leave` belongs under the `txType` query parameter, not `type`; the helper now emits `txType` and the two consumers use valid `limit=50` requests.
- Browser verification on `/dashboard/transactions?address=thor1456ja57j5wasf23mhgjpskq8mwhxzxejplh0z5` showed both action-history requests returning `200 OK`; the page no longer throws action-history 502s.

## 2026-04-17 Task: task-2-fix-unbond-leave-logic
- **Defect**: Widening fetch alone corrupts history math - all actions were mapped to `type: 'BOND'` regardless of actual type.
- **Fix in `use-bond-history.ts`**: Map `bond`/`addLiquidity` → `BOND`, `unbond`/`unstake`/`leave` → `UNBOND`. Only sum BOND amounts for `initialBond` calculation.
- **Fix in `transaction-history.tsx`**: Added `'unbond'` to filter (Midgard returns 'unbond', not 'unstake').

## 2026-04-17 Task: task-2-fix-txType-param
- **Browser QA failure**: `502 Bad Gateway` for `/api/midgard/v2/actions?...type=bond,unbond,leave`
- **Root cause**: Midgard API uses `txType` parameter for bond/unbond/leave, not `type` (which is for action types like swap/addLiquidity).
- **Fix**: Renamed `type` parameter to `txType` in `getActions()` in `src/lib/api/midgard.ts`.
- OpenAPI spec (`midgard-openapi.json:1203-1210`) confirms: `type` = action types, `txType` = transaction types (bond, unbond, leave, etc.)

## 2026-04-17 Task: task-2-fix-limit-param
- **Browser QA failure**: `502 Bad Gateway` from `useBondHistory` due to `limit=100` exceeding API max of 50.
- **Fix**: Changed `limit=100` to `limit=50` in `use-bond-history.ts:28`.
- OpenAPI spec (`midgard-openapi.json:1239`) documents: `maximum: 50` for limit parameter.

## 2026-04-17 Task: task-3-pendulum-threshold
- **Issue**: `network-security-metrics.tsx` used `<= 1.2` for LP Favored threshold while risk page uses `< 1.5`.
- **Fix**: Changed line 40 in `network-security-metrics.tsx` from `<= 1.2` to `< 1.5` to align with risk page pendulum logic.

## 2026-04-17 Task: task-4-dashboard-shell-date-now
- **Issue**: `useState<number>(Date.now())` called at render time + `elapsed = Date.now() - lastUpdated` called Date.now() in render.
- **Fix**: Replaced with tick-based calculation: track tick-at-refresh, compute elapsed as `(tick - tickAtRefresh) * 10000` ms.
- **Preserved**: 10-second tick interval still triggers freshness updates; manual refresh captures current tick.

## 2026-04-17 Task: task-4-final
- Browser QA on `/dashboard/transactions?address=thor1456ja57j5wasf23mhgjpskq8mwhxzxejplh0z5` showed the freshness label move from `3m ago` to `10s ago` after invoking the refresh control.
- The same refresh interaction re-fired the expected dashboard API requests, confirming the tick-based replacement preserved manual refresh behavior.

## 2026-04-17 Task: task-5-lp-data
- `use-lp-positions.ts` now maps live pool statuses `available -> active` and `staged -> standby`, and derives health scores from those real status values instead of returning a blanket `100`.
- Browser QA on `/dashboard/lp?address=thor1456ja57j5wasf23mhgjpskq8mwhxzxejplh0z5` confirmed the page still renders correctly for a non-LP address (`No LP positions found.`) while `GET /api/midgard/v2/pools` remains healthy.

## 2026-04-17 Task: task-6-lint-cleanup
- Targeted ESLint on the modified `risk/page.tsx` and `network-security-metrics.tsx` now returns zero problems.
- Post-cleanup browser smoke check still loads the risk page successfully; remaining console noise is from previously observed 404s on unrelated THORName/member lookups, not from the lint cleanup itself.

## 2026-04-17 Task: task-5-lp-real-data
- **Issue**: `use-lp-positions.ts` had hardcoded placeholders: `healthScore: 100`, `status: 'active'`.
- **Fix**: Added `mapPoolStatusToUi()` and `deriveHealthScore()` helpers that map Midgard pool status to LP UI types.
- **Mapping**: `available` → `active`/`100`, `staged` → `standby`/`50`; unknown → `standby`/`50`.
- **Preserved**: `slashRisk: 0` remains explicitly set (LP positions cannot be slashed like node bonds).
- Build verified: `npm run build` passes with no errors.

## 2026-04-17 Task: task-6-address-lint-errors
- Removed 14 unused-variable warnings across `risk/page.tsx` and `network-security-metrics.tsx`.
- In `risk/page.tsx`: removed `DollarSign`, `ArrowUp`, `formatRuneAmount` imports; removed `networkLoading`, `constants`, `constantsLoading`, `networkBondDisplay`, `jailedCount`, `atRiskCount`, `totalBonded`, `bondsDisplay`, `liquidityDisplay` locals; removed `useNetworkConstants` import (fully unused after TVL fix); removed `positions` param from `IncentivePendulum` (no longer used after network-only data refactor).
- In `network-security-metrics.tsx`: removed `constants` from `useNetworkConstants` destructuring and `blockReward` local.
- `npx eslint src/app/dashboard/risk/page.tsx src/components/dashboard/network-security-metrics.tsx` passes with 0 problems.
- `npm run build` passes with 0 errors.

## 2026-04-17 Task: docs-sync
- Root docs needed updates in five places after the bug-fix wave: the risk formatting rule, Midgard actions query guidance, RECENT CHANGES, KNOWN ISSUES, and the LP dashboard plan.
- The most important documentation correction was switching every bond-history reference from `/v2/actions?type=bond` to `/v2/actions?txType=bond,unbond,leave&limit=50`, because the old guidance now contradicts the shipped code and Midgard contract.
