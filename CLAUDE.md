# CLAUDE.md — Heimdall Project Context

> **AI agent reading this:** before any non-trivial change, run `npm test` and
> `npm run build` locally. CI is the source of truth — match it exactly.

## Project Overview
Heimdall is a professional investment command center for THORChain bond
providers. Live at https://bond.thorchain.no.

**Canonical status:** `Reedtrullz/Heimdall` at `/Users/reidar/Projectos/Heimdall` is the canonical THORChain dashboard. The older `THORNode Watcher` / BondTrack checkout is archive-only and should only be read for historical QA/audit artifacts.

## Tech Stack
- **Framework:** Next.js 16.2.7 (App Router, Turbopack, `output: 'standalone'`)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4 (lightningcss / @tailwindcss/oxide native deps)
- **Data:** SWR
- **Charts:** Recharts
- **Tests:** Vitest (unit) + Playwright (E2E)
- **Container:** Single multi-stage `Dockerfile` (Node 22 slim, standalone output)
- **Deploy:** Ansible → VPS, Docker, Caddy reverse proxy
- **Secrets:** Ansible Vault (`group_vars/vps/vault.yml`)

## Repo Layout (top-level)
```
.github/workflows/ci.yml      Single CI workflow (test, build, e2e, publish)
.github/workflows/opencode.yml OpenCode auto-PR helper (unrelated)
Dockerfile                    Canonical multi-stage build
.dockerignore                 Aggressive — only ships what runtime needs
compose.production.yml        VPS docker compose
ansible-playbook.yml          Heimdall deploy
inventory/, group_vars/       Ansible config + vault
src/                          Application code
e2e/                          Playwright specs
docs/                         Living docs
docs/archive/                 Historical audits, learnings (read-only)
```

## Development
```bash
nvm use                       # picks up .nvmrc (Node 22)
npm install
npm run dev                   # http://localhost:3000
npm test                      # vitest run
npm run e2e                   # playwright (needs dev server)
npm run build                 # production build
```

## CI (single workflow: `.github/workflows/ci.yml`)
Triggers on push/PR to `master` or `staging`.

Jobs (run in parallel):
1. **test** — `npm ci`, `npm run lint -- --max-warnings=0`, `npm test`, `npm run test:coverage`
2. **build** — `npm run build` (verifies Next.js build outside Docker)
3. **e2e** — `npm run e2e` with Playwright

Then **docker-build** runs a non-pushing `Dockerfile` build for PR, staging,
and other non-`master` refs. **publish** runs only on `push` to `master`, after
all three pass:
- builds the canonical `Dockerfile`
- publishes GHCR tags, including immutable `sha-<short>` tags
- uses Buildx with GitHub Actions cache (`cache-from`/`cache-to: type=gha`)

Keep GitHub and Docker JavaScript actions on Node 24-capable majors:
`actions/checkout@v6`, `actions/setup-node@v6`, `actions/upload-artifact@v7`,
`docker/setup-buildx-action@v4`, `docker/build-push-action@v7`,
`docker/login-action@v4`, and `docker/metadata-action@v6`. Do not downgrade
them to older Node 20-backed majors to silence a workflow issue; fetch the run
logs and fix the actual failure.

There is no separate "Publish" workflow and no cross-workflow `workflow_run`
trigger — that pattern caused two-named-workflow races in the past.

## Docker
Single `Dockerfile`, three stages:
1. `deps` — `npm ci --include=optional` + force-installs the linux/x64
   prebuilt binaries Tailwind v4 / Turbopack need (`lightningcss-linux-x64-gnu`,
   `@tailwindcss/oxide-linux-x64-gnu`). Lockfile generated on macOS/arm64
   sometimes omits these.
2. `builder` — runs `npm run build`. Build args = `NEXT_PUBLIC_*` and `VERSION`.
3. `runner` — copies only `.next/standalone`, `.next/static`, `public/`. Runs
   as non-root `node`. Includes `HEALTHCHECK` hitting `/api/health`.

