# Heimdall 🛡️

A professional investment command center for THORChain bond providers — monitor bonded RUNE, node health, rewards, risk metrics, and LP positions with institutional-grade precision.

> **Canonical project:** This repository (`Reedtrullz/Heimdall`, local path `/Users/reidar/Projectos/Heimdall`) is the canonical THORChain dashboard. Do not revive or implement new work in the older `THORNode Watcher` / BondTrack checkout; keep it archive-only for historical QA/audit artifacts.

![Next.js](https://img.shields.io/badge/Next.js-16.2.7-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-cyan)
![License](https://img.shields.io/badge/License-MIT-green)
![CI](https://github.com/Reedtrullz/Heimdall/actions/workflows/ci.yml/badge.svg)
![Deployment](https://img.shields.io/badge/Deployment-Ansible-blue)
![Health](https://img.shields.io/badge/Health-✅-green)

## Features

### 📊 Portfolio Overview
- Total bonded RUNE tracking with USD valuation
- Real-time RUNE price (USD)
- Weighted APY calculations with benchmark comparison
- Portfolio health scoring (A-F grade)
- Net earnings transparency (gross vs net after fees)

### ⛓️ Node Health
- Active/Standby/Ready status monitoring
- Bond amount and rank tracking
- Slash points and jail status
- Churn-out risk assessment
- Node operator fee impact analysis

### 💰 Rewards & Earnings
- P&L dashboard with initial bond tracking
- Fee impact breakdown (leakage analysis)
- Auto-compound projections
- RUNE price chart with multiple timeframes
- Yield benchmarking (User vs Network vs Top Nodes)

### ⚠️ Risk Monitoring
- Slash monitor with severity levels
- Network security metrics (TVL, bond-to-pool ratio)
- Unbond window tracker
- Churn-out risk indicators
- Portfolio health score with actionable insights

### 🔧 Transaction Tools
- BOND/UNBOND memo composer
- Transaction history from Midgard using `type=` filter
- Wallet connection (Keplr, XDEFI, Vultisig)
- Watchlist management

### 🌊 LP Status Trust Rebuild
- USD-based LP portfolio hero (`Total LP Value`, `Net P/L`, `Positions`, `Last Activity`)
- Investor-facing LP cards and table rows with real asset symbols (`ATOM`, `DOGE`, `BCH`)
- Honest `current-only` fallback when historical entry pricing cannot be proven
- Pricing-confidence banner instead of fake `0.00%` LP performance metrics
- Truthful missing-address state on `/dashboard/lp`

## Tech Stack

- **Framework**: Next.js 16.2.7 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Data Fetching**: SWR
- **Charts**: Recharts (with ResponsiveContainer fixes for clean rendering)
- **Testing**: Vitest (190 tests / 39 files) + Playwright (62 E2E tests), all passing ✅
- **Icons**: lucide-react
- **Deployment**: Ansible → VPS (GHCR, Docker, Caddy reverse proxy)
- **Security**: Ansible Vault for sensitive variables

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm test

# Run E2E tests (requires dev server running)
npm run e2e

# Run E2E tests with UI
npm run e2e:ui

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

Copy `.env.example` to `.env.local` when you need local overrides. Do not put
secrets in `NEXT_PUBLIC_*` variables; they are bundled into client-side code.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_THORNODE_API` | THORNode API endpoint | `https://gateway.liquify.com/chain/thorchain_api` |
| `NEXT_PUBLIC_MIDGARD_API` | Midgard API endpoint | `https://gateway.liquify.com/chain/thorchain_midgard` |
| `NEXT_PUBLIC_MIDGARD_FALLBACK` | Secondary Midgard fallback | `https://midgard.thorchain.network` |
| `NEXT_PUBLIC_THORCHAIN_RPC` | THORChain RPC | `https://rpc.thorchain.info` |
| `VERSION` | Runtime app version; Ansible sets this to the immutable deployed image tag | `sha-<short>` |

## THORChain Data Conventions

Before changing API clients, live-data charts, RUNE/APY math, or LP valuation copy, read [docs/thorchain-data-conventions.md](docs/thorchain-data-conventions.md). It is shared with tcwiki and defines endpoint routing, `1e8` RUNE units, APY decimal-vs-percent boundaries, and `current-only` LP valuation provenance.

## Deployment

Heimdall uses a **push-based deployment model** from your local machine to the VPS via Ansible.

### Architecture
```
Developer Push → GitHub → CI workflow (test, build, e2e, publish)
                       ↓ (publish job runs after the others pass)
                  GHCR (ghcr.io/reedtrullz/heimdall:sha-<short>)
                       ↓
                  Local Machine (ansible-playbook) 
                       ↓
                  VPS (198.23.137.16) 
                       ↓
                  Docker Container (port 3001) 
                       ↓
                  Caddy Reverse Proxy (bond.thorchain.no)
```

### Quick Deploy
```bash
# 1. Ensure Ansible is installed (via Homebrew)
brew install ansible

# 2. Run deployment playbook
cd /Users/reidar/Projectos/Heimdall
ansible-playbook -i inventory/hosts.yml ansible-playbook.yml
```

By default the playbook deploys
`ghcr.io/reedtrullz/heimdall:sha-<local short sha>` and sets runtime `VERSION`
to the same immutable tag. Override with `IMAGE_TAG=sha-<exact-short-sha>` when
deploying a specific published image; the playbook rejects mutable deploy tags
such as `latest`.

`compose.production.yml` is only a manual/diagnostic path and also refuses to
default to a mutable image: run it with `IMAGE_SHA=<exact-short-sha>` so the
image and runtime `VERSION` both resolve to `sha-$IMAGE_SHA`.

### Features
- **Health Check**: Waits for `/api/health` to return `{"status":"healthy"}`
- **Rollback**: Automatically reverts to the previous image ID/digest/reference on health check failure
- **Vault**: Sensitive vars (e.g. CoinAPI key) stored in `group_vars/vps/vault.yml` (encrypted)
See [DEPLOYMENT.md](DEPLOYMENT.md) for full details. The Inebotten
Discord bot is a separate project — see
[Reedtrullz/inebotten-discord](https://github.com/Reedtrullz/inebotten-discord)
(its `deploy/` directory contains its own playbook).

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # Server-side API proxy routes (bypass CORS)
│   ├── dashboard/          # Dashboard pages (portfolio, nodes, rewards, risk, transactions, lp)
│   ├── layout.tsx          # Root layout with ThemeProvider
│   └── page.tsx            # Landing page
├── components/
│   ├── dashboard/          # 18+ domain components (charts, tables, monitors)
│   ├── layout/             # sidebar, dashboard-shell, theme-toggle
│   ├── wallet/             # wallet-connect, transaction-review
│   ├── alerts/             # alert-toast
│   ├── shared/             # address-input, status-badge, export-button
│   └── ui/                 # shadcn-style primitives
└── lib/
    ├── api/                # THORNode + Midgard API clients
    ├── hooks/              # SWR data hooks
    ├── transactions/       # BOND/UNBOND signing
    ├── types/              # TypeScript interfaces
    └── utils/              # formatters, calculations, health scoring
```

## API CORS Workaround

External Midgard/THORNode APIs block browser requests due to CORS. The app uses server-side proxy routes:

- `/api/midgard/*` → proxies to `gateway.liquify.com/chain/thorchain_midgard` (falls back to `midgard.thorchain.network`)
- `/api/thorchain/*` → proxies to `gateway.liquify.com/chain/thorchain_api/thorchain`

All API calls from frontend go through these proxies, bypassing browser CORS restrictions.

> The legacy `gateway.liquify.com/chain/thorchain_mainnet` path returns HTTP 500 and is not a valid endpoint. Use `thorchain_api` and `thorchain_midgard`.

> The `/api/thorchain/*` proxy normalises a leading `thorchain/` segment in the request path before applying its allowlist (see `src/app/api/thorchain/[...path]/route.ts`). The frontend client adds that prefix, and `THORNODE_API_URL` already ends in `/thorchain` — don't remove the normalisation.

## Supported Wallets

- **Keplr Wallet** — Cosmos-based wallet with THORChain support
- **XDEFI Wallet** — Cross-chain desktop wallet
- **Vultisig** — Multi-chain hardware wallet

## E2E Testing

We use Playwright for end-to-end testing. Tests are in the `e2e/` directory.

```bash
# Run all E2E tests
npm run e2e

# Run with UI mode (debugging)
npm run e2e:ui

# Run specific test file
npx playwright test e2e/portfolio.spec.ts

# View test report
npx playwright show-report
```

### E2E Best Practices (from CI fixes)
- Use `.first()` when text locators match multiple elements
- Use `{ exact: true }` for heading matches to avoid partial matches
- Mock API endpoints in `test.beforeEach()` for predictable tests
- Check page headings with `getByRole('heading', { name: ... })` 
- Avoid fragile XPath locators; use semantic text/role locators
- Handle missing elements gracefully (e.g., charts with `minWidth={0} minHeight={0}`)
## CI / CD

The `master` branch uses a single GitHub Actions workflow at
`.github/workflows/ci.yml`:

- **test** — Vitest unit tests + coverage
- **build** — Next.js production build
- **e2e** — Playwright E2E tests
- **docker-build** — non-pushing Docker build verification for PR, staging, and other non-`master` refs
- **publish** — runs only on `push` to `master`, after the three above pass.
  Builds the canonical `Dockerfile` with Buildx and publishes the GHCR
  `sha-<short>` tag.

The workflow keeps GitHub first-party JavaScript actions on Node 24-capable
majors (`actions/checkout@v6`, `actions/setup-node@v6`,
`actions/upload-artifact@v7`) so CI does not regress to Node.js 20 deprecation
warnings.

Deploy verification should compare the exact immutable SHA tag in GHCR,
Ansible's selected `IMAGE_TAG`, `docker ps --format '{{.Image}}'`, and
`/api/health`'s `version`. Do not treat this documentation as a production
deployment claim.

There is no separate publish workflow and no cross-workflow `workflow_run`
trigger. See `CLAUDE.md` and `AGENTS.md` for the rationale.

## Known Issues (Live QA)

The deployed site at `https://bond.thorchain.no` is the source of truth for user-facing QA. As of the latest live audit, these non-wallet issues are confirmed and under remediation:

- THORName reverse lookup can return repeated 502s on dashboard routes
- The LP Status route now degrades honestly when member or pricing history data is unavailable; remaining live caveat is upstream Midgard pool-history `502` responses that force `current-only` valuation
- The notification prompt can block header controls and its `Enable` CTA does not visibly resolve the prompt
- Changelog year navigation works, but changelog search, filters, and entry buttons do not behave correctly on the deployed dev site
- Overview quick-action buttons do not preserve the intended transaction mode
- The Transactions page still needs clearer UNBOND-mode behavior and visible copy-action feedback
- Some Rewards page controls have dead or unclear deployed behavior, including the `30D` label oddity

Fixes are considered complete only after they are re-tested on `https://dev.thorchain.no`, not just locally.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests: `npm test` and `npm run e2e`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Submit a pull request

## License

MIT
