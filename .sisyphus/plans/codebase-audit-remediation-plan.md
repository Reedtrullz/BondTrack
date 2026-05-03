# BondTrack Codebase Audit & Remediation Plan

## TL;DR

> **Summary**: Consolidated remediation plan for the current BondTrack audit. The repo builds successfully, but it has correctness bugs in transaction flow, unit/API handling, stale UI state, and multiple quality/process regressions in tests, duplicated declarations, and silent persistence failures.
>
> **Build/Test Status**:
> - `npm run build` ✅ passes
> - `npm test -- --run` ❌ fails in 4 files / 7 tests
>
> **Priority Split**:
> - **P0**: Broken transaction flows, wrong API/query contracts, incorrect unit comparisons, dead test suite
> - **P1**: Stale route/UI state, misleading empty/loading states, wallet/proxy hardening gaps
> - **P2**: Duplicate declarations, dead legacy hooks, silent storage failures, config/docs drift, `any` cleanup

---

## Context

### Original Request
User asked for a comprehensive codebase review, then asked to continue looking for bugs, gaps, missing features, annoyances, and quality issues and gather the findings into a plan file.

### Audit Evidence
- App/UI audit via parallel explore pass
- Data/hooks audit via parallel explore pass
- External framework risk lens via librarian pass
- Additional pages/shared/quality audit via parallel explore passes
- Direct file verification across app, lib, hooks, proxy routes, wallet, and shared components
- Verification commands:
  - `npm run build` → passes
  - `npm test -- --run` → fails with parse/test/runtime issues

### Current System State
- The app is shippable enough to build, but not trustworthy enough to call healthy.
- Several defects are user-visible today.
- The test suite is not a reliable safety net in its current state.
- There are multiple places where missing data or storage errors are silently masked as harmless empty states.

---

## Work Objectives

### Core Objective
Bring BondTrack from “builds but has correctness and quality debt” to “behaviorally trustworthy, diagnostically honest, and safe to iterate on.”

### Deliverables
1. Correct transaction and history flows
2. Correct unit/query handling in the data layer
3. Honest UI state for loading/error/empty cases
4. Stable route/query synchronization across dashboard surfaces
5. Working, trustworthy tests for core hooks/utilities
6. Reduced maintenance drift from duplicate types/hooks/docs/config

### Definition of Done
- [x] Transaction quick actions open the intended composer mode and cannot submit invalid unbond amounts
- [x] Midgard bond-history requests use the correct query contract
- [x] Yield guard / churn / jail related calculations use correct units and trusted block-height sources
- [x] Route-driven components resync correctly when query params or addresses change
- [x] User-visible loading states no longer mask upstream errors as empty data
- [x] `npm test -- --run` passes or remaining failures are explicitly documented as intentional and fixed later with issue links
- [x] Duplicate/dead declarations are removed or merged
- [x] Silent storage failures are surfaced or logged consistently
- [x] Build still passes after fixes

### Must Have
- P0 and P1 correctness fixes
- A truthful test baseline
- No dead parse-error test files blocking confidence

### Must NOT Have
- New feature work before correctness is restored
- More silent fallbacks that hide system failures
- More duplicate hook/type sources

---

## Findings Summary

## P0 — Correctness / Trust Breakers

1. **Transaction quick-action mismatch**
   - Files:
     - `src/components/dashboard/node-status-card.tsx`
     - `src/components/dashboard/transaction-composer.tsx`
   - Problem: quick links write `action=bond|unbond`, but composer only understands `'BOND' | 'UNBOND'`.
   - Impact: user can land in the wrong transaction mode.

2. **Unbond can proceed with invalid amount**
   - File: `src/components/dashboard/transaction-composer.tsx`
   - Problem: submit validation checks node eligibility but not `amountToUnbond` validity.
   - Impact: user can attempt zero-value or invalid unbond.

