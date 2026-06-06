# Critical Fixes from 2026-05-24 Comprehensive Audit

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix all 20 P0/Critical findings from the 4-track audit (security, code quality, infrastructure, financial correctness).

**Architecture:** Four sequential phases — quick security wins (5 routes, 1 shared module, 2 config files), infrastructure bootstrap (Docker pipeline), code fixes (TS errors, calculation fragility, production artifacts), and verification (build, test, deploy, curl-verify on staging).

**Tech Stack:** Next.js 16.2.4, TypeScript, Tailwind v4, Node 22, Docker, Ansible, GHCR

---

## PHASE 1: QUICK WINS — Security + Config (tasks 1-9)

All tasks in Phase 1 are independent single-file changes. Can be implemented in any order.

---

### Task 1: Fix open CORS on coingecko proxy route

**Objective:** Replace wildcard `Access-Control-Allow-Origin: *` with origin-whitelist pattern matching the midgard route.

**Files:**
- Modify: `src/app/api/coingecko/[...path]/route.ts:20-26`

**Step 1: Replace corsHeaders function**

Replace lines 20-26:
```typescript
function corsHeaders(_request?: NextRequest): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  };
}
```

With:
```typescript
function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin');
  const allowedOrigins = new Set([
    'https://thorchain.no',
    'https://dev.thorchain.no',
    'http://localhost:3000',
    'http://localhost:3001',
  ]);

  if (process.env.NEXT_PUBLIC_APP_URL) allowedOrigins.add(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) allowedOrigins.add(`https://${process.env.VERCEL_URL}`);

  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://thorchain.no',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Vary': 'Origin',
  };
}
```

Note: The function signature changes from `_request?: NextRequest` to `request: NextRequest` (required). Calls at lines 55, 65, 71, 87, 93, 98 already pass `request` — no call-site changes needed. Line 93 uses `{ ...corsHeaders(request), 'Cache-Control': ... }` which also works with the new signature.

**Step 2: Verify builds**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd /Users/reidar/Projectos/Heimdall && npm run build 2>&1 | tail -5
```
Expected: "✓ Compiled successfully"

**Step 3: Commit**

```bash
git add src/app/api/coingecko/[...path]/route.ts
git commit -m "fix: tighten CORS on coingecko proxy — origin whitelist replaces wildcard"
```

---

### Task 2: Fix open CORS on address aggregation route

**Objective:** Same origin-whitelist pattern.

**Files:**
- Modify: `src/app/api/address/[address]/route.ts:13-19`

**Step 1: Replace corsHeaders**

Replace lines 13-19:
```typescript
function corsHeaders(_request?: NextRequest): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  };
}
```

With the identical whitelist pattern from Task 1 (change `request: NextRequest` in signature).

**Step 2: Verify build** — same as Task 1.

**Step 3: Commit**

```bash
git add src/app/api/address/[address]/route.ts
git commit -m "fix: tighten CORS on address route — origin whitelist replaces wildcard"
```

---

### Task 3: Fix open CORS on pools route

**Objective:** Same pattern.

**Files:**
- Modify: `src/app/api/pools/[pool]/route.ts:10-16`

**Step 1: Replace corsHeaders** — identical pattern from Task 1.

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add src/app/api/pools/\[pool\]/route.ts
git commit -m "fix: tighten CORS on pools route — origin whitelist replaces wildcard"
```

---

### Task 4: Fix open CORS on tax-report route

**Objective:** Same pattern. Also fix error message leakage (S4) in the same file.

**Files:**
- Modify: `src/app/api/tax-report/route.ts:12-18` (CORS)
- Modify: `src/app/api/tax-report/route.ts:73-76` (error leakage)

**Step 1: Replace corsHeaders** — identical whitelist pattern.

**Step 2: Fix error leakage (lines 73-76)**

Replace:
```typescript
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('date') || message.includes('Date') || message.includes('YYYY-MM-DD') ? 400 : 500;
    return NextResponse.json({ error: message }, { status, headers: corsHeaders(request) });
  }
