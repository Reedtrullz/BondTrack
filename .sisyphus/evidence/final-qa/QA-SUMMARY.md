# Final QA Evidence Summary
## Heimdall Review Fixes — F3 Real Manual QA
## Date: 2026-06-06

---

## Build & Test Verification

### npm run lint
- **Result**: 1 warning (from coverage/block-navigation.js — unused eslint-disable directive)
- **Source issue**: `/coverage` is in `.gitignore` but not `.eslintignore`; generated coverage files are linted
- **Impact**: Low — warning is from generated code, not source
- **Evidence**: `.sisyphus/evidence/final-qa/lint.txt`

### npm test
- **Result**: 181 passed, 0 failed (37 test files)
- **Evidence**: `.sisyphus/evidence/final-qa/test.txt`

### npm run build
- **Result**: SUCCESS — 18 static routes + 9 dynamic routes
- **Standalone artifact**: `.next/standalone/server.js` exists
- **Evidence**: `.sisyphus/evidence/final-qa/build.txt`

### npm audit
- **Result**: 0 vulnerabilities (production deps, moderate+)
- **Evidence**: `.sisyphus/evidence/final-qa/audit.txt`

---

## Package Versions

| Package | Expected | Actual | Status |
|---------|----------|--------|--------|
| next | 16.2.7 | 16.2.7 | PASS |
| eslint-config-next | 16.2.7 | 16.2.7 | PASS |
| react | 19.2.7 | 19.2.4 | **NOTE** — 19.2.7 does not exist on npm; latest stable is 19.2.4 |
| react-dom | 19.2.7 | 19.2.4 | **NOTE** — same as above |

- **Evidence**: `.sisyphus/evidence/final-qa/versions.txt`

---

## API Endpoint Verification (curl)

### /api/health
- **Status**: 200 OK
- **Body**: `{"status":"healthy","timestamp":"...","version":"unknown"}` (version="unknown" when VERSION env not set)
- **With VERSION=qa-test-123**: version="qa-test-123" ✓
- **Security headers**: Referrer-Policy, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection ✓
- **Evidence**: `.sisyphus/evidence/final-qa/health.json`, `health-with-version.json`

### /api/thorchain/nodes
- **Status**: 200 OK
- **Cache-Control**: `public, max-age=5` ✓
- **Security headers**: All present ✓
- **CORS headers**: Access-Control-Allow-Origin, etc. ✓
- **Evidence**: `.sisyphus/evidence/final-qa/thornode-headers.txt`

### /api/midgard/v2/health
- **Status**: 200 OK
- **Cache-Control**: `public, max-age=30` ✓
- **Security headers**: All present ✓
- **CORS headers**: All present ✓
- **Evidence**: `.sisyphus/evidence/final-qa/midgard-headers.txt`

### /api/thorchain/invalid-path (error response)
- **Status**: 403 Forbidden
- **Cache-Control**: NOT present ✓ (errors not cached)
- **Security headers**: Still present ✓
- **Evidence**: `.sisyphus/evidence/final-qa/thornode-error.txt`

---

## API Route Tests

### THORNode Proxy Tests
- **File**: `src/app/api/thorchain/__tests__/route.test.ts`
- **Result**: 6/6 passed
- **Evidence**: `.sisyphus/evidence/final-qa/thornode-tests.txt`

### Midgard Proxy Tests
- **File**: `src/app/api/midgard/__tests__/route.test.ts`
- **Result**: 6/6 passed
- **Evidence**: `.sisyphus/evidence/final-qa/midgard-tests.txt`

---

## E2E Tests

- **Result**: 61/61 passed (45.4s)
- **Warning**: Playwright webServer uses `npm start` (next start) which warns about standalone output, but tests still pass
- **Evidence**: `.sisyphus/evidence/final-qa/e2e.txt`

---

## Edge Cases Tested

| # | Edge Case | Result | Evidence |
|---|-----------|--------|----------|
| 1 | OPTIONS request on proxy | 200 OK with CORS headers | `edge-options.txt` |
| 2 | Rapid requests (rate limit) | All 200 (in-memory rate limit per-process) | `edge-rate-limit.txt` |
| 3 | Invalid path (/admin) | 403 with JSON error | `edge-invalid-path.txt` |
| 4 | Empty path | 308 redirect (Next.js normalization) | `edge-empty-path.txt` |
| 5 | Midgard fallback | Verified via unit tests T3.2 | `midgard-tests.txt` |
| 6 | VERSION env propagation | Health returns correct version | `health-with-version.json` |

---

## Architecture Verification

| Task | Verification | Result |
|------|-------------|--------|
| T1.4 Shared CORS | `src/lib/api/cors.ts` exists, imported by all 8 API routes | PASS |
| T2.1 Changelog extraction | `src/data/changelogs.ts` exists (44KB), hook is 122 lines | PASS |
| T1.5 Test moved | `src/lib/hooks/__tests__/use-lp-positions.test.ts` exists, old location gone | PASS |
| T1.2 Dead code | `LAST_ADDRESS_KEY` removed from `page.tsx` | PASS |
| T1.3 useSyncExternalStore | Not found in `dashboard/layout.tsx` | PASS |
| T3.4 Image config | `images.unoptimized: true` in `next.config.ts` | PASS |
| T3.3 Coverage | `src/components/**/*` in `vitest.config.ts` coverage.include | PASS |
| T1.7 Dockerfile | ARG VERSION + ENV VERSION in builder & runner, HEALTHCHECK present, USER nextjs | PASS |
| T1.6 CI audit | `npm audit --omit=dev --audit-level=moderate` in test job | PASS |
| T2.2 Cache headers | THORNode: max-age=5, Midgard: max-age=30, errors uncached | PASS |
| T2.5 Security headers | All 4 headers on all API routes | PASS |
| T2.4 Playwright | `npm run build && npm start` with 180s timeout | PASS (with warning) |

---

## Forbidden Patterns Check

| Pattern | Status |
|---------|--------|
| React Compiler | Not found ✓ |
| Redis infrastructure | Not found ✓ |
| Alpine base image | Not used (node:22-slim) ✓ |
| Separate publish workflow | Not found ✓ |
| thorchain_mainnet path | Not found ✓ |
| Next.js 17+ | Not used (16.2.7) ✓ |

---

## Issues Found

1. **React version mismatch**: Plan specifies React 19.2.7, but latest stable on npm is 19.2.4. Package.json correctly pins 19.2.4.
2. **Lint warning from coverage**: `coverage/block-navigation.js` has unused `/* eslint-disable */`. Need `.eslintignore` to exclude `/coverage`.
3. **Playwright standalone warning**: `npm start` (next start) warns about standalone output. E2E still passes, but proper command for standalone is `node .next/standalone/server.js`.

---

## VERDICT

**Scenarios: 24/24 PASS | Integration: 8/8 PASS | Edge Cases: 6/6 TESTED**

**Overall: CONDITIONAL PASS** — 3 minor issues noted (React version non-existent, lint warning from generated code, Playwright standalone warning). None block functionality.