3. **Wrong Midgard query parameter contract**
   - Files:
     - `src/lib/api/midgard.ts`
     - `src/lib/hooks/use-bond-history.ts`
     - `src/components/dashboard/transaction-history.tsx`
   - Problem: actions request uses `type` instead of the documented `txType` for bond/unbond/leave history.
   - Impact: missing or incorrect history, brittle upstream behavior.

4. **Yield Guard unit mismatch**
   - File: `src/lib/hooks/use-bond-positions.ts`
   - Problem: raw `total_bond` is compared to `OptimalBondD / 1e8`.
   - Impact: incorrect `overbonded` flags.

5. **Optimizer heuristic points users at wrong nodes**
   - Files:
     - `src/lib/utils/bond-optimizer.ts`
     - `src/components/dashboard/bond-optimizer.tsx`
   - Problem: “top” nodes are selected by descending slash points and the same node is reused for every suggestion.
   - Impact: recommendations can be actively bad.

6. **Dead parse-error test file**
   - File: `src/components/dashboard/__tests__/personal-fee-audit.test.tsx`
   - Problem: parse error prevents the suite from running at all.
   - Impact: no coverage for that feature area and the overall suite is red.

---

## P1 — User-Visible Bugs / Misleading UI State

7. **Transaction history keeps stale address state**
   - File: `src/components/dashboard/transaction-history.tsx`
   - Problem: internal address state initializes from prop once and does not resync on route changes.
   - Impact: user can view/search against an older address after navigation.

8. **Bond optimizer shows false “Portfolio Optimized” state**
   - File: `src/components/dashboard/bond-optimizer.tsx`
   - Problem: empty/no-data states collapse into “Certified Optimal”.
   - Impact: misleading portfolio guidance.

9. **Churn risk can show endless loading or false empty state**
   - Files:
     - `src/lib/hooks/use-node-rankings.ts`
     - `src/components/dashboard/churn-out-risk.tsx`
   - Problem: loading/error/no-data all collapse to `[]`.
   - Impact: failed upstream fetches look like harmless empty/loading states.

10. **Current block height and churn countdown use weak sources/fallbacks**
    - Files:
      - `src/lib/hooks/use-current-block-height.ts`
      - `src/lib/hooks/use-churn-countdown.ts`
      - `src/lib/hooks/use-bond-positions.ts`
    - Problem: one hook falls back to `0`, another derives height from constants, another falls back to node height.
    - Impact: wrong jail/churn timing and disappearing countdowns during Midgard issues.

11. **Sidebar active navigation is wrong on every non-overview page**
    - File: `src/components/layout/sidebar.tsx`
    - Problem: active nav styling is hardcoded to `index === 0`.
    - Impact: users lose location awareness.

12. **Network health undercounts active validators**
    - File: `src/components/dashboard/network-health.tsx`
    - Problem: filters `status === 'active'` while the rest of the codebase uses `Active`.
    - Impact: wrong network-security display.

13. **PnL dashboard leaks manual initial-bond state across addresses**
    - File: `src/components/dashboard/pnl-dashboard.tsx`
    - Problem: when address/storage key changes and no saved value exists, stale manual state remains.
    - Impact: wallet B can show wallet A’s manual baseline.

14. **Changelogs filter state is not truly URL-driven**
    - File: `src/app/dashboard/changelogs/page.tsx`
    - Problem: URL params seed local state once, then local state only pushes back to the URL.
    - Impact: back/forward navigation and external URL changes can leave stale UI filters.

15. **Changelogs cannot preserve an all-collapsed state**
    - File: `src/app/dashboard/changelogs/page.tsx`
    - Problem: localStorage is only written when `expandedIds.size > 0`, and empty state is auto-expanded.
    - Impact: user preference is ignored.

16. **Changelogs layout composes the page incorrectly**
    - File: `src/app/dashboard/changelogs/layout.tsx`
    - Problem: layout imports and renders the page directly instead of rendering `children`.
    - Impact: brittle layout behavior and poor route composition.