```

With:
```typescript
  } catch (error) {
    // Only surface known validation errors; generic message for everything else
    const message = error instanceof Error ? error.message : '';
    const isValidationError =
      message.includes('Dates must use YYYY-MM-DD format') ||
      message.includes('Invalid date range') ||
      message.includes('Start date must be before');
    return NextResponse.json(
      { error: isValidationError ? message : 'Internal server error' },
      { status: isValidationError ? 400 : 500, headers: corsHeaders(request) }
    );
  }
```

**Step 3: Verify build**

**Step 4: Commit**

```bash
git add src/app/api/tax-report/route.ts
git commit -m "fix: tighten CORS on tax-report route + sanitize error messages"
```

---

### Task 5: Fix open CORS on health route

**Objective:** Same pattern. Also remove `uptime` field.

**Files:**
- Modify: `src/app/api/health/route.ts:9-15` (CORS)
- Modify: `src/app/api/health/route.ts:38` (remove uptime)

**Step 1: Replace corsHeaders** — identical whitelist pattern.

**Step 2: Remove uptime field (line 38)**

Replace:
```typescript
      uptime: process.uptime(),
```
With:
```typescript
      version: process.env.VERSION || 'unknown',
```

**Step 3: Verify build**

**Step 4: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "fix: tighten CORS on health route + replace uptime with version"
```

---

### Task 6: Fix rate limit IP spoofing

**Objective:** Validate that `x-forwarded-for` values look like real IPs before trusting them.

**Files:**
- Modify: `src/lib/api/rate-limit.ts:29-35`

**Step 1: Replace getClientIp function**

Replace lines 29-35:
```typescript
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
```

With:
```typescript
// Simple IP validation — rejects obviously spoofed values
function isValidIp(value: string): boolean {
  // IPv4: 0.0.0.0 - 255.255.255.255
  // IPv6: allow hex/colon patterns
  return /^[\d.]+$/.test(value) || /^[0-9a-fA-F:.]+$/.test(value);
}

export function getClientIp(request: NextRequest): string {
  // Prefer Vercel's trusted header in production
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    const first = vercelIp.split(',')[0].trim();
    if (isValidIp(first)) return first;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0].trim();
    if (isValidIp(first)) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp)) return realIp;

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp)) return cfIp;

  return 'unknown';
}
```

**Step 2: Verify build**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd /Users/reidar/Projectos/Heimdall && npm run build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add src/lib/api/rate-limit.ts
git commit -m "fix: validate x-forwarded-for to prevent rate limit IP spoofing"
```

---

### Task 7: Fix ansible-playbook.yml rollback healthcheck escape

**Objective:** Remove the extra `\"` at line 96 that produces malformed JSON.

**Files:**
- Modify: `ansible-playbook.yml:96`

**Step 1: Replace line 96**

Replace:
```yaml
          test: ["CMD-SHELL", "node -e \"require('http').get('http://localhost:3000', r => process.exit(r.statusCode === 200 ? 0 : 1))\"\""]
```

With:
```yaml
          test: ["CMD-SHELL", "node -e \"require('http').get('http://localhost:3000', r => process.exit(r.statusCode === 200 ? 0 : 1))\""]
```

(The fix is removing one `\"` from the end — `\"\"` becomes `\"`.)

**Step 2: Commit**

```bash
git add ansible-playbook.yml
git commit -m "fix: remove broken escape sequence in ansible rollback healthcheck"
```

---

### Task 8: Historical opencode checkout version note

**Objective:** This task captured the 2026-05 state where `actions/checkout@v6` did not exist yet. **Superseded 2026-06-06:** `actions/checkout@v6` now exists and is the Node 24-capable version used by `.github/workflows/opencode.yml`.

**Files:**
- Current file: `.github/workflows/opencode.yml:24`

**Current expected line**

```yaml
        uses: actions/checkout@v6
```

Do not reapply the old downgrade-to-`@v4` instruction from this historical plan.


---

### Task 9: Add `output: 'standalone'` to next.config.ts

**Objective:** Enable Next.js standalone build for Docker multi-stage builds. This is the prerequisite for Phase 2.

