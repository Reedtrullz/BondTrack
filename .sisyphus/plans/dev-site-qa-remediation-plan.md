# BondTrack Dev Site QA Remediation Plan

## TL;DR

> **Objective**: Fix the live issues found on `https://dev.thorchain.no`, then continue testing and iterating until all confirmed bugs and UX quirks are resolved on the deployed dev environment.
>
> **Current Dev Findings**:
> - Repeated Midgard 502s from THORName reverse lookup on dashboard routes
> - LP Status depends on a failing `/v2/member/{address}` request and does not degrade gracefully
> - Notification prompt blocks top-right controls like **Connect Wallet**
> - Changelog search/filter controls render but do not actually update state/URL
> - Wallet interaction path is not verifiable in normal flow because the prompt overlays the click target

---

## Scope

This plan covers the user-facing issues confirmed on the deployed dev site:

1. Landing page lookup flow
2. Dashboard route loading and navigation
3. Header interactions and overlays
4. Changelog search/filter UX
5. LP Status degraded/error behavior
6. Console/runtime/API health on the deployed environment
7. Exhaustive non-wallet button audit on the deployed environment
8. Re-test loop until all confirmed bugs and UX quirks are fixed

---

## Working Principle

We will not stop after applying code changes locally.

For every fix:
1. reproduce the bug on `dev.thorchain.no`
2. identify the root cause in code
3. implement the smallest correct fix
4. verify locally with targeted tests
5. deploy to dev/staging
6. re-test the live dev URL with Playwright
7. repeat until the issue is no longer reproducible and no new UX regressions appear

**Definition of done for this plan**: all currently confirmed live bugs are resolved, all touched routes are re-tested on `https://dev.thorchain.no`, console/runtime noise is reduced to expected/benign levels, and no remaining UX blocker from this audit is left unverified.

---

## Confirmed Issues to Fix

### P0 — Live Reliability / Broken UX

1. **THORName reverse lookup causes repeated 502s on dashboard pages**
   - Symptom: `/api/midgard/v2/thorname/rlookup/<address>` fails repeatedly
   - User impact: console noise across routes, possible repeated fetch churn, degraded polish
   - Hypothesis areas:
     - THORName lookup hook/client behavior
     - Midgard proxy fallback/error handling
     - Missing graceful handling for "no thorname exists" responses

2. **Notification prompt blocks header actions**
    - Symptom: "Enable Notifications" overlay intercepts pointer events over **Connect Wallet**
    - Additional button-audit findings:
      - it also blocks **Refresh dashboard data** on overview in normal click flow
      - clicking **Enable** does not dismiss or visibly advance the prompt state
      - the visible **Dismiss** control on overview belongs to a separate alert card, not the notification prompt itself
    - User impact: top-right actions are partially blocked and the prompt behaves like a sticky obstructive overlay
    - Hypothesis areas:
      - alert-toast positioning/z-index/pointer behavior
      - prompt CTA behavior
      - dismiss/close affordance and non-blocking overlay behavior

3. **Changelog search and filters are non-functional in deployed build**
    - Symptom: input is visible but typed text resets to empty; filter clicks do not update state or URL
    - Additional button-audit findings:
      - year buttons do scroll the page and appear functional
      - all filter buttons tested (`All`, `Update`, `ADR`, `Chain`, `Feature`, `Bug`) leave `All` active except `All` itself
      - accordion/entry buttons across the visible changelog list appear non-functional: click probes showed no state/UI change on every tested entry button
    - User impact: core changelog discovery controls are broken
    - Hypothesis areas:
      - URL ↔ local state synchronization loop
      - controlled input state being overwritten every render
      - router replace logic or searchParams-derived state
      - accordion expand/collapse wiring

4. **LP Status page does not handle upstream member failures honestly**
    - Symptom: `/api/midgard/v2/member/<address>` returns 502 and the page shell loads without a clear user-facing resolution state
    - User impact: LP route appears incomplete/broken for affected addresses
   - Hypothesis areas:
     - LP hook error handling
     - page-level empty/error branching
     - Midgard member endpoint fallback behavior

5. **Overview quick actions do not preserve intended transaction mode**
   - Symptom: both **Bond More** and **Unbond** land on the generic transactions route without an explicit action mode
   - User impact: overview quick actions do not take the user into the expected composer state
   - Hypothesis areas:
     - quick-action link generation
     - transaction composer route-state parsing