17. **Dashboard refresh freshness label is not trustworthy**
    - File: `src/components/layout/dashboard-shell.tsx`
    - Problem: manual refresh manipulates tick state so fresh data can immediately appear “10s old”.
    - Impact: misleading freshness signal.

---

## P2 — Quality, Test, and Maintenance Debt

18. **Bond history semantics are misleading**
    - File: `src/lib/hooks/use-bond-history.ts`
    - Problem: `initialBond` is calculated as sum of all BOND actions.
    - Impact: `bondGrowth` is not truly “growth” after multiple bond/unbond events.

19. **Zero-value formatting is wrong**
    - File: `src/lib/utils/formatters.ts`
    - Problem: `if (!raw)` treats `0` as missing.
    - Impact: malformed zero display and special-case UI workarounds.

20. **Bond rank calculation is collision-prone**
    - File: `src/lib/utils/calculations.ts`
    - Problem: rank lookup identifies nodes by matching `total_bond` rather than stable identity.
    - Impact: duplicate bond values can produce wrong rank.

21. **Watchlist tests are red for the wrong reasons**
    - Files:
      - `src/lib/hooks/__tests__/use-watchlist.test.ts`
      - `src/lib/hooks/use-watchlist.ts`
    - Problem: tests use short invalid addresses while the hook rejects them by design.
    - Impact: suite is red, but not for the real behavior it intends to verify.

22. **Fee-calculation test expectation does not match implementation contract**
    - Files:
      - `src/lib/utils/__tests__/fee-calculations.test.ts`
      - `src/lib/utils/fee-calculations.ts`
    - Problem: one test expects 100% leakage in a scenario the implementation cannot produce.
    - Impact: misleading test failure / false signal.

23. **useBondPositions fetches even when address is null**
    - Files:
      - `src/lib/hooks/use-bond-positions.ts`
      - `src/lib/hooks/__tests__/use-bond-positions.test.ts`
    - Problem: nodes/health fetch still occur and `isLoading` can remain true with no address.
    - Impact: unnecessary network work and confusing hook semantics.

24. **Duplicate Midgard type declarations**
    - File: `src/lib/api/midgard.ts`
    - Problem: `MemberDetailsRaw`, `MemberPoolRaw`, and `ActionsResponseRaw` are declared twice.
    - Impact: future drift and maintenance confusion.

25. **Legacy duplicate wallet hook remains in repo**
    - File: `src/hooks/use-wallet.ts`
    - Problem: appears unused while real app logic lives in `src/lib/hooks/use-wallet.ts`.
    - Impact: split behavior and developer confusion.

26. **Silent localStorage/JSON failures are swallowed**
    - Files:
      - `src/lib/hooks/use-watchlist.ts`
      - `src/lib/hooks/use-alerts.ts`
      - `src/lib/hooks/use-pending-transactions.ts`
    - Problem: empty `catch {}` blocks hide parse/quota/corruption failures.
    - Impact: invisible persistence failures and harder debugging.

27. **Config/docs drift around endpoints**
    - Files:
      - `src/lib/config.ts`
      - `README.md`
      - proxy route files under `src/app/api/...`
    - Problem: env names/defaults/proxy naming are inconsistent or misleading; `track` looks unused.
    - Impact: setup/deploy confusion.

28. **Production-adjacent `any` usage weakens type safety**
    - Files:
      - `src/lib/utils/bond-optimizer.ts`
      - `src/components/dashboard/bond-optimizer.tsx`
      - `src/components/dashboard/auto-compound-chart.tsx`
    - Problem: `any` is used in user-facing optimization/charting paths.
    - Impact: weaker compiler protection in risky logic.