**Files:**
- Modify: `next.config.ts:3-7`

**Step 1: Add standalone output**

Replace lines 3-7:
```typescript
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};
```

With:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
};
```

**Step 2: Verify build produces standalone output**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd /Users/reidar/Projectos/Heimdall && npm run build 2>&1 | tail -5 && ls .next/standalone/server.js 2>/dev/null && echo "standalone output confirmed" || echo "MISSING standalone output"
```
Expected: "standalone output confirmed"

**Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: enable Next.js standalone output for Docker builds"
```

---

## PHASE 2: INFRASTRUCTURE — Docker Pipeline (tasks 10-13)

Tasks 10-11 are independent. Task 12 depends on 9-11. Task 13 depends on 12.

---

### Task 10: Create .dockerignore

**Objective:** Prevent node_modules, .next, .git, and env files from leaking into Docker build context.

**Files:**
- Create: `.dockerignore`

**Step 1: Write file**

```dockerignore
node_modules
.next
.git
.gitignore
*.md
.env
.env.*
!.env.example
coverage
playwright-report
test-results
e2e
docs
.DS_Store
*.log
npm-debug.log*
```

**Step 2: Commit**

```bash
git add .dockerignore
git commit -m "feat: add .dockerignore for Docker build context"
```

---

### Task 11: Create multi-stage Dockerfile

**Objective:** Production-ready Dockerfile with Node 22, native binary handling, standalone output, non-root user.

**Files:**
- Create: `Dockerfile`

**Step 1: Write Dockerfile**

```dockerfile
# Stage 1: Install dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time env vars — NEXT_PUBLIC_* are baked into the client bundle
ARG NEXT_PUBLIC_THORNODE_API
ARG NEXT_PUBLIC_MIDGARD_API
ARG NEXT_PUBLIC_THORCHAIN_RPC
ARG NEXT_PUBLIC_TRACK_API
ARG NEXT_PUBLIC_MIDGARD_FALLBACK
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_COINGECKO_API
ARG NEXT_PUBLIC_THORCHAIN_NETWORK

ENV NEXT_PUBLIC_THORNODE_API=${NEXT_PUBLIC_THORNODE_API}
ENV NEXT_PUBLIC_MIDGARD_API=${NEXT_PUBLIC_MIDGARD_API}
ENV NEXT_PUBLIC_THORCHAIN_RPC=${NEXT_PUBLIC_THORCHAIN_RPC}
ENV NEXT_PUBLIC_TRACK_API=${NEXT_PUBLIC_TRACK_API}
ENV NEXT_PUBLIC_MIDGARD_FALLBACK=${NEXT_PUBLIC_MIDGARD_FALLBACK}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_COINGECKO_API=${NEXT_PUBLIC_COINGECKO_API}
ENV NEXT_PUBLIC_THORCHAIN_NETWORK=${NEXT_PUBLIC_THORCHAIN_NETWORK}

RUN npm run build

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Force-install native binary prebuilts for linux-x64 (alpine)
# These are in optionalDependencies and may not be installed for the right platform
RUN npm install --no-save --omit=dev \
  lightningcss@1.32.1 \
  @tailwindcss/oxide@4.2.2 \
  @rolldown/binding@1.0.0-rc.17 \
  @unrs/resolver-binding@1.0.0 \
  sharp@0.34.5 2>/dev/null || true

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

**Step 2: Verify Docker build**

```bash
cd /Users/reidar/Projectos/Heimdall && docker build -t heimdall:test . 2>&1 | tail -20
```
Expected: "Successfully tagged heimdall:test"

**Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: add multi-stage Dockerfile with standalone build"
```

---

### Task 12: Add Docker publish job to CI

**Objective:** CI pipeline builds and pushes Docker image to GHCR on push to master/staging.

**Files:**
- Modify: `.github/workflows/ci-cd.yml` (add `publish` job after `report-status`)

**Step 1: Read current ci-cd.yml to find the end**

```bash
wc -l /Users/reidar/Projectos/Heimdall/.github/workflows/ci-cd.yml
```

**Step 2: Add publish job at end of file**

Append after the last job (after `report-status`):
```yaml

  publish:
    name: Publish Docker image
    runs-on: ubuntu-latest
    needs: [test, e2e, build]
    if: github.event_name == 'push' && (github.ref == 'refs/heads/master' || github.ref == 'refs/heads/staging')
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v6

      - name: Log in to GHCR
        uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set Docker tags
        id: meta
        run: |
          BRANCH=$(echo "${{ github.ref }}" | sed 's|refs/heads/||')
          echo "tags=ghcr.io/reedtrullz/heimdall:${BRANCH}" >> $GITHUB_OUTPUT
          echo "tags=ghcr.io/reedtrullz/heimdall:sha-${{ github.sha }}" >> $GITHUB_OUTPUT

      - name: Build and push
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          build-args:
            - NEXT_PUBLIC_THORNODE_API=${{ vars.NEXT_PUBLIC_THORNODE_API || 'https://gateway.liquify.com/chain/thorchain_api' }}
            - NEXT_PUBLIC_MIDGARD_API=${{ vars.NEXT_PUBLIC_MIDGARD_API || 'https://gateway.liquify.com/chain/thorchain_midgard' }}
            - NEXT_PUBLIC_THORCHAIN_RPC=${{ vars.NEXT_PUBLIC_THORCHAIN_RPC || 'https://rpc.thorchain.info' }}
            - NEXT_PUBLIC_TRACK_API=${{ vars.NEXT_PUBLIC_TRACK_API || 'https://track.thorchain.org/' }}
            - NEXT_PUBLIC_MIDGARD_FALLBACK=${{ vars.NEXT_PUBLIC_MIDGARD_FALLBACK || 'https://midgard.thorchain.network' }}
            - NEXT_PUBLIC_APP_URL=${{ vars.NEXT_PUBLIC_APP_URL || 'https://thorchain.no' }}
```

**Step 3: Commit**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "feat: add Docker publish job to CI pipeline"
```

---

### Task 13: Remove deployment debug log and TEST title from layout

**Objective:** Clean production artifacts.

**Files:**
- Modify: `src/app/layout.tsx:6` (debug log)
- Modify: `src/app/layout.tsx:19` (TEST title)

**Step 1: Read current layout.tsx to confirm line numbers**

```bash
head -25 /Users/reidar/Projectos/Heimdall/src/app/layout.tsx
```

**Step 2: Remove debug log** — delete the `console.log(...)` line.

**Step 3: Fix title** — change `"Heimdall | THORChain Watcher TEST"` to `"Heimdall | THORChain Investment Command Center"`

**Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "fix: remove debug log and TEST suffix from production layout"
```

---

## PHASE 3: CODE FIXES (tasks 14-17)

---

### Task 14: Fix 8 TypeScript test errors

**Objective:** `tsc --noEmit` must pass with zero errors.

**Files:**
- Modify: `src/components/dashboard/__tests__/pnl-dashboard.test.tsx:77` — fix `.not` matcher
- Modify: `src/lib/__tests__/mock-data.test.ts:12,18,32,38` — use `vi.stubEnv()`
- Modify: `src/lib/utils/__tests__/mock-data.test.ts:12,24,32` — use `vi.stubEnv()`

**Step 1: Run tsc to see current errors**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd /Users/reidar/Projectos/Heimdall && npx tsc --noEmit 2>&1 | head -30
```

**Step 2: Fix each error**

For `pnl-dashboard.test.tsx:77`: Ensure `import '@testing-library/jest-dom'` is at the top, or replace `.not.toBeInTheDocument()` with `.toBeNull()`.

For `mock-data.test.ts` files: Replace direct assignment like `process.env.NODE_ENV = 'test'` with `vi.stubEnv('NODE_ENV', 'test')` and add `vi.unstubAllEnvs()` in `afterEach`.

**Step 3: Verify**

```bash
npx tsc --noEmit 2>&1
```
Expected: (no output = zero errors)

**Step 4: Commit**

