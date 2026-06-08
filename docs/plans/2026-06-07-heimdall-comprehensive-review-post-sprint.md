# Heimdall comprehensive review — 07-06-2026

Repo: `/Users/reidar/Projectos/Heimdall`, branch `master` HEAD `191f6b32153803d0f35e00ee134852b8f1b7aaad`.
Baseline: post trust sprint A-003..A-062, live at `https://bond.thorchain.no` (`sha-191f6b3`).
Size: 28,631 lines TS/TSX across 222 files, 56 unit tests, 12 Playwright specs, coverage 37.6% lines / 31.6% branches.

## Scorecard

| Area | Verdict |
|---|---|
| Project shape / docs | 🟡 A- runbook and AGENTS.md are strong, but 11 stale worktrees, .sisyphus evidence dirs in repo, no `not-found`/`error`/`loading`/sitemap/robots, `docs/archive` still has 1.4 KB stale .DS_Store |
| API proxy + validation | 🟢 strong — per-path allowlists, schema validation, rate limiting, structured errors |
| Security headers / CORS | 🟡 proxy CORS good; Caddy is a bare reverse proxy with zero response headers; `cors.ts` `Access-Control-Allow-Origin` is hardcoded fallback to `https://thorchain.no` when origin absent |
| Rate limiting | 🟡 in-memory only, not durable, single-process; `getClientIp` trusts forwarding headers without a trusted proxy contract — works in front of Caddy only because Caddy is local |
| AuthN / AuthZ | 🟡 no auth anywhere — by design? or gap? Anyone can query `/api/address/[address]` for any THORChain address; no way to differentiate "self" from "third party" |
| Mock data hygiene | 🟢 gated by `NEXT_PUBLIC_USE_MOCK_DATA === 'true'`, disabled in `NODE_ENV === 'test'`, production default `false`. But `use-all-nodes` / `use-bond-positions` / `use-rune-price` / `use-earnings` all import mock-data; risk that a stray `NEXT_PUBLIC_USE_MOCK_DATA=true` env (e.g., Vercel preview) silently turns production into fake data — needs a CI check |
| Financial correctness | 🟡 mostly sound after A-001/A-002; remaining issues: `pools/[pool]/route.ts:78` returns `totalLiquidityFeesRune` of *first pool* mislabeled as `totalPooledRune`; `tax-export.ts` requires CoinAPI but no fallback when key missing (returns empty) — at least the UI is gated, but route doesn't surface this |
| RUNE math / BigInt handling | 🟢 uses BigInt for ledger math, document precision loss in `rawRuneToDisplayNumber`; display-only with documented deprecation `runeToNumber` |
| BOND memo / signing | 🟢 after A-001 |
| LP "position snapshot" honesty | 🟢 after A-003..A-062 |
| Frontend UX / a11y | 🟡 most chart hidden tables, label/aria, focus dialog added; missing: `error.tsx` (page), `not-found.tsx`, `loading.tsx`, `global-error.tsx`, skip-link to main, prefers-reduced-motion handling |
| Frontend a11y | 🟡 `dashboard-shell.tsx` uses `interval` for `setNow` — no cleanup consideration if component unmounts; `dashboard-shell.tsx:73` already returns `clearInterval`, OK. But no `prefers-reduced-motion`; subagent review fix `aria-hidden={!isExpanded}` good |
| Tests | 🟡 56 unit files but 37.6% line coverage is low for a financial app; 12 E2E specs cover main flows but no test for `tax-report` route error responses, no test for `pools/[pool]` 5xx upstream, no test for `address/[address]` against malformed address (only the typecheck covers) |
| CI / CD | 🟡 runs only 1 OS (no matrix), no Snyk/SBOM, no secret scan; `Build & publish image` triggers on `master` push, fine; `force_source: yes` on image pull good |
| Dependency hygiene | 🟡 13 pre-existing Dependabot vulnerabilities (7 high, 4 moderate, 2 low) on default branch — unchanged by this work, but no Dependabot auto-PR pipeline; no Renovate |
| Sitemap / SEO | 🔴 no `sitemap.xml`, no `robots.txt`, no `manifest.webmanifest` (PWA). For a `Learn` site this is a real SEO loss |
| A11y basics missing | 🔴 no skip-link to main content, no `prefers-reduced-motion` |
| Custom error/404 | 🔴 no `app/not-found.tsx`, no `app/error.tsx`, no `app/global-error.tsx`, no `app/dashboard/loading.tsx` (per-route skeleton) |
| Telemetry / observability | 🔴 no client analytics, no error reporting, no perf metrics (no Vercel analytics, no Sentry) — fine if intentional, but undocumented |
| Mock data CI guard | 🟡 no CI check that `NEXT_PUBLIC_USE_MOCK_DATA !== 'true'` in build args |
| Worktree hygiene | 🔴 11 stale worktrees from A-003..A-062 sprint; 1 from prior remediation sprint |
| AGENTS.md staleness | 🟡 `src/lib/transactions/AGENTS.md` says `bond.ts (310 lines)` but it's 337. `bond.ts` was extended by A-001 |
| Stale `.sisyphus/evidence/` | 🟡 committed to repo, 53 evidence files. Should live outside repo, or in `docs/` with note that it's machine-generated and freeze-frozen |
| `deep-research-report.md` (608 lines) | 🟡 committed but never cited from README/AGENTS; also probably stale |
| `cors.ts` CORS allow-origin fallback | 🟡 when origin is not in allowlist, returns `'https://thorchain.no'` rather than `'null'`. This is intentional but a security smell — tools like curl that send no Origin will get the canonical origin; should probably be `'null'` for missing/malformed Origin |
| `bifrost-status.tsx` | 🟢 small, focused, live status; AGENTS.md mentions it as "Bifrost bridge status" but file is just showing Bifrost data plane status, not bridge |
| `address/[address]/route.ts:78` | 🟡 `parsedActions` `pools` is the *action's* `pools` array (assets touched) — could confuse consumers; should rename |
| `learn/[slug]/page.tsx` | 🟡 inline `renderInlineMarkdown` regex — fine for now, but `articles` is empty map? Need to check what articles actually render. No content authoring flow |
| `data/changelogs.ts` (1385 lines) | 🟡 hand-authored data file. No way to refresh. Live TCC/TCU changelog scrape would be more accurate but needs CI + dedup |
| `use-changelogs.ts` (122 lines) | 🟡 thin shim over the static data; if real data pipeline ships, this hook signature should stay stable |
| `tax-export.ts:493` | 🟢 FIFO bond cost basis implemented; LP income uses `LP_CURRENT_POSITION_ESTIMATE_NOTE` to make the limitation explicit; warnings surfaced via `X-Heimdall-Tax-Warnings` header |
| `use-lp-positions.ts:495` | 🟡 495 lines, multiple in-file caches, complex error states. Candidate for split |
| `bond.ts:337` | 🟡 337 lines with 14 functions; could split into `bond-memo.ts` (pure) + `bond-signing.ts` (wallet) |
| `dashboard/risk/page.tsx:530` | 🟡 530 lines, second largest page; needs split |
| `next.config.ts` | 🟡 `turbopack.root: __dirname` is fine, but `images: { unoptimized: true }` means no Lighthouse score for images — fine since there are no images |
| Dockerfile | 🟢 after prior sprint; non-root, standalone, glibc, native prebuilts installed |
| Caddyfile | 🟡 3 lines, no security headers, no HSTS, no X-Content-Type-Options, no CSP. Next.js adds HSTS for non-API, but Caddy should layer for belt-and-braces |
| `.env.example` | 🟢 documents contract, no secrets, `COINAPI_KEY` blank by default |
| `inventory/hosts.yml` | 🟡 SSH key path is hardcoded; `ansible-playbook` works but is fragile if `~/.ssh/id_rsa_racknerd` is rotated. Should reference vault variable or `ansible_ssh_private_key_file: "{{ vault_vps_ssh_key | default("~/.ssh/id_rsa_racknerd") }}"` |
| `ansible-playbook.yml` | 🟢 immutable tag enforced, health check wait, rollback on failure |
| `docs/plans/2026-05-24-audit-critical-fixes.md` (24 KB) | 🟡 living doc, but no `## Done`/`## Status` header; should mark which items are done vs carryover |
| `playwright.config.ts` | 🟡 1 worker in CI, fine; 5 in local; reuse existing server only with `PLAYWRIGHT_REUSE_SERVER=true`; not configured in CI |
| `tsconfig.json` | 🟢 13-line clean config, path alias `@/*` |
| `coverage/` | 🟡 generated, but `coverage-summary.json` is 50 KB, `coverage/lcov.info` is in repo? need to check — could be bloating the repo |