29. **Proxy observability and consistency are weak**
    - Files:
      - `src/app/api/midgard/[...path]/route.ts`
      - `src/app/api/thorchain/[...path]/route.ts`
    - Problems:
      - Midgard proxy returns detailed endpoint failures but THORNode proxy drops underlying error details.
      - Config/env names differ from front-end config naming.
      - Only Midgard proxy has timeout logic.
    - Impact: harder production debugging and inconsistent upstream behavior.

30. **Wallet integration behavior is rigid and partly inconsistent**
    - Files:
      - `src/lib/hooks/use-wallet.ts`
      - `src/lib/transactions/bond.ts`
    - Problems:
      - expected chain is hardcoded to mainnet
      - wallet transaction amount handling is inconsistent across Keplr vs XDEFI/Vultisig
      - auto-reconnect behavior is implicit and not strongly guarded
    - Impact: stagenet incompatibility and wallet-specific transaction risk.

---

## Execution Strategy

### Recommended Waves

**Wave 1 — Restore correctness and trust (P0)**
- Fix transaction quick-action/composer contract
- Add unbond amount validation
- Fix Midgard actions query contract
- Fix Yield Guard unit mismatch
- Fix optimizer heuristic
- Repair the dead parse-error test file

**Wave 2 — Fix stale state and misleading UI (P1)**
- Resync transaction history/composer/query-driven components to route state
- Fix sidebar active state
- Fix network health status casing
- Fix PnL manual baseline reset
- Fix changelog state/persistence/layout issues
- Normalize loading/error/empty handling in ranking/churn surfaces

**Wave 3 — Normalize data-source and timing behavior**
- Unify current block-height sourcing around Midgard health
- Remove weak countdown fallbacks
- Fix freshness label semantics
- Tighten proxy error reporting / timeout consistency

**Wave 4 — Restore quality baseline (P2)**
- Replace invalid test fixtures and misleading assertions
- Stop fetching hooks when inputs are null
- Remove duplicate type declarations and legacy hook copies
- Replace silent catches with surfaced diagnostics
- Clean config/docs drift and remove/justify unused config
- Reduce `any` usage in production-adjacent code

**Wave 5 — Release testing and live detection**
- Turn the existing Vitest/Playwright surface into a reliable release gate
- Add preview-deployment smoke and visual regression checks
- Add production-grade runtime error capture and alert routing
- Add synthetic monitoring for the highest-risk routes and proxy-backed flows

---

## Dependency Notes

- Transaction quick-action fixes should happen before transaction QA or additional wallet integration work.
- Midgard query contract fixes should happen before bond-history/history-table assertions are trusted.
- Height-source fixes should happen before churn/jail/risk QA because they influence multiple downstream displays.
- Test-suite cleanup should happen after P0 behavior fixes so the updated tests can lock in corrected behavior.

---

## Verification Strategy

## Release Testing Strategy

### Current Baseline in the Repo
- `package.json` already has `test`, `test:coverage`, `e2e`, `e2e:ui`, and `e2e:debug` scripts.
- `.github/workflows/test.yml` already runs unit tests, coverage, E2E, and build in CI.
- `playwright.config.ts` is present and runs against a local dev server with HTML reports and retry traces.
- `vitest.config.ts` is present, but coverage is scoped mainly to hooks/utils, and `passWithNoTests: true` weakens the signal.
- There is meaningful E2E coverage under `e2e/`, including homepage, dashboard pages, navigation, transactions, wallet states, and a broad “comprehensive” spec.
- Shared testing scaffolding exists under `src/test/` (setup/utils/MSW), but it is not yet a clearly trustworthy release system.

### Current Gaps in Release Confidence
- Current test suite is red, so CI cannot be treated as a release gate yet.
- Page/component coverage is thin outside hooks and smoke E2E.
- No dedicated visual snapshot baseline is in use even though Playwright is present.
- Playwright runs Chromium only.
- No explicit release checklist or QA document exists in the repo.
- CI does not run lint and has no dedicated `typecheck` script.
- Wallet/browser extension flows remain hard to validate fully in CI without a stricter harness.

