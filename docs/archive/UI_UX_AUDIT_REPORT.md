# BondTrack UI/UX & Math Audit Report

Date: 2026-04-29  
Auditor: Codex

## Executive Summary

BondTrack/Heimdall has a strong dashboard foundation: the route structure is coherent, the sample bond address resolves into usable Rewards, Risk, and Transaction pages, and the app already exposes advanced concepts like operator fee leakage, compound forecasts, bond-to-pool security, and LP pricing provenance. The current production risk is accuracy and trust. Several APY values are displayed at the wrong scale, reward projections use inconsistent daily-rate math, notification state causes repeated React hydration errors, live Midgard proxy failures leave important sections stuck or noisy, and several E2E tests now fail because UI labels, placeholders, wallet flows, and route behavior have drifted. The highest-value next step is to fix numeric units and hydration first, then stabilize API fallbacks and transaction/wallet interactions.

## Math Accuracy Verification

### Formulas Verified

| Formula | File | Lines | Status | Notes |
|---|---:|---:|---|---|
| RUNE raw conversion divisor | `src/lib/utils/formatters.ts` | 3, 37-49, 59-65 | Pass with caveat | `runeToNumber()` converts raw 1e8 strings to display numbers and `formatRuneAmount()` formats raw amounts. Caveat: when `runeToNumber()` receives a number, it assumes raw 1e8 units, so callers must not pass already-normalized RUNE numbers. |
| Bond provider share | `src/lib/utils/calculations.ts` | 7-12 | Pass | Uses `BigInt` ratio math and returns percent with two-decimal precision. |
| Bond APY | `src/lib/utils/calculations.ts` | 18-32 | Pass | Formula is `(share * currentAward * (1 - fee) * NETWORK.CHURNS_PER_YEAR / bond) * 100`; it uses `NETWORK.CHURNS_PER_YEAR`. |
| Churns per year constant | `src/lib/config.ts` | 9-13 | Pass | `365 / 2.5 = 146`, consistent with a 2.5-day churn interval. |
| Yield benchmark node APY | `src/lib/utils/yield-benchmarks.ts` | 16-19 | Pass with caveat | Uses current award and `NETWORK.CHURNS_PER_YEAR`, but does not apply operator fee, so it is gross network comparison rather than user net APY. |
| Reward projection daily rate | `src/components/dashboard/reward-projections.tsx` | 51-63 | Bug | Uses compounded daily rate `Math.pow(1 + APY/100, 1/365) - 1`, while Portfolio Summary uses simple APY/365. |
| Personal fee leakage | `src/lib/utils/fee-calculations.ts` | 20-25, 69-72 | Bug/caveat | `normalizeApy()` returns decimal APY, then monthly uses `apy / 12`; this is not the same as the app's 30-day daily approximation. |
| Pool APY normalization | `src/lib/utils/fee-calculations.ts` | 20-25 | Pass internally | `12.5` becomes `0.125`; `0.125` stays `0.125`. The bug is downstream display. |
| Pool APY display | `src/components/dashboard/market-overview.tsx` | 111, 173-180 | Bug | Decimal APY is passed to `formatPercent()`, which prints `0.13%` instead of `12.50%`. |
| LP APY display | `src/app/dashboard/lp/page.tsx` | 185-188 | Bug | Same decimal-to-percent display mismatch as Market Overview. |
| LP IL formula | `src/lib/utils/il-calculator.ts` | 13-47 | Pass | Uses standard XYK impermanent loss: `2*sqrt(priceRatio)/(1+priceRatio)-1`. |
| LP valuation fallback | `src/lib/utils/lp-analytics.ts` | 111-157 | Risk | When entry pricing is unavailable, labels can imply P/L while the code computes current LP yield versus current-price HODL, not full historical P/L. |
| Fee revenue personal share | `src/components/dashboard/fee-revenue-summary.tsx` | 25-53 | Pass with data caveat | Formula is `(userBond / totalActiveBond) * dailyRevenue`; returns zero if `summary` or `totalActiveBond` is missing. |
| Portfolio weighted APY | `src/app/dashboard/portfolio/page.tsx` | 165-167, 330-332 | Inconsistent | `weightedAPY` is already a percent in most bond-position data, but portfolio displays `(weightedAPY * 100).toFixed(2)%`, which can overstate by 100x if `netAPY` is percent. |
| Auto compound month labels | `src/components/dashboard/auto-compound-chart.tsx` | 47-67, 164-170 | Bug | Generates 13 points from current month through +12 months; because 2026-04-29 plus 11 and 12 months both land in March in display terms around year rollover, duplicate `Mar 27` labels are visible. |