## Gaps & Issues (prioritized)

### 🔴 Blockers (must address)

1. **No `not-found.tsx`, `error.tsx`, `global-error.tsx`, or `loading.tsx`** — Next.js will use the default error screen for client crashes and 404 page is bare. **File**: `src/app/{,dashboard,learn}/`. **Fix**: add at minimum `src/app/error.tsx`, `src/app/dashboard/error.tsx`, `src/app/dashboard/loading.tsx`, `src/app/not-found.tsx`.
2. **No SEO fundamentals** — `sitemap.xml`, `robots.txt`, `manifest.webmanifest` all missing. The `/learn` section is content marketing and benefits massively from search indexing. **Fix**: add `src/app/sitemap.ts` and `src/app/robots.ts` using `MetadataRoute`. Add `app/manifest.ts` for PWA.
3. **Caddy has no security response headers** — relies on Next.js for HSTS (only added to non-`/api` paths via `next.config.ts`). All `/api/*` and any response from Caddy without Next's middleware gets no headers. **Fix**: add Caddyfile snippet:
   ```
   header Strict-Transport-Security "max-age=63072000; includeSubDomains"
   header X-Content-Type-Options "nosniff"
   header Referrer-Policy "strict-origin-when-cross-origin"
   ```
4. **Stale worktrees polluting the worktree list** — 11 from the A-003..A-062 sprint, 1 from prior remediation sprint. **Fix**: `git worktree remove --force` for each, then `git worktree prune`.
5. **No `prefers-reduced-motion`** — accessibility gap. **Fix**: wrap `setInterval` ticks in shell, `transition-all` Tailwind classes, `animate-pulse` skeletons with `motion-safe:animate-pulse`.