### Recommended Release Testing Layers

#### Layer 1 — Deterministic Pre-Release Gate
Use these as mandatory merge/release blockers once stabilized:
- `npm run build`
- `npm run lint`
- dedicated `npx tsc --noEmit` script (add this)
- `npm test -- --run`
- a small stable Playwright smoke subset covering the highest-risk flows

**Why**: right now the repo already builds in CI, and both Vitest and Playwright exist. The biggest missing step is turning them into a trustworthy gate rather than adding a brand-new test framework.

#### Layer 2 — Preview Deployment Validation
Run browser validation against the actual Vercel preview URL, not just localhost.

Recommended checks on preview deploys:
- landing page renders and accepts address / THORName entry
- dashboard routes load with `?address=`
- proxy-backed pages render without 5xx explosions
- wallet detection/fallback states render correctly when providers are absent
- critical route screenshots match baseline on desktop and mobile breakpoints

**Why**: preview testing catches deployment/runtime/config issues that localhost E2E misses.

#### Layer 3 — Visual Regression for UI/UX Safety
Use Playwright screenshot assertions for a narrow, curated set of pages/components instead of trying to snapshot everything.

Initial screenshot targets:
- `/`
- `/dashboard/overview`
- `/dashboard/risk`
- `/dashboard/transactions`
- sidebar on desktop + mobile menu state
- wallet-connect dropdown state
- changelog filtered state

**Rule**: only baseline stable states with mocked data or highly deterministic fixtures.

#### Layer 4 — Manual Release QA for Hard-to-Automate Paths
Keep a short manual release checklist for flows where browser automation is weaker than real usage:
- real wallet detection on supported browsers
- network mismatch UX
- transaction preview generation
- mobile interaction sanity on iPhone-sized viewport
- upstream degradation behavior when Midgard/THORNode are slow or unavailable

**Rule**: do not gate every release on full real signing automation; gate on mocked provider coverage automatically and do one manual sanity pass for real-wallet behavior until a stable harness exists.

### Recommended Release Test Matrix

#### Must-pass on every PR
- build
- lint
- typecheck
- fixed unit tests for hooks/utils
- Playwright smoke subset

#### Must-pass on protected branch / release candidate
- full Playwright suite
- visual regression subset
- preview-URL smoke against deployed artifact

#### Nightly / scheduled
- full Playwright suite across multiple viewports
- synthetic checks against preview/prod critical routes
- longer-running upstream-failure scenarios

### Recommended Test Expansion Order
1. Restore trust in existing Vitest and Playwright suites
2. Add `typecheck` and lint to CI
3. Split Playwright into smoke vs full suites
4. Add screenshot baselines for curated stable screens
5. Add preview-deployment browser validation
6. Expand component/page test coverage only after the baseline gate is reliable

---

## Live Error and Bug Detection Strategy

### What Exists Today
- Root layout mounts `@vercel/analytics` and `@vercel/speed-insights`
- Dashboard routes have a local React `ErrorBoundary`
- Some client components log errors with `console.error`
- Proxy routes surface HTTP failures, but inconsistently between Midgard and THORNode
- Browser notification alerts exist for some portfolio conditions, but these are not production monitoring

### What Is Missing Today
- No global production error tracker for client/server exceptions
- No `app/error.tsx` or `app/global-error.tsx` based runtime capture path surfaced in the audit
- No alert routing for production failures to a team channel
- No structured proxy-route logging/tracing
- No production session replay / release health / crash-free signal
- No synthetic monitoring of the live site

### Recommended Live Detection Stack

#### Minimum Viable Setup (implement first)
1. **Sentry for Next.js runtime error tracking**
   - capture client exceptions
   - capture server/route-handler exceptions
   - enable release tagging and source maps
   - enable session replay for high-value paths with masking/privacy rules

