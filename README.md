# BondTrack 🪝

A comprehensive dashboard for THORChain bond providers to monitor bonded RUNE, node health, rewards, and risk metrics.

![Next.js](https://img.shields.io/badge/Next.js-16.2.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-cyan)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### 📊 Portfolio Overview
- Total bonded RUNE tracking
- Real-time RUNE price (USD)
- Weighted APY calculations
- Position count and distribution

### ⛓️ Node Health
- Active/Standby/Ready status monitoring
- Bond amount and rank tracking
- Slash points and jail status
- Churn-out risk assessment

### 💰 Rewards & Earnings
- PnL dashboard with initial bond tracking
- Fee impact breakdown (leakage analysis)
- Auto-compound projections
- RUNE price chart with multiple timeframes

### ⚠️ Risk Monitoring
- Slash monitor with severity levels
- Network security metrics (TVL, bond-to-pool ratio)
- Unbond window tracker
- Churn-out risk indicators

### 🔧 Transaction Tools
- BOND/UNBOND memo composer
- Transaction history from Midgard using `type=` filter
- Wallet connection (Keplr, XDEFI, Vultisig)
- Watchlist management

## Tech Stack

- **Framework**: Next.js 16.2.2 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Data Fetching**: SWR
- **Charts**: Recharts
- **Testing**: Vitest + Playwright
- **Icons**: lucide-react

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run e2e tests
npm run e2e

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

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # Server-side API proxy routes (bypass CORS)
│   ├── dashboard/          # Dashboard pages (overview, nodes, rewards, risk, transactions)
│   ├── layout.tsx          # Root layout with ThemeProvider
│   └── page.tsx            # Landing page
├── components/
│   ├── dashboard/          # 18 domain components (charts, tables, monitors)
│   ├── layout/             # sidebar, dashboard-shell, theme-toggle
│   ├── wallet/             # wallet-connect, transaction-preview
│   ├── alerts/             # alert-toast
│   ├── shared/             # address-input, status-badge, export-button
│   └── ui/                 # shadcn-style primitives
└── lib/
    ├── api/                # THORNode + Midgard API clients
    ├── hooks/              # SWR data hooks
    ├── transactions/       # BOND/UNBOND signing
    ├── types/              # TypeScript interfaces
    └── utils/              # formatters, calculations
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

## API Endpoints

- **THORNode**: Nodes, Network Constants, Supply
- **Midgard**: Bonds, Earnings, History, Network, Actions (`txType` for bond/unbond/leave history)

## Current Dev QA Findings

The deployed staging/dev environment at `https://dev.thorchain.no` is the source of truth for user-facing QA. As of the latest live audit, these non-wallet issues are confirmed and under remediation:

- THORName reverse lookup can return repeated 502s on dashboard routes
- The LP Status route does not yet communicate upstream member lookup failures clearly enough
- The notification prompt can block header controls and its `Enable` CTA does not visibly resolve the prompt
- Changelog year navigation works, but changelog search, filters, and entry buttons do not behave correctly on the deployed dev site
- Overview quick-action buttons do not preserve the intended transaction mode
- The Transactions page still needs clearer UNBOND-mode behavior and visible copy-action feedback
- Some Rewards page controls have dead or unclear deployed behavior, including the `30D,` label oddity

Fixes are considered complete only after they are re-tested on `https://dev.thorchain.no`, not just locally.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT
