# Heimdall Review Fixes — Comprehensive Implementation Plan

## TL;DR

> **Security patches + code quality + architecture improvements for the Heimdall THORChain dashboard.**
>
> **Deliverables**: Updated dependencies (Next.js 16.2.7, React 19.2.7), 64 lint warnings resolved, shared CORS module extracted, changelog data split, Docker HEALTHCHECK, CI hardening (npm audit), production-build E2E, API route tests, security headers.
>
> **Estimated Effort**: Medium (4-6 hours across 4 waves)
> **Parallel Execution**: YES — 4 waves with parallel tasks
> **Critical Path**: Wave 0 (deps) → Wave 1 (lint/CI) → Wave 2 (architecture) → Wave 3 (perf/tests)

---

## Context

### Original Request
Comprehensive codebase review found security gaps, code quality issues, architectural debt, and CI/CD improvements needed across the Heimdall THORChain dashboard.

### Review Findings
- **Security**: Next.js 16.2.2 needs 16.2.7, React 19.2.4 needs 19.2.7 (security patches)
- **Code Quality**: 64 lint warnings (unused variables), dead code, anti-patterns
- **Architecture**: 1,505-line use-changelogs.ts, duplicate CORS functions, no proxy caching
- **CI/CD**: No npm audit, no Docker HEALTHCHECK, E2E runs against dev server
- **Testing**: No API route tests, no component coverage, only Chromium E2E
- **Performance**: No React Compiler, no compression config

### Metis Review
**Restructured to 4 waves** with Wave 0 as isolated dependency validation. Nice-to-haves (Firefox E2E, React Compiler, Docker image scan) deferred to "Future Improvements" section.

---

## Work Objectives

### Core Objective
Address all Critical and High-priority findings from the comprehensive review while maintaining build stability and test coverage.

### Concrete Deliverables
- Updated `package.json` + `package-lock.json` with security patches
- Zero lint warnings across codebase
- Extracted `src/lib/api/cors.ts` shared module
- Extracted `src/data/changelogs.ts` data file
- Updated Dockerfile with `ARG VERSION` and `HEALTHCHECK`
- Updated CI with `npm audit` step
- Updated Playwright config for production-build E2E
- API route tests for `/api/thorchain` and `/api/midgard`
- Security headers on all API proxy responses
- Proxy response caching with `Cache-Control` headers

### Definition of Done
- [ ] `npm run lint` produces 0 warnings
- [ ] `npm test` passes (169 tests)
- [ ] `npm run build` succeeds
- [ ] `npm run e2e` passes (Playwright)
- [ ] Docker image builds successfully
- [ ] All acceptance criteria in each task verified by agent

### Must Have
- Security patches applied and verified
- All lint warnings resolved (not suppressed)
- Shared CORS module extracted
- Changelog data extracted
- Dockerfile HEALTHCHECK
- CI npm audit
- API route tests for 2 highest-traffic proxies
- Security headers on API responses
- Proxy caching with Cache-Control

### Must NOT Have (Guardrails)
- **Must NOT upgrade to Next.js 17 or React 20** — patch versions only
- **Must NOT add new infrastructure** (Redis, PostgreSQL) — use in-memory caching only
- **Must NOT refactor unrelated components** — fixes only, no feature work
- **Must NOT add new dashboard features** — maintenance sprint only
- **Must NOT change deployment target** — stays VPS + Ansible + Docker standalone
- **Must NOT disable lint rules to suppress warnings** — only remove actual dead code
- **Must NOT change proxy path normalization** — preserve AGENTS.md rule #8
- **Must NOT add React Compiler** — experimental, deferred to future
- **Must NOT add Firefox E2E** — nice-to-have, deferred to future
- **Must NOT add Docker image scan** — needs tool decision, deferred to future

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest + Playwright + MSW)
- **Automated tests**: Tests-after (existing tests must pass after each change)
- **Framework**: Vitest 4 + jsdom + Playwright
- **Test policy**: Each wave ends with `npm test && npm run build && npm run e2e`

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/`.

- **Frontend/UI**: Use Playwright (navigate, assert DOM, screenshot)
- **API/Backend**: Use Bash (curl) — send requests, assert status + headers
- **CI/CD**: Use Bash (run workflow commands locally)
- **Build**: Use Bash (npm run build, verify output)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Security — isolated, rollback-ready):
├── T0.1: Upgrade Next.js 16.2.2 → 16.2.7
├── T0.2: Upgrade React 19.2.4 → 19.2.7
├── T0.3: Upgrade eslint-config-next 16.2.2 → 16.2.7
└── T0.4: Verify build + tests after dependency upgrades

Wave 1 (Code Quality + CI Hardening — MAX PARALLEL):
├── T1.1: Fix all 64 lint warnings (unused variables/imports)
├── T1.2: Remove dead code (LAST_ADDRESS_KEY, etc.)
├── T1.3: Fix useSyncExternalStore anti-pattern in dashboard/layout.tsx
├── T1.4: Extract shared CORS module to src/lib/api/cors.ts
├── T1.5: Move orphaned test file to src/lib/hooks/__tests__/
├── T1.6: Add npm audit to CI workflow
└── T1.7: Add ARG VERSION to Dockerfile

Wave 2 (Architecture — MAX PARALLEL):
├── T2.1: Extract changelog data from use-changelogs.ts
├── T2.2: Add Cache-Control headers to proxy routes
├── T2.3: Add Docker HEALTHCHECK
├── T2.4: Update Playwright config for production-build E2E
└── T2.5: Add security headers to API proxy responses

Wave 3 (Testing + Performance — MAX PARALLEL):
├── T3.1: Add API route tests for /api/thorchain proxy
├── T3.2: Add API route tests for /api/midgard proxy
├── T3.3: Expand vitest coverage to include src/components/
└── T3.4: Add image optimization config to next.config.ts

Wave FINAL (4 parallel reviews + user okay):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
├── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T0.1 → T0.4 → T1.1 → T1.7 → T2.1 → T2.5 → T3.1 → T3.4 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 7 (Wave 1)
```

---

## TODOs