2. **Vercel platform signals**
   - keep Analytics + Speed Insights
   - enable/monitor Vercel Observability if available for function and route-level failure/latency insight

3. **Single alert destination**
   - Slack/email channel for:
     - production deploy failures
     - error volume spikes
     - repeated proxy failures
     - synthetic-check failures

4. **Synthetic checks for top routes**
   - browser check: `/`
   - browser check: `/dashboard/overview?address=<test-address>`
   - API checks: `/api/midgard/...` and `/api/thorchain/...` health-critical endpoints

#### Mature but still pragmatic setup (later)
- structured logs for proxy routes
- breadcrumbs for key UI events (route changes, wallet selection, submit attempts)
- alert thresholds separated by app bug vs upstream dependency failure
- release health dashboards and crash-free session metrics

### Detection Priorities by Risk

#### Priority 1 — App-breaking failures
- uncaught React errors
- hydration/render crashes
- route-handler exceptions
- dashboard route load failures

#### Priority 2 — Dependency and proxy failures
- Midgard proxy 5xx spikes
- THORNode proxy 5xx spikes
- latency regressions on proxy endpoints
- malformed upstream responses

#### Priority 3 — User-experience degradations
- repeated wallet connect failures
- dead clicks / rage clicks in critical flows
- Core Web Vitals regressions
- sharp increase in client-visible empty/error states

### Recommended Alert Routing Rules
- **Page immediately / high-priority channel**:
  - production deploy broken
  - homepage/downstream dashboard synthetic check failures
  - sustained 5xx spikes on proxy routes
- **Summary alerts / lower-noise channel**:
  - elevated client exception rate
  - wallet-flow failures above threshold
  - visual-regression failures in preview deploys

### Monitoring Rules Specific to This App
- Separate upstream THORChain/Midgard instability from app-code regressions; do not page both the same way.
- Tag errors by route, wallet type, proxy endpoint, and release.
- Mask wallet-sensitive or address-sensitive replay fields where appropriate.
- Treat transaction-generation failures as higher severity than chart/widget display failures.

---

## Executable QA Scenarios for Release Testing and Monitoring

**Scenario: Preview deployment smoke gate**
- **Tool**: Playwright against Vercel preview URL
- **Steps**:
  1. Deploy PR to preview
  2. Run smoke spec against the preview base URL
  3. Visit `/`, submit a test address, and open overview/risk/transactions pages
- **Expected Result**:
  - core pages render on deployed artifact
  - no route crashes
  - no blocking proxy failures on critical pages

**Scenario: Visual regression on stable dashboard states**
- **Tool**: Playwright screenshot assertions
- **Steps**:
  1. Load curated stable pages with deterministic mocks/fixtures
  2. Capture screenshots for desktop and mobile states
  3. Compare with committed baseline
- **Expected Result**:
  - no unexpected layout or style drift on curated pages

**Scenario: Production error tracker catches client/runtime exceptions**
- **Tool**: Manual browser QA in staging/preview + monitoring dashboard
- **Steps**:
  1. Trigger a controlled client-side exception in a non-production environment
  2. Trigger a controlled server/proxy exception
  3. Confirm both events appear with route, release, and environment context
- **Expected Result**:
  - both client and server failures are captured and queryable

**Scenario: Synthetic checks detect upstream proxy degradation**
- **Tool**: Synthetic browser/API monitor
- **Steps**:
  1. Simulate failing or slow responses from Midgard/THORNode critical endpoints
  2. Run browser and API synthetic checks
- **Expected Result**:
  - synthetic checks fail with actionable status/latency evidence
  - alert path distinguishes upstream outage from app crash

**Scenario: Release candidate manual wallet sanity pass**
- **Tool**: Manual browser QA with supported wallets
- **Steps**:
  1. Open preview/release candidate in supported browser
  2. Validate wallet detection, connect UI, mismatch messaging, and transaction preview generation
- **Expected Result**:
  - wallet UX is sane on real browser/provider combinations even if real signing is not fully automated in CI