### Bugs Found

1. **Reward projection daily math is inconsistent with portfolio daily earnings**
   - Path: `src/components/dashboard/reward-projections.tsx:51-63`, `src/app/dashboard/portfolio/page.tsx:348-352`
   - Evidence: `RewardProjections` compounds APY into a daily rate, while Portfolio Summary uses `totalBondedRune * weightedAPY / 365`.
   - Sample: 5,871.72 RUNE at 10% APY gives simple daily `1.6087 RUNE`; compounded daily gives `1.5334 RUNE`, `4.68%` lower.
   - Proposed fix: choose one product convention. For dashboard consistency, display simple prorated daily/weekly/monthly rewards unless the component is explicitly labelled "compounded".

2. **Monthly fee leakage uses calendar-month approximation that differs from 30-day daily rate**
   - Path: `src/lib/utils/fee-calculations.ts:69`
   - Evidence: at 20% APY, `apy / 12 = 0.0166667`, while `apy / 365 * 30 = 0.0164384`; monthly is `1.39%` higher.
   - Proposed fix: define `monthly` as either 30-day or annual/12 everywhere and update labels. Prefer `daily * 30` because the UI labels "monthly projection" next to daily-derived projections.

3. **Pool APY displays as near-zero because decimal APY is not converted before formatting**
   - Path: `src/components/dashboard/market-overview.tsx:111,173-180`, `src/app/dashboard/lp/page.tsx:185-188`, `src/lib/hooks/use-lp-positions.ts:326-330`
   - Evidence: `normalizeApy('12.5')` returns `0.125`; `formatPercent(0.125)` returns `0.13%`, but the expected display is `12.50%`.
   - Proposed fix: add a decimal percent formatter such as `formatDecimalPercent(value)` or multiply normalized APY by 100 at display boundaries.

4. **Portfolio Total Bonded KPI omits the RUNE unit**
   - Path: `src/components/dashboard/portfolio-summary.tsx:31-35`
   - Evidence: KPI value is `5,871.72` with no `ᚱ` or `RUNE`, while the requested convention says RUNE amounts should be explicit.
   - Proposed fix: render `formatRuneFromNumber(totalBonded)` or append `RUNE` consistently.

5. **Portfolio weighted APY may be multiplied by 100 twice**
   - Path: `src/app/dashboard/portfolio/page.tsx:165-167,330-332`
   - Evidence: `calculateAPY()` returns percent values, while portfolio renders `(weightedAPY * 100).toFixed(2)%`.
   - Proposed fix: normalize the `BondPosition.netAPY` contract: either store decimal APY and multiply at display, or store percent APY and never multiply at display. Current rewards page behavior suggests percent APY is expected.

6. **Raw RUNE is parsed with `Number()` in bond ranking flags**
   - Path: `src/lib/hooks/use-bond-positions.ts:19-29,81-83`
   - Evidence: `Number(n.total_bond)` and `Number(constants.int_64_values.OptimalBondD)` bypass the RUNE conversion convention.
   - Proposed fix: use raw `BigInt` for raw-to-raw comparisons, or `runeToNumber()` when comparing normalized RUNE amounts.

7. **LP historical price fallback uses raw amounts directly**
   - Path: `src/lib/hooks/use-lp-positions.ts:174-181`
   - Evidence: fallback asset entry price uses `Number(pool.runeDeposit)` and `Number(pool.assetDeposit)` directly. The ratio cancels decimals only if both assets use the same 1e8 scale, which is not guaranteed across all assets.
   - Proposed fix: use parsed native decimal metadata or existing normalized helper functions for both sides.

8. **Local chart conversion duplicates `runeToNumber()`**
   - Path: `src/components/dashboard/fee-revenue-chart.tsx:26-41`
   - Evidence: component defines a local `runeToNumber()` instead of importing the shared formatter.
   - Proposed fix: import `runeToNumber` from `src/lib/utils/formatters.ts` to keep conversion semantics centralized.