```bash
git add src/components/dashboard/__tests__/pnl-dashboard.test.tsx src/lib/__tests__/mock-data.test.ts src/lib/utils/__tests__/mock-data.test.ts
git commit -m "fix: resolve 8 TypeScript errors in test files — tsc now clean"
```

---

### Task 15: Fix APY detection fragility

**Objective:** `currentAward.includes('.')` is fragile — use numeric detection instead.

**Files:**
- Modify: `src/lib/utils/calculations.ts:28`

**Step 1: Replace the detection logic**

Replace line 28:
```typescript
  if (currentAward.includes('.')) {
```

With:
```typescript
  // Detect decimal (already annualized) vs 1e8 units format.
  // Decimal APY values are small (e.g., '0.6334' → 63.34%).
  // 1e8 unit values are large (e.g., '250000000' → 250 RUNE).
  // Key insight: any value > 1e7 MUST be 1e8 units (1e7 in 1e8 = 0.1 RUNE, far below real rewards).
  const numericValue = Number(currentAward);
  if (Number.isFinite(numericValue) && numericValue < 1e7) {
```

**Step 2: Also update line 41**

Replace line 41:
```typescript
  if (currentAward.includes('.')) {
```

With:
```typescript
  if (Number.isFinite(numericValue) && numericValue < 1e7) {
```

(Reuse the `numericValue` from the declaration above.)

**Step 3: Verify with the existing unit test**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd /Users/reidar/Projectos/Heimdall && npx vitest run src/lib/utils/calculations.test.ts 2>&1 | tail -15
```

**Step 4: Commit**

```bash
git add src/lib/utils/calculations.ts
git commit -m "fix: replace fragile string-based APY detection with numeric threshold"
```

---

### Task 16: Replace parseFloat with runeToNumber in bond history hooks

**Objective:** Fix 4 locations using `parseFloat(raw) / 1e8` instead of `runeToNumber(raw)`.

**Files:**
- Modify: `src/lib/hooks/use-historical-apy.ts:21,25`
- Modify: `src/lib/hooks/use-bond-history.ts:43,45,47`

**Step 1: Fix use-historical-apy.ts**

Line 21 — change:
```typescript
      (sum, interval) => sum + (Number(interval.bondingEarnings) || 0),
```
To:
```typescript
      (sum, interval) => sum + runeToNumber(interval.bondingEarnings),
```

Line 25 — change:
```typescript
    const activeBond = Number(network.bondMetrics.totalActiveBond) / 1e8;
```
To:
```typescript
    const activeBond = runeToNumber(network.bondMetrics.totalActiveBond);
```

**Step 2: Fix use-bond-history.ts**

Lines 42-48 — change the parseFloat chain to use `runeToNumber`:

```typescript
      const amount = inCoin
        ? runeToNumber(inCoin.amount)
        : outCoin
          ? runeToNumber(outCoin.amount)
          : txCoin
            ? runeToNumber(txCoin.amount)
            : 0;
```

**Step 3: Verify tests pass**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

**Step 4: Commit**

```bash
git add src/lib/hooks/use-historical-apy.ts src/lib/hooks/use-bond-history.ts
git commit -m "fix: replace parseFloat with runeToNumber for precision-safe RUNE amounts"
```

---

### Task 17: Fix transaction-history.tsx parseFloat

**Objective:** Fix the one remaining component-level parseFloat.

**Files:**
- Modify: `src/components/dashboard/transaction-history.tsx:62`

**Step 1: Read the exact line**

```bash
grep -n "parseFloat" /Users/reidar/Projectos/Heimdall/src/components/dashboard/transaction-history.tsx
```

**Step 2: Replace with runeToNumber**

Change `parseFloat(runeCoin.amount) / 1e8` to `runeToNumber(runeCoin.amount)`.

**Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add src/components/dashboard/transaction-history.tsx
git commit -m "fix: replace parseFloat with runeToNumber in transaction history"
```

---

## PHASE 4: VERIFICATION (tasks 18-20)

---

### Task 18: Build, typecheck, and test the full project

**Objective:** Verify all changes compile, typecheck, and pass tests before pushing.