### Automated
- `npm run build`
- `npm test -- --run`
- targeted hook/component tests for:
  - transaction composer
  - bond history
  - watchlist
  - fee calculations
  - bond positions null-address behavior

### Manual QA
- Open transaction shortcuts from node cards and confirm correct mode/node/amount behavior
- Navigate between dashboard pages and confirm sidebar active state stays correct
- Change `address` in route and confirm transaction history and PnL update cleanly
- Validate changelog filters with back/forward navigation and collapse persistence
- Simulate/no-op upstream failures and confirm risk/countdown widgets show errors rather than infinite loading or false empties

### Executable QA Scenarios

#### Wave 1 — Transaction and Data Correctness

**Scenario: Node quick actions open the correct transaction state**
- **Tool**: Playwright or manual browser QA
- **Steps**:
  1. Open `/dashboard/nodes?address=<valid-address-with-positions>`
  2. Hover a node card and click **Bond 10k**
  3. Verify the Transactions page opens in `BOND` mode with the clicked node selected and amount `10000`
  4. Return and click **Unbond** on the same node
  5. Verify the page opens in `UNBOND` mode for that node
- **Expected Result**:
  - `Bond 10k` never opens `UNBOND`
  - `Unbond` never opens `BOND`
  - mode, node, and amount match the clicked shortcut

**Scenario: Invalid unbond cannot be submitted**
- **Tool**: Playwright or manual browser QA
- **Steps**:
  1. Open `/dashboard/transactions?address=<valid-address>&node=<standby-node>&action=UNBOND`
  2. Enter `0` or empty string as unbond amount
  3. Attempt to click **Sign & Broadcast**
- **Expected Result**:
  - submit action remains disabled or shows an explicit validation error
  - no transaction preview/submit path proceeds with invalid amount

**Scenario: Bond history and transaction history include exit events**
- **Tool**: Manual browser QA + targeted test or direct hook inspection
- **Steps**:
  1. Open `/dashboard/rewards?address=<address-with-unbond-or-leave-history>`
  2. Open `/dashboard/transactions?address=<same-address>`
  3. Verify history includes BOND plus exit events (`UNBOND`/`LEAVE` as applicable)
- **Expected Result**:
  - exit events appear consistently in both surfaces
  - no upstream 4xx/5xx caused by wrong query params

**Scenario: Yield Guard flags match consistent units**
- **Tool**: Targeted hook test or direct function-level assertion
- **Steps**:
  1. Feed `useBondPositions` fixtures with known `total_bond` and `OptimalBondD`
  2. Verify only nodes truly above the threshold are flagged `overbonded`
- **Expected Result**:
  - threshold behavior is stable and not triggered by raw-vs-RUNE unit mismatch

#### Wave 2 — Route State and UI Honesty

**Scenario: Address-driven surfaces resync after navigation**
- **Tool**: Playwright or manual browser QA
- **Steps**:
  1. Open `/dashboard/transactions?address=<address-a>`
  2. Confirm transaction history and any address input reflect address A
  3. Navigate to the same page with `address=<address-b>` via sidebar, recent-address switch, or direct URL change
  4. Open `/dashboard/rewards?address=<address-b>` and inspect PnL
- **Expected Result**:
  - transaction history switches to address B without stale address A state
  - PnL manual baseline does not leak from address A into address B

**Scenario: Sidebar active state matches current route**
- **Tool**: Playwright or manual browser QA
- **Steps**:
  1. Visit each dashboard page: overview, nodes, rewards, risk, transactions, lp, changelogs
  2. Inspect sidebar active styling after each navigation
- **Expected Result**:
  - exactly one nav item is active
  - active styling matches the current pathname, not always Overview