Local build:
```bash
docker build -t heimdall .
docker run --rm -p 3000:3000 heimdall
```

## Deployment
```bash
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml
```
Flow: local push → CI builds & publishes to GHCR → run Ansible from local →
VPS pulls image → swaps container → health-checks `/api/health` → rolls back
on failure. **Never `git pull` on the VPS.**

Ansible defaults to `ghcr.io/reedtrullz/heimdall:sha-<local short sha>` or an
explicit `IMAGE_TAG`. Runtime `VERSION` must equal that immutable deployed tag;
verify by comparing the exact SHA tag with `/api/health` after a deploy. Do not
use mutable `:latest` as the deploy identity.

## Environment Variables
`NEXT_PUBLIC_*` vars are baked into the build at Docker build time (they need
to be present in the client bundle). They're set as `build-args` in the CI
publish step. Runtime-only vars (`PORT`, `HOSTNAME`, `NODE_ENV`, `VERSION`)
are set in Ansible; the manual `compose.production.yml` fallback requires
`IMAGE_SHA=<exact-short-sha>` and derives `VERSION=sha-$IMAGE_SHA`. See
`.env.example` for local, non-secret documentation of public and server-side
variables.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_THORNODE_API` | THORNode API |
| `NEXT_PUBLIC_MIDGARD_API` | Midgard API |
| `NEXT_PUBLIC_COINGECKO_API` | CoinGecko API |
| `NEXT_PUBLIC_THORCHAIN_NETWORK` | `mainnet` / `stagenet` |
| `VERSION` | Runtime image tag, set to the immutable deployed `sha-<short>` tag |

## Health Endpoint
`GET /api/health` → `{ "status": "healthy", "timestamp": "...", "version": "..." }`

Version priority: `process.env.VERSION` → `"unknown"`.

## Conventions
- Pages using `useSearchParams` must be `'use client'` and wrapped in `<Suspense>`.
- API proxy routes: `export const dynamic = 'force-dynamic'`.
- Address persistence: unified `BONDTRACK_ADDRESS` localStorage key (legacy name; do not rename).
- Component-local storage keys are `heimdall-*`.
- Single-Node First UI; prefer contextual empty states over UI voids.

## Don't
- Don't add a second workflow named `CI/CD Pipeline`.
- Don't use `workflow_run:` triggers to chain build → publish — use `needs:` inside one workflow.
- Don't introduce `Dockerfile.v2`, `Dockerfile-simple`, etc. as cache-bust hacks. If Docker cache misbehaves, prefer `--no-cache` on the action or a fresh GHA cache key.
- Don't switch the base image to Alpine (musl breaks `lightningcss` and `@tailwindcss/oxide` prebuilts).
- Don't commit secrets, `dogfood-output/`, or scratch `.md` reports to root — use `docs/archive/`.
- Don't bake stale `gateway.liquify.com/chain/thorchain_mainnet` URLs as build args. The correct paths are `thorchain_api` (THORNode) and `thorchain_midgard` (Midgard) — they're already set in `ci.yml` and `ansible-playbook.yml`. The `_mainnet` path returns HTTP 500.
- Don't change the `/api/thorchain/[...path]` proxy's leading-segment normalisation. The frontend client calls `fetchThornode('/thorchain/nodes')` so the browser hits `/api/thorchain/thorchain/nodes`; the proxy strips the duplicate `thorchain/` segment before its allowlist (`/^nodes$/`, `/^network$/`, …) runs, and `THORNODE_API_URL` already ends in `/thorchain`. Removing that step makes every request 403 and the "THORNode API is temporarily unavailable" banner reappears.
- Don't drop `force_source: yes` from the docker_image task in `ansible-playbook.yml` — it verifies the selected immutable tag is pulled instead of trusting a cached local image.

## Historical reports
See `docs/archive/` for prior audits (LP, UI/UX, etc.) and `learnings.md`.
