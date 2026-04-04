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
- Earnings history with interval filtering
- APY chart visualization
- Fee impact calculations
- Auto-compound projections
- PnL dashboard

### ⚠️ Risk Monitoring
- Slash monitor with severity levels
- Network security metrics (TVL, bond-to-pool ratio)
- Unbond window tracker
- Churn-out risk indicators

### 🔧 Transaction Tools
- BOND/UNBOND memo composer
- Transaction history from Midgard
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
| `NEXT_PUBLIC_THORNODE_API` | THORNode RPC endpoint | `gateway.liquify.com/chain/thorchain_api` |
| `NEXT_PUBLIC_MIDGARD_API` | Midgard API endpoint | `gateway.liquify.com/chain/thorchain_midgard` |
| `NEXT_PUBLIC_RPC_URL` | THORChain RPC | `https://rpc.thorchain.info` |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Dashboard pages (overview, nodes, rewards, risk, transactions)
│   ├── layout.tsx          # Root layout with ThemeProvider
│   └── page.tsx            # Landing page
├── components/
│   ├── dashboard/          # 14 domain components (charts, tables, monitors)
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

## Supported Wallets

- **Keplr Wallet** — Cosmos-based wallet with THORChain support
- **XDEFI Wallet** — Cross-chain desktop wallet
- **Vultisig** — Multi-chain hardware wallet

## API Endpoints

- **THORNode**: Nodes, Network Constants, Supply
- **Midgard**: Bonds, Earnings, History, Network, Actions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT
