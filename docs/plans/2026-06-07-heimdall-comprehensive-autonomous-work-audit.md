# Heimdall comprehensive autonomous work audit — 2026-06-07

Repo: `/Users/reidar/Projectos/Heimdall`
Branch/HEAD verified before synthesis: `staging` @ `8c9896b9c7f7954adf3782bd071ae024fe82fcb4` (`8c9896b`, `test: assert proxy success headers`)
Audit mode: source/read-only analysis plus this documentation artifact. No commits, pushes, GHCR publish, production deploy, live-wallet signing, or live-site verification were performed for this audit.

## Baseline evidence

- Repo status at synthesis start: `## staging...origin/staging`; clean before this report file was written.
- Latest verified staging CI before this audit: GitHub Actions run `27079744291` completed `status=completed`, `conclusion=success`, `headSha=8c9896b9c7f7954adf3782bd071ae024fe82fcb4`.
- Local gates re-run during audit tracks:
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`.
  - `npm run lint -- --max-warnings=0` → passed.
  - `npm test` → 39 files / 190 tests passed, `stderr_bytes=0` in the controller run.
  - `npm run test:coverage -- --coverage.reporter=json-summary` → passed.
  - `npx tsc --noEmit --pretty false` → passed.
  - `npm run build` → passed.
  - `npm run e2e` → 62 tests passed.
- Full specialist reports were written outside the repo:
  - `/tmp/heimdall-audit-security-api.md` — 14 findings: 3 High, 8 Medium, 3 Low; 9 autonomous-safe.
  - `/tmp/heimdall-audit-financial.md` — 10 findings: 4 High, 5 Medium, 1 Low.
  - `/tmp/heimdall-audit-frontend-ux.md` — 18 findings: 6 High, 9 Medium, 3 Low; 16 autonomous-safe.
  - `/tmp/heimdall-audit-tests-gates.md` — 10 false-green/gate findings.
  - `/tmp/heimdall-audit-ci-deploy-docs.md` — 15 findings: 4 High, 8 Medium, 3 Low; 10 autonomous-safe.
  - `/tmp/heimdall-audit-maintainability.md` — 11 findings.
- Raw specialist finding count: 78. The queue below merges overlaps into 62 autonomous or mostly-autonomous work packages, plus a separate hold list for owner/infra decisions.

## Executive conclusion

Heimdall is in a healthy staging baseline: tests, lint, typecheck, build, E2E, audit, and exact-SHA staging CI are green. The next highest-value work is not broad feature work; it is trust-hardening:

1. Financial correctness around BOND operator-fee memo validation and historical APY math.
2. API route input/cache/CORS hardening so proxy and report routes fail closed.
3. Test-gate work that prevents false-green release confidence around coverage, wallet signing, API routes, Playwright console/page errors, and E2E mocks.
4. Product-trust/a11y fixes where the UI currently says or implies “live”, “online”, or “saved” without sufficient evidence or accessible interaction semantics.
5. Release-governance cleanup around deterministic native dependencies, CI timeouts/permissions, build/runtime env contracts, and stale docs.

Recommended immediate next batch: **Batch 1 — financial + API trust hardening**, starting with `A-001`, `A-002`, `A-010`, `A-011`, `A-012`, `A-013`, `A-015`, `A-016`, and route tests from `A-025`.

## Safe execution order

### Batch 1 — P0 financial/API correctness and fail-closed behavior

Goal: reduce risk of wrong memos, wrong yield math, and API misuse without touching production, secrets, live wallets, or deploy infra.

Work items: `A-001`, `A-002`, `A-003`, `A-004`, `A-005`, `A-010`, `A-011`, `A-012`, `A-013`, `A-014`, `A-015`, `A-016`, `A-017`, `A-025`.

Suggested gate: `npm run lint -- --max-warnings=0 && npm test && npx tsc --noEmit --pretty false && npm run build` plus focused `npx vitest run src/app/api src/lib/transactions/bond.test.ts`.

### Batch 2 — false-green prevention

Goal: make the CI/local gates more likely to catch real financial, API, and browser regressions.

Work items: `A-007`, `A-019`, `A-020`, `A-021`, `A-022`, `A-023`, `A-024`, `A-026`, `A-027`.

Suggested gate: full local gates plus `npx playwright test --repeat-each=2` for changed E2E specs when practical.

### Batch 3 — product trust and accessibility

Goal: remove misleading trust cues and make wallet, drawer, dialog, sort/filter, alert, and chart flows keyboard/screen-reader viable.

Work items: `A-028` through `A-044`.

Suggested gate: `npm run lint`, focused RTL/component tests, full `npm test`, and Playwright mobile/keyboard smoke.

### Batch 4 — CI/deploy/docs release governance

Goal: make source-to-image-to-deploy evidence more deterministic and make docs harder for agents/operators to misread.

Work items: `A-045` through `A-053`, except any production/non-prod deploy proof must remain blocked until explicitly authorized.

Suggested gate: YAML parse, `npm run lint`, local build, workflow grep checks, and exact-SHA GitHub Actions watch only if changes are committed/pushed later.

### Batch 5 — maintainability and performance refactors

Goal: reduce complexity and request fan-out after the correctness/test foundation is stronger.

Work items: `A-054` through `A-062`.

Suggested gate: small PR-sized batches; keep public exports stable first; run full local gates after each batch.

## Consolidated autonomous work queue

Legend: **Autonomous-safe** means no credentials, no live wallet/broadcast, no production deploy, no GH secret mutation, and locally verifiable. Some items are “partial” where tests/docs/refactors are safe but final policy or live proof is blocked.

### Financial correctness / DeFi trust

| ID | Priority | Autonomous work | Evidence anchors | Verification |
|---|---:|---|---|---|
| A-001 | P0 | Add dedicated BOND provider/operator-fee validation. Reject fee without provider, reject non-integer/blank malformed fees, enforce `0..10000` bps, preserve valid `BOND:<node>`, `BOND:<node>:<provider>:0`, and `BOND:<node>:<provider>:10000`. | `src/lib/transactions/bond.ts:295-303`; `src/components/dashboard/transaction-composer.tsx:108-111`, `212-215`, `329-330`; `src/lib/transactions/bond.test.ts:10-54`. | `npx vitest run src/lib/transactions/bond.test.ts src/components/dashboard/transaction-composer.test.tsx`; `npm run lint`. |
| A-002 | P0 | Fix historical APY double division. `totalBondingEarnings` is already human RUNE after `runeToNumber`; remove the second `/ 1e8` and add a regression test. | `src/lib/hooks/use-historical-apy.ts:21-27`; consumed by `src/components/dashboard/auto-compound-chart.tsx:21`, `30-35`. | Extract/test pure calculation or hook test; expected example: 10 RUNE/day on 10,000 RUNE over 10 days annualizes to about 36.5%, not near zero. |
| A-003 | P1 | Normalize APY chart timestamp handling and label the chart honestly as an estimated/current-baseline series unless true historical APY is implemented. | `src/lib/hooks/use-apy-chart-data.ts:21-36`; timestamp normalization already exists in `src/lib/hooks/use-lp-positions.ts:111-119` and `src/lib/utils/tax-export.ts:47-51`. | Hook tests for seconds vs nanoseconds; UI copy test/snapshot for estimate label. |
| A-004 | P1 | Treat LP `estimated` as a first-class trust tier everywhere; do not silently mix estimated entry pricing into aggregate P/L as if it were historical. | `src/lib/hooks/use-lp-positions.ts:184-195`, `320-340`; `src/app/dashboard/lp/page.tsx:32-41`; `src/lib/utils/lp-analytics.ts:213-219`. | `npx vitest run src/lib/hooks/__tests__/use-lp-positions.test.ts src/lib/utils/__tests__/lp-analytics.test.ts`; LP page component/E2E smoke. |
| A-005 | P1 | Reuse one Midgard timestamp normalizer and expose RUNE price freshness/staleness from `useRunePrice`; label stale price data in portfolio/LP/PnL surfaces. | `src/lib/hooks/use-rune-price.ts:23-27`, `58-61`; `src/components/dashboard/price-chart.tsx:36-45`; normalizers in `src/lib/hooks/use-lp-positions.ts:111-119` and `src/lib/utils/tax-export.ts:47-51`. | Hook tests with stale and nanosecond intervals; page tests assert stale source copy. |
| A-006 | P2 | Add high-value BigInt/Number precision boundary tests and begin isolating exact math from display-only conversion helpers. | `src/lib/utils/formatters.ts:41-49`; `src/lib/utils/tax-export.ts:57-64`; `src/lib/hooks/use-lp-positions.ts:94-103`; `src/lib/utils/lp-analytics.ts:77-79`; `src/lib/api/midgard.ts:262-270`. | Formatter/tax/LP tests with values above `Number.MAX_SAFE_INTEGER`; no UI change in first batch. |
| A-007 | P1 | Add `/api/tax-report` route tests for malformed JSON, missing/invalid address, date validation, CSV headers, success path, and generic error mapping. This is autonomous even if deeper tax span/schema policy remains blocked. | UI calls route at `src/app/dashboard/rewards/page.tsx:114-144`; route logic in `src/app/api/tax-report/route.ts:13-78`; current E2E stops before POST in `e2e/tax-export.spec.ts:179-187`. | `npx vitest run src/app/api/tax-report/route.test.ts src/lib/utils/__tests__/tax-export.test.ts`; `npx playwright test e2e/tax-export.spec.ts` after browser flow additions. |
| A-008 | P2-partial | Add paginated action-loading scaffolding/tests for tax export and an explicit incomplete-history warning path. Defer CSV schema changes like `actionType`/`side` to owner review if compatibility matters. | `src/lib/utils/tax-export.ts:138-140`, `248-257`, `397`; `src/lib/api/midgard.ts:423-429`. | Unit tests for pagination and warning state; avoid changing exported CSV columns without approval. |

### API/security hardening

| ID | Priority | Autonomous work | Evidence anchors | Verification |
|---|---:|---|---|---|
| A-010 | P0 | Add per-path query schemas/caps to Midgard and THORNode proxies. Reject unknown or out-of-range `limit`, `count`, `offset`, `from`, `to`, `interval`, addresses, and assets per allowed path. | `src/app/api/midgard/[...path]/route.ts:10-21`, `47`, `75`; `src/app/api/thorchain/[...path]/route.ts:9-29`, `72`, `101`. | `npx vitest run src/app/api/midgard/__tests__/route.test.ts src/app/api/thorchain/__tests__/route.test.ts`; `npm run lint`. |
| A-011 | P0 | Validate CoinAPI request shape before consuming quota; use strict date parsing, future/earliest bounds, range caps, and reject unknown param combinations. | `src/app/api/coinapi/rune-price/route.ts:15-18`, `20-52`, `54-88`; `src/lib/api/coinapi.ts:1`, `20-23`. | Add/extend CoinAPI route tests; assert invalid requests do not decrement limiter. |
| A-012 | P0 | Add shared `no-store`/private response header helper for user/report endpoints and health freshness responses, including validation/error paths. | `src/app/api/address/[address]/route.ts:25-47`, `88-99`; `src/app/api/tax-report/route.ts:23-34`, `58-76`; `src/app/api/pools/[pool]/route.ts:20-21`, `42-43`, `61-70`; `src/app/api/health/route.ts:27-33`. | `npx vitest run src/app/api`; assert `Cache-Control: no-store, max-age=0` where expected. |
| A-013 | P0 | Make CORS method support route-aware and add `OPTIONS` for POST `/api/tax-report`; add consistency tests for API routes. | `src/lib/api/cors.ts:24-28`; `src/app/api/tax-report/route.ts:13`, `24-26`, `31-33`, `60-62`, `73-75`; missing `OPTIONS` in several routes. | API route tests for preflight, POST advertised methods, and disallowed origins. |
| A-014 | P1 | Stop returning upstream base URLs/status detail arrays to clients; preserve request-id/server-side diagnostics. | `src/app/api/midgard/[...path]/route.ts:92-95`, `113-115`; `src/app/api/thorchain/[...path]/route.ts:90-93`, `114-116`, `130-132`. | Proxy failure tests assert generic error bodies and no upstream URL leakage. |
| A-015 | P0 | Strictly validate/clamp `/api/address/[address]` `limit`; reject `NaN`, negative, zero, fractional, too large, and weird strings. | `src/app/api/address/[address]/route.ts:23`, `52`; `src/lib/api/midgard.ts:423-429`. | `npx vitest run src/app/api/address/[address]/route.test.ts`. |
| A-016 | P0 | Validate `/api/pools/[pool]` pool identifiers with length and THORChain asset character-set checks before work begins. | `src/app/api/pools/[pool]/route.ts:16-22`, `46-49`. | Add route tests for invalid symbols and valid `BTC.BTC`-style pools. |
| A-017 | P1 | Add explicit no-store health headers and route tests. | `src/app/api/health/route.ts:27-33`. | `npx vitest run src/app/api/health/route.test.ts`. |
| A-018 | P2 | Add staged page-level security headers: HSTS and Permissions-Policy first; CSP in report-only mode before enforcement. | API-only headers in `src/lib/api/cors.ts:3-8`; no page `headers()` in `next.config.ts:3-12`. | `npm run build && npm run e2e`; browser header smoke. Enforced CSP waits for QA. |

### Tests, quality gates, and false-green prevention

| ID | Priority | Autonomous work | Evidence anchors | Verification |
|---|---:|---|---|---|
| A-019 | P0 | Add `typecheck` script and a CI `npm run typecheck` step for parity with local release gates. | `package.json:11-23`; `.github/workflows/ci.yml:33-41`, `60-63`; `tsconfig.json:7-16`. | `npm run typecheck`; exact-SHA CI after push. |
| A-020 | P0 | Make coverage gate meaningful: expand include to `src/app/api/**`, `src/lib/api/**`, and `src/lib/transactions/**`; add initial ratchet thresholds or critical-file thresholds. | `vitest.config.ts:16-20`; current coverage: 32.82% statements, 28.61% branches, 29.57% functions, 34.36% lines; excluded critical paths include `src/app/api/tax-report/route.ts:13-78` and `src/lib/transactions/bond.ts:34-218`. | `npx vitest run --coverage --coverage.reporter=text`; expect thresholds to fail until tests are added. |
| A-021 | P0 | Add mocked wallet adapter tests and connected transaction composer tests for Keplr, XDEFI, and Vultisig payloads, including UNBOND zero-transfer semantics. | `src/components/dashboard/transaction-composer.tsx:188-203`, `378-381`; `src/lib/transactions/bond.ts:88-150`, `152-183`, `185-218`; existing helper-only tests in `src/lib/transactions/bond.test.ts:1-54`; E2E disconnected-only at `e2e/transactions.spec.ts:124-126`. | `npx vitest run src/lib/transactions/bond.test.ts src/components/dashboard/transaction-composer.test.tsx`; focused Playwright if UI flow changes. |
| A-022 | P0 | Add a Playwright fixture that fails on `pageerror`, unexpected console errors, and failed same-origin `/api/**` requests. | `playwright.config.ts:11-14`; no `page.on('pageerror')`, console, or request-failed fixture found under `e2e/`; smoke tests like `e2e/comprehensive.spec.ts:6-23` assert only page text. | `npx playwright test`; maintain allowlist for expected browser noise. |
| A-023 | P1 | Make E2E mocks fail closed. Replace `route.continue()` for unhandled app APIs with explicit failures/404s and strengthen retry/error assertions. | `e2e/dashboard-pages.spec.ts:108`, `133`; stronger pattern in `e2e/portfolio.spec.ts:194`, `246`; weak retry in `e2e/comprehensive.spec.ts:72-94`; swallowed `networkidle` at `e2e/comprehensive.spec.ts:65-69`. | `npx playwright test e2e/dashboard-pages.spec.ts e2e/comprehensive.spec.ts`. |
| A-024 | P1 | Replace wallet E2E fixed sleeps, DOM scanning, and body text polling with semantic locators or stable test IDs. | `e2e/wallet.spec.ts:6-27`, `69-73`, `92`, `112`, `138`, `160`, `179`, `211`, `243`; static count: 14 `waitForTimeout` across E2E. | `npx playwright test e2e/wallet.spec.ts --repeat-each=3`. |
| A-025 | P0 | Add missing route tests for CoinAPI, CoinGecko, pools, tax-report, and health. | Covered: `src/app/api/address/[address]/route.test.ts:26-72`, `src/app/api/midgard/__tests__/route.test.ts:41-167`, `src/app/api/thorchain/__tests__/route.test.ts:49-141`; uncovered: `src/app/api/coinapi/rune-price/route.ts:20-104`, `src/app/api/coingecko/[...path]/route.ts:34-94`, `src/app/api/pools/[pool]/route.ts:11-72`, `src/app/api/tax-report/route.ts:13-78`. | `npx vitest run src/app/api`. |
| A-026 | P2 | Add machine-readable JUnit/test reporters and upload/report paths for Playwright/Vitest. | Playwright reporter only HTML at `playwright.config.ts:9`; coverage reporters HTML/JSON at `vitest.config.ts:18`; artifact upload at `.github/workflows/ci.yml:43-48`, `84-89`. | CI artifact check; local reporter output. |
| A-027 | P2 | Make local E2E server reuse opt-in or document release verification as `CI=true npm run e2e`. | `playwright.config.ts:21-25`, especially `reuseExistingServer: !process.env.CI`. | `CI=true npx playwright test`. |

### Frontend UX, accessibility, and product trust

| ID | Priority | Autonomous work | Evidence anchors | Verification |
|---|---:|---|---|---|
| A-028 | P0 | Replace hardcoded/simulated “Live”, “online”, and Bifrost health signals with real health/SWR last-success metadata and honest degraded/unknown labels. | `src/components/layout/bifrost-status.tsx:8`, `12-16`, `39-41`; `src/app/page.tsx:91-94`; `src/app/dashboard/portfolio/page.tsx:183-185`; `src/app/dashboard/rewards/page.tsx:205-207`; `src/components/layout/dashboard-shell.tsx:63-75`. | Unit tests with mocked health; Playwright degraded-health smoke. |
| A-029 | P0 | Make mobile sidebar a real accessible dialog/sheet with focus trap, Escape close, focus restore, labelled close button, and background inertness. | `src/components/layout/sidebar.tsx:37-58`, `126-134`. | Mobile Playwright keyboard test: open, focus inside, Tab cycle, Escape close, focus return. |
| A-030 | P0 | Make wallet connect dropdown/menu accessible: `aria-haspopup`, `aria-expanded`, menu/list semantics, Escape close, focus return. | `src/components/wallet/wallet-connect.tsx:101-109`, `123-126`, `146-160`, `169-177`, `179-235`. | Component tests and Playwright keyboard wallet flow. |
| A-031 | P0 | Introduce shared dialog primitive or focus management for transaction preview and tax export modal. | `src/components/wallet/transaction-preview.tsx:37-40`; `src/app/dashboard/rewards/page.tsx:312-320`, `351-375`. | Keyboard tests for initial focus, trap, Escape, and return. |
| A-032 | P1 | Normalize ARIA state for sort/filter/toggle/disclosure controls; use buttons in sortable table headers and `aria-sort`/`aria-pressed`/`aria-expanded`. | `src/app/dashboard/nodes/page.tsx:45-50`; `src/app/dashboard/explorer/page.tsx:173-210`; `src/app/dashboard/changelogs/page.tsx:390-415`, `521-560`, `577-633`; `src/components/dashboard/transaction-composer.tsx:247-262`; `src/components/dashboard/auto-compound-chart.tsx:90-145`. | RTL role/state tests; keyboard table sorting. |
| A-033 | P1 | Add a real label, `aria-invalid`, `aria-describedby`, and live validation for the primary address input. | `src/components/shared/address-input.tsx:83-93`. | `getByLabelText(/thorchain address/i)` tests and validation association tests. |
| A-034 | P1 | Tie transaction-composer validation messages to specific fields with per-field error IDs and `aria-invalid`. | `src/components/dashboard/transaction-composer.tsx:295-307`, `324-330`, `361-364`. | Component tests for invalid node/amount/provider/fee states. |
| A-035 | P2 | Remove or implement IL calculator “Save Calculation”; stop using `alert()` and stop promising mock persistence. | `src/components/dashboard/il-calculator.tsx:226-233`. | Unit test for removed button or local saved-history behavior. |
| A-036 | P2 | Fix changelog expanded-state persistence so collapse-all persists; add reset affordance for corrupted state. | `src/app/dashboard/changelogs/page.tsx:121-132`, `147-163`, `186-190`. | `src/app/dashboard/changelogs/page.test.tsx` additions. |
| A-037 | P1 | Validate dashboard URL address before writing persistent localStorage; clear malformed sticky state and show clear invalid-address copy. | `src/app/dashboard/layout.tsx:65-77`; contrast with validation in `src/app/page.tsx:24-27` and `src/components/shared/address-input.tsx:16-27`. | Layout tests with invalid `?address=abc`. |
| A-038 | P2 | Add recent/watchlist remove and clear controls plus short local-only privacy copy. | `src/components/shared/recent-addresses.tsx:33-40`; `src/app/dashboard/transactions/page.tsx:61-74`; `src/lib/hooks/use-watchlist.ts:62-69`. | Hook/component tests for remove/clear. |
| A-039 | P1 | Add live-region semantics for alert toasts and accessible names for dismiss buttons. | `src/components/alerts/alert-toast.tsx:165-186`. | Alert toast tests for roles and labels. |
| A-040 | P2 | Add accessible summaries or data-table fallbacks for Recharts-only charts. | `src/components/dashboard/price-chart.tsx:134-172`; `src/app/dashboard/portfolio/page.tsx:212-235`; `src/components/dashboard/risk-radar.tsx:68-86`; `src/components/dashboard/auto-compound-chart.tsx:150-228`. | RTL accessible-name checks and keyboard pass. |
| A-041 | P2 | Add breadcrumb landmark label and current-page state. | `src/components/shared/breadcrumbs.tsx:33-59`. | `getByRole('navigation', { name: /breadcrumb/i })`; `aria-current="page"` assertions. |
| A-042 | P2 | Make landing feature cards real links or remove pointer/hover affordance. | `src/app/page.tsx:64-88`, `123-128`. | Role/link tests or visual smoke. |
| A-043 | P2 | Verify and adjust mobile header layout so freshness remains available without crowding wallet/menu/refresh controls. | `src/components/layout/dashboard-shell.tsx:143-181`, `164-168`; `src/components/wallet/wallet-connect.tsx:123-137`. | Playwright screenshots at 320/375/390 px and keyboard navigation. |
| A-044 | P2-partial | Fix Learn markdown links with a parser or explicit link mapping. Stale product wording (“BondTrack”) needs content approval but the renderer fix is autonomous. | `src/app/learn/page.tsx:31-34`, `85-88`; `src/app/learn/[slug]/page.tsx:41-43`, `153-159`, `225-240`. | Article link/accessibility tests; content owner review before wording rewrite. |

### CI/CD, Docker, Ansible, release docs

| ID | Priority | Autonomous work | Evidence anchors | Verification |
|---|---:|---|---|---|
| A-045 | P0 | Add superseded/historical banners to stale plan docs and correct active docs that mention obsolete Docker/workflow patterns. | `CLAUDE.md:73-81`; `docs/plans/2026-05-05-heimdall-next-steps.md:128-131`, `171`; `docs/plans/2026-05-24-audit-critical-fixes.md:418-468`, `514-573`; current guardrails in `AGENTS.md:11-25`, `CLAUDE.md:131-139`. | Grep for `latest`, `ci-cd.yml`, `CI/CD Pipeline`, `node:22-alpine`, stale stage names. |
| A-046 | P0 | Tighten CI least privilege/timeouts: remove unused `checks: write` if not needed; add job-level `timeout-minutes` to build/e2e/docker/publish and OpenCode. | `.github/workflows/ci.yml:14-17`, `50-184`; `.github/workflows/opencode.yml:9-33`. | YAML parse and CI run after push. |
| A-047 | P1-partial | Wire existing `vault_coinapi_key` into Ansible container env without reading/changing the secret. Final proof that the secret exists remains owner/VPS-gated. | `.env.example:27-29`; `group_vars/vps/vault.yml:1`; `ansible-playbook.yml:58-71`, `109-121`, `142`; `src/app/api/coinapi/rune-price/route.ts:50-51`; `src/lib/api/coinapi.ts:1`, `20-23`. | `ansible-playbook --syntax-check` where available; no secret access. Post-deploy route proof is blocked. |
| A-048 | P1 | Clarify build-time vs runtime env contract, pass all declared `NEXT_PUBLIC_*` build args consistently, and update docs so operators do not think runtime Ansible env mutates baked client bundles. | `Dockerfile:4-22`, `39-40`; `.github/workflows/ci.yml:114-121`, `166-173`; `src/lib/config.ts:5`; `src/lib/api/cors.ts:21`; `ansible-playbook.yml:63-67`; `DEPLOYMENT.md:47-51`. | Grep env names across Docker/CI/Ansible/docs; Docker build when available. |
| A-049 | P0 | Make Linux native dependency installs deterministic: replace unversioned `npm install --no-save --no-package-lock`, remove runtime `|| true`, or generate/pin Linux native optional deps. | `.github/actions/install-deps/action.yml:15-30`; `Dockerfile:31-37`, `58-62`; lockfile native package refs such as `package-lock.json:2736`, `6231`, `7443`, `8401`. | `npm ci --include=optional`; build/test; Docker build on linux/amd64 where available. |
| A-050 | P1 | Standardize GHCR image repository lower-case everywhere, including publish metadata/summary, so verify and publish paths match Ansible/compose. | `.github/workflows/ci.yml:111`, `152`, `184`; `README.md:5`; `ansible-playbook.yml:5`; `compose.production.yml:5`. | YAML parse; grep `ghcr.io/`; exact CI publish on master only if release is authorized. |
| A-051 | P1 | Align Docker/Ansible/Compose healthcheck commands on `127.0.0.1` and explicit request error handling. | `Dockerfile:66-67`; `ansible-playbook.yml:52-53`, `103-104`; stronger compose form at `compose.production.yml:24-29`. | Docker inspect where available; Ansible syntax check where available. |
| A-052 | P2 | Align compose diagnostic endpoints with `.env.example`/CI and add a validation wrapper for `IMAGE_SHA` format because Compose interpolation only checks presence. | `compose.production.yml:3-5`, `14`, `17`, `20`; `.github/workflows/ci.yml:118`, `121`; `.env.example:7`, `10`. | `docker compose config` where available; shell validation tests. |
| A-053 | P2 | Harmonize README onboarding/release commands with `.nvmrc`, `npm ci`, and vault-password-file guidance. | `.nvmrc:1`; `CLAUDE.md:38-46`; `README.md:70-90`, `130-138`; `AGENTS.md:69-74`; `DEPLOYMENT.md:22-26`. | Docs grep and local command smoke. |

### Maintainability, architecture, performance, dependencies

| ID | Priority | Autonomous work | Evidence anchors | Verification |
|---|---:|---|---|---|
| A-054 | P1 | Centralize localStorage/sessionStorage keys and migrations in `src/lib/storage/keys.ts`; replace duplicated page-local constants. | `src/app/page.tsx:9-10`, `18-32`; `src/app/dashboard/layout.tsx:15-27`, `42-77`; `src/app/dashboard/changelogs/page.tsx:19`, `121-160`; `src/lib/hooks/use-watchlist.ts:5`, `29-47`; `src/lib/hooks/use-pending-transactions.ts:14`, `21-38`; `src/components/dashboard/pnl-dashboard.tsx:30-48`. | Storage migration tests; dashboard navigation smoke. |
| A-055 | P1 | Consolidate display formatting helpers and explicitly name display-only BigInt-to-number conversions; add edge tests. | Central helpers in `src/lib/utils/formatters.ts:8-119`; local helpers in `src/app/dashboard/risk/page.tsx:25-33`, `src/components/dashboard/risk-heatmap.tsx:61-64`, `src/components/dashboard/network-comparison-table.tsx:65`, `src/components/dashboard/price-chart.tsx:29-34`, `src/components/dashboard/apy-chart.tsx:14-19`. | Formatter tests plus affected component tests. |
| A-056 | P2 | Add/import an import-graph check and remove or archive unused dashboard widgets/hooks/utils in small batches. | Orphan candidates: `src/components/dashboard/apy-chart.tsx:39`, `bond-optimizer.tsx:18`, `lp-portfolio-hero.tsx:10`, `actionable-alerts.tsx:14`, `src/lib/hooks/use-coinapi-price.ts:12`, `src/lib/hooks/use-pending-transactions.ts:43`, `src/lib/utils/export.ts:4`, plus listed candidates in the maintainability report. | Import graph script; `npm run lint && npm test && npx tsc --noEmit`. |
| A-057 | P1 | Reduce LP/portfolio request fan-out: split current LP state from historical enrichment, cache historical day lookups, and add request-count tests for multi-pool members. | Portfolio mounts many hooks at `src/app/dashboard/portfolio/page.tsx:71-88`; LP hook fetch fan-out at `src/lib/hooks/use-lp-positions.ts:131-173`, refresh at `244-248`. | Mocked multi-pool hook tests asserting bounded request count; LP E2E smoke. |
| A-058 | P2 | Extract shared proxy helper for allowlist/rate-limit/CORS/upstream fetch/error shape and unify retry/no-retry client options. | Duplication across `src/app/api/midgard/[...path]/route.ts:29-116`, `src/app/api/thorchain/[...path]/route.ts:37-133`, `src/app/api/coingecko/[...path]/route.ts:17-93`; raw no-retry fetch at `src/lib/api/midgard.ts:474-488`; generic client in `src/lib/api/client.ts:17-69`. | Existing proxy route tests plus added common-helper tests. |
| A-059 | P2 | Split large files behind stable exports: changelog page, risk page internals, Midgard client, LP hook, transaction composer, bond simulator. | Largest files: `src/data/changelogs.ts` 1385 lines; `src/app/dashboard/changelogs/page.tsx` 666; `src/lib/api/midgard.ts` 604; `src/app/dashboard/risk/page.tsx` 530; `src/lib/utils/tax-export.ts` 430; `src/components/dashboard/transaction-composer.tsx` 407; `src/lib/hooks/use-lp-positions.ts` 405; `src/components/dashboard/bond-simulator.tsx` 405. | Small-batch refactors; `npm run lint && npm test && npx tsc --noEmit && npm run build`. |
| A-060 | P2 | Simplify or document the atypical changelog route boundary where layout imports and renders its page directly. | `src/app/dashboard/changelogs/layout.tsx:4`, `19-24`; `src/app/dashboard/changelogs/page.tsx:104`. | Changelog page tests and route smoke. |
| A-061 | P2 | Run a patch/minor dependency update branch after correctness work; keep React/Next/TypeScript/ESLint majors separate. | Node engine in `package.json:8-10`; exact pins in `package.json:36-37`; `npm outdated --json` found 16 top-level outdated packages; `npm audit --omit=dev --json` found 0 vulnerabilities; `npm ls --depth=0 --json` reported 5 local extraneous packages. | `npm ci`; full local gates; separate major-upgrade plan. |
| A-062 | P2 | Document/test the in-memory rate-limit store as single-process best-effort, including cap behavior and spoofed-IP helper behavior. Backend shared-store work is not autonomous. | `src/lib/api/rate-limit.ts:8`, `10-21`, `67-75`; route use at `src/app/api/midgard/[...path]/route.ts:49-63`, `src/app/api/thorchain/[...path]/route.ts:74-88`, `src/app/api/coingecko/[...path]/route.ts:41-55`. | Unit tests for cap/reset/header parsing; docs/source comment. |

## Non-autonomous / hold for owner, infra, live proof, or product policy

These were discovered during the audit but should not be executed autonomously without explicit owner direction or external environment facts.

| Hold ID | Work | Why blocked | Evidence anchors |
|---|---|---|---|
| H-001 | Define trusted proxy/IP-header policy for rate-limit identity. | Requires deployment topology and header-sanitization facts. | `src/lib/api/rate-limit.ts:29-55`. |
| H-002 | Replace in-memory rate limiting with Redis/KV/shared limiter and global CoinAPI paid-upstream bucket. | Requires provider choice, credentials, infra config. | `src/lib/api/rate-limit.ts:8-21`, `59-101`; `src/app/api/coinapi/rune-price/route.ts:8-27`. |
| H-003 | Decide maximum tax-report span, chunking/completeness policy, and CSV schema compatibility. | Product/tax correctness policy. | `src/lib/utils/tax-export.ts:92-112`, `138-140`, `301-307`, `370-375`, `397`. |
| H-004 | Decide missing-price tax behavior: block export, blank USD fields, or explicit low-confidence inclusion. | Tax/product policy. | `src/lib/utils/tax-export.ts:154-168`, `201-221`, `244-257`. |
| H-005 | Decide privacy UX for local address/watchlist/pending-tx persistence: opt-in, opt-out, or clear-data-only. | Product/privacy policy. | `src/app/page.tsx:24-31`; `src/app/dashboard/layout.tsx:22-76`; `src/lib/hooks/use-watchlist.ts:29-47`; `src/lib/hooks/use-pending-transactions.ts:21-37`; `src/lib/hooks/use-alerts.ts:31-89`; `src/lib/hooks/use-wallet.ts:205-216`. |
| H-006 | Decide whether Heimdall should support LEAVE signing/copying or explicitly mark it unsupported. | Product/safety decision for node exit semantics. | Current types/UI: `src/lib/transactions/bond.ts:15`; `src/components/dashboard/transaction-composer.tsx:22`, `247-262`; tax recognizes LEAVE at `src/lib/utils/tax-export.ts:77-80`, `188-189`. |
| H-007 | Final enforced CSP. | Report-only/staged headers are autonomous, but enforcement needs browser QA. | `next.config.ts:3-12`; local storage privacy surface above. |
| H-008 | OpenCode workflow policy: actor allowlist, exact action pin, whether OIDC is required, and whether comment-triggering should remain. | Third-party action trust and secret/OIDC exposure. | `.github/workflows/opencode.yml:3-7`, `11-21`, `28-33`. |
| H-009 | Staging image publishing/deploy policy. | Changes release governance and GHCR behavior. | `.github/workflows/ci.yml:91-127`; `ansible-playbook.yml:7-8`, `29-33`; `README.md:235-238`. |
| H-010 | Rollback failure drill and proof against a non-prod/live target. | Requires deploy target or controlled bad-image test permission. | `ansible-playbook.yml:17-26`, `73-82`, `91-130`. |
| H-011 | dev/staging/prod split and Caddy/VPS validation. | Requires external infra facts and/or read-only server access. | `inventory/hosts.yml:1-5`; `Caddyfile:1-3`; `README.md:257-267`; `DEPLOYMENT.md:66-80`. |
| H-012 | Full-SHA/digest deploy identity policy. | Full-SHA docs are safe, but changing deploy identity policy or digest-based deploys should be approved. | `.github/workflows/ci.yml:102-103`, `145-146`; `ansible-playbook.yml:11-15`; `compose.production.yml:3-5`, `14`; `README.md:119`, `140-143`. |
| H-013 | Learn content wording and navigation IA. | Renderer/link fixes are autonomous; stale product copy and whether Learn belongs in nav need content/product review. | `src/app/learn/page.tsx:31-34`, `38-92`; `src/app/learn/[slug]/page.tsx:153-159`; `src/components/layout/sidebar.tsx:14-23`. |

## Next recommended autonomous batch

If continuing without further owner input, do **Batch 1A**:

1. `A-001` BOND operator-fee validation + tests.
2. `A-002` historical APY double-conversion fix + regression test.
3. `A-015` address `limit` validation and `A-016` pool ID validation.
4. `A-012` no-store headers and `A-013` tax-report CORS/OPTIONS.
5. `A-011` CoinAPI strict date/range validation and quota order.
6. `A-025` missing route tests for affected API routes.

Why this batch first:

- It addresses High/P0 correctness and fail-closed issues.
- It is local-only and fully testable.
- It does not touch secrets, GHCR, deploy, live wallet signing, or production.
- It strengthens the gates needed before doing larger UX or maintainability refactors.

Expected verification before any push/claim:

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm audit --omit=dev --audit-level=moderate
npm run lint -- --max-warnings=0
npm test
npm run test:coverage -- --coverage.reporter=json-summary
npx tsc --noEmit --pretty false
npm run build
npm run e2e
```

If these changes are later committed/pushed, wait for exact-SHA GitHub Actions `status=completed` and `conclusion=success` before claiming remote verification.
