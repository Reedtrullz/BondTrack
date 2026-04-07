<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# THORNode Watcher — Knowledge Base

**Stack**: Next.js 16.2.2 (App Router, Turbopack) · TypeScript · Tailwind v4 · SWR · Recharts · lucide-react
**Purpose**: Dashboard for THORChain bond providers to monitor bonded RUNE, node health, rewards, and risk.
**Note**: Renamed to "BondTrack" but directory remains `thornode-watcher/`

## DEPLOYMENT

**Vercel Project**: reedtrullzs-projects/bond-track
**Project ID**: prj_8u5egmdS0r5dm5Ssz07QE8qgbqnU
**Production URL**: https://thorchain.no
**Preview URL**: https://bond-track-*.vercel.app

**Domains configured**:
- thorchain.no (custom, verified)
- bond-track-pi.vercel.app (auto-created)

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

## KEY FEATURES (Bond Provider Focus)

**Portfolio Tracking**:
- Total bonded, weighted APY, position count
- Per-node bond amount and share percentage
- Manual initial bond input with localStorage persistence (`pnl-dashboard.tsx`)

**Yield Guard System**:
- Auto-flags nodes at risk: overbonded, highest slash, lowest bond, oldest, leaving
- Risk badges on position table (`position-table.tsx`)
- "Your Nodes at Risk" summary on Risk page

**Bond History**:
- Address-specific BOND/UNBOND transactions from Midgard `/v2/actions?type=bond`
- Cumulative bond tracking over time
- Date parsing: nanoseconds → divide by 1e9

**Risk Monitoring**:
- Your positions at risk summary
- Slash point monitoring (per your nodes)
- Churn-out risk (your ranking vs all active)
- Unbond window tracker

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