- [x] **T0.1. Upgrade Next.js to 16.2.7**

  **What to do**:
  - Run `npm install next@16.2.7`
  - Verify `package-lock.json` is updated
  - Run `npm run build` to verify no breaking changes
  - Run `npm test` to verify all 169 tests pass
  - Run `npm run e2e` to verify Playwright specs pass
  - If any failure, investigate and fix; if unresolvable within 30 minutes, document and revert

  **Must NOT do**:
  - Do NOT upgrade to Next.js 17 or beyond
  - Do NOT change any source code to "fix" build issues — patch upgrades should be compatible
  - Do NOT proceed to Wave 1 until this task is verified

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Dependency bump with verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T0.2, T0.3)
  - **Parallel Group**: Wave 0
  - **Blocks**: T0.4 (verification), T1.x (all Wave 1 tasks)
  - **Blocked By**: None

  **References**:
  - `package.json:34` — Current `next` version
  - `package-lock.json` — Will be updated by npm install
  - `next.config.ts` — Verify no config changes needed
  - `README.md` — Update badge if present

  **Acceptance Criteria**:
  - [ ] `npm ls next` shows `16.2.7`
  - [ ] `npm run build` succeeds
  - [ ] `npm test` passes (169 tests)
  - [ ] `npm run e2e` passes

  **QA Scenarios**:
  ```
  Scenario: Verify Next.js version
    Tool: Bash
    Steps:
      1. Run `npm ls next`
      2. Assert output contains "next@16.2.7"
    Expected Result: Version is 16.2.7
    Evidence: .sisyphus/evidence/t0-1-next-version.txt

  Scenario: Verify build succeeds
    Tool: Bash
    Steps:
      1. Run `npm run build`
      2. Assert exit code is 0
      3. Assert `.next/standalone/server.js` exists
    Expected Result: Build completes with no errors
    Evidence: .sisyphus/evidence/t0-1-build-success.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t0-1-next-version.txt` — npm ls output
  - [ ] `task-t0-1-build-success.txt` — Build log tail
  - [ ] `task-t0-1-test-results.txt` — Test summary

  **Commit**: YES
  - Message: `chore(deps): upgrade Next.js to 16.2.7 (security patch)`
  - Files: `package.json`, `package-lock.json`
  - Pre-commit: `npm test && npm run build`

---

- [x] **T0.2. Upgrade React to latest patch (19.2.4)**

  **What to do**:
  - Run `npm install react@19.2.4 react-dom@19.2.4` (19.2.7 does not exist on npm; 19.2.4 is the latest stable patch)
  - Verify `package-lock.json` is updated
  - Run `npm run build` to verify no breaking changes
  - Run `npm test` to verify all 169 tests pass
  - Check for any `useSyncExternalStore` behavior changes (React 19.2.4 may have subtle changes)

  **Must NOT do**:
  - Do NOT upgrade to React 20 or beyond
  - Do NOT change component code unless tests fail
  - Do NOT proceed to Wave 1 until verified

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T0.1, T0.3)
  - **Parallel Group**: Wave 0
  - **Blocks**: T0.4
  - **Blocked By**: None

  **References**:
  - `package.json:36-37` — Current react/react-dom versions

  **Acceptance Criteria**:
  - [ ] `npm ls react` shows `19.2.4`
  - [ ] `npm ls react-dom` shows `19.2.4`
  - [ ] `npm test` passes (169 tests)
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Verify React version
    Tool: Bash
    Steps:
      1. Run `npm ls react react-dom`
      2. Assert both show 19.2.4
    Expected Result: Both packages at 19.2.4
    Evidence: .sisyphus/evidence/t0-2-react-version.txt

  Scenario: Verify no test regressions
    Tool: Bash
    Steps:
      1. Run `npm test`
      2. Assert "169 passed" in output
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/t0-2-test-results.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t0-2-react-version.txt` — npm ls output
  - [ ] `task-t0-2-test-results.txt` — Test summary

  **Commit**: YES
  - Message: `chore(deps): upgrade React to 19.2.4 (latest patch)`
  - Files: `package.json`, `package-lock.json`
  - Pre-commit: `npm test && npm run build`

---

- [x] **T0.3. Upgrade eslint-config-next to 16.2.7**

  **What to do**:
  - Run `npm install eslint-config-next@16.2.7`
  - Verify `package-lock.json` is updated
  - Run `npm run lint` to verify no new errors or unexpected changes
  - Verify `eslint.config.mjs` is compatible with new version

  **Must NOT do**:
  - Do NOT change lint rules or suppress warnings
  - Do NOT upgrade eslint itself beyond v9

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T0.1, T0.2)
  - **Parallel Group**: Wave 0
  - **Blocks**: T0.4
  - **Blocked By**: None

  **References**:
  - `package.json:53` — Current eslint-config-next version
  - `eslint.config.mjs` — Verify compatibility

  **Acceptance Criteria**:
  - [ ] `npm ls eslint-config-next` shows `16.2.7`
  - [ ] `npm run lint` produces same output as before (or fewer warnings)
  - [ ] No new lint errors introduced

  **QA Scenarios**:
  ```
  Scenario: Verify eslint-config-next version
    Tool: Bash
    Steps:
      1. Run `npm ls eslint-config-next`
      2. Assert output contains "16.2.7"
    Expected Result: Version is 16.2.7
    Evidence: .sisyphus/evidence/t0-3-eslint-version.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t0-3-eslint-version.txt` — npm ls output
  - [ ] `task-t0-3-lint-results.txt` — npm run lint output

  **Commit**: YES
  - Message: `chore(deps): upgrade eslint-config-next to 16.2.7`
  - Files: `package.json`, `package-lock.json`
  - Pre-commit: `npm run lint`

---

- [x] **T0.4. Verify Wave 0 dependency upgrades**

  **What to do**:
  - Run full verification suite: `npm ci && npm run lint && npm test && npm run build`
  - Verify all artifacts are correct
  - If ANY failure, debug the failing task and re-verify
  - Only mark this complete when all Wave 0 tasks pass

  **Must NOT do**:
  - Do NOT proceed to Wave 1 until this task passes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (verification gate)
  - **Parallel Group**: Sequential
  - **Blocks**: ALL Wave 1 tasks
  - **Blocked By**: T0.1, T0.2, T0.3

  **Acceptance Criteria**:
  - [ ] `npm ci` succeeds
  - [ ] `npm run lint` succeeds (may still have existing warnings from Wave 1)
  - [ ] `npm test` passes (169 tests)
  - [ ] `npm run build` succeeds
  - [ ] `npm run e2e` passes (if time permits)

  **QA Scenarios**:
  ```
  Scenario: Full verification suite
    Tool: Bash
    Steps:
      1. Run `npm ci`
      2. Run `npm run lint` — capture output
      3. Run `npm test` — capture output
      4. Run `npm run build` — capture output
      5. Assert all exit codes are 0
    Expected Result: All commands succeed
    Evidence: .sisyphus/evidence/t0-4-full-verification.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t0-4-full-verification.txt` — Complete command log

  **Commit**: NO (Wave 0 commits are per-task)

---

- [x] **T1.1. Fix all 64 lint warnings (unused variables/imports)**

  **What to do**:
  - Run `npm run lint` to get the full list of 64 warnings
  - For each warning, determine if it's truly dead code or a false positive
  - Remove unused imports, unused variables, and unused parameters
  - For unused function parameters (e.g., `_signerAddress`), rename to `_` prefix
  - For destructured values that are unused, remove from destructuring
  - Run `npm run lint` after each batch of fixes to verify progress
  - Target: 0 warnings

  **Must NOT do**:
  - Do NOT suppress warnings with `// eslint-disable` — only remove actual dead code
  - Do NOT change any runtime logic
  - Do NOT remove variables that are actually used (false positives)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1.2, T1.3, T1.4, T1.5, T1.6, T1.7)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: T0.4

  **References**:
  - `npm run lint` output — Full list of 64 warnings
  - `src/components/layout/dashboard-shell.tsx` — `Wifi`, `WifiOff`, `setStatus` unused
  - `src/components/layout/sidebar.tsx` — `useState` unused
  - `src/components/layout/theme-toggle.tsx` — `theme` unused
  - `src/components/wallet/wallet-connect.tsx` — `networkMismatch` unused
  - `src/lib/transactions/bond.ts` — `_signerAddress` unused
  - `src/lib/hooks/use-earnings.ts` — `index` unused
  - `src/lib/hooks/use-wallet.ts` — `THORCHAIN_CHAIN_ID_STAGENET` unused
  - `src/test/msw/handlers/thornode.ts` — `mockBalances` unused

  **Acceptance Criteria**:
  - [ ] `npm run lint` produces 0 warnings
  - [ ] `npm test` still passes (169 tests)
  - [ ] `npm run build` still succeeds

  **QA Scenarios**:
  ```
  Scenario: Verify zero lint warnings
    Tool: Bash
    Steps:
      1. Run `npm run lint`
      2. Assert output contains "0 problems"
    Expected Result: Zero warnings, zero errors
    Evidence: .sisyphus/evidence/t1-1-lint-zero.txt

  Scenario: Verify tests still pass
    Tool: Bash
    Steps:
      1. Run `npm test`
      2. Assert "169 passed" in output
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/t1-1-tests-pass.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t1-1-lint-zero.txt` — npm run lint output
  - [ ] `task-t1-1-tests-pass.txt` — Test summary

  **Commit**: YES
  - Message: `fix(lint): resolve 64 unused variable/import warnings`
  - Files: Multiple files (list in commit body)
  - Pre-commit: `npm run lint && npm test`