**Scenario: Changelog filters are URL-driven and persistent correctly**
- **Tool**: Playwright or manual browser QA
- **Steps**:
  1. Open `/dashboard/changelogs?q=Solana&type=bug`
  2. Verify search input and filter pills reflect the URL
  3. Change filters, then use browser back/forward
  4. Collapse all entries, refresh, and return
- **Expected Result**:
  - UI state always matches URL state
  - back/forward restores visible filters correctly
  - all-collapsed state can persist if chosen

**Scenario: Churn/risk widgets distinguish loading vs failure vs empty data**
- **Tool**: Manual browser QA with mocked or temporarily blocked network
- **Steps**:
  1. Open `/dashboard/risk?address=<valid-address>`
  2. Simulate failure for all-nodes or health fetch
  3. Observe churn/ranking widgets
- **Expected Result**:
  - failures display explicit error states
  - widgets do not remain in infinite loading or misleading “no active nodes” states

#### Wave 3 — Height Source, Proxy Behavior, and Freshness

**Scenario: Freshness indicator reflects actual refresh semantics**
- **Tool**: Manual browser QA
- **Steps**:
  1. Open any dashboard page with an address
  2. Click Refresh
  3. Observe the freshness chip immediately and after 10 seconds
- **Expected Result**:
  - immediately after refresh, chip indicates fresh data rather than “10s ago”
  - elapsed time increments consistently after that point

**Scenario: Midgard health is the trusted block-height source**
- **Tool**: Targeted hook tests + optional manual browser QA
- **Steps**:
  1. Stub `/v2/health` with known heights
  2. Verify `useCurrentBlockHeight`, `useChurnCountdown`, and jail-related consumers derive from that value
  3. Simulate health failure and confirm defined fallback/error behavior
- **Expected Result**:
  - height-dependent widgets use one consistent source of truth
  - failure mode is explicit, not silently wrong

**Scenario: Proxy failures are diagnosable**
- **Tool**: Direct API calls or browser network inspection
- **Steps**:
  1. Force upstream Midgard/THORNode proxy failures
  2. Hit `/api/midgard/...` and `/api/thorchain/...`
  3. Compare returned status and error detail
- **Expected Result**:
  - both proxies return actionable error responses
  - timeout/fallback behavior is consistent enough to debug upstream issues

#### Wave 4 — Quality Baseline and Regression Safety

**Scenario: Test suite returns to a trustworthy baseline**
- **Tool**: Bash
- **Steps**:
  1. Run `npm test -- --run`
- **Expected Result**:
  - parse error suite runs
  - watchlist tests use valid fixtures and assert real behavior
  - fee calculation expectations match implementation contract
  - null-address hook semantics are explicit and tested

**Scenario: Duplicate/dead code is removed without breaking builds**
- **Tool**: Bash + code inspection
- **Steps**:
  1. Remove/merge duplicate types and unused legacy hook paths
  2. Run `npm run build`
  3. Run search to ensure only canonical implementations remain
- **Expected Result**:
  - build passes
  - only one active source of truth remains per hook/type area

**Scenario: Storage failures are surfaced instead of swallowed**
- **Tool**: Targeted tests or manual browser QA with forced localStorage/JSON failure
- **Steps**:
  1. Inject malformed localStorage payloads for watchlist/alerts/pending transactions
  2. Load the app/hooks
- **Expected Result**:
  - failure is logged or surfaced consistently
  - app degrades safely without silently hiding the root cause

---

## Suggested First Implementation Slice

If doing this incrementally, the safest first slice is:
1. Fix quick-action/composer mode mismatch
2. Validate unbond amount
3. Fix Midgard `txType` contract
4. Fix Yield Guard unit mismatch
5. Repair dead parse-error test
6. Re-run build + tests

That gives the fastest recovery in user trust and engineering confidence.

---

## Exit Criteria

- P0 issues resolved and verified
- P1 issues either resolved or isolated with explicit follow-up items
- Test suite is trustworthy enough to catch regressions in the fixed areas
- Plan can be split into execution tasks without rediscovery work
