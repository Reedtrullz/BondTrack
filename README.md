# Heimdall 🛡️

A professional investment command center for THORChain bond providers — monitor bonded RUNE, node health, rewards, risk metrics, and LP positions with institutional-grade precision.

![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-cyan)
![License](https://img.shields.io/badge/License-MIT-green)
![CI Status](https://github.com/Reedtrullz/Heimdall/actions/workflows/ci-cd.yml/badge.svg)
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

- **Framework**: Next.js 16.2.4 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Data Fetching**: SWR
- **Charts**: Recharts (with ResponsiveContainer fixes for clean rendering)
- **Testing**: Vitest + Playwright (167 unit tests, 34 test files, all passing ✅)
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

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_THORNODE_API` | THORNode API endpoint | `https://gateway.liquify.com/chain/thorchain_api` |
| `NEXT_PUBLIC_MIDGARD_API` | Midgard API endpoint | `https://gateway.liquify.com/chain/thorchain_midgard` |
| `NEXT_PUBLIC_MIDGARD_FALLBACK` | Secondary Midgard fallback | `https://midgard.thorchain.network` |
| `NEXT_PUBLIC_THORCHAIN_RPC` | THORChain RPC | `https://rpc.thorchain.info` |
| `VERSION` | App version (set by Ansible/GitHub SHA) | `latest` |

## Deployment

Heimdall uses a **push-based deployment model** from your local machine to the VPS via Ansible.

### Architecture
```
Developer Push → GitHub → CI/CD Pipeline (test, e2e, build) 
                       ↓ (on success)
                  docker-publish.yml 
                       ↓
                  GHCR (ghcr.io/reedtrullz/heimdall:latest)
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

### Features
- **Health Check**: Waits for `/api/health` to return `{"status":"healthy"}`
- **Rollback**: Automatically reverts to previous image on health check failure
- **Vault**: Sensitive vars (COINAPI_KEY, Discord tokens) stored in `group_vars/vps/vault.yml` (encrypted)
- **Inebotten**: Separate playbook for Discord bot deployment (`inebotten-playbook.yml`)

See [DEPLOYMENT.md](DEPLOYMENT.md) for full details.

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

- `/api/midgard/*` → proxies to `gateway.liquify.com` (falls back to `midgard.thorchain.network`)
- `/api/thorchain/*` → proxies to `gateway.liquify.com/chain/thorchain_api`

All API calls from frontend go through these proxies, bypassing browser CORS restrictions.

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
## CI/CD Pipeline

The `master` branch uses GitHub Actions (`.github/workflows/ci-cd.yml` + `docker-publish.yml`):

- ✅ **test** — Vitest unit tests (167 tests, 34 test files)
- ✅ **build** — Next.js production build 
- ✅ **e2e** — Playwright E2E tests 
- ✅ **docker-publish** — Build & push to GHCR (`ghcr.io/reedtrullz/heimdall:latest` + short SHA tag)
- ✅ **report-status** — Reports CI status to GitHub

All tests must pass before the Docker image is published to GHCR for Ansible deployment.

**Current Status**: ✅ All jobs passing (as of 2026-05-05)
**Live Site**: https://bond.thorchain.no (healthy, HTTP 200)

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