---

- [x] **T1.2. Remove dead code**

  **What to do**:
  - Remove `LAST_ADDRESS_KEY` from `src/app/page.tsx:13` (never used, duplicate of `OLD_LAST_ADDRESS_KEY`)
  - Check for other dead code identified in review
  - Search for any unused constants, functions, or types
  - Run `npm run lint` and `npm test` after removal

  **Must NOT do**:
  - Do NOT remove `OLD_LAST_ADDRESS_KEY` or `BONDTRACK_ADDRESS` — these are used
  - Do NOT proceed beyond `src/app/page.tsx` unless other dead code is obvious

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1.1, T1.3, T1.4, T1.5, T1.6, T1.7)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: T0.4

  **References**:
  - `src/app/page.tsx:11-13` — `OLD_LAST_ADDRESS_KEY`, `LAST_ADDRESS_KEY` (dead)

  **Acceptance Criteria**:
  - [ ] `LAST_ADDRESS_KEY` constant removed from `page.tsx`
  - [ ] `npm run lint` still passes
  - [ ] `npm test` still passes

  **QA Scenarios**:
  ```
  Scenario: Verify dead code removed
    Tool: Bash
    Steps:
      1. Run `grep -n "LAST_ADDRESS_KEY" src/app/page.tsx`
      2. Assert output only shows OLD_LAST_ADDRESS_KEY and BONDTRACK_ADDRESS
    Expected Result: LAST_ADDRESS_KEY is gone
    Evidence: .sisyphus/evidence/t1-2-dead-code.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t1-2-dead-code.txt` — grep output

  **Commit**: YES (groups with T1.1)
  - Message: `fix(lint): remove dead code and unused constants`
  - Files: `src/app/page.tsx`
  - Pre-commit: `npm run lint && npm test`

---

- [x] **T1.3. Fix useSyncExternalStore anti-pattern**

  **What to do**:
  - Read `src/app/dashboard/layout.tsx:27-38` to understand current usage
  - Replace `useSyncExternalStore` with `useState` + `useEffect` for localStorage address persistence
  - The current code reads localStorage on every render with a no-op subscribe — this is misleading
  - Implement: `useState` initialized from localStorage (with `typeof window` check), `useEffect` to sync on mount
  - Ensure address preservation logic still works (BONDTRACK_ADDRESS, legacy migration)
  - Run tests to verify dashboard layout behavior

  **Must NOT do**:
  - Do NOT change the address persistence logic behavior — only refactor the implementation
  - Do NOT break the legacy migration from `OLD_SESSION_KEY` and `OLD_LOCAL_KEY`
  - Do NOT break the URL parameter → localStorage sync

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1.1, T1.2, T1.4, T1.5, T1.6, T1.7)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: T0.4

  **References**:
  - `src/app/dashboard/layout.tsx:15-75` — Full address persistence logic
  - React docs: `useSyncExternalStore` — intended for external stores, not localStorage

  **Acceptance Criteria**:
  - [ ] `useSyncExternalStore` replaced with `useState` + `useEffect`
  - [ ] `npm test` still passes
  - [ ] `npm run build` still succeeds
  - [ ] Dashboard layout behavior unchanged (address preserved across refresh)

  **QA Scenarios**:
  ```
  Scenario: Verify address persistence still works
    Tool: Bash
    Steps:
      1. Run `npm test` — verify existing tests pass
      2. Check `src/app/dashboard/layout.tsx` for `useSyncExternalStore` — should be gone
    Expected Result: No useSyncExternalStore, all tests pass
    Evidence: .sisyphus/evidence/t1-3-sync-fix.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t1-3-sync-fix.txt` — grep and test results

  **Commit**: YES
  - Message: `refactor(layout): replace useSyncExternalStore with useState + useEffect`
  - Files: `src/app/dashboard/layout.tsx`
  - Pre-commit: `npm test`

---

