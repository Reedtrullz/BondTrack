<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BondTrack — Knowledge Base

**Stack**: Next.js 16.2.2 (App Router, Turbopack) · TypeScript · Tailwind v4 · SWR · Recharts · lucide-react
**Purpose**: Professional Investment Command Center for THORChain bond providers to monitor and optimize bonded RUNE, node health, rewards, and risk.
**Note**: Renamed to "BondTrack" but directory remains `thornode-watcher/`

## DEPLOYMENT

**Vercel Project**: reedtrullzs-projects/bond-track
**Project ID**: prj_8u5egmdS0r5dm5Ssz07QE8qgbqnU
**Production URL**: https://thorchain.no
**Preview URL**: https://bond-track-*.vercel.app

**Domains configured**:
- thorchain.no (custom, verified)
- bond-track-pi.vercel.app (auto-created)
- dev.thorchain.no (Staging/Development)

**Observability**: No drains (Hobby plan), no analytics/speed insights installed

**Deployment method**: GitHub integration (auto-deploy on push to master)

## STRUCTURE
```
thornode-watcher/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Landing — address input
│   │   ├── layout.tsx          # Root — ThemeProvider wrapper
│   │   └── dashboard/          # All dashboard pages (requires ?address= param)
│   │       ├── layout.tsx      # Suspense + DashboardShell wrapper
│   │       ├── page.tsx        # Redirects to /dashboard/overview (passes address)
│   │       ├── overview/       # Portfolio summary + position table
│   │       ├── nodes/          # Node health detail
│   │       ├── rewards/        # Earnings, APY, PnL, fee impact, auto-compound
│   │       ├── risk/           # Slash monitor, churn-out risk, unbond tracker
│   │       └── transactions/   # BOND/UNBOND composer, tx history, watchlist, recent addresses
│   ├── components/
│   │   ├── dashboard/          # 18 domain components (charts, tables, monitors, network comparison)
│   │   ├── layout/             # sidebar, dashboard-shell, theme-toggle
│   │   ├── wallet/             # wallet-connect, transaction-preview
│   │   ├── alerts/             # alert-toast, alert hooks
│   │   ├── shared/             # address-input, status-badge, export-button, loading-skeleton, recent-addresses
│   │   └── ui/                 # shadcn-style primitives (button.tsx)
│   └── lib/
│       ├── api/                # THORNode + Midgard API clients (see lib/api/AGENTS.md)
│       ├── hooks/              # SWR hooks + use-wallet.ts (see lib/hooks/AGENTS.md)
│       ├── transactions/       # bond.ts — BOND/UNBOND transaction signing
│       ├── types/              # BondPosition, raw API types, wallet types
│       └── utils/              # formatters.ts (1e8 conversion), calculations.ts (APY, PnL, rank)
├── src/lib/config.ts           # ENDPOINTS (env-overridable), NETWORK constants
└── src/lib/utils.ts            # cn() utility (clsx + tailwind-merge)
```

## KEY FEATURES (Investment Command Center)

**Portfolio Intelligence**:
- Total bonded, weighted APY, position count
- **Portfolio Health Score (0-100)**: Calculated based on slash points, jail status, and churn risk.
- **Bond Optimizer**: AI-driven suggestions for re-bonding to optimize yield vs risk.
- Manual initial bond input with localStorage persistence (`pnl-dashboard.tsx`)

**Risk Defense Center**:
- **Visual Risk Heatmap**: mapping Slashes vs. Churn Risk for all positions.
- **Prescriptive Alerts**: Alerts shift from diagnostic to actionable (e.g., "Action: Reduce bond to mitigate risk").
- **Unbond Window Tracker**: Real-time countdown for the unbonding window.
- **Security Monitor**: Slash point monitoring and churn-out risk relative to the active set.

**PnL Performance Statement**:
- **Reward Velocity**: Visual flow from Gross Earnings $\rightarrow$ Fee Leakage $\rightarrow$ Net Take-Home.
- **Yield Benchmarking**: Comparison of user's weighted APY vs network averages and top-tier nodes.
- **Earnings Projections**: Dynamic short and long-term projections with auto-compounding.
- **Net Earnings Transparency**: Clear breakdown of operator fee impact on total returns.

**Strategic Control Room**:
- **Guided Bonding**: Strategic presets for common bond amounts and targets.
- **Impact Preview**: Real-time simulation of how a bond move affects Health Score and APY.
- **Integrated Workflow**: Direct "Quick Action" links from Node/Risk pages to the composer.
- **Watchlist**: Monitoring target nodes for optimal entry points.

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Add new API endpoint | `src/lib/api/thornode.ts` or `midgard.ts` |
| Add new data hook | `src/lib/hooks/` — use SWR pattern |
| Add dashboard page | `src/app/dashboard/<name>/page.tsx` — must be 'use client' if using useSearchParams |
| New chart component | `src/components/dashboard/` — use Recharts ResponsiveContainer |
| New calculation | `src/lib/utils/calculations.ts` |
| New formatter | `src/lib/utils/formatters.ts` |
| Change API URLs | `src/lib/config.ts` — env vars override defaults |
| Wallet integration | `src/lib/hooks/use-wallet.ts` + `src/lib/types/wallet.ts` |
| Transaction signing | `src/lib/transactions/bond.ts` |

## CONVENTIONS

**RUNE amounts**: All API returns are strings in 1e8 units. Use `runeToNumber()` for display, `BigInt()` for math. Never use `Number()` directly on raw amounts.

**useSearchParams**: Must be wrapped in Suspense boundary. `dashboard/layout.tsx` provides this. Pages using it must be `'use client'`.

**Address prop**: Dashboard pages get address from `useSearchParams().get('address')`. The `/dashboard` redirect passes it through.

**API client**: `src/lib/api/client.ts` provides `fetchThornode<T>()` and `fetchMidgard<T>()`. Next.js `fetch` with `next: { revalidate: 60 }` for caching.

**Endpoints**: Default to Liquify (`gateway.liquify.com`). Override via `NEXT_PUBLIC_THORNODE_API`, `NEXT_PUBLIC_MIDGARD_API`, etc.

**Dark mode**: Uses next-themes with `attribute="class"`. All components use `dark:` Tailwind variants.

**Charts**: Recharts with ResponsiveContainer. Data from Midgard history endpoints. Timestamps are nanoseconds — divide by 1e9.

## WALLET INTEGRATION

**Supported wallets**: Keplr, XDEFI, Vultisig

**Wallet detection**:
- Keplr: `window.keplr`
- XDEFI: `window.xfi?.thorchain`
- Vultisig: `window.vultisig?.thorchain` or `window.thorchain`

**Transaction signing** (`src/lib/transactions/bond.ts`):
- Keplr: Uses `@cosmjs/stargate` SigningStargateClient
- XDEFI/Vultisig: Uses `window.xfi/thorchain.request({ method: 'sendTransaction' })`
- Vultisig: Uses `window.thorchain.request({ method: 'deposit_transaction' })`

**Wallet types**: Defined in `src/lib/types/wallet.ts` — extends `Window` interface

## ANTI-PATTERNS
- Never use `Number(raw_amount)` — always `runeToNumber(raw)` or `BigInt(raw)`
- Never use `@/components/ui/button` without creating the component first
- Never use `useSearchParams()` outside Suspense boundary
- Never hardcode API URLs — use `ENDPOINTS` from config
- Never use `@ts-ignore` or `as any`
- Never modify API client files when adding UI components
- Never hardcode wallet names in UI — use WalletType enum

## RECENT CHANGES
- **Full "Investment Command Center" Overhaul**:
  - Integrated Portfolio Health Scoring (0-100) and an "Intelligence Hub" on Overview.
  - Implemented a Visual Risk Heatmap and prescriptive "Defense" alerts on Risk page.
  - Added Individual Health Grades and "Quick Action" shortcuts to the Nodes registry.
  - Created a "Reward Velocity" PnL statement with Gross $\rightarrow$ Fee $\rightarrow$ Net transparency.
  - Upgraded Transactions to a "Control Room" with guided presets and URL-driven flows.
- Fix jail detection: use Midgard `/v2/health` for current block height instead of stale node `active_block_height`
- Add `useCurrentBlockHeight` hook for real-time block height from Midgard
- Complete UI/UX overhaul with Network Comparison and Pooled Node details
- Add NetworkComparisonTable component to compare bond positions vs network averages
- Add PooledNodeDetails component showing accumulated rewards from all nodes
- Add useAllNodes, useChurnCountdown, useNetworkMetrics hooks
- Add RecentAddresses component for quick address switching
- Add thorchain.no as custom domain, deploy to Vercel
- `use-bond-positions.ts`: Added Yield Guard flag calculation, skip constants fetch when address is null
- `position-table.tsx`: Added YieldGuardBadge component with risk flags
- `risk/page.tsx`: Added YourNodesAtRisk card, improved Your All Positions section
- `rewards/page.tsx`: Fixed bond history empty states, timestamps divide by 1e9
- `pnl-dashboard.tsx`: Manual initial bond input with localStorage
- **Risk dashboard overhaul**: Refactor all components to show user's nodes only (not network-wide)
- **useNodeRankings hook**: Computes user's node rank in active set, percentile, at-risk status
- **Incentive Pendulum card**: Shows Node/LP reward split, effective security, bond-to-pool ratio
- **EarningStatusSummary**: Quick view of Active (earning) vs Standby (not earning) vs Jailed

## KNOWN ISSUES
- Bond history may show empty for addresses that should have transactions — check `getActions()` type=bond filter
- 6 pre-existing test failures in `use-watchlist.test.ts` and `use-bond-positions.test.ts`

## COMMANDS
```bash
npm run dev     # Next.js dev (Turbopack)
npm run build   # Production build + type check
npm run start   # Production server
npx tsc --noEmit  # Type check only
```