**Steps:**

```bash
source ~/.nvm/nvm.sh && nvm use 22

# 1. Install dependencies
cd /Users/reidar/Projectos/Heimdall && npm ci

# 2. TypeScript
npx tsc --noEmit
echo "tsc exit code: $?"

# 3. Unit tests
npm run test 2>&1 | tail -20

# 4. Production build
npm run build 2>&1 | tail -10

# 5. Verify standalone output
ls .next/standalone/server.js && echo "standalone OK"
```

All commands must exit 0. Build must complete successfully.

---

### Task 19: Push to staging and verify CI

**Objective:** Push to staging branch, wait for CI to complete green.

**Steps:**

```bash
cd /Users/reidar/Projectos/Heimdall
git checkout staging
git push origin staging

# Wait for CI — poll until completed success
sleep 10
for i in $(seq 12); do
  sleep 15
  STATUS=$(gh run list --repo Reedtrullz/Heimdall --workflow ci-cd.yml --limit 1 --json status,conclusion -q '.[0].status + " " + .[0].conclusion')
  echo "$STATUS"
  [ "$STATUS" = "completed success" ] && break
done
```

**Do NOT proceed past this task until `completed success` is confirmed.**

---

### Task 20: Deploy to staging and verify live

**Objective:** Deploy to dev.thorchain.no and curl-verify all fixed routes.

**Steps:**

```bash
cd /Users/reidar/Projectos/Heimdall
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml

# Wait 30s for deploy + health check
sleep 30

# Verify health
curl -s https://dev.thorchain.no/api/health | python3 -m json.tool

# Verify CORS is restricted (should return non-wildcard Allow-Origin)
curl -sI -H "Origin: https://evil.com" https://dev.thorchain.no/api/health 2>&1 | grep -i access-control

# Verify midgard proxy still works
curl -s -o /dev/null -w "%{http_code}" https://dev.thorchain.no/api/midgard/v2/health
# Expected: 200

# Verify thorchain proxy still works
curl -s -o /dev/null -w "%{http_code}" https://dev.thorchain.no/api/thorchain/thorchain/nodes
# Expected: 200

# Verify address route
curl -s -o /dev/null -w "%{http_code}" "https://dev.thorchain.no/api/address/thor158qequwhnggm4ch4psv55yqpxsugf67n62dy2"
# Expected: 200
```

All curl responses must return 200. CORS header must NOT be `*` when origin is evil.com.

---

## EXECUTION ORDER

```
Phase 1 (parallel-safe):
  Task 1-6 (any order) → security fixes
  Task 7 → ansible fix
  Task 8 → CI fix
  Task 9 → next.config.ts standalone

Phase 2:
  Task 10 → .dockerignore (independent)
  Task 11 → Dockerfile (needs Task 9)
  Task 12 → CI publish job (needs 9, 10, 11)
  Task 13 → layout cleanup (independent)

Phase 3:
  Task 14-17 (any order) → code fixes

Phase 4 (SEQUENTIAL, DO NOT SKIP):
  Task 18 → build+typecheck+test locally
  Task 19 → push to staging, WAIT for CI green
  Task 20 → deploy to staging, curl-verify all routes
```

## COMMIT SUMMARY (20 commits expected)

```
fix: tighten CORS on coingecko proxy
fix: tighten CORS on address route
fix: tighten CORS on pools route
fix: tighten CORS on tax-report route + sanitize errors
fix: tighten CORS on health route + replace uptime
fix: validate x-forwarded-for for rate limit IP spoofing
fix: ansible rollback healthcheck escape
fix: opencode checkout@v6 → v4
feat: enable standalone output
feat: add .dockerignore
feat: add multi-stage Dockerfile
feat: add Docker publish to CI
fix: remove debug log and TEST from layout
fix: 8 TypeScript test errors
fix: replace fragile string-based APY detection
fix: parseFloat → runeToNumber in hooks
fix: parseFloat → runeToNumber in transaction history
[verification] full build + typecheck + test
[verification] push to staging + CI green
[verification] deploy to staging + curl verify
```