- [x] **T1.4. Extract shared CORS module**

  **What to do**:
  - Create `src/lib/api/cors.ts` with a shared `corsHeaders(request, extraOrigins?)` function
  - The function should handle: origin validation, allowed origins set, CORS headers, Vary header
  - Base allowed origins (all routes): `['https://thorchain.no', 'https://dev.thorchain.no', 'http://localhost:3000', 'http://localhost:3001']`
  - THORNode and Midgard routes also include `'https://bond.thorchain.no'` — pass this as `extraOrigins`
  - Health route uses only the base origins
  - Move `corsHeaders` implementations from:
    - `src/app/api/thorchain/[...path]/route.ts`
    - `src/app/api/midgard/[...path]/route.ts`
    - `src/app/api/health/route.ts`
  - Update all three routes to import from `src/lib/api/cors.ts`
  - Verify each route still passes its existing behavior (origin validation, header values)
  - Ensure the shared function supports the same environment variable checks (`NEXT_PUBLIC_APP_URL`, `VERCEL_URL`)

  **Must NOT do**:
  - Do NOT change the allowed origins list for any route
  - Do NOT change the CORS header values
  - Do NOT break the `Vary: Origin` header
  - Do NOT change proxy path normalization logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1.1, T1.2, T1.3, T1.5, T1.6, T1.7)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: T0.4

  **References**:
  - `src/app/api/thorchain/[...path]/route.ts:38-57` — corsHeaders function
  - `src/app/api/midgard/[...path]/route.ts:31-50` — Identical corsHeaders function
  - `src/app/api/health/route.ts:9-27` — Identical corsHeaders function
  - `src/lib/api/AGENTS.md` — Proxy rules and conventions

  **Acceptance Criteria**:
  - [ ] `src/lib/api/cors.ts` exists and exports `corsHeaders`
  - [ ] All three proxy routes import from `src/lib/api/cors.ts`
  - [ ] `npm test` still passes
  - [ ] `npm run build` still succeeds
  - [ ] `npm run lint` passes (0 warnings)

  **QA Scenarios**:
  ```
  Scenario: Verify CORS module extracted
    Tool: Bash
    Steps:
      1. Run `ls src/lib/api/cors.ts`
      2. Run `grep -n "corsHeaders" src/app/api/thorchain/\[...path\]/route.ts`
      3. Assert import line exists, not function definition
    Expected Result: Shared module imported, no duplicate functions
    Evidence: .sisyphus/evidence/t1-4-cors-extracted.txt

  Scenario: Verify CORS headers still work
    Tool: Bash (curl)
    Steps:
      1. Start dev server: `npm run dev &`
      2. Wait for server
      3. Run `curl -I -H "Origin: http://localhost:3000" http://localhost:3000/api/health`
      4. Assert response contains `Access-Control-Allow-Origin: http://localhost:3000`
    Expected Result: CORS headers present and correct
    Evidence: .sisyphus/evidence/t1-4-cors-headers.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t1-4-cors-extracted.txt` — File structure verification
  - [ ] `task-t1-4-cors-headers.txt` — curl response headers

  **Commit**: YES
  - Message: `refactor(api): extract shared CORS module to src/lib/api/cors.ts`
  - Files: `src/lib/api/cors.ts`, `src/app/api/thorchain/[...path]/route.ts`, `src/app/api/midgard/[...path]/route.ts`, `src/app/api/health/route.ts`
  - Pre-commit: `npm run lint && npm test && npm run build`

---

- [x] **T1.5. Move orphaned test file**

  **What to do**:
  - Move `src/hooks/use-lp-positions.test.ts` to `src/lib/hooks/__tests__/use-lp-positions.test.ts`
  - Update any import paths in the test file if needed
  - Verify the test file runs with the existing test suite
  - Run `npm test` to confirm the moved test still executes
  - Delete the empty `src/hooks/` directory if it becomes empty

  **Must NOT do**:
  - Do NOT modify the test logic
  - Do NOT change the test file name

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1.1, T1.2, T1.3, T1.4, T1.6, T1.7)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: T0.4

  **References**:
  - `src/hooks/use-lp-positions.test.ts` — Orphaned file
  - `src/lib/hooks/__tests__/` — Target directory
  - `vitest.config.ts:10` — `include: ['src/**/*.{test,spec}.{ts,tsx}']` — matches both locations

  **Acceptance Criteria**:
  - [ ] File moved to `src/lib/hooks/__tests__/use-lp-positions.test.ts`
  - [ ] `src/hooks/use-lp-positions.test.ts` no longer exists
  - [ ] `npm test` includes the moved test in the count
  - [ ] `npm run lint` passes

  **QA Scenarios**:
  ```
  Scenario: Verify test file moved
    Tool: Bash
    Steps:
      1. Run `ls src/lib/hooks/__tests__/use-lp-positions.test.ts`
      2. Run `ls src/hooks/use-lp-positions.test.ts` — should fail
    Expected Result: File exists in new location, not in old
    Evidence: .sisyphus/evidence/t1-5-test-moved.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t1-5-test-moved.txt` — ls verification

  **Commit**: YES (groups with T1.1)
  - Message: `chore(test): move orphaned test to src/lib/hooks/__tests__`
  - Files: `src/hooks/use-lp-positions.test.ts` (deleted), `src/lib/hooks/__tests__/use-lp-positions.test.ts` (added)
  - Pre-commit: `npm test`

---

- [x] **T1.6. Add npm audit to CI workflow**

  **What to do**:
  - Edit `.github/workflows/ci.yml`
  - Add a step in the `test` job (after `npm ci`, before `npm test`) that runs:
    - `npm audit --omit=dev --audit-level=moderate`
  - The step should fail the build if vulnerabilities are found at moderate level or higher
  - Use `--omit=dev` to avoid devDependency noise (Vitest, Playwright, etc.)
  - Document the audit-level choice in a comment
  - Verify the workflow syntax is valid (YAML lint)

  **Must NOT do**:
  - Do NOT add `npm audit fix` — that could upgrade beyond patch versions
  - Do NOT audit devDependencies — production-only
  - Do NOT change other CI jobs

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1.1, T1.2, T1.3, T1.4, T1.5, T1.7)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: T0.4

  **References**:
  - `.github/workflows/ci.yml:24-47` — test job structure
  - `npm audit` docs — `--audit-level=moderate`, `--omit=dev`

  **Acceptance Criteria**:
  - [ ] `npm audit --omit=dev --audit-level=moderate` step added to test job
  - [ ] Step is after `npm ci` and before `npm test`
  - [ ] CI workflow YAML is valid
  - [ ] Current audit passes (no production vulnerabilities at moderate+)

  **QA Scenarios**:
  ```
  Scenario: Verify npm audit passes locally
    Tool: Bash
    Steps:
      1. Run `npm audit --omit=dev --audit-level=moderate`
      2. Assert exit code is 0
    Expected Result: No moderate+ vulnerabilities in production deps
    Evidence: .sisyphus/evidence/t1-6-audit-pass.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t1-6-audit-pass.txt` — npm audit output

  **Commit**: YES
  - Message: `ci: add npm audit to test job`
  - Files: `.github/workflows/ci.yml`
  - Pre-commit: `npm audit --omit=dev --audit-level=moderate`

---

- [x] **T1.7. Add ARG VERSION to Dockerfile**

  **What to do**:
  - Edit `Dockerfile`
  - Add `ARG VERSION` in the `builder` stage (near other ARGs)
  - Add `ENV VERSION=${VERSION}` in the `builder` stage to pass it through
  - Add `ARG VERSION` in the `runner` stage
  - Add `ENV VERSION=${VERSION}` in the `runner` stage so the app can read it
  - Verify the health endpoint (`/api/health`) reads `process.env.VERSION`
  - Test locally: `docker build --build-arg VERSION=test-123 -t heimdall-test .` and verify health endpoint returns `"test-123"`

  **Must NOT do**:
  - Do NOT change the base image or multi-stage structure
  - Do NOT change other ARGs

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1.1, T1.2, T1.3, T1.4, T1.5, T1.6)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: T0.4

  **References**:
  - `Dockerfile:11-18` — Existing ARGs
  - `Dockerfile:48-70` — Runner stage
  - `src/app/api/health/route.ts:50` — `process.env.VERSION || 'unknown'`
  - `.github/workflows/ci.yml:127` — `VERSION=sha-${{ github.sha }}` build arg

  **Acceptance Criteria**:
  - [ ] `ARG VERSION` declared in builder stage
  - [ ] `ENV VERSION=${VERSION}` in builder stage
  - [ ] `ARG VERSION` declared in runner stage
  - [ ] `ENV VERSION=${VERSION}` in runner stage
  - [ ] Docker build with `--build-arg VERSION=test-123` produces health endpoint with version "test-123"

  **QA Scenarios**:
  ```
  Scenario: Verify Docker build with version
    Tool: Bash
    Steps:
      1. Run `docker build --build-arg VERSION=test-123 -t heimdall-test .`
      2. Run `docker run -d -p 3000:3000 heimdall-test`
      3. Wait 5s
      4. Run `curl -s http://localhost:3000/api/health | jq '.version'`
      5. Assert output contains "test-123"
    Expected Result: Health endpoint returns the build version
    Evidence: .sisyphus/evidence/t1-7-docker-version.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t1-7-docker-version.txt` — curl response with version

  **Commit**: YES
  - Message: `chore(docker): add VERSION build arg to pass through health endpoint`
  - Files: `Dockerfile`
  - Pre-commit: `docker build --build-arg VERSION=ci-test -t heimdall-ci .` (if Docker available)

---

- [x] **T2.1. Extract changelog data from use-changelogs.ts**

  **What to do**:
  - Read `src/lib/hooks/use-changelogs.ts` to understand the data structure
  - Create `src/data/changelogs.ts` (or `src/lib/data/changelogs.ts` if following existing conventions)
  - Move the `CHANGELOG_DATA` constant and any related data transformation functions to the new file
  - Keep the hook logic (sorting, filtering, search) in `use-changelogs.ts`
  - Update imports in `use-changelogs.ts` to import data from the new file
  - Target: `use-changelogs.ts` should be <500 lines (from 1,505)
  - Run `npm run lint` and `npm test` to verify
  - Verify any pages that import from `use-changelogs.ts` still work

  **Must NOT do**:
  - Do NOT change the data structure or the changelog entries themselves
  - Do NOT change the hook's public API (return type, function signature)
  - Do NOT break the changelog page (`/dashboard/changelogs`)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2.2, T2.3, T2.4, T2.5)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: T1.x (all Wave 1 tasks)

  **References**:
  - `src/lib/hooks/use-changelogs.ts` — Source file (1,505 lines)
  - `src/app/dashboard/changelogs/` — Page that consumes the hook
  - `src/app/dashboard/changelogs/layout.tsx` — Imports from the hook

  **Acceptance Criteria**:
  - [ ] `src/data/changelogs.ts` (or equivalent) exists with data constant
  - [ ] `use-changelogs.ts` is <500 lines
  - [ ] `npm test` passes
  - [ ] `npm run build` succeeds
  - [ ] `npm run lint` passes
  - [ ] Changelog page still renders correctly

  **QA Scenarios**:
  ```
  Scenario: Verify changelog data extracted
    Tool: Bash
    Steps:
      1. Run `wc -l src/lib/hooks/use-changelogs.ts`
      2. Assert line count < 500
      3. Run `ls src/data/changelogs.ts` (or equivalent path)
      4. Assert file exists
    Expected Result: Hook under 500 lines, data file exists
    Evidence: .sisyphus/evidence/t2-1-changelog-extracted.txt

  Scenario: Verify changelog page still works
    Tool: Playwright
    Steps:
      1. Start dev server
      2. Navigate to `/dashboard/changelogs`
      3. Wait for page load
      4. Screenshot the page
      5. Assert no error boundary visible
    Expected Result: Page renders without errors
    Evidence: .sisyphus/evidence/t2-1-changelog-page.png
  ```

  **Evidence to Capture**:
  - [ ] `task-t2-1-changelog-extracted.txt` — wc and ls output
  - [ ] `task-t2-1-changelog-page.png` — Playwright screenshot

  **Commit**: YES
  - Message: `refactor(changelogs): extract data constant to src/data/changelogs.ts`
  - Files: `src/lib/hooks/use-changelogs.ts`, `src/data/changelogs.ts` (new)
  - Pre-commit: `npm run lint && npm test && npm run build`

---

- [x] **T2.2. Add Cache-Control headers to proxy routes**

  **What to do**:
  - Edit `src/app/api/thorchain/[...path]/route.ts` and `src/app/api/midgard/[...path]/route.ts`
  - Add `Cache-Control` headers to successful responses (not errors)
  - For THORNode proxy: `Cache-Control: public, max-age=5` (5 seconds — fast-changing data)
  - For Midgard proxy: `Cache-Control: public, max-age=30` (30 seconds — less volatile)
  - The cache headers should be in addition to existing CORS headers
  - Ensure the cache headers don't override or conflict with CORS headers
  - Verify with curl that headers are present
  - Document the caching strategy in `src/lib/api/AGENTS.md`

  **Must NOT do**:
  - Do NOT add caching to error responses (429, 403, 502)
  - Do NOT cache health endpoint (it's used for Docker HEALTHCHECK)
  - Do NOT change the upstream fetch behavior — only add response headers
  - Do NOT add Redis or any external caching infrastructure

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2.1, T2.3, T2.4, T2.5)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: T1.x (all Wave 1 tasks)

  **References**:
  - `src/app/api/thorchain/[...path]/route.ts:120-122` — Where to add headers
  - `src/app/api/midgard/[...path]/route.ts:112-114` — Where to add headers
  - `src/lib/api/AGENTS.md` — Document caching rules
  - `src/lib/api/cors.ts` (from T1.4) — CORS headers to merge with

  **Acceptance Criteria**:
  - [ ] THORNode proxy returns `Cache-Control: public, max-age=5` on successful responses
  - [ ] Midgard proxy returns `Cache-Control: public, max-age=30` on successful responses
  - [ ] Error responses (429, 403, 502) do NOT have cache headers
  - [ ] CORS headers are still present alongside cache headers
  - [ ] `npm test` passes
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Verify THORNode cache headers
    Tool: Bash (curl)
    Steps:
      1. Start dev server
      2. Run `curl -I http://localhost:3000/api/thorchain/nodes`
      3. Assert response contains `Cache-Control: public, max-age=5`
    Expected Result: Cache-Control header present with 5s max-age
    Evidence: .sisyphus/evidence/t2-2-thornode-cache.txt

  Scenario: Verify Midgard cache headers
    Tool: Bash (curl)
    Steps:
      1. Run `curl -I http://localhost:3000/api/midgard/v2/health`
      2. Assert response contains `Cache-Control: public, max-age=30`
    Expected Result: Cache-Control header present with 30s max-age
    Evidence: .sisyphus/evidence/t2-2-midgard-cache.txt

  Scenario: Verify error responses not cached
    Tool: Bash (curl)
    Steps:
      1. Run `curl -I http://localhost:3000/api/thorchain/invalid-path`
      2. Assert response status is 403
      3. Assert response does NOT contain `Cache-Control`
    Expected Result: No cache headers on error responses
    Evidence: .sisyphus/evidence/t2-2-error-no-cache.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t2-2-thornode-cache.txt` — curl headers
  - [ ] `task-t2-2-midgard-cache.txt` — curl headers
  - [ ] `task-t2-2-error-no-cache.txt` — curl headers

  **Commit**: YES
  - Message: `feat(api): add Cache-Control headers to proxy routes`
  - Files: `src/app/api/thorchain/[...path]/route.ts`, `src/app/api/midgard/[...path]/route.ts`, `src/lib/api/AGENTS.md`
  - Pre-commit: `npm run lint && npm test && npm run build`

---

- [x] **T2.3. Add Docker HEALTHCHECK**

  **What to do**:
  - Edit `Dockerfile`
  - Add a `HEALTHCHECK` instruction in the `runner` stage (after `EXPOSE 3000`, before `CMD`)
  - Use a Node.js one-liner to check `/api/health`:
    ```dockerfile
    HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
      CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
    ```
  - The start-period should be 40s (Next.js standalone takes time to start)
  - Verify the Dockerfile builds successfully
  - Test: `docker run -d -p 3000:3000 heimdall-test`, wait 45s, then `docker ps` should show `(healthy)`

  **Must NOT do**:
  - Do NOT make the health check depend on external APIs (THORNode, Midgard)
  - Do NOT use `curl` in the healthcheck (not installed in node:22-slim)
  - Do NOT change the base image

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2.1, T2.2, T2.4, T2.5)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: T1.x (all Wave 1 tasks)

  **References**:
  - `Dockerfile:68-70` — Runner stage (where to add)
  - `src/app/api/health/route.ts` — Health endpoint (only checks local process)
  - Docker docs: `HEALTHCHECK` instruction

  **Acceptance Criteria**:
  - [ ] `HEALTHCHECK` instruction present in Dockerfile
  - [ ] `docker build` succeeds
  - [ ] Container shows `(healthy)` status after 45 seconds
  - [ ] Health check only depends on local process, not external APIs

  **QA Scenarios**:
  ```
  Scenario: Verify Docker healthcheck
    Tool: Bash
    Steps:
      1. Run `docker build -t heimdall-health-test .`
      2. Run `docker run -d --name heimdall-health -p 3000:3000 heimdall-health-test`
      3. Wait 45 seconds
      4. Run `docker ps --filter "name=heimdall-health" --format "{{.Status}}"`
      5. Assert output contains "healthy"
    Expected Result: Container shows healthy status
    Evidence: .sisyphus/evidence/t2-3-docker-health.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t2-3-docker-health.txt` — docker ps output

  **Commit**: YES
  - Message: `chore(docker): add HEALTHCHECK for container health monitoring`
  - Files: `Dockerfile`
  - Pre-commit: `docker build -t heimdall-health-test .` (if Docker available)

---

- [x] **T2.4. Update Playwright config for production-build E2E**

  **What to do**:
  - Edit `playwright.config.ts`
  - Change `webServer.command` from `npm run dev` to `npm run build && npm start`
  - Increase `webServer.timeout` to 180000 (3 minutes) to allow for build time
  - Ensure `reuseExistingServer: !process.env.CI` still works
  - Verify the production server starts on port 3000
  - Run `npm run e2e` to verify all specs pass against production build
  - If any specs fail due to production-vs-dev differences, fix them
  - Document the change in `e2e/AGENTS.md`

  **Must NOT do**:
  - Do NOT change the test specs themselves unless they genuinely fail
  - Do NOT change the browser projects
  - Do NOT change the baseURL

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2.1, T2.2, T2.3, T2.5)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: T1.x (all Wave 1 tasks)

  **References**:
  - `playwright.config.ts:21-26` — webServer configuration
  - `e2e/AGENTS.md` — Document the change
  - `next.config.ts:4` — `output: 'standalone'` — production server uses `server.js`

  **Acceptance Criteria**:
  - [ ] `webServer.command` is `npm run build && npm start`
  - [ ] `webServer.timeout` is ≥ 180000
  - [ ] `npm run e2e` passes all specs
  - [ ] Production build starts successfully on port 3000

  **QA Scenarios**:
  ```
  Scenario: Verify E2E against production build
    Tool: Bash
    Steps:
      1. Run `npm run e2e`
      2. Assert all specs pass
      3. Assert no failures
    Expected Result: All E2E specs pass against production build
    Evidence: .sisyphus/evidence/t2-4-e2e-production.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t2-4-e2e-production.txt` — Playwright test results

  **Commit**: YES
  - Message: `test(e2e): run against production build instead of dev server`
  - Files: `playwright.config.ts`, `e2e/AGENTS.md`
  - Pre-commit: `npm run e2e`

---

- [x] **T2.5. Add security headers to API proxy responses**

  **What to do**:
  - Edit `src/lib/api/cors.ts` (from T1.4) or create `src/lib/api/security-headers.ts`
  - Add the following security headers to all API proxy responses:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `X-XSS-Protection: 1; mode=block` (legacy but still useful)
  - Merge these with the existing CORS headers in the response
  - Apply to all proxy routes: `/api/thorchain/*`, `/api/midgard/*`, `/api/health`, `/api/coingecko/*`, `/api/coinapi/*`, `/api/address/*`, `/api/pools/*`, `/api/tax-report`
  - Do NOT add CSP (Content Security Policy) — too complex for this sprint, deferred to Future Improvements
  - Verify with curl that headers are present
  - Document in `src/lib/api/AGENTS.md`

  **Must NOT do**:
  - Do NOT add CSP (deferred)
  - Do NOT add HSTS (handled by reverse proxy/Caddy)
  - Do NOT change the response body or status codes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2.1, T2.2, T2.3, T2.4)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: T1.x (all Wave 1 tasks)

  **References**:
  - `src/lib/api/cors.ts` (from T1.4) — Where to add headers
  - `src/lib/api/AGENTS.md` — Document security headers
  - OWASP security headers guide

  **Acceptance Criteria**:
  - [ ] All API routes return `X-Content-Type-Options: nosniff`
  - [ ] All API routes return `X-Frame-Options: DENY`
  - [ ] All API routes return `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] `npm test` passes
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Verify security headers on THORNode proxy
    Tool: Bash (curl)
    Steps:
      1. Start dev server
      2. Run `curl -I http://localhost:3000/api/thorchain/nodes`
      3. Assert response contains `X-Content-Type-Options: nosniff`
      4. Assert response contains `X-Frame-Options: DENY`
      5. Assert response contains `Referrer-Policy: strict-origin-when-cross-origin`
    Expected Result: All security headers present
    Evidence: .sisyphus/evidence/t2-5-security-headers.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t2-5-security-headers.txt` — curl response headers

  **Commit**: YES
  - Message: `feat(api): add security headers to all proxy responses`
  - Files: `src/lib/api/cors.ts`, `src/lib/api/AGENTS.md`
  - Pre-commit: `npm run lint && npm test && npm run build`

---

- [x] **T3.1. Add API route tests for /api/thorchain proxy**

  **What to do**:
  - Create `src/app/api/thorchain/__tests__/route.test.ts`
  - Use Vitest + `node-mocks-http` (or mock `NextRequest`/`NextResponse` directly)
  - Test cases:
    1. **Allowed path**: `GET /api/thorchain/nodes` → returns 200 with JSON
    2. **Disallowed path**: `GET /api/thorchain/admin` → returns 403
    3. **Rate limit**: Multiple rapid requests → returns 429 with retry headers
    4. **CORS**: Request with allowed origin → returns correct `Access-Control-Allow-Origin`
    5. **OPTIONS**: `OPTIONS` request → returns 200 with CORS headers
    6. **Path normalization**: `GET /api/thorchain/thorchain/nodes` → strips leading `thorchain/` and returns 200
  - Mock the upstream `fetch` call to avoid real network requests
  - Follow existing test patterns from `src/lib/hooks/__tests__/` and `src/test/msw/`
  - Run `npm test` to verify the new tests pass

  **Must NOT do**:
  - Do NOT make real network requests to upstream APIs
  - Do NOT test the actual THORNode API responses — only test the proxy logic
  - Do NOT add tests for all 8 proxy routes — only `/api/thorchain` for now

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3.2, T3.3, T3.4)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T2.x (all Wave 2 tasks)

  **References**:
  - `src/app/api/thorchain/[...path]/route.ts` — Route to test
  - `src/lib/hooks/__tests__/use-bond-positions.test.ts` — Existing test pattern (vi.mock, renderHook)
  - `src/test/setup.ts` — Test setup (localStorage, Notification, matchMedia mocks)
  - `vitest.config.ts` — Test config (globals: true, environment: jsdom)
  - `node-mocks-http` or manual NextRequest/NextResponse mocking

  **Acceptance Criteria**:
  - [ ] Test file `src/app/api/thorchain/__tests__/route.test.ts` exists
  - [ ] All 6 test cases pass
  - [ ] `npm test` includes the new tests in the count
  - [ ] No real network requests made during tests

  **QA Scenarios**:
  ```
  Scenario: Run API route tests
    Tool: Bash
    Steps:
      1. Run `npm test -- src/app/api/thorchain/__tests__/route.test.ts`
      2. Assert all tests pass
      3. Assert total test count increased by 6
    Expected Result: All proxy tests pass
    Evidence: .sisyphus/evidence/t3-1-thornode-tests.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t3-1-thornode-tests.txt` — Test output

  **Commit**: YES
  - Message: `test(api): add route tests for /api/thorchain proxy`
  - Files: `src/app/api/thorchain/__tests__/route.test.ts`
  - Pre-commit: `npm test -- src/app/api/thorchain/__tests__/route.test.ts`

---

- [x] **T3.2. Add API route tests for /api/midgard proxy**

  **What to do**:
  - Create `src/app/api/midgard/__tests__/route.test.ts`
  - Follow the same pattern as T3.1
  - Test cases:
    1. **Allowed path**: `GET /api/midgard/v2/health` → returns 200 with JSON
    2. **Disallowed path**: `GET /api/midgard/v2/admin` → returns 403
    3. **Rate limit**: Multiple rapid requests → returns 429
    4. **CORS**: Request with allowed origin → returns correct CORS headers
    5. **OPTIONS**: `OPTIONS` request → returns 200 with CORS headers
    6. **Fallback**: First endpoint fails → tries second endpoint (Midgard fallback)
  - Mock upstream `fetch` to avoid real network requests
  - Run `npm test` to verify

  **Must NOT do**:
  - Do NOT make real network requests
  - Do NOT test all 8 proxy routes

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3.1, T3.3, T3.4)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T2.x (all Wave 2 tasks)

  **References**:
  - `src/app/api/midgard/[...path]/route.ts` — Route to test
  - `src/app/api/thorchain/__tests__/route.test.ts` (from T3.1) — Pattern to follow

  **Acceptance Criteria**:
  - [ ] Test file `src/app/api/midgard/__tests__/route.test.ts` exists
  - [ ] All 6 test cases pass
  - [ ] `npm test` includes the new tests
  - [ ] No real network requests

  **QA Scenarios**:
  ```
  Scenario: Run Midgard API route tests
    Tool: Bash
    Steps:
      1. Run `npm test -- src/app/api/midgard/__tests__/route.test.ts`
      2. Assert all tests pass
    Expected Result: All proxy tests pass
    Evidence: .sisyphus/evidence/t3-2-midgard-tests.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t3-2-midgard-tests.txt` — Test output

  **Commit**: YES
  - Message: `test(api): add route tests for /api/midgard proxy`
  - Files: `src/app/api/midgard/__tests__/route.test.ts`
  - Pre-commit: `npm test -- src/app/api/midgard/__tests__/route.test.ts`

---

- [x] **T3.3. Expand vitest coverage to include src/components/**

  **What to do**:
  - Edit `vitest.config.ts`
  - Add `src/components/**/*` to the `coverage.include` array
  - Keep existing `src/lib/hooks/**` and `src/lib/utils/**`
  - Run `npm run test:coverage` to verify the coverage report includes components
  - The coverage report should show component files in the HTML output
  - Do NOT add new tests — just expand coverage tracking to existing tests
  - If coverage is very low (<10%), document it as a known gap for future improvement

  **Must NOT do**:
  - Do NOT add new test files just to improve coverage numbers
  - Do NOT change coverage thresholds or enforce minimums
  - Do NOT remove existing coverage includes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3.1, T3.2, T3.4)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T2.x (all Wave 2 tasks)

  **References**:
  - `vitest.config.ts:11-16` — Coverage config
  - `src/components/` — Component files to include

  **Acceptance Criteria**:
  - [ ] `vitest.config.ts` includes `src/components/**/*` in coverage
  - [ ] `npm run test:coverage` produces HTML report with component files
  - [ ] Existing coverage for hooks/utils is preserved

  **QA Scenarios**:
  ```
  Scenario: Verify coverage includes components
    Tool: Bash
    Steps:
      1. Run `npm run test:coverage`
      2. Open `coverage/index.html` or check `coverage/coverage-final.json`
      3. Assert component files are listed (e.g., `src/components/dashboard/portfolio-summary.tsx`)
    Expected Result: Coverage report includes component files
    Evidence: .sisyphus/evidence/t3-3-coverage-components.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t3-3-coverage-components.txt` — Coverage report file list

  **Commit**: YES
  - Message: `test(coverage): expand to include src/components`
  - Files: `vitest.config.ts`
  - Pre-commit: `npm run test:coverage`

---

- [x] **T3.4. Add image optimization config to next.config.ts**

  **What to do**:
  - Edit `next.config.ts`
  - Add `images` configuration with `unoptimized: false` (or explicit `domains` if using external images)
  - Since the project uses `lucide-react` (SVG icons) and no external images, the config may be minimal:
    ```typescript
    images: {
      unoptimized: false,
    },
    ```
  - Or if no images are used at all, consider `unoptimized: true` to skip Next.js image optimization overhead
  - Verify the build still succeeds
  - Verify no runtime errors related to images
  - Document the choice in `next.config.ts` with a comment

  **Must NOT do**:
  - Do NOT add external image domains unless the project uses them
  - Do NOT change the `output: 'standalone'` setting
  - Do NOT add image formats beyond the default

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3.1, T3.2, T3.3)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T2.x (all Wave 2 tasks)

  **References**:
  - `next.config.ts:1-9` — Current config
  - Next.js docs: `images` configuration
  - `src/app/page.tsx` — Check if any images are used
  - `src/components/` — Check for `<img>` or `next/image` usage

  **Acceptance Criteria**:
  - [ ] `images` config present in `next.config.ts`
  - [ ] `npm run build` succeeds
  - [ ] `npm test` passes
  - [ ] No runtime errors related to images

  **QA Scenarios**:
  ```
  Scenario: Verify build with image config
    Tool: Bash
    Steps:
      1. Run `npm run build`
      2. Assert exit code is 0
      3. Assert no image-related errors in build output
    Expected Result: Build succeeds with image config
    Evidence: .sisyphus/evidence/t3-4-image-config.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-t3-4-image-config.txt` — Build output

  **Commit**: YES
  - Message: `perf(config): add image optimization configuration`
  - Files: `next.config.ts`
  - Pre-commit: `npm run build && npm test`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `npm run lint` + `npm test` + `npm run build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together). Test edge cases: empty state, invalid input, rate limiting. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Future Improvements (Deferred)