6. **Transactions page UNBOND toggle appears ineffective on deployed dev**
   - Symptom: clicking **UNBOND** did not expose an unbond-specific composer state during deployed testing
   - User impact: the transactions control room may be stuck in bond mode even when unbond is selected
   - Hypothesis areas:
     - mode toggle state handling
     - unbond form rendering conditions
     - selected-position / validation gating hiding the intended form state

7. **Rewards control buttons show dead or unclear behavior**
   - Symptom:
     - **Edit initial bond** showed no visible editor state during deployed testing
     - **Optimize Now** showed no visible navigation or state response
     - range buttons (`24H`, `7D`, `30D`, `1Y`) showed no discernible active-state change in the deployed UI
     - `30D` currently renders as `30D,` in button text during button enumeration
   - User impact: key controls on the rewards surface feel broken or ambiguous
   - Hypothesis areas:
     - rewards page event wiring
     - hidden/obscured edit state
     - chart range state styling and button labels

8. **Transactions copy actions provide no visible feedback**
   - Symptom: **Copy** and **Copy Memo** retained the same labels after clicking, with no visible confirmation in deployed testing
   - User impact: users cannot tell whether copy actions succeeded
   - Hypothesis areas:
     - clipboard success feedback
     - disabled feedback state or toast path

### P1 — Follow-up Verification / UX Completeness

9. **Wallet path remains intentionally out of scope for the current audit pass** [x]
   - Note: browser wallet connectivity is deferred per instruction; only non-wallet button behavior is in scope right now

10. **Risk, Rewards, Transactions, Overview, and Nodes must be re-checked after shared and route-specific fixes** [x]
   - Goal: verify route behavior did not regress while fixing shared data/overlay issues

---

## Execution Waves

### Wave 1 — Stabilize shared blockers first

#### Task 1.1: Fix notification prompt so it never blocks primary UI controls [x]
- Inspect alert toast / notification prompt component
- Make overlay non-blocking or reposition it away from critical controls
- Ensure the prompt has an actual dismiss/resolve path
- Verify **Refresh dashboard data** and other header controls are clickable with the prompt visible
- Do not spend effort on browser-wallet-provider connectivity yet

#### Task 1.2: Fix THORName reverse lookup failure handling [x]
- Trace where reverse lookup is requested on dashboard routes
- Determine whether 502 means upstream absence, proxy bug, or fallback bug
- Make "no THORName found" a safe non-error state when appropriate
- Ensure repeated failed fetches do not spam console or degrade route UX

### Wave 2 — Restore broken route-specific interactions

#### Task 2.1: Fix changelog search input/state synchronization [x]
- Audit current `searchParams` ↔ `useState` ↔ `router.replace` flow
- Stop state from being overwritten while typing
- Verify typing updates the UI and URL
- Verify back/forward and direct query URLs still work

#### Task 2.1a: Remove unused React import from changelog test [x]
- Remove unused React import from test file
- Verify TypeScript diagnostics pass with no warnings

#### Task 2.2: Fix changelog filter buttons [x]
- Verify button click changes local state
- Verify active filter styling updates correctly
- Verify URL query reflects selected filter
- Verify filter survives route refresh/navigation

#### Task 2.2a: Fix changelog filter button URL generation [x]
- Fix URL generation issue where filter buttons return `/dashboard/changelogs` instead of `?type=bug`
- Verify tests pass and filter buttons work correctly

#### Task 2.3: Fix changelog accordion entry buttons [x]
- Verify entry buttons actually expand/collapse content or otherwise remove button semantics if entries are meant to be static
- Ensure each visible changelog entry button has a meaningful interaction outcome
- Re-test every entry button after the fix

#### Task 2.4: Fix LP Status degraded/error state [x]
- Inspect LP page and LP hook failure branches
- Make member endpoint failures visible and actionable
- Distinguish "no LP positions" from "failed to load LP data"
- Ensure the route shows an explicit error/empty state instead of a partial shell-only experience

#### Task 2.5: Fix transaction-mode and quick-action regressions [x]
- Ensure overview quick actions pass the intended transaction mode
- Ensure the transactions page reflects **BOND** vs **UNBOND** state correctly
- Verify unbond-specific fields/states render when unbond is selected

#### Task 2.6: Fix rewards control responsiveness and clarity [x]
- Make **Edit initial bond** visibly enter edit mode
- Make **Optimize Now** perform the intended visible action or remove/relabel it
- Ensure chart range buttons visibly update selected state and data window
- Fix the `30D,` label rendering oddity

#### Task 2.7: Add visible feedback for copy actions [x]
- Ensure **Copy** and **Copy Memo** confirm success/failure clearly
- Verify feedback works on deployed dev without browser-wallet dependencies