9. **LP P/L can look definitive when historical pricing is unavailable**
   - Path: `src/lib/utils/lp-analytics.ts:111-157`, `src/lib/hooks/use-lp-positions.ts:286-306,345-352`
   - Evidence: fallback returns a numeric `netProfitLossPercent` based on current-price HODL, while UI surfaces "Net PnL" and "IL %" without always making pricing provenance prominent.
   - Proposed fix: surface "current-value estimate" and require a setup wizard/manual entry before showing full net P/L.

10. **Duplicate month labels in compounding forecast**
    - Path: `src/components/dashboard/auto-compound-chart.tsx:56-67`
    - Evidence: live Rewards page showed `Apr May ... Jan 27 Mar 27 Mar 27 Apr 27`, skipping/duplicating month labels.
    - Proposed fix: generate month labels from month indexes with a stable formatter and include enough year context to keep all ticks unique.

## UI/UX Testing Results

### Playwright Results

Command executed:

```bash
npx playwright test --reporter=list 2>&1
```

Result: **34 passed, 36 failed, exit code 1**.

Dominant failures:

- Repeated React hydration mismatch from `AlertToast` in dashboard routes.
- Dashboard navigation and page tests failing due redirect/current route expectations and hidden content.
- Transaction composer tests failing because labels/placeholders changed (`Amount to Unbond` vs `UNBOND AMOUNT`, no `thor1...` placeholder).
- Wallet tests failing because dropdown/connect state does not match expected mocked wallet behavior.
- Network security test expecting `2.00x`, while live/test UI renders a different ratio.
- Tax export test expecting `PnL Performance`, while Rewards now renders `Performance` and `Profit & Loss`.

### Manual Browser Findings

Manual verification was run against `http://localhost:3000` after starting the local Next dev server because localhost initially returned `ERR_CONNECTION_REFUSED`.

#### 1. Homepage -> Address Entry

- Correct: Homepage renders brand, address input, `Lookup` button, and feature cards for Node Health, Earnings, Risk Alerts, and Transactions.
- Correct: Entering `thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346` redirects to `/dashboard/portfolio?address=...`.
- Wrong: Dashboard shell shows wallet balance as `ᚱᚱ0.20 available`, a duplicated RUNE symbol.
- Wrong: Notification reminder appears immediately and persists across pages; it does not block top-right controls in desktop layout, but it adds noisy footer content and causes hydration errors.
- Screenshot description: Clean dark/amber landing page, then dashboard shell with left navigation and a bottom notification card.

#### 2. Portfolio Page

- Correct: Route resolves to `/dashboard/portfolio?address=...` and shell/nav render.
- Wrong: In the automated browser snapshot, the main Portfolio content did not render within the wait window; only header/shell, wallet, and notification prompt appeared.
- Wrong: Console logged `502` responses for `/api/midgard/v2/member/...`, which likely blocks LP portions of the unified portfolio.
- Wrong: Expected KPI values such as Total Bonded `ᚱ5,871.72` and RUNE Price `$0.5052` were not visible in the captured portfolio state.
- Screenshot description: Dashboard shell and notification prompt visible; portfolio body area effectively blank/loading.

#### 3. Overview Page

- Correct: `/dashboard/overview?address=...` redirects to `/dashboard/portfolio?address=...`, matching the known route convention.
- Wrong: Because it redirects to the same blocked Portfolio state, old overview-specific expectations should be updated or removed.
- Screenshot description: Same as Portfolio after redirect.

#### 4. Rewards Page

- Correct: Rewards page renders major sections: Performance, Profit & Loss, Yield Optimization, Personal Fee Audit, Compound Growth Forecast, Market Context, and RUNE Price.
- Correct: Bonded amount appears as `5871.72`; current bond value appears as `$2,966.40`; RUNE price path shows `$0.5052`.
- Wrong: Initial Bond shows `0.00`, which makes Bond Growth `N/A` and Total Return `$2,966.40 +0.00%`; this is misleading when historical initial bond is unavailable.
- Wrong: Personal Fee Audit shows huge monthly rewards (`ᚱ967.02/mo`, `ᚱ918.67/mo`) that should be rechecked after APY unit normalization.
- Wrong: Compound chart duplicate labels are visible: `Mar 27` appears twice.
- Wrong: Recharts warns that chart width/height are `-1`, indicating unstable chart container measurement.
- Screenshot description: Dense dashboard content, chart axis visible, duplicate month labels near the right edge, notification prompt at bottom.

#### 5. Risk Page

