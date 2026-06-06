# Heimdall Release Trust Sprint Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make the current staging candidate honest and safe enough for a future production release by fixing deploy identity, financial/tax correctness, and visible trust gaps discovered in the 2026-06-06 review.

**Architecture:** Keep work on `staging`. Do not push or merge to `master` unless explicitly requested. Prefer TDD for behavior changes, patch existing infrastructure files rather than replacing them, and preserve THORChain proxy path normalization.

**Tech Stack:** Next.js 16.2.7 App Router, TypeScript, Vitest, Playwright, Docker/GHCR, Ansible, Node 22.

---

## Task 1: Deployment truth and release gates

**Objective:** Make deploy identity immutable and test the production artifact shape before any future master release.

**Files:**
- Modify: `ansible-playbook.yml`
- Modify: `.github/workflows/ci.yml`
- Modify: `playwright.config.ts`
- Create: `.env.example`
- Modify docs as needed: `README.md`, `CLAUDE.md`, `AGENTS.md`, `DEPLOYMENT.md`

**Requirements:**
1. Ansible defaults to `ghcr.io/reedtrullz/heimdall:sha-<local short sha>` or an explicitly provided `IMAGE_TAG`, not mutable `:latest`.
2. Runtime `VERSION` equals the immutable image tag deployed.
3. Rollback uses an immutable previous image reference when available; preserve existing rollback and health-check logic.
4. Ansible container healthchecks hit `/api/health`, not `/`.
5. CI runs `npm run lint -- --max-warnings=0`.
6. CI has a non-pushing Docker build verification job for PR/staging/non-master refs, while publish remains master-only.
7. Playwright local webServer runs the standalone artifact (`node .next/standalone/server.js`) after copying `public/` and `.next/static/` into `.next/standalone/`; no `next start` standalone warning remains.
8. `.env.example` documents public and server-side vars without secrets.
9. Docs mention immutable deploy tags and exact-SHA verification; do not claim production deployment.

**Verification:**
- `source ~/.nvm/nvm.sh && nvm use 22 && npm run lint -- --max-warnings=0`
- `source ~/.nvm/nvm.sh && nvm use 22 && npm run e2e`
- `ruby -ryaml -e "YAML.load_file('.github/workflows/ci.yml'); puts 'OK'"`
- `docker build --platform linux/amd64 ... -t heimdall-review:amd64 .`
- `docker run ... heimdall-review:amd64` then curl `/api/health` and verify `version`.

---

## Task 2: Financial/tax correctness fixes

**Objective:** Fix the audit findings that can misstate RUNE/tax values.

**Files:**
- Modify: `src/lib/utils/tax-export.ts`
- Modify/add tests: `src/lib/utils/__tests__/tax-export.test.ts`
- Modify: `src/app/api/address/[address]/route.ts`
- Add/modify route tests if appropriate.
- Update docs/AGENTS if field semantics change.

**Requirements:**
1. Bond FIFO lots prior to report start must use price history that starts at the earliest included bond action, not report start.
2. Action type detection must prefer `metadata.refund.txType`, then `action.type`, then memo prefix.
3. UNBOND memo amounts in base units (`UNBOND:<node>:<baseUnits>`) must be parsed as fallback when Midgard coin amounts are absent.
4. LP rows must be explicitly confidence-labeled as current-position estimates until historical add/withdraw reconstruction exists; do not imply a complete LP tax ledger.
5. `/api/address` must not return raw 1e8 base units as unlabeled `amount`; expose `amountBaseUnits` and `amountRune` (or equivalent explicit names).
6. Add RED/GREEN tests for pre-period cost basis and UNBOND memo amount fallback.

**Verification:**
- Targeted Vitest for tax export and address route/unit tests.
- `source ~/.nvm/nvm.sh && nvm use 22 && npm test`
- `source ~/.nvm/nvm.sh && nvm use 22 && npm run build`

---

## Task 3: User-visible trust gaps

**Objective:** Fix silent/dead UI paths that make the dashboard look unreliable.

**Files:**
- Modify: `src/lib/hooks/use-wallet-balance.ts` and/or `src/app/api/thorchain/[...path]/route.ts`
- Modify: `src/app/dashboard/settings/notifications/page.tsx`
- Add/modify tests in `src/lib/hooks/__tests__/`, `src/app/dashboard/**`, and/or `e2e/`

**Requirements:**
1. Wallet balance hook must call an allowed/proven THORNode path; add a test so the path cannot drift back to a forbidden proxy path.
2. Notification settings must either wire to actual local alert preferences or clearly state email/Telegram channels are not active yet; remove mock-save trust claims.
3. Add targeted E2E assertions for at least transaction quick-action mode and memo-copy feedback if low-risk; otherwise add TODO docs with exact blockers.

**Verification:**
- Targeted tests for changed hooks/pages/E2E specs.
- `source ~/.nvm/nvm.sh && nvm use 22 && npm run e2e -- --grep "Transaction Composer|Portfolio"`
- Full gates in final task.

---

## Task 4: Final integration review and staging push

**Objective:** Prove the integrated candidate is clean and push only to `staging`.

**Requirements:**
1. Independent final review checks spec compliance, code quality, and integration issues across all changed files.
2. Run full local gates: audit, lint, unit tests, build, E2E, Docker amd64 build/run health.
3. Commit changes on `staging` with clear messages.
4. Push `staging`, wait for the exact pushed SHA GitHub Actions run to `completed/success`.
5. Do **not** push or merge to `master`; do **not** claim production deployment.

**Verification:**
- `git status --short --branch`
- `git log --oneline -5`
- `gh run view <run> --json status,conclusion,headSha,jobs` for exact pushed SHA.

---

## Plan review history

- 2026-06-06: Derived from parent review findings with three read-only specialist audits (financial/API, deployment/CI, product/tests). Implement under subagent-driven-development with parent-side verification after every subagent.
- 2026-06-06 follow-up: after staging CI passed at `79756d2`, continue with CI maintenance by upgrading first-party GitHub Actions to Node 24-capable majors (`checkout@v6`, `setup-node@v6`, `upload-artifact@v7`) and verifying the exact pushed SHA.