### Wave 3 — Shared route validation after fixes

#### Task 3.1: Re-test all main routes on dev [x]
- `/`
- `/dashboard/overview`
- `/dashboard/nodes`
- `/dashboard/rewards`
- `/dashboard/risk`
- `/dashboard/transactions`
- `/dashboard/lp`
- `/dashboard/changelogs`

#### Task 3.2: Re-test major user flows [x]
- address lookup from landing page
- sidebar navigation with preserved address
- theme toggle
- export CSV
- transaction action routes (`action=bond`, `action=unbond`)
- changelog search/filter interactions
- changelog year buttons
- changelog accordion buttons
- rewards control buttons
- transaction copy buttons
- overview quick-action buttons

#### Task 3.3: Re-test every non-wallet button on deployed dev [x]
- landing: `Lookup`
- overview: theme toggle, refresh, quick actions, export, alert dismiss, notification prompt CTA/path
- nodes: shared header buttons present on route
- rewards: edit, optimizer CTA, range controls, shared header buttons
- risk: show/hide details, shared header buttons
- transactions: mode toggles, search, copy actions, shared header buttons
- lp: shared header buttons and explicit route-state buttons if present
- changelogs: filters, year buttons, every entry/accordion button, shared header buttons

#### Task 3.4: Re-check console and network health [x]
- confirm THORName reverse lookup no longer spams 502s, or is explicitly handled as expected non-fatal behavior
- confirm LP route errors are surfaced honestly
- confirm no new 4xx/5xx regressions were introduced by the fixes

---

## Verification Loop (Mandatory)

After each fix wave:

1. run targeted local verification
   - `lsp_diagnostics` on changed files
   - relevant unit/component tests
   - `npm test -- --run`
   - `npm run build`

2. deploy updated branch to the dev environment

3. run browser QA against `https://dev.thorchain.no`
   - verify original bug repro is gone
   - verify related flows still work
   - collect console errors and failed network requests

4. if any bug or UX quirk remains:
   - capture exact repro
   - update the issue list
   - implement the next fix
   - repeat the cycle

**Explicit continuation rule**: continue testing and iterating until I can confirm that all confirmed bugs and UX quirks from this audit are fixed on the deployed dev URL, not just locally.

---

## Route-by-Route Done Criteria

### Landing
- address field works
- lookup navigates correctly
- no broken recent-address state

### Overview
- top-right controls clickable even when notification prompt exists
- export works
- **Bond More** opens bond mode intentionally
- **Unbond** opens unbond mode intentionally
- no repeated avoidable console errors

### Nodes
- route loads with address-bound data
- no new console/runtime failures

### Rewards
- route loads and remains stable
- no hook-order or hydration regressions
- edit/optimize/range buttons all produce visible and intentional responses

### Risk
- risk widgets render expected states
- no hidden error/loading regressions after shared fixes

### Transactions
- `action=bond` and `action=unbond` land in the expected mode
- in-page **BOND** and **UNBOND** toggles visibly switch the composer state
- copy actions provide visible success feedback
- route remains usable after shared fixes

### LP Status
- clear success, empty, or explicit error state
- no ambiguous shell-only render on upstream failure

### Changelogs
- search input accepts typing
- filters update state and URL
- active filter styling matches the selected filter
- year buttons keep scrolling behavior intact
- entry buttons have real, visible behavior

---

## Deliverables

1. Code fixes for all confirmed issues above
2. Regression coverage where practical for shared/data/route bugs
3. A button-by-button live QA report for all non-wallet controls against `https://dev.thorchain.no`
4. A final live QA report against `https://dev.thorchain.no`
5. Confirmation that testing continued iteratively until all confirmed bugs and UX quirks were fixed

---

## Exit Criteria

- No confirmed bug from this audit remains reproducible on `https://dev.thorchain.no`
- Changelog controls work normally in deployed dev
- Notification prompt no longer blocks critical interactions
- Notification prompt CTA/dismiss behavior is intentional and non-obstructive
- LP route communicates upstream failures honestly
- Shared Midgard lookup behavior is corrected or safely degraded
- Rewards controls behave visibly and intentionally
- Transaction quick actions and in-page mode toggles behave correctly
- Changelog filters and entry buttons behave correctly
- Every reachable non-wallet button has been re-tested on the deployed dev site
- All touched user-facing routes are re-tested after the final deployment
- Final report includes what was tested, what was fixed, and what evidence confirms closure