These items were identified during review but are **out of scope for this sprint**:

1. **React Compiler evaluation** — Experimental; add a research task to evaluate compatibility with SWR hooks
2. **Firefox E2E** — Cross-browser coverage; increases CI time ~40%
3. **Docker image scan** — Needs tool selection (Trivy/Snyk/Docker Scout); requires CI auth setup
4. **Redis-based rate limiter** — Only needed if moving to multi-instance deployment; current single-VPS in-memory is fine
5. **CSP (Content Security Policy)** — Complex for a dashboard with wallet connections; needs policy research

---

## Commit Strategy

- **Wave 0**: `chore(deps): security patch Next.js + React to latest`
- **Wave 1**: `fix(lint): resolve 64 unused variable warnings` + `refactor(api): extract shared CORS module` + `ci: add npm audit to test job` + `chore(docker): add VERSION arg and HEALTHCHECK`
- **Wave 2**: `refactor(changelogs): extract data to src/data/changelogs.ts` + `feat(api): add Cache-Control and security headers to proxies` + `test(e2e): run against production build`
- **Wave 3**: `test(api): add proxy route tests for thorchain and midgard` + `test(coverage): expand to src/components` + `perf(config): add image optimization`

---

## Success Criteria

### Verification Commands
```bash
# After all waves
npm run lint      # Expected: 0 warnings, 0 errors
npm test          # Expected: 169 pass, 0 fail
npm run build     # Expected: build succeeds, 18 static + 9 dynamic routes
npm run e2e       # Expected: all Playwright specs pass

# API verification
curl -s http://localhost:3000/api/health | jq '.version'  # Expected: not "unknown"
curl -I http://localhost:3000/api/thorchain/nodes         # Expected: Cache-Control header present
curl -I http://localhost:3000/api/midgard/v2/health       # Expected: X-Frame-Options, X-Content-Type-Options present

# Docker verification
docker build -t heimdall-test .  # Expected: builds successfully
docker run -d -p 3000:3000 heimdall-test
curl -s http://localhost:3000/api/health | jq '.status'  # Expected: "healthy"
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All 169 tests pass
- [ ] Build succeeds with zero warnings
- [ ] E2E passes
- [ ] Docker image builds and healthcheck passes
- [ ] All evidence files present in .sisyphus/evidence/