### 🟡 Important

6. **Pools route returns wrong field**: `src/app/api/pools/[pool]/route.ts:78` — `totalPooledRune: earnings.meta.pools.length > 0 ? earnings.meta.pools[0].totalLiquidityFeesRune : '0'` returns first pool's *liquidity fees*, not total pooled RUNE. **Fix**: return network-level `network.totalPooledRune` from upstream or use `getNetwork()`.
7. **Mock data fall-back risks in CI/build** — `use-all-nodes` etc. silently use mock when `NEXT_PUBLIC_USE_MOCK_DATA === 'true'`. CI should fail the build if this env is set during a production build. **Fix**: add assertion in `ci.yml` build job: `test "$NEXT_PUBLIC_USE_MOCK_DATA" != "true" || (echo 'mock data must be off'; exit 1)`.
8. **No auth = no ability to differentiate "self" vs "third party"** — anyone can hit `/api/address/[address]`. This is by design for a public read-only explorer, but the AGENTS.md does not document this as intentional. **Fix**: add `## Public read-only API` section to AGENTS.md or implement optional per-user auth if multi-tenant is a future plan.
9. **Coverage 37.6% lines** — too low for a financial app. **Fix**: identify the largest untested files (`use-lp-positions.ts`, `use-earnings.ts`, `dashboard/risk/page.tsx`, `bond.ts`) and add tests.
10. **13 Dependabot vulnerabilities on default branch** — no auto-PR pipeline. **Fix**: enable Dependabot security updates via `.github/dependabot.yml`, or add Renovate.
11. **`docs/archive/.DS_Store`** — should not be in repo. **Fix**: `git rm --cached docs/archive/.DS_Store`, add to `.gitignore`.
12. **`.sisyphus/` in repo** — 53 evidence files committed. **Fix**: move outside repo, or add `.sisyphus/` to `.gitignore` (evidence shouldn't be source).
13. **`deep-research-report.md` (608 lines) committed but uncited** — appears to be a one-off research artifact. **Fix**: archive to `docs/archive/`, link from one place, or delete.
14. **`use-lp-positions.ts:495` and `dashboard/risk/page.tsx:530` are too large** — split refactor. **Fix**: extract pure functions to `lib/utils/lp-analytics.ts`; split `risk/page.tsx` into widgets.
15. **AGENTS.md stale on `bond.ts` line count** — `src/lib/transactions/AGENTS.md` says 310, actual 337. **Fix**: update or remove the line count.
16. **No skip-link to main content** — common a11y pattern. **Fix**: add `<a href="#main" className="sr-only focus:not-sr-only ...">Skip to main content</a>` in root layout.
17. **`cors.ts:29` hardcoded fallback origin** — when origin absent, returns `'https://thorchain.no'`. CORS spec says response without `Origin` is fine. Better fallback is `'null'`. **Fix**: change fallback to `*` (read-only public API) or `'null'`.

### 🟢 Nice to have

18. **`address/[address]/route.ts:78` — `parsedActions` should rename `pools` to `affectedPools`** to avoid confusion with the LP pool concept.
19. **`learn/[slug]/page.tsx`** — `articles` is an in-memory map. Add MDX support or a content directory.
20. **No `next/script` analytics hooks** — fine if intentional, document in AGENTS.md.
21. **No `playwright/.last-run.json` gitignored** — check.
22. **Caddyfile is 3 lines** — could include `encode zstd gzip`, `header -Server`, log format directives, ACME storage config.
23. **`inventory/hosts.yml` hardcodes SSH key** — move to vault.
24. **`vitest.config.ts` has custom Vite `optimizeDeps.exclude: ['@img/sharp-wasm32']`** — fine, but no comment why.

## Files Changed (since 191f6b3)

None — this is a review.

## Recommendation

None of the blockers are likely to cause user-facing harm today, but together they make the codebase fragile for a financial-grade project:

- **Most urgent**: error/not-found pages, Caddy security headers, sitemap/robots (hurts discoverability for the `Learn` content), stale worktrees, mock-data CI guard.
- **Most strategic**: lift test coverage from 37.6% to 60%+, document auth model (or ship it), split the two largest files.
- **Quick wins**: AGENTS.md update, mock data CI guard, skip-link, prefers-reduced-motion, Dependabot auto-update.

The trust sprint A-003..A-062 work is **solid** — proxy validation, rate limiting, CORS, financial correctness, a11y, test gates, and CI/CD are all in good shape. The remaining gaps are mostly about project plumbing (worktrees, AGENTS, coverage) and missing standard app surfaces (sitemap, 404, error pages) rather than correctness.