- Correct: Risk page renders Risk Monitor, Incentive Pendulum, Bond-to-Pool Gauge, Shield Analysis, and Your Nodes.
- Correct: Sample address shows `ᚱ5,871.72 Total Bonded`, `1 active`, and network TVL.
- Wrong: Health summary says `7 At Risk` while also showing `1 critical`; this contradicts the expected "85 Healthy" style and should be made semantically consistent.
- Wrong: Network Security and Pendulum both showed `1.14x` in the browser, while the known issue expected `1.08x` vs `1.18x`; tests still expect `2.00x`, so test data and live calculation assumptions have drifted.
- Wrong: Recharts container warnings appear on Risk as well.
- Screenshot description: Risk cards and pendulum are visible, with a severe slash/critical state and a warning-colored network security gauge.

#### 6. LP Page

- Correct: Route and dashboard shell render for `thor14wtqzhe9cj7jjtwkv4436jz00xphwr6m3zq9z8`.
- Wrong: Page remained in `Loading pool data... 67%` during the capture window.
- Wrong: Console showed `502` for THORName reverse lookup and several historical pool lookups (`DOGE.DOGE`, `BCH.BCH`, `GAIA.ATOM`).
- Wrong: IL % could not be verified from UI because the LP table/cards did not finish loading.
- Screenshot description: LP dashboard shell with loading progress bar stuck at 67%, notification prompt at bottom.

#### 7. Transactions Page

- Correct: Transaction Center, Transaction Composer, Watchlist, and Bond History render.
- Correct: BOND/UNBOND mode toggle works; clicking UNBOND changes the URL to include `action=unbond` and memo becomes `UNBOND:<node>:0`.
- Correct: Memo generation works with the preselected node.
- Wrong: Inputs have no placeholders or associated labels in DOM, causing E2E and accessibility fragility.
- Wrong: Copy button fails in headless browser due clipboard permission and displays duplicate error messages.
- Wrong: Bond History remains `Loading transactions...` while Midgard `/actions` returns `502`.
- Screenshot description: Functional composer card with generated memo, but copy failure state duplicated below the buttons.

#### 8. Changelogs Page

- Correct: Changelogs page renders a large "Odin's Journal" timeline with year/category controls and many entries.
- Correct: Year buttons and search/filter controls are present and can be interacted with.
- Wrong: The content is very long and heading-heavy; scanning is difficult because every nested item becomes a heading.
- Wrong: Search/filter state was difficult to verify in the automated text snapshot because the page contains many matching entries and no compact result count near the search.
- Screenshot description: Very tall changelog timeline with many headings, left dashboard nav, and bottom notification prompt.

## Issue Catalog

### P0 (Critical - Fix Immediately)

1. **APY display scale is wrong across pool surfaces**
   - Page/Component: `src/components/dashboard/market-overview.tsx`, `src/app/dashboard/lp/page.tsx`
   - Root Cause: `normalizeApy()` returns decimal values, then `formatPercent()` prints them as whole percent values.
   - Reproduction: Open Portfolio market overview or LP page with pool APY data.
   - Expected: `12.50%`; Actual: `0.13%` or `0.00%`.

2. **React hydration mismatch on all dashboard routes**
   - Page/Component: `src/app/dashboard/layout.tsx:115-120`, `src/components/alerts/alert-toast.tsx:51-107`
   - Root Cause: notification permission/dismissed state differs between server render and client render.
   - Reproduction: Open any dashboard route with notifications denied/off.
   - Expected: stable hydration; Actual: React hydration error and regenerated tree.

3. **Portfolio page can fail to render useful KPI content under Midgard member 502**
   - Page/Component: `src/app/dashboard/portfolio/page.tsx`, `src/lib/hooks/use-lp-positions.ts`
   - Root Cause: LP/member API failure path appears to block or delay unified portfolio content.
   - Reproduction: Open `/dashboard/portfolio?address=thor12mp...0346` while `/api/midgard/v2/member/...` returns 502.
   - Expected: bond KPIs render even if LP data fails; Actual: captured state showed only shell/header/prompt.

### P1 (High Priority)

4. **Reward projections disagree with daily earnings math**
   - Page/Component: `src/components/dashboard/reward-projections.tsx:51-63`
   - Root Cause: compounded daily rate vs simple APY/365 elsewhere.
   - Reproduction: Compare Reward Projections with Portfolio Est. Daily Earnings.
   - Expected: same stated convention; Actual: 4.68% lower daily reward at 10% APY in sample.

