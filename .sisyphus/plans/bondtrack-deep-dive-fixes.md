# BondTrack Deep-Dive Fixes

## TL;DR

> Fix 20+ issues identified in comprehensive app analysis: config centralization, reusable components, dead code removal, API health banner, address persistence unification, TransactionComposer fix, multi-node RiskRadar, page consolidation, Rewards restructuring, bond CSV export, RUNE balance display, mobile LP optimization, and changelogs address gating.
>
> **Deliverables**: Centralized config, reusable DashboardCard, unified address persistence, global API health banner, consolidated dashboard pages, restructured Rewards, enhanced RiskRadar, bond CSV export, RUNE balance display, mobile-optimized LP table
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 6 waves + final verification
> **Critical Path**: T1-T6 (Foundation) → T7-T9 (Data/API) → T10-T12 (Risk/Node) → T13-T14 (Consolidation) → T15-T16 (Redesign) → T17-T20 (Features) → T21-T24 (Tests) → F1-F4

---

## Context

### Original Request
Fix all issues identified in deep-dive analysis of BondTrack app architecture, UX, code quality, and missing features.

### Interview Summary
**Key Discussions**:
- User previously completed QA audit fixing 11 data accuracy bugs (health score, bond history, pool APY, daily share, projection math, security gauges)
- User requested comprehensive top-to-bottom analysis covering design, displayed info, missing features
- 20 issues identified across UX, code quality, architecture, and feature gaps

**Research Findings**:
- Metis review identified dual `src/` directories (4 orphaned files in root `/src/`), recommended wave restructuring, and agent-executable QA
- P0 data accuracy bugs from QA audit are ALREADY FIXED (not part of this plan)
- Root `/src/` contains 4 small orphaned files: `lp-summary-card.tsx`, `LPPositionCard.tsx`, `PoolStatusBadge.tsx`, `pool.ts` — dead code to remove

### Metis Review
**Identified Gaps** (addressed):
- Card abstraction must be in Wave 1 (foundation), not Wave 5
- Wave 4 must be split: consolidation first, redesign second
- Persistence unification needs consumer mapping before changes
- File moves need `lsp_find_references` and immediate build verification
- All QA must be agent-executable with exact selectors

---

## Work Objectives

### Core Objective
Fix all 20 identified issues across configuration, components, data layer, UX, page architecture, and missing features to improve code maintainability, user experience, and feature completeness.

### Concrete Deliverables
- `src/lib/config.ts` extended with centralized thresholds and constants
- `src/components/shared/dashboard-card.tsx` reusable card component
- `src/lib/hooks/use-api-health.ts` global API health monitoring hook
- `src/components/shared/api-health-banner.tsx` health banner component
- Unified address persistence via single `localStorage` key
- Consolidated dashboard pages (Overview + Portfolio merged)
- Restructured Rewards page with clearer section boundaries
- Multi-node RiskRadar with node selector
- Bond position CSV export functionality
- RUNE wallet balance display in header
- Mobile-optimized LP table view
- Changelogs accessible without address

### Definition of Done
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes with all Vitest tests green
- [ ] `npm run lint` passes with zero errors
- [ ] All Playwright QA scenarios pass
- [ ] No 404s from deprecated routes (redirects in place)

### Must Have
- All magic numbers centralized in config
- DashboardCard component replaces repeated card styling
- API health banner visible when upstream APIs fail
- Address persistence unified to single mechanism
- TransactionComposer uses proper callback for mode sync
- RiskRadar supports multiple nodes
- Portfolio and Overview consolidated into single canonical page
- Rewards page restructured into logical sections
- Bond CSV export
- RUNE balance display
- Mobile LP table
- Changelogs accessible without address

### Must NOT Have (Guardrails)
- No breaking changes to existing URL structure without redirects
- No new dependencies without explicit justification
- No `as any` or `@ts-ignore`
- No human-intervention QA steps
- No removal of features without user-facing deprecation notice
- No changes to wallet integration code
- No changes to transaction signing logic

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest + Playwright + MSW scaffolding)
- **Automated tests**: YES (Tests-after for new features, updates for refactored code)
- **Framework**: Vitest for unit, Playwright for e2e/QA
- **Agent-Executed QA**: MANDATORY for every task

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — navigate, interact, assert DOM, screenshot
- **API/Backend**: Bash (curl) — send requests, assert status + response fields
- **Library/Module**: Bash (bun/node REPL) — import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — can all start immediately):
├── T1: Centralize magic numbers into config.ts
├── T2: Extract reusable DashboardCard component
├── T3: Consolidate duplicate YieldGuardFlag types
├── T4: Remove dead code (getNetworkSecurityMetrics)
├── T5: Clean up orphaned root src/ files
└── T6: Move useLpPositions to src/lib/hooks/

Wave 2 (Data Layer & API Health — depends: T1, T2):
├── T7: Build global API health banner hook + component
├── T8: Unify address persistence
└── T9: Fix TransactionComposer mode sync

Wave 3 (Risk & Node UX — depends: T1, T2):
├── T10: Multi-node RiskRadar with selector
├── T11: Fix watchlist buttons (router.push)
└── T12: Add node comparison table to Nodes page

Wave 4a (Page Consolidation — depends: T2):
├── T13: Merge Overview into Portfolio (canonical page)
└── T14: Add redirect from /dashboard/overview to /dashboard/portfolio

Wave 4b (Page Redesign — depends: T4a, T1, T2):
├── T15: Restructure Rewards page into logical sections
└── T16: Fix or remove handleOptimizeNow

Wave 5 (Features & Polish — depends: T4a, T1, T2):
├── T17: Add bond position CSV export
├── T18: Add RUNE wallet balance display
├── T19: Mobile-optimize LP table
└── T20: Make Changelogs accessible without address

Wave 6 (Testing & Verification — depends: ALL previous):
├── T21: Playwright tests for API health banner
├── T22: Playwright tests for page redirects
├── T23: Unit tests for centralized config
└── T24: Full build/test/lint verification

Wave FINAL (4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high + playwright)
└── F4: Scope fidelity check (deep)

Critical Path: T1/T2 → T7/T8 → T10 → T13 → T15 → T17-T20 → T21-T24 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Wave 1)
```

---

## TODOs

- [ ] T1. Centralize Magic Numbers and Thresholds into config.ts

  **What to do**:
  - Audit all dashboard components and utilities for magic numbers
  - Add centralized constants to `src/lib/config.ts`:
    - `SLASH_POINT_THRESHOLDS: { warning: 50, critical: 200 }`
    - `HEALTH_SCORE_THRESHOLDS: { healthy: 80, warning: 50 }`
    - `BOND_TO_POOL_THRESHOLDS: { underSecured: 1.0, building: 1.5, healthy: 2.5 }`
    - `PROGRESS_BAR_MULTIPLIER: 33`
    - `MAX_ACTIONS_LIMIT: 50`
    - `REFRESH_INTERVALS: { bondPositions: 60000, earnings: 300000, price: 300000, health: 30000 }`
  - Replace all inline magic numbers with imports from config
  - Update `calculateNetworkSecurityState()` in `calculations.ts` to use config thresholds
  - Update `risk/page.tsx` severity scoring to use config thresholds
  - Update `health-score.ts` to use config thresholds
  - Update `network-security-card.tsx` progress calculation to use config multiplier

  **Must NOT do**:
  - Do NOT change any calculation logic — only replace literal values with config imports
  - Do NOT modify API endpoint URLs or network constants already in config

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Reason**: Refactoring task — find-and-replace literals with config imports, no complex logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2-T6)
  - **Blocks**: T10, T12, T15
  - **Blocked By**: None

  **References**:
  - `src/lib/config.ts` — Extend existing NETWORK and ENDPOINTS objects
  - `src/lib/utils/calculations.ts:114-136` — calculateNetworkSecurityState thresholds
  - `src/lib/utils/health-score.ts` — Health score thresholds
  - `src/app/dashboard/risk/page.tsx:33-42` — getNodeSeverityScore magic numbers
  - `src/components/dashboard/network-security-card.tsx:43` — progress bar multiplier
  - `src/lib/api/midgard.ts:450` — MAX_ACTIONS_LIMIT (limit=50)
  - `src/lib/hooks/use-bond-positions.ts:59` — refreshInterval: 60_000

  **Acceptance Criteria**:
  - [ ] `grep -r "50\|200\|1.0\|1.5\|2.5\|33\|60000\|300000" src/app/dashboard/risk/ src/lib/utils/ | grep -v "config.ts" | grep -v ".test."` returns zero magic number matches (excluding test files and config itself)
  - [ ] `npm run build` passes
  - [ ] `npm run test` passes

  **QA Scenarios**:
  ```
  Scenario: Config values exist and are imported
    Tool: Bash (grep)
    Preconditions: T1 changes committed
    Steps:
      1. grep -r "SLASH_POINT_THRESHOLDS" src/lib/config.ts
      2. grep -r "SLASH_POINT_THRESHOLDS" src/lib/utils/health-score.ts src/app/dashboard/risk/page.tsx src/lib/utils/calculations.ts
    Expected Result: (1) shows export definition; (2) shows imports in all 3 files
    Evidence: .sisyphus/evidence/t1-config-imports.txt

  Scenario: No magic numbers remain in refactored files
    Tool: Bash (grep)
    Steps:
      1. grep -n "slashPoints >= 200\|slashPoints >= 50\|healthScore >= 80\|healthScore >= 50\|bondToPoolRatio >= 2.5\|bondToPoolRatio >= 1.5\|bondToPoolRatio >= 1.0\|Math.min(ratio \* 33" src/lib/utils/calculations.ts src/lib/utils/health-score.ts src/app/dashboard/risk/page.tsx src/components/dashboard/network-security-card.tsx
    Expected Result: Zero matches (all replaced with config imports)
    Evidence: .sisyphus/evidence/t1-no-magic-numbers.txt
  ```

  **Commit**: YES
  - Message: `refactor(config): centralize magic numbers and thresholds`
  - Files: `src/lib/config.ts`, `src/lib/utils/calculations.ts`, `src/lib/utils/health-score.ts`, `src/app/dashboard/risk/page.tsx`, `src/components/dashboard/network-security-card.tsx`, `src/lib/api/midgard.ts`, `src/lib/hooks/use-bond-positions.ts`

- [ ] T2. Extract Reusable DashboardCard Component

  **What to do**:
  - Create `src/components/shared/dashboard-card.tsx`
  - Implement a flexible card component that replaces the repeated pattern:
    ```
    rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80
    ```
  - Props: `children`, `className` (optional), `title` (optional string), `icon` (optional ReactNode), `highlight` (optional: 'emerald' | 'amber' | 'red' | 'cyan')
  - When `highlight` is set, apply colored border variant
  - When `title` is set, render header with title and optional icon
  - Replace the pattern in ALL components:
    - `overview/page.tsx` — MarketOverview, PortfolioSummary, FeeRevenueSummary, FeeRevenueChart, RewardProjections, PositionTable wrappers
    - `portfolio/page.tsx` — Total Portfolio Value card, Asset Allocation card, Performance Summary card, Quick Actions card
    - `risk/page.tsx` — RiskSummaryBanner, IncentivePendulum, NetworkSecurityCard, NodesList, detail panels
    - `rewards/page.tsx` — PnL section, Yield Optimization section, Market Context section
    - `lp/page.tsx` — LpPortfolioHero, LpSummaryCard, table wrapper
  - Be careful with components that have INTERNAL card styling (like `LpSummaryCard` which is its own card component) — only replace the wrapper containers in PAGE files, not reusable components themselves

  **Must NOT do**:
  - Do NOT modify internal component styling of components like `LpSummaryCard`, `NodeStatusCard`, `NetworkSecurityCard` — those are standalone components
  - Do NOT change visual appearance — the card should look identical to the current styling

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Reason**: Component extraction + systematic replacement

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3-T6)
  - **Blocks**: T10, T13, T15, T17, T19
  - **Blocked By**: None

  **References**:
  - `src/app/dashboard/overview/page.tsx:151-228` — Multiple card wrappers
  - `src/app/dashboard/portfolio/page.tsx:130-249` — Card wrappers
  - `src/app/dashboard/risk/page.tsx:120-522` — Card wrappers
  - `src/app/dashboard/lp/page.tsx:271-408` — Card wrappers
  - Existing `src/components/shared/export-button.tsx` — Pattern for shared components

  **Acceptance Criteria**:
  - [ ] `DashboardCard` component exists at `src/components/shared/dashboard-card.tsx`
  - [ ] `grep -r "rounded-2xl border border-zinc-200 bg-white/90" src/app/dashboard/` returns zero matches in PAGE files (component internal styling exempt)
  - [ ] Visual regression: Playwright screenshot of Overview page matches baseline
  - [ ] `npm run build` passes

  **QA Scenarios**:
  ```
  Scenario: DashboardCard renders correctly in dark mode
    Tool: Playwright
    Preconditions: Dev server running at http://localhost:3000
    Steps:
      1. Navigate to /dashboard/overview?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      2. Click theme toggle to dark mode
      3. Screenshot the PortfolioSummary card area
    Expected Result: Card has dark background (zinc-900/80), dark border (zinc-800), no visual regressions
    Evidence: .sisyphus/evidence/t2-dark-mode-card.png

  Scenario: DashboardCard with highlight prop
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard/risk?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      2. Screenshot the RiskSummaryBanner
    Expected Result: Banner card renders with correct styling, no className conflicts
    Evidence: .sisyphus/evidence/t2-risk-banner-card.png
  ```

  **Commit**: YES
  - Message: `refactor(ui): extract reusable DashboardCard component`
  - Files: `src/components/shared/dashboard-card.tsx`, all `src/app/dashboard/*/page.tsx`

- [ ] T3. Consolidate Duplicate YieldGuardFlag Types

  **What to do**:
  - Remove `YieldGuardFlag` export from `src/lib/hooks/use-bond-positions.ts` (line 7)
  - Update `src/app/dashboard/risk/page.tsx` to import `YieldGuardFlag` from `src/lib/types/node` instead of redeclaring inline
  - Verify `src/lib/types/node.ts` is the single source of truth for `YieldGuardFlag`
  - Update any other files that declare or import YieldGuardFlag from the hook

  **Must NOT do**:
  - Do NOT change the type definition itself — only consolidate imports

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/lib/types/node.ts:6` — Canonical YieldGuardFlag type
  - `src/lib/hooks/use-bond-positions.ts:7` — Duplicate declaration
  - `src/app/dashboard/risk/page.tsx` — Inline usage (line 44 redeclares YIELD_GUARD_CONFIG but uses YieldGuardFlag as key type)

  **Acceptance Criteria**:
  - [ ] `grep -r "export type YieldGuardFlag" src/` returns only one result (in `types/node.ts`)
  - [ ] `npm run build` passes
  - [ ] `npm run test` passes

  **QA Scenarios**:
  ```
  Scenario: Single YieldGuardFlag definition exists
    Tool: Bash (grep)
    Steps:
      1. grep -r "export type YieldGuardFlag" src/
      2. grep -r "from '@/lib/types/node'" src/lib/hooks/use-bond-positions.ts
    Expected Result: (1) Exactly one hit in src/lib/types/node.ts; (2) use-bond-positions imports YieldGuardFlag from types/node
    Evidence: .sisyphus/evidence/t3-type-consolidation.txt
  ```

  **Commit**: YES
  - Message: `refactor(types): consolidate YieldGuardFlag to single source of truth`
  - Files: `src/lib/hooks/use-bond-positions.ts`, `src/lib/types/node.ts`

- [ ] T4. Remove Dead Code (getNetworkSecurityMetrics)

  **What to do**:
  - Remove unused `getNetworkSecurityMetrics()` function from `src/lib/api/midgard.ts` (lines 436-448)
  - Remove unused `NetworkSecurityMetricsRaw` interface from `src/lib/api/midgard.ts` (lines 134-138)
  - Verify no imports reference these exports
  - Also remove `getNetworkSecurityMetrics` import from `src/lib/api/midgard.ts` top-level if it exists

  **Must NOT do**:
  - Do NOT remove `calculateNetworkSecurityState` from `calculations.ts` — that IS used
  - Do NOT remove `NetworkRaw` interface — used throughout

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/lib/api/midgard.ts:134-138` — NetworkSecurityMetricsRaw interface
  - `src/lib/api/midgard.ts:436-448` — getNetworkSecurityMetrics function

  **Acceptance Criteria**:
  - [ ] `lsp_find_references` on `getNetworkSecurityMetrics` returns zero usages
  - [ ] `lsp_find_references` on `NetworkSecurityMetricsRaw` returns zero usages
  - [ ] `npm run build` passes after removal

  **QA Scenarios**:
  ```
  Scenario: Dead code removed and build still passes
    Tool: Bash (grep + npm run build)
    Steps:
      1. grep -n "getNetworkSecurityMetrics\|NetworkSecurityMetricsRaw" src/lib/api/midgard.ts
      2. npm run build
    Expected Result: (1) Zero matches; (2) Build succeeds with zero errors
    Evidence: .sisyphus/evidence/t4-dead-code-removed.txt
  ```

  **Commit**: YES
  - Message: `chore(api): remove dead code getNetworkSecurityMetrics`
  - Files: `src/lib/api/midgard.ts`

- [ ] T5. Clean Up Orphaned Root src/ Files

  **What to do**:
  - Delete the root `/Users/reidar/Downloads/THORNode Watcher/src/` directory entirely
  - It contains 4 orphaned files that are not part of the main app build:
    - `src/components/dashboard/lp-summary-card.tsx`
    - `src/app/dashboard/lp/components/LPPositionCard.tsx`
    - `src/app/dashboard/lp/components/PoolStatusBadge.tsx`
    - `src/lib/utils/pool.ts`
  - Verify the main app at `thornode-watcher/src/` has equivalent or better implementations

  **Must NOT do**:
  - Do NOT delete anything inside `thornode-watcher/src/`
  - Do NOT port these files — they are outdated and the main app already has superior implementations

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Root `src/` directory no longer exists
  - [ ] `npm run build` in `thornode-watcher/` still passes

  **QA Scenarios**:
  ```
  Scenario: Orphaned directory deleted
    Tool: Bash (ls)
    Steps:
      1. ls /Users/reidar/Downloads/THORNode\ Watcher/src/ 2>&1
    Expected Result: "No such file or directory" error
    Evidence: .sisyphus/evidence/t5-orphaned-deleted.txt
  ```

  **Commit**: YES (separate from main app commits)
  - Message: `chore: remove orphaned root src/ directory`

- [ ] T6. Move useLpPositions to src/lib/hooks/

  **What to do**:
  - Move `src/hooks/use-lp-positions.ts` to `src/lib/hooks/use-lp-positions.ts`
  - Update ALL imports across the codebase:
    - `src/app/dashboard/lp/page.tsx`
    - `src/app/dashboard/portfolio/page.tsx`
    - Any test files referencing it
  - Use `lsp_find_references` on the old path to find all imports
  - Run `npm run build` immediately after to catch any missed imports

  **Must NOT do**:
  - Do NOT change the hook implementation — only move the file and update imports

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T19
  - **Blocked By**: None

  **References**:
  - `src/hooks/use-lp-positions.ts` — Source file
  - `lsp_find_references` on old import path to find all consumers

  **Acceptance Criteria**:
  - [ ] File exists at `src/lib/hooks/use-lp-positions.ts`
  - [ ] File does NOT exist at `src/hooks/use-lp-positions.ts`
  - [ ] `grep -r "from '@/hooks/use-lp-positions'" src/` returns zero matches
  - [ ] `grep -r "from '../../../hooks/use-lp-positions'" src/` returns zero matches
  - [ ] `npm run build` passes

  **QA Scenarios**:
  ```
  Scenario: All imports updated and build passes
    Tool: Bash (grep + npm run build)
    Steps:
      1. grep -r "use-lp-positions" src/app/dashboard/lp/page.tsx src/app/dashboard/portfolio/page.tsx
      2. npm run build
    Expected Result: (1) All imports point to @/lib/hooks/use-lp-positions; (2) Build succeeds
    Evidence: .sisyphus/evidence/t6-move-verified.txt
  ```

  **Commit**: YES
  - Message: `refactor(hooks): move useLpPositions to lib/hooks for consistency`
  - Files: `src/hooks/use-lp-positions.ts` (deleted), `src/lib/hooks/use-lp-positions.ts` (moved), all import sites

---

## Final Verification Wave

- [ ] T7. Build Global API Health Banner Hook + Component

  **What to do**:
  - Create `src/lib/hooks/use-api-health.ts` that monitors the health of critical APIs:
    - Polls Midgard `/v2/health` every 30s
    - Polls THORNode `/thorchain/nodes` every 60s
    - Tracks success/failure state for each API
    - Exposes: `{ midgard: 'healthy' | 'degraded' | 'down', thornode: 'healthy' | 'degraded' | 'down', lastChecked: Date }`
  - Create `src/components/shared/api-health-banner.tsx`:
    - Fixed-position banner at top of dashboard (below header)
    - Shows only when ANY API is 'degraded' or 'down'
    - Message: "Midgard API is temporarily unavailable — some data may be stale" (or THORNode equivalent)
    - Dismissible per-session (not persisted)
    - Color: amber for degraded, red for down
  - Integrate banner into `src/components/layout/dashboard-shell.tsx` — render conditionally when APIs are unhealthy
  - Ensure banner doesn't block content (add `mt-` spacing or use sticky positioning)

  **Must NOT do**:
  - Do NOT block dashboard rendering if APIs are down — banner should be informational only
  - Do NOT retry failed health checks aggressively — use same retry config as other API calls

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Reason**: Requires hook design, component styling, and integration into shell

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T8, T9)
  - **Parallel Group**: Wave 2
  - **Blocks**: T21 (Playwright tests for banner)
  - **Blocked By**: T1, T2 (for consistent styling)

  **References**:
  - `src/lib/api/midgard.ts:621-623` — getHealth() endpoint
  - `src/lib/api/thornode.ts` — getAllNodes() or similar health check
  - `src/lib/api/client.ts` — fetch patterns with retry
  - `src/components/layout/dashboard-shell.tsx` — Integration point
  - `src/components/dashboard/upgrade-alert-banner.tsx` — Pattern for dismissible banner

  **Acceptance Criteria**:
  - [ ] `useApiHealth` hook exists and returns correct status shapes
  - [ ] Banner renders when API is degraded
  - [ ] Banner is dismissible
  - [ ] Banner doesn't appear when APIs are healthy
  - [ ] `npm run build` passes

  **QA Scenarios**:
  ```
  Scenario: Banner appears when Midgard returns 502
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Intercept /api/midgard/v2/health to return 502
      2. Navigate to /dashboard/overview?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      3. Wait 5s for health check
    Expected Result: Banner visible with text containing "Midgard API is temporarily unavailable"
    Evidence: .sisyphus/evidence/t7-banner-502.png

  Scenario: Banner dismissed and stays hidden
    Tool: Playwright
    Steps:
      1. Same as above
      2. Click dismiss button on banner
      3. Refresh page
    Expected Result: Banner hidden after dismiss, still hidden after refresh
    Evidence: .sisyphus/evidence/t7-banner-dismissed.png
  ```

  **Commit**: YES
  - Message: `feat(health): add global API health banner`
  - Files: `src/lib/hooks/use-api-health.ts`, `src/components/shared/api-health-banner.tsx`, `src/components/layout/dashboard-shell.tsx`

- [ ] T8. Unify Address Persistence

  **What to do**:
  - Map ALL consumers of address persistence:
    - `src/app/page.tsx` — `localStorage` key `thornode-watcher-last-address` (landing redirect)
    - `src/app/dashboard/layout.tsx` — `sessionStorage` key `dashboard-address` (address restore)
    - `src/app/dashboard/layout.tsx` — also saves to sessionStorage
    - `src/lib/hooks/use-watchlist.ts` — watchlist localStorage
    - `src/components/dashboard/pnl-dashboard.tsx` — localStorage for manual bond input
  - Define a single unified key: `BONDTRACK_ADDRESS` in `localStorage`
  - Update `src/app/page.tsx` landing redirect to use unified key
  - Update `src/app/dashboard/layout.tsx` to:
    - Read from `localStorage` (not sessionStorage)
    - Save to `localStorage` (not sessionStorage)
    - Still support `?address=` URL param as override
  - Add migration: on first load, check old keys and migrate to new key, then delete old keys
  - Ensure the no-address flow still works: when no address in URL or storage, show a clear CTA to go home instead of infinite loading skeleton

  **Must NOT do**:
  - Do NOT break the existing `?address=` URL parameter flow
  - Do NOT remove watchlist functionality — only the active address persistence

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Reason**: Touching core address flow — needs careful testing

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7, T9)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/app/page.tsx:10-27` — Landing address persistence
  - `src/app/dashboard/layout.tsx:13-42` — Dashboard address restore
  - `src/lib/hooks/use-watchlist.ts` — Watchlist storage
  - `AGENTS.md` — "Dashboard layout restores the last viewed address from sessionStorage"

  **Acceptance Criteria**:
  - [ ] Only one persistence key exists: `BONDTRACK_ADDRESS` in localStorage
  - [ ] Old keys (`thornode-watcher-last-address`, `dashboard-address`) are migrated and removed
  - [ ] Landing page redirect works with new key
  - [ ] Dashboard address restore works with new key
  - [ ] URL `?address=` param still works and overrides storage
  - [ ] No-address state shows clear CTA instead of infinite skeleton

  **QA Scenarios**:
  ```
  Scenario: Address restored from localStorage on dashboard load
    Tool: Playwright
    Steps:
      1. localStorage.setItem('BONDTRACK_ADDRESS', 'thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346')
      2. Navigate to /dashboard/overview
      3. Wait for load
    Expected Result: URL updated to /dashboard/overview?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
    Evidence: .sisyphus/evidence/t8-address-restore.png

  Scenario: No address shows clear CTA
    Tool: Playwright
    Steps:
      1. Clear localStorage and sessionStorage
      2. Navigate to /dashboard/overview
    Expected Result: Page shows "Enter an address to get started" CTA with link to home, NOT infinite loading skeleton
    Evidence: .sisyphus/evidence/t8-no-address-cta.png
  ```

  **Commit**: YES
  - Message: `refactor(auth): unify address persistence to single localStorage key`
  - Files: `src/app/page.tsx`, `src/app/dashboard/layout.tsx`

- [ ] T9. Fix TransactionComposer Mode Sync

  **What to do**:
  - Modify `src/components/dashboard/transaction-composer.tsx` to accept an `onModeChange` callback prop
  - Inside TransactionComposer, when user clicks BOND/UNBOND tabs, call `onModeChange('bond' | 'unbond')` instead of relying on external click interception
  - Update `src/app/dashboard/transactions/page.tsx`:
    - Remove the fragile `handleComposerClick` function (lines 36-53)
    - Remove the `onClick={handleComposerClick}` wrapper
    - Pass `onModeChange={syncTransactionMode}` directly to `<TransactionComposer />`
  - Ensure the URL sync logic in `syncTransactionMode` still works correctly

  **Must NOT do**:
  - Do NOT change the visual appearance of the composer
  - Do NOT break the existing BOND/UNBOND mode switching

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7, T8)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/app/dashboard/transactions/page.tsx:36-53` — Fragile handleComposerClick
  - `src/app/dashboard/transactions/page.tsx:73-74` — onClick wrapper
  - `src/components/dashboard/transaction-composer.tsx` — Component to modify

  **Acceptance Criteria**:
  - [ ] `handleComposerClick` function removed from transactions/page.tsx
  - [ ] TransactionComposer accepts `onModeChange` prop
  - [ ] Clicking BOND tab updates URL to `?action=bond`
  - [ ] Clicking UNBOND tab updates URL to `?action=unbond`
  - [ ] `npm run build` passes

  **QA Scenarios**:
  ```
  Scenario: Mode switch updates URL correctly
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to /dashboard/transactions?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346&action=bond
      2. Click UNBOND tab in composer
      3. Assert URL contains action=unbond
      4. Click BOND tab
      5. Assert URL contains action=bond
    Expected Result: URL updates correctly without page reload
    Evidence: .sisyphus/evidence/t9-mode-switch.gif
  ```

  **Commit**: YES
  - Message: `fix(transactions): replace fragile textContent mode detection with callback prop`
  - Files: `src/components/dashboard/transaction-composer.tsx`, `src/app/dashboard/transactions/page.tsx`

---

## Final Verification Wave

- [x] T10. Multi-Node RiskRadar with Selector

  **What to do**:
  - Modify `src/components/dashboard/risk-radar.tsx` to accept either a single position or an array of positions
  - Add a node selector dropdown when multiple positions exist:
    - Show abbreviated node address (first 8 + last 4)
    - Include bond amount and status in option label
    - Default to first position (current behavior)
  - When user selects a different node, re-render the radar for that node
  - Update `src/app/dashboard/risk/page.tsx`:
    - Pass ALL positions to RiskRadar instead of just `positions[0]`
    - Remove the conditional that only renders radar when `positions.length > 0` (keep it, but pass all)

  **Must NOT do**:
  - Do NOT remove the existing single-position support — extend it
  - Do NOT change the radar chart library or data shape

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Reason**: UI component enhancement with interactivity

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T11, T12)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T1, T2

  **References**:
  - `src/components/dashboard/risk-radar.tsx` — Component to enhance
  - `src/app/dashboard/risk/page.tsx:503-509` — Current usage (only first position)

  **Acceptance Criteria**:
  - [ ] RiskRadar accepts `positions: BondPosition[]` prop
  - [ ] Selector dropdown visible when positions.length > 1
  - [ ] Selecting different node updates radar
  - [ ] Single-node users see no dropdown (clean experience)

  **QA Scenarios**:
  ```
  Scenario: Multi-node provider sees selector and can switch
    Tool: Playwright
    Preconditions: Address with multiple bond positions
    Steps:
      1. Navigate to /dashboard/risk?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      2. Verify selector dropdown is visible
      3. Select second node from dropdown
      4. Screenshot radar
    Expected Result: Radar updates to show second node's metrics
    Evidence: .sisyphus/evidence/t10-multi-node-radar.png
  ```

  **Commit**: YES
  - Message: `feat(risk): add multi-node support to RiskRadar`
  - Files: `src/components/dashboard/risk-radar.tsx`, `src/app/dashboard/risk/page.tsx`

- [x] T11. Fix Watchlist Buttons (router.push)

  **What to do**:
  - In `src/app/dashboard/transactions/page.tsx` (line 89), replace `window.location.href` with `router.push()`
  - Ensure the address param is preserved in the navigation
  - Also check `src/components/shared/recent-addresses.tsx` for similar `window.location` usage
  - Also check `src/components/layout/dashboard-shell.tsx` for any `window.location` patterns

  **Must NOT do**:
  - Do NOT change the visual appearance of watchlist buttons

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T10, T12)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/app/dashboard/transactions/page.tsx:89` — window.location.href
  - `src/components/shared/recent-addresses.tsx` — Check for similar patterns

  **Acceptance Criteria**:
  - [ ] No `window.location.href` used for internal navigation in dashboard
  - [ ] Watchlist buttons use client-side navigation
  - [ ] Page transitions are smooth (no full reload flash)

  **QA Scenarios**:
  ```
  Scenario: Watchlist click uses client-side navigation
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard/transactions?address=addr1
      2. Add addr2 to watchlist
      3. Click addr2 in watchlist
      4. Measure navigation time
    Expected Result: Navigation completes in <500ms (client-side), URL updates to addr2
    Evidence: .sisyphus/evidence/t11-watchlist-nav.png
  ```

  **Commit**: YES
  - Message: `fix(nav): use router.push for watchlist instead of window.location`
  - Files: `src/app/dashboard/transactions/page.tsx`, `src/components/shared/recent-addresses.tsx`

- [x] T12. Add Node Comparison Table to Nodes Page

  **What to do**:
  - In `src/app/dashboard/nodes/page.tsx`, add a sortable comparison table below the existing node cards
  - Table columns: Node Address, Status, Bond Amount, APY, Slash Points, Operator Fee, Risk Score
  - Sortable by clicking column headers
  - Color-coded rows based on risk (red for high slash/jailed, amber for warning)
  - Use existing ` BondPosition` data from `useBondPositions`
  - Reuse styling from LP table for consistency

  **Must NOT do**:
  - Do NOT remove existing NodeStatusCard grid view — add the table as an additional view
  - Do NOT fetch new data — use existing bond positions

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T10, T11)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T1, T2

  **References**:
  - `src/app/dashboard/nodes/page.tsx` — Page to enhance
  - `src/app/dashboard/lp/page.tsx:332-406` — LP table pattern to follow
  - `src/lib/types/node.ts` — BondPosition type

  **Acceptance Criteria**:
  - [ ] Table renders below node cards
  - [ ] All columns populated with correct data
  - [ ] Sorting works for all columns
  - [ ] Risk color coding applied

  **QA Scenarios**:
  ```
  Scenario: Node comparison table renders and sorts
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard/nodes?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      2. Scroll to comparison table
      3. Click "APY" column header to sort
      4. Screenshot
    Expected Result: Table visible, sorted by APY descending
    Evidence: .sisyphus/evidence/t12-node-table.png
  ```

  **Commit**: YES
  - Message: `feat(nodes): add sortable node comparison table`
  - Files: `src/app/dashboard/nodes/page.tsx`

- [x] T13. Merge Overview into Portfolio (Canonical Dashboard Page)

  **What to do**:
  - Portfolio (`/dashboard/portfolio`) becomes the canonical dashboard page
  - Merge Overview's key widgets INTO Portfolio:
    - Market Overview widget (top of Portfolio)
    - Fee Revenue Summary + Chart (below portfolio hero)
    - Position Table (already exists in Overview, add to Portfolio)
    - Intelligence Feed sidebar (right column)
  - Remove placeholder "Performance Summary" card from Portfolio
  - Keep Portfolio's existing: Total Portfolio Value hero, Asset Allocation pie chart, Quick Actions
  - The merged page should feel like a true "command center" — portfolio value at top, market context, positions, and alerts
  - Ensure Bond + LP data are BOTH displayed (Portfolio already does this)

  **Must NOT do**:
  - Do NOT simply duplicate all Overview code into Portfolio — extract shared components if needed
  - Do NOT remove the Portfolio pie chart (it's the one unique feature)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Reason**: Page restructuring with component composition

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T14)
  - **Parallel Group**: Wave 4a
  - **Blocks**: T15 (Rewards restructuring depends on page layout)
  - **Blocked By**: T2 (DashboardCard)

  **References**:
  - `src/app/dashboard/portfolio/page.tsx` — Target page
  - `src/app/dashboard/overview/page.tsx` — Source widgets to port
  - `src/components/dashboard/market-overview.tsx` — Widget to include
  - `src/components/dashboard/fee-revenue-summary.tsx` — Widget to include
  - `src/components/dashboard/fee-revenue-chart.tsx` — Widget to include
  - `src/components/dashboard/position-table.tsx` — Widget to include
  - `src/components/dashboard/intelligence-feed.tsx` — Widget to include

  **Acceptance Criteria**:
  - [ ] Portfolio page contains: hero value, pie chart, market overview, fee revenue, position table, quick actions
  - [ ] No "Performance Summary" placeholder
  - [ ] Page loads without errors
  - [ ] `npm run build` passes

  **QA Scenarios**:
  ```
  Scenario: Merged Portfolio page shows all widgets
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard/portfolio?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      2. Scroll through entire page
      3. Capture full-page screenshot
    Expected Result: All widgets visible: hero, pie chart, market overview, fee revenue, position table, quick actions
    Evidence: .sisyphus/evidence/t13-merged-portfolio.png
  ```

  **Commit**: YES
  - Message: `feat(portfolio): merge Overview widgets into Portfolio as canonical dashboard`
  - Files: `src/app/dashboard/portfolio/page.tsx`

- [x] T14. Add Redirect from /dashboard/overview to /dashboard/portfolio

  **What to do**:
  - In `src/app/dashboard/page.tsx` (the redirect file), change redirect target from `/dashboard/overview` to `/dashboard/portfolio`
  - In `src/app/dashboard/overview/page.tsx`, add a client-side redirect to `/dashboard/portfolio` (preserve query params)
  - Update `src/components/layout/sidebar.tsx` nav items to point to Portfolio instead of Overview
  - Update any internal links that reference `/dashboard/overview` (check overview/page.tsx quick actions, portfolio quick actions)
  - Add `next.config.js` or `middleware.ts` server-side redirect as backup:
    ```js
    // next.config.js
    async redirects() {
      return [
        {
          source: '/dashboard/overview',
          destination: '/dashboard/portfolio',
          permanent: true,
        },
      ];
    }
    ```
  - Update `src/app/dashboard/layout.tsx` address restore to redirect to `/dashboard/portfolio` instead of `/dashboard/overview`

  **Must NOT do**:
  - Do NOT delete the overview/page.tsx file yet — keep it with redirect for safety

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T13)
  - **Parallel Group**: Wave 4a
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/app/dashboard/page.tsx` — Current redirect to overview
  - `src/app/dashboard/overview/page.tsx` — Add client redirect
  - `src/components/layout/sidebar.tsx` — Navigation items
  - `next.config.js` or `next.config.ts` — Server redirects

  **Acceptance Criteria**:
  - [ ] `/dashboard?address=...` redirects to `/dashboard/portfolio?address=...`
  - [ ] `/dashboard/overview?address=...` redirects to `/dashboard/portfolio?address=...`
  - [ ] Sidebar "Overview" link renamed to "Portfolio" and points to `/dashboard/portfolio`
  - [ ] Server-side 301 redirect configured

  **QA Scenarios**:
  ```
  Scenario: Old overview URL redirects to portfolio
    Tool: Bash (curl)
    Steps:
      1. curl -I "http://localhost:3000/dashboard/overview?address=test"
    Expected Result: HTTP 308 or 301 with Location header pointing to /dashboard/portfolio
    Evidence: .sisyphus/evidence/t14-redirect.txt

  Scenario: Sidebar navigation points to portfolio
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard/portfolio
      2. Inspect sidebar "Portfolio" link href
    Expected Result: href contains /dashboard/portfolio
    Evidence: .sisyphus/evidence/t14-sidebar-link.png
  ```

  **Commit**: YES
  - Message: `refactor(routing): redirect overview to portfolio, make portfolio canonical`
  - Files: `src/app/dashboard/page.tsx`, `src/app/dashboard/overview/page.tsx`, `src/components/layout/sidebar.tsx`, `next.config.ts`

- [x] T15. Restructure Rewards Page into Logical Sections

  **What to do**:
  - Split the crowded Rewards page into clearly separated sections with section headers:
    1. **PnL Performance** — Keep PnLDashboard, move Tax Export button into this section header
    2. **Yield Optimization** — PersonalFeeAudit, AutoCompoundChart, strategic insight banner
    3. **Market Context** — PriceChart (compact)
  - Add visual separation between sections (use DashboardCard with title prop)
  - Move Tax Export to a more prominent location (section header with icon)
  - Reduce vertical spacing waste — current page has `space-y-12` which creates excessive gaps
  - Ensure each section is collapsible on mobile (optional enhancement)

  **Must NOT do**:
  - Do NOT remove any existing functionality — only reorganize layout
  - Do NOT change the Tax Export logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T16)
  - **Parallel Group**: Wave 4b
  - **Blocks**: None
  - **Blocked By**: T13, T14 (page consolidation), T2 (DashboardCard)

  **References**:
  - `src/app/dashboard/rewards/page.tsx` — Page to restructure
  - `src/components/dashboard/pnl-dashboard.tsx` — PnL section
  - `src/components/dashboard/fee-impact-tracker.tsx` — Fee audit
  - `src/components/dashboard/auto-compound-chart.tsx` — Auto-compound
  - `src/components/dashboard/price-chart.tsx` — Price chart

  **Acceptance Criteria**:
  - [ ] Three distinct sections with clear headers
  - [ ] Tax Export button visible in PnL section header
  - [ ] Reduced excessive vertical spacing
  - [ ] `npm run build` passes

  **QA Scenarios**:
  ```
  Scenario: Rewards page sections are visually distinct
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard/rewards?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      2. Scroll through page
      3. Capture full-page screenshot
    Expected Result: Three clear sections with headers, tax export visible
    Evidence: .sisyphus/evidence/t15-rewards-structure.png
  ```

  **Commit**: YES
  - Message: `ui(rewards): restructure into logical sections with clear headers`
  - Files: `src/app/dashboard/rewards/page.tsx`

- [x] T16. Fix or Remove handleOptimizeNow

  **What to do**:
  - Current behavior: "Optimize Now" button goes to `/dashboard/transactions?action=optimize` but transactions page only parses `bond`/`unbond`, so it defaults to bond
  - **Option A (Implement)**: Create an actual optimization flow:
    - Show a modal or dedicated page with bond optimization suggestions
    - Use existing `bond-optimizer.ts` utility to generate suggestions
    - Display: "Move X RUNE from Node A to Node B to improve APY by Y%"
    - Add "Apply" buttons that pre-fill transaction composer
  - **Option B (Remove)**: Remove the button and strategic insight banner entirely if optimization is out of scope
  - **Decision**: Given scope, implement a lightweight version of Option A:
    - Create `src/components/dashboard/bond-optimizer-suggestions.tsx`
    - Show top 3 suggestions based on `analyzeBondOptimization()`
    - Each suggestion has "Bond Here" link that goes to transactions with pre-filled params
    - If no suggestions available, show "Your portfolio is well-optimized" message

  **Must NOT do**:
  - Do NOT leave the misleading button as-is

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Reason**: Requires using existing optimization logic and integrating with transaction flow

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T15)
  - **Parallel Group**: Wave 4b
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/app/dashboard/rewards/page.tsx:183-191` — Current button and insight banner
  - `src/lib/utils/bond-optimizer.ts` — Existing optimization logic
  - `src/components/dashboard/bond-optimizer.tsx` — Existing optimizer component

  **Acceptance Criteria**:
  - [ ] Either a working optimizer UI exists, OR the misleading button is removed
  - [ ] If implemented: suggestions are based on real data, actionable, and link to transactions

  **QA Scenarios**:
  ```
  Scenario: Optimizer shows real suggestions
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard/rewards?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      2. Scroll to Yield Optimization section
      3. Verify suggestions are visible (or "well-optimized" message)
    Expected Result: Meaningful optimization suggestions or clear empty state
    Evidence: .sisyphus/evidence/t16-optimizer.png
  ```

  **Commit**: YES
  - Message: `feat(rewards): implement lightweight bond optimizer suggestions`
  - Files: `src/components/dashboard/bond-optimizer-suggestions.tsx`, `src/app/dashboard/rewards/page.tsx`

- [x] T17. Add Bond Position CSV Export

  **What to do**:
  - Create bond CSV export following the same pattern as LP export in `lp/page.tsx`
  - Add export function to `src/lib/utils/export.ts` or create `src/lib/utils/bond-export.ts`
  - Columns: Node Address, Status, Bond Amount, Bond Share %, APY, Slash Points, Operator Fee, Jailed, Version
  - Add Export button to:
    - `src/app/dashboard/portfolio/page.tsx` (next to existing export if any)
    - `src/app/dashboard/nodes/page.tsx` (above node cards)
  - Reuse existing `ExportButton` component pattern if it supports bond data, or create a bond-specific variant

  **Must NOT do**:
  - Do NOT duplicate LP export logic — extract shared CSV generation utility if possible

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T18-T20)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T13 (Portfolio is canonical page)

  **References**:
  - `src/app/dashboard/lp/page.tsx:124-147` — LP export pattern
  - `src/components/shared/export-button.tsx` — Existing export button
  - `src/lib/types/node.ts` — BondPosition type

  **Acceptance Criteria**:
  - [ ] CSV export generates file with correct columns
  - [ ] Data matches displayed bond positions
  - [ ] Button visible on Portfolio and Nodes pages

  **QA Scenarios**:
  ```
  Scenario: Bond CSV export works
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard/nodes?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      2. Click "Export CSV" button
      3. Verify downloaded file contains expected columns
    Expected Result: CSV file downloaded with Node Address, Status, Bond Amount, etc.
    Evidence: .sisyphus/evidence/t17-bond-csv.csv
  ```

  **Commit**: YES
  - Message: `feat(export): add bond position CSV export`
  - Files: `src/lib/utils/bond-export.ts`, `src/app/dashboard/portfolio/page.tsx`, `src/app/dashboard/nodes/page.tsx`

- [x] T18. Add RUNE Wallet Balance Display

  **What to do**:
  - Create a lightweight hook `src/lib/hooks/use-wallet-balance.ts` that fetches RUNE balance for the current address
  - Use THORNode `/cosmos/bank/v1beta1/balances/{address}` endpoint or Midgard equivalent
  - Display balance in dashboard header (`dashboard-shell.tsx`) next to the address
  - Format: "ᚱXX,XXX.XX available" in small text below the address
  - If balance fetch fails, show nothing (don't clutter header with errors)

  **Must NOT do**:
  - Do NOT require wallet connection — use the address from URL/storage
  - Do NOT block rendering if balance fetch fails

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T17, T19, T20)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/layout/dashboard-shell.tsx:136-144` — Header address display area
  - `src/lib/api/thornode.ts` — THORNode API client
  - `src/lib/utils/formatters.ts` — formatRuneAmount

  **Acceptance Criteria**:
  - [ ] Balance visible in header when available
  - [ ] Gracefully hidden when fetch fails
  - [ ] Updates on address change

  **QA Scenarios**:
  ```
  Scenario: Wallet balance displayed in header
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard/portfolio?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      2. Check header area below address
    Expected Result: "ᚱXX,XXX.XX available" visible
    Evidence: .sisyphus/evidence/t18-wallet-balance.png
  ```

  **Commit**: YES
  - Message: `feat(wallet): display RUNE balance in dashboard header`
  - Files: `src/lib/hooks/use-wallet-balance.ts`, `src/components/layout/dashboard-shell.tsx`

- [x] T19. Mobile-Optimize LP Table

  **What to do**:
  - In `src/app/dashboard/lp/page.tsx`, add a mobile card view for the LP positions table
  - Below ~768px, hide the table and show cards instead:
    - Each card shows: Pool name, Status badge, Net PnL, Pool APY, IL %
    - Cards are vertically stacked
    - Tap to expand for full details (deposited, withdrawable, share %)
  - Keep the table for desktop (md breakpoint and up)
  - Use Tailwind responsive classes: `hidden md:block` for table, `md:hidden` for cards

  **Must NOT do**:
  - Do NOT remove the desktop table
  - Do NOT change desktop table styling

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T17, T18, T20)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T6 (useLpPositions moved)

  **References**:
  - `src/app/dashboard/lp/page.tsx:324-407` — Current table
  - `src/components/dashboard/lp-summary-card.tsx` — Existing card component to reuse

  **Acceptance Criteria**:
  - [ ] Table hidden on mobile, cards shown
  - [ ] Cards visible on mobile with key metrics
  - [ ] Desktop table unchanged

  **QA Scenarios**:
  ```
  Scenario: Mobile LP view shows cards
    Tool: Playwright
    Steps:
      1. Set viewport to 375x667 (iPhone SE)
      2. Navigate to /dashboard/lp?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346
      3. Scroll to LP positions section
    Expected Result: Card-based layout visible, no horizontal table scrolling
    Evidence: .sisyphus/evidence/t19-mobile-lp.png
  ```

  **Commit**: YES
  - Message: `feat(lp): add mobile-optimized card view for LP positions`
  - Files: `src/app/dashboard/lp/page.tsx`

- [x] T20. Make Changelogs Accessible Without Address

  **What to do**:
  - Modify `src/app/dashboard/layout.tsx` to allow changelogs route to render without an address:
    - Check if current pathname is `/dashboard/changelogs`
    - If so, skip the address requirement and render shell + children normally
    - Or: extract changelogs to a non-dashboard route like `/changelogs`
  - Preferred approach: Allow changelogs within dashboard shell but without requiring address
    - In `DashboardContent`, check `pathname === '/dashboard/changelogs'`
    - If changelogs, set `effectiveAddress = null` but still render shell
    - Sidebar should still be visible for navigation
  - Alternative: Create `/changelogs` route outside dashboard and redirect `/dashboard/changelogs` there

  **Must NOT do**:
  - Do NOT break existing changelogs functionality
  - Do NOT require address for changelogs

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T17-T19)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/app/dashboard/layout.tsx:44-52` — Address requirement logic
  - `src/app/dashboard/changelogs/page.tsx` — Changelogs page
  - `src/components/layout/dashboard-shell.tsx` — Shell rendering

  **Acceptance Criteria**:
  - [ ] `/dashboard/changelogs` renders without `?address=` param
  - [ ] Sidebar navigation visible
  - [ ] Changelogs content loads and is interactive

  **QA Scenarios**:
  ```
  Scenario: Changelogs loads without address
    Tool: Playwright
    Steps:
      1. Clear all storage
      2. Navigate to /dashboard/changelogs
    Expected Result: Page renders with changelogs timeline, sidebar visible, no infinite loading
    Evidence: .sisyphus/evidence/t20-changelogs-no-address.png
  ```

  **Commit**: YES
  - Message: `feat(changelogs): allow access without address requirement`
  - Files: `src/app/dashboard/layout.tsx`

- [x] T21. Playwright Tests for API Health Banner

  **What to do**:
  - Create `e2e/api-health.spec.ts`
  - Test 1: Intercept Midgard health to return 502, verify banner appears
  - Test 2: Intercept THORNode to return 500, verify banner appears with THORNode message
  - Test 3: Both APIs healthy, verify banner NOT visible
  - Test 4: Click dismiss, verify banner hidden
  - Use Playwright request interception: `page.route()`

  **Must NOT do**:
  - Do NOT test against production APIs

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T22-T24)
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: T7 (API health banner)

  **References**:
  - `e2e/` directory — Existing Playwright tests
  - Playwright docs: `page.route()` for request interception

  **Acceptance Criteria**:
  - [ ] `npm run e2e` includes api-health tests
  - [ ] All 4 scenarios pass

  **QA Scenarios**:
  ```
  Scenario: Playwright test suite passes
    Tool: Bash
    Steps:
      1. npm run e2e -- e2e/api-health.spec.ts
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/t21-e2e-results.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): add API health banner Playwright tests`
  - Files: `e2e/api-health.spec.ts`

- [x] T22. Playwright Tests for Page Redirects

  **What to do**:
  - Create `e2e/redirects.spec.ts`
  - Test: `/dashboard/overview?address=test` → redirects to `/dashboard/portfolio?address=test`
  - Test: `/dashboard` → redirects to `/dashboard/portfolio`
  - Test: Old bookmark still works (301/308 status)
  - Verify query params preserved through redirect

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T21, T23, T24)
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: T14 (redirects implemented)

  **Acceptance Criteria**:
  - [ ] Redirect tests pass
  - [ ] Query params preserved

  **QA Scenarios**:
  ```
  Scenario: Overview redirects to Portfolio with params preserved
    Tool: Bash (curl)
    Steps:
      1. curl -I "http://localhost:3000/dashboard/overview?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346"
      2. curl -I "http://localhost:3000/dashboard"
    Expected Result: (1) HTTP 308/301 Location contains /dashboard/portfolio?address=thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346; (2) HTTP 308/301 Location contains /dashboard/portfolio
    Evidence: .sisyphus/evidence/t22-redirects.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): add page redirect Playwright tests`
  - Files: `e2e/redirects.spec.ts`

- [x] T23. Unit Tests for Centralized Config

  **What to do**:
  - Create `src/lib/utils/__tests__/config.test.ts`
  - Test that all threshold constants exist and are positive numbers
  - Test that refresh intervals are reasonable (not zero, not excessive)
  - Test that NETWORK constants match expected values

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T21, T22, T24)
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: T1 (config centralization)

  **Acceptance Criteria**:
  - [ ] Config tests pass
  - [ ] All constants verified

  **QA Scenarios**:
  ```
  Scenario: Config unit tests pass
    Tool: Bash (npm run test)
    Steps:
      1. npm run test -- --run src/lib/utils/__tests__/config.test.ts
    Expected Result: All tests pass, zero failures
    Evidence: .sisyphus/evidence/t23-config-tests.txt
  ```

  **Commit**: YES
  - Message: `test(unit): add config constant validation tests`
  - Files: `src/lib/utils/__tests__/config.test.ts`

- [x] T24. Full Build/Test/Lint Verification

  **What to do**:
  - Run full verification suite:
    ```bash
    npm run build
    npm run test
    npm run lint
    npx tsc --noEmit
    ```
  - Fix any failures
  - Document any remaining warnings (should be zero errors)

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO — this is the final gate
  - **Parallel Group**: Wave 6 (final)
  - **Blocks**: F1-F4
  - **Blocked By**: ALL previous tasks

  **Acceptance Criteria**:
  - [ ] `npm run build` passes with zero errors
  - [ ] `npm run test` passes with all tests green
  - [ ] `npm run lint` passes with zero errors
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: Full verification suite passes
    Tool: Bash (npm run)
    Steps:
      1. npm run build 2>&1 | tail -5
      2. npm run test -- --run 2>&1 | tail -5
      3. npm run lint 2>&1 | tail -5
      4. npx tsc --noEmit 2>&1 | tail -5
    Expected Result: All four commands exit with code 0, zero errors
    Evidence: .sisyphus/evidence/t24-full-verification.txt
  ```

  **Commit**: NO (verification only)

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist in `.sisyphus/evidence/`.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `npm run lint` + `npm run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports, AI slop patterns.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- Wave 1 commits: Grouped by task (T1-T6 each independent)
- Wave 2-6 commits: Grouped by task
- Final verification: No commits, just QA evidence

---

## Success Criteria

### Verification Commands
```bash
cd thornode-watcher
npm run build        # Expected: zero TypeScript errors
npm run test         # Expected: all tests pass
npm run lint         # Expected: zero errors
npx tsc --noEmit     # Expected: zero errors
```

### Final Checklist
- [ ] All magic numbers centralized in config.ts
- [ ] DashboardCard component used consistently across pages
- [ ] YieldGuardFlag has single type definition
- [ ] Dead code removed (getNetworkSecurityMetrics, NetworkSecurityMetricsRaw)
- [ ] Orphaned root src/ directory deleted
- [ ] useLpPositions in correct directory with all imports updated
- [ ] API health banner visible when APIs fail
- [ ] Address persistence unified
- [ ] TransactionComposer uses proper callback
- [ ] RiskRadar supports multiple nodes
- [ ] Overview + Portfolio consolidated with redirect
- [ ] Rewards page restructured
- [ ] Bond CSV export functional
- [ ] RUNE balance displayed
- [ ] LP table mobile-optimized
- [ ] Changelogs accessible without address
- [ ] All tests passing
- [ ] All lint checks passing
- [ ] Build succeeds