5. **Monthly fee projection convention is inconsistent**
   - Page/Component: `src/lib/utils/fee-calculations.ts:69`
   - Root Cause: monthly uses `apy / 12`, not `apy / 365 * 30`.
   - Reproduction: Run fee projection for monthly vs daily*30.
   - Expected: clear monthly convention; Actual: 1.39% difference at 20% APY.

6. **Portfolio weighted APY risks 100x display**
   - Page/Component: `src/app/dashboard/portfolio/page.tsx:165-167,330-332`
   - Root Cause: `weightedAPY` percent values are multiplied by 100 at display.
   - Reproduction: Load portfolio with nonzero bond APY.
   - Expected: e.g. `20.00%`; Actual could render `2000.00%`.

7. **Risk health messaging contradicts itself**
   - Page/Component: `src/app/dashboard/risk/page.tsx:122-166`
   - Root Cause: aggregate score and status pills use different severity language without a dominant state model.
   - Reproduction: Open Risk page for sample bond address.
   - Expected: one clear severity and explanation; Actual: `7 At Risk`, `1 active`, `1 critical`.

8. **LP page stalls when historical pricing endpoints fail**
   - Page/Component: `src/lib/hooks/use-lp-positions.ts:160-229`, `src/app/dashboard/lp/page.tsx`
   - Root Cause: historical pool lookup failures produce repeated 502s and visible long loading progress.
   - Reproduction: Open LP page for `thor14wt...q9z8`.
   - Expected: partial LP data with provenance warnings; Actual: stuck at `Loading pool data... 67%`.

9. **Transaction history cannot recover cleanly from Midgard actions 502**
   - Page/Component: `src/components/dashboard/transaction-history.tsx`, `src/lib/api/midgard.ts`
   - Root Cause: `/api/midgard/v2/actions?...` errors leave history loading/noisy.
   - Reproduction: Open Transactions page for sample bond address.
   - Expected: error state or cached history fallback; Actual: repeated 502 and `Loading transactions...`.

10. **Transaction composer labels/placeholders are inaccessible/test-fragile**
    - Page/Component: `src/components/dashboard/transaction-composer.tsx:227-240`
    - Root Cause: visual labels are not associated with inputs and placeholders are absent.
    - Reproduction: Inspect inputs on Transactions page.
    - Expected: accessible labels and stable placeholders; Actual: no placeholder/label association in DOM.

11. **Copy memo failure duplicates error feedback**
    - Page/Component: `src/components/dashboard/transaction-composer.tsx:162-180,244-276`
    - Root Cause: inline and primary copy feedback can render the same failure message.
    - Reproduction: Click `Copy Memo` in headless/browser without clipboard permission.
    - Expected: one actionable error; Actual: duplicate "Copy failed" messages.

12. **Wallet connection flow fails E2E expectations**
    - Page/Component: `src/components/wallet/wallet-connect.tsx:154-225`
    - Root Cause: dropdown availability and mocked wallet connection state do not match tests.
    - Reproduction: Run `e2e/wallet.spec.ts`.
    - Expected: selectable wallet menu and connected address; Actual: several wallet tests fail to show connected address.

### P2 (Medium Priority)

13. **Duplicate RUNE symbol in wallet balance**
    - Page/Component: `src/components/layout/dashboard-shell.tsx:154`
    - Root Cause: literal `ᚱ` is prepended to `formatRuneFromNumber()`, which already includes `ᚱ`.
    - Reproduction: Open dashboard shell.
    - Expected: `ᚱ0.20 available`; Actual: `ᚱᚱ0.20 available`.

14. **Portfolio Total Bonded KPI omits RUNE unit**
    - Page/Component: `src/components/dashboard/portfolio-summary.tsx:31-35`
    - Root Cause: value is a formatted number string only.
    - Reproduction: Render summary.
    - Expected: `ᚱ5,871.72` or `5,871.72 RUNE`; Actual: `5,871.72`.

15. **Performance Summary shows placeholder `--` or misleading zeros**
    - Page/Component: `src/app/dashboard/portfolio/page.tsx:287-353`
    - Root Cause: historical price windows and APY values are missing or inconsistently scaled.
    - Reproduction: Open Portfolio under partial API data.
    - Expected: explicit unavailable state with cause; Actual: `--`/zero-like values.

16. **PnL initial bond defaults to current or zero in confusing ways**
    - Page/Component: `src/components/dashboard/pnl-dashboard.tsx:152-176`
    - Root Cause: when bond history is missing, initial bond and entry price fall back to current values.
    - Reproduction: Open Rewards page for sample address.
    - Expected: clear "set initial bond" setup state; Actual: Initial Bond `0.00`, Current Bond `5871.72`, Total Return `$2,966.40 +0.00%`.

17. **Recharts container warnings indicate unstable chart sizing**
    - Page/Component: Rewards and Risk charts
    - Root Cause: `ResponsiveContainer` is mounted before measurable parent dimensions in at least some views.
    - Reproduction: Open Rewards/Risk and inspect console.
    - Expected: no chart sizing warnings; Actual: width/height `-1` warnings.

18. **Network security tests and live ratio expectations drifted**
    - Page/Component: `src/components/dashboard/network-security-card.tsx`, `src/app/dashboard/risk/page.tsx`
    - Root Cause: tests expect `2.00x`; live browser rendered `1.14x`; older QA expected `1.08x`/`1.18x`.
    - Reproduction: Run `e2e/risk-security.spec.ts`.
    - Expected: one source-of-truth fixture or live-tolerant assertion; Actual: test fails.

19. **Changelog information hierarchy is too heading-heavy**
    - Page/Component: `src/app/dashboard/changelogs/page.tsx`
    - Root Cause: nested entries are all promoted into headings.
    - Reproduction: Open Changelogs and scan page.
    - Expected: grouped timeline with compact result summaries; Actual: very long heading list.

20. **Notification prompt is still globally noisy**
    - Page/Component: `src/components/alerts/alert-toast.tsx:94-153`
    - Root Cause: persistent bottom prompt appears on every dashboard route until dismissed.
    - Reproduction: Open dashboard with notifications denied/off.
    - Expected: low-noise notification center or single reminder; Actual: repeated prompt across all pages.

### P3 (Nice to Have)

21. **Changelog search lacks obvious result count**
    - Page/Component: `src/app/dashboard/changelogs/page.tsx`
    - Root Cause: filters change content without a compact count/summary.
    - Reproduction: Search `ADR`.
    - Expected: "N results" near controls; Actual: hard to verify filter effect in long page.

22. **LP export writes raw amounts**
    - Page/Component: `src/app/dashboard/lp/page.tsx:127-140`
    - Root Cause: CSV rows use raw amount strings.
    - Reproduction: Export LP data.
    - Expected: human-readable RUNE/asset amounts plus raw columns if needed; Actual: raw values only.

23. **Realistic Mode copy is underspecified**
    - Page/Component: `src/components/dashboard/auto-compound-chart.tsx:88-105`
    - Root Cause: toggle title explains it only on hover.
    - Reproduction: Open Rewards page.
    - Expected: concise inline explanation or tooltip accessible by keyboard; Actual: hidden title tooltip.

24. **Mobile quick actions are not optimized**
    - Page/Component: Dashboard shell and portfolio/rewards actions
    - Root Cause: desktop actions wrap into content; no thumb-friendly action sheet.
    - Reproduction: mobile viewport Portfolio.
    - Expected: bottom action sheet for Bond/Unbond/Refresh/Alerts; Actual: standard stacked/wrapped controls.

## Enhancement Proposals

1. **APY Unit Contract**
   - Problem: APY values mix percent and decimal formats across hooks and components.
   - Proposal: Define `ApyDecimal` and `ApyPercent` types or naming conventions (`poolApyDecimal`, `netApyPercent`). Add `formatApyDecimal()` and `formatApyPercent()`.
   - Files to Modify: `src/lib/utils/fee-calculations.ts`, `src/lib/utils/formatters.ts`, APY display components.
   - Effort: M

2. **Smart Notification Center**
   - Problem: Persistent notification prompt causes hydration mismatch and noisy UX.
   - Proposal: Render notification UI only after client mount; replace global prompt with a small bell icon/state in header and non-blocking toast stack for actual alerts.
   - Files to Modify: `src/components/alerts/alert-toast.tsx`, `src/app/dashboard/layout.tsx`, `src/components/layout/dashboard-shell.tsx`.
   - Effort: M

3. **LP Entry Pricing Wizard**
   - Problem: LP P/L and IL become ambiguous when historical pricing endpoints fail.
   - Proposal: Add a guided setup panel where users can accept inferred historical prices, enter manual entry prices, or mark a position as current-value-only.
   - Files to Modify: `src/app/dashboard/lp/page.tsx`, `src/lib/hooks/use-lp-positions.ts`, `src/lib/utils/lp-analytics.ts`.
   - Effort: L

4. **Real-Time Bond Health Alerts**
   - Problem: Risk page shows severe slash state but does not translate it into clear alert rules.
   - Proposal: Add rule cards for slash threshold, jail status, churn-out rank, requested leave, and version drift; route alerts into the notification center.
   - Files to Modify: `src/lib/utils/portfolio-alerts.ts`, `src/lib/hooks/use-alerts.ts`, `src/app/dashboard/risk/page.tsx`.
   - Effort: M

5. **Portfolio Comparison Mode**
   - Problem: Users see their APY/risk but not whether it is good relative to network.
   - Proposal: Add side-by-side cards: user APY vs network median/top quartile, user fee vs network fee, user slash points vs active-node percentile.
   - Files to Modify: `src/lib/utils/yield-benchmarks.ts`, `src/components/dashboard/portfolio-summary.tsx`, `src/components/dashboard/network-comparison-table.tsx`.
   - Effort: M

6. **Interactive Yield Simulator**
   - Problem: Bond/fee/compounding decisions are shown as static numbers.
   - Proposal: Add sliders for bond amount, operator fee, APY scenario, and compounding cadence; show daily/monthly/yearly reward deltas.
   - Files to Modify: `src/components/dashboard/bond-simulator.tsx`, `src/components/dashboard/reward-projections.tsx`, Rewards page.
   - Effort: M

7. **LP Impermanent Loss Hedging Suggestions**
   - Problem: IL is shown as a number but not translated into actions.
   - Proposal: Add pool-specific insight cards: high IL, missing historical price, underperforming APY, pool status risk, and "consider rebalancing" explanations.
   - Files to Modify: `src/app/dashboard/lp/page.tsx`, `src/components/dashboard/lp-summary-card.tsx`, `src/lib/utils/lp-analytics.ts`.
   - Effort: M

8. **Mobile Quick-Actions Bottom Sheet**
   - Problem: Mobile users need fast Bond, Unbond, Copy Memo, Refresh, and Alert actions.
   - Proposal: Add a sticky bottom action bar that opens a bottom sheet with contextual actions per route.
   - Files to Modify: `src/components/layout/dashboard-shell.tsx`, `src/app/dashboard/portfolio/page.tsx`, `src/app/dashboard/transactions/page.tsx`.
   - Effort: M

9. **Dark Mode Chart Polish**
   - Problem: Charts warn about sizing and some chart labels/gridlines are hard to read.
   - Proposal: Create a shared chart theme wrapper with stable min dimensions, dark/light token colors, and accessible tooltip contrast.
   - Files to Modify: `src/components/dashboard/auto-compound-chart.tsx`, `src/components/dashboard/fee-revenue-chart.tsx`, `src/components/dashboard/price-chart.tsx`, `src/components/dashboard/risk-radar.tsx`.
   - Effort: M

10. **Tax Optimization Hints**
   - Problem: Export exists, but users get no timing context.
   - Proposal: Add informational, non-financial-advice hints around realized/unrealized events, bond/unbond timing, and missing cost-basis data.
   - Files to Modify: `src/lib/utils/tax-export.ts`, `src/components/shared/export-button.tsx`, Rewards page.
   - Effort: L

## Recommended Action Plan

1. Fix the APY unit contract first: pool APY display, LP APY display, portfolio weighted APY, and fee/reward projection convention.
2. Fix the notification hydration mismatch by making notification prompt render client-only after permission state is known.
3. Make portfolio resilient to LP/member API failures so bond KPIs render even when LP endpoints fail.
4. Add explicit provenance labels for PnL and LP valuations: historical, estimated, current-value-only, manual override.
5. Repair transaction composer accessibility and copy feedback; update E2E tests to target labels rather than placeholder text.
6. Stabilize wallet dropdown and mocked connection behavior, then rerun wallet specs.
7. Fix chart month labels and chart container sizing warnings.
8. Rebaseline Playwright tests around current route behavior (`/dashboard/overview` redirecting to `/dashboard/portfolio`) and current section names.
9. Add partial-data error states for Midgard 502s on member, pool history, THORName, and actions endpoints.
10. Implement enhancements after correctness: notification center, LP entry wizard, comparison mode, simulator, and mobile bottom sheet.

