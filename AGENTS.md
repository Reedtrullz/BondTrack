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

**Observability**: Vercel Analytics + Speed Insights installed. No log drains (Hobby plan).

**Deployment method**: GitHub integration (auto-deploy on push to master)
**CI**: GitHub Actions (`.github/workflows/test.yml`) runs test, coverage, e2e, and build on Node 22.

## LIVE DEV QA POLICY

`https://dev.thorchain.no` is the verification target for user-facing fixes. For deployed regressions, do not stop at local validation.

Required loop:
1. reproduce on `dev.thorchain.no`
2. fix locally
3. run diagnostics/tests/build
4. deploy to dev/staging
5. re-test on `dev.thorchain.no`
6. continue iterating until the confirmed bug or UX quirk is no longer reproducible

Current live QA scope is focused on non-wallet user flows first. Browser wallet connectivity can be deferred when explicitly requested.

## STRUCTURE
```
thornode-watcher/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # Server-side API proxy routes
│   │   │   ├── midgard/[...path]/route.ts  # Midgard proxy (bypasses CORS)
│   │   │   ├── thorchain/[...path]/route.ts # THORNode proxy (bypasses CORS)
│   │   │   ├── coingecko/[...path]/route.ts # CoinGecko proxy
│   │   │   ├── coinapi/rune-price/route.ts  # RUNE price endpoint
│   │   │   ├── address/[address]/route.ts   # Address aggregation
│   │   │   ├── pools/[pool]/route.ts        # Pool analytics
│   │   │   └── tax-report/route.ts          # Tax CSV export (server-side)
│   │   ├── page.tsx            # Landing — address input
│   │   ├── layout.tsx          # Root — ThemeProvider wrapper
│   │   └── dashboard/          # All dashboard pages (requires ?address= param)
│   │   ├── layout.tsx      # Suspense + DashboardShell wrapper
│   │   ├── page.tsx        # Redirects to /dashboard/portfolio (passes address)
│   │       ├── portfolio/      # Unified Bond + LP portfolio dashboard
│   │       ├── overview/       # Portfolio summary + position table + fee revenue + market overview
│   │       ├── nodes/          # Node health detail
│   │       ├── rewards/        # Earnings, APY, PnL, fee impact, auto-compound, tax export
│   │       ├── risk/           # Slash monitor, churn-out risk, unbond tracker, network security
│   │       ├── transactions/   # BOND/UNBOND composer, tx history, watchlist, recent addresses
│   │       ├── lp/             # Liquidity Provider positions and metrics + IL calculator
│   │       └── changelogs/     # THORChain changelog browser
│   ├── components/
│   │   ├── dashboard/          # 25+ domain components (charts, tables, monitors, network comparison, revenue, alerts)
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
- **Liquidity Provider (LP) Dashboard**: Monitor LP positions, rewards, and pool-specific metrics.
- **Performance Summary**: Live 7d/24h RUNE price impact, weighted APY, operator fees, estimated daily earnings.
- Manual initial bond input with localStorage persistence (`pnl-dashboard.tsx`)

**Risk Defense Center**:
- **Risk Summary Banner**: Health score (0-100), total bonded, status pills (active/standby/jailed/at-risk), pendulum status, unbond timer
- **Incentive Pendulum**: Shows Node vs LP split with actual RUNE amounts and percentages, bond-to-pool ratio with visual bar
- **Quick KPIs**: Compact pills for Earning, Slash, Jailed, Churn countdown
- **Nodes List**: All nodes sorted by severity score, with action alerts
- **Show Details toggle**: Expands to show SlashMonitor, ChurnOutRisk, UnbondWindowTracker, NetworkSecurityMetrics

**PnL Performance Statement**:
- **Reward Velocity**: Visual flow from Gross Earnings $\rightarrow$ Fee Leakage $\rightarrow$ Net Take-Home.
- **Yield Benchmarking**: Comparison of user's weighted APY vs network averages and top-tier nodes.
- **Earnings Projections**: Dynamic short and long-term projections with auto-compounding.
- **Net Earnings Transparency**: Clear breakdown of operator fee impact on total returns.

**Unified Portfolio Dashboard**:
- **Total AUM**: Combined Bond + LP value in USD with asset allocation pie chart
- **Performance Summary**: 7d / 30d / YTD return placeholders with quick action links
- **Live data**: Fetches bond positions, LP positions, and RUNE price in real-time

**Protocol Revenue & Market Context**:
- **Fee Revenue Tracker**: 30-day protocol fee trend (Recharts area chart) + 24h/7d/30d KPI cards
- **User Earnings Share**: Estimated daily share based on bond proportion of total active bond
- **Market Overview Widget**: 24h swap volume, top 5 pools by volume, RUNE price (24h + 7d change), protocol TVL

**LP Intelligence**:
- **Impermanent Loss Calculator**: XYK formula-based IL % per position
- **IL Display**: Badge on LP cards and sortable column in LP table

**Tax & Compliance**:
- **Tax Export Suite**: CSV export with FIFO cost basis for bond rewards + LP income
- **Server-side aggregation**: `/api/tax-report` route avoids CORS and handles date-range filtering

**Protocol Alerts**:
- **Upgrade Alert Banner**: Detects THORNode version changes, dismissible per-version with localStorage persistence
- **Changelog Link**: Direct navigation to changelogs page from alert

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
| Add new chart component | `src/components/dashboard/` — use Recharts ResponsiveContainer |
| Add LP dashboard page | `src/app/dashboard/lp/page.tsx` |
| Add portfolio dashboard | `src/app/dashboard/portfolio/page.tsx` |
| Add protocol revenue chart | `src/components/dashboard/fee-revenue-chart.tsx` |
| Add market overview widget | `src/components/dashboard/market-overview.tsx` |
| Add network security gauge | `src/components/dashboard/network-security-card.tsx` |
| Add upgrade alert banner | `src/components/dashboard/upgrade-alert-banner.tsx` |
| New calculation | `src/lib/utils/calculations.ts` |
| New IL calculation | `src/lib/utils/il-calculator.ts` |
| New formatter | `src/lib/utils/formatters.ts` |
| Tax export utility | `src/lib/utils/tax-export.ts` |
| Change API URLs | `src/lib/config.ts` — env vars override defaults |
| Wallet integration | `src/lib/hooks/use-wallet.ts` + `src/lib/types/wallet.ts` |
| Transaction signing | `src/lib/transactions/bond.ts` |
| CoinGecko price lookup | `src/lib/api/coingecko.ts` |
| RUNE price (CoinAPI) | `src/lib/api/coinapi.ts` |
| Address aggregation API | `src/app/api/address/[address]/route.ts` |
| Pool analytics API | `src/app/api/pools/[pool]/route.ts` |
| Tax report API | `src/app/api/tax-report/route.ts` |
| CI/CD config | `.github/workflows/test.yml` |
| E2E tests | `e2e/*.spec.ts` |

## CONVENTIONS

**RUNE amounts**: All API returns are strings in 1e8 units. Use `runeToNumber()` for display, `BigInt()` for math. Never use `Number()` directly on raw amounts.

**Amount display**: When displaying parsed amounts in UI, multiply by `1e8` before passing to `formatRuneAmount()` because the parsing divides by 1e8, but the formatter expects 1e8 units. Example: `formatRuneAmount(String(Math.floor(tx.amount * 1e8)))`.

**useSearchParams**: Must be wrapped in Suspense boundary. `dashboard/layout.tsx` provides this. Pages using it must be `'use client'`.

**Midgard Proxy**: The proxy in `src/app/api/midgard/[...path]/route.ts` passes through 4xx errors from the upstream Midgard API. Ensure any new API client calls use the proxy to avoid CORS issues.

**THORName reverse lookup**: Reverse lookup failures on the deployed dev site are currently a known live-QA concern. Treat "lookup unavailable" and "no THORName found" as degraded/non-fatal states in user-facing flows unless the feature explicitly requires a successful reverse lookup.

**Midgard bond history**: Use `type=` (not `txType=`) for bond history. The `txType` filter is deprecated/unreliable. The API function `getActions()` accepts a `typeParam` argument for this.

**Address persistence**: Unified `BONDTRACK_ADDRESS` localStorage key. Dashboard layout restores last address on load. Old keys (`dashboard-address`, `thornode-watcher-last-address`) are migrated and deleted automatically.

**Address prop**: Dashboard pages get address from `useSearchParams().get('address')`. The `/dashboard` redirect passes it through.

**API client**: `src/lib/api/client.ts` provides `fetchThornode<T>()` and `fetchMidgard<T>()`. Next.js `fetch` with `next: { revalidate: 60 }` for caching. All calls go through server-side proxy routes to bypass CORS.

**Endpoints**: Default to liquify (`gateway.liquify.com`) with `midgard.thorchain.network` as fallback. Override via `NEXT_PUBLIC_MIDGARD_API`, `NEXT_PUBLIC_THORNODE_API`, and related fallback env vars.

**Dark mode**: Uses next-themes with `attribute="class"`. All components use `dark:` Tailwind variants.

**Charts**: Recharts with ResponsiveContainer. Data from Midgard history endpoints. Timestamps are nanoseconds — divide by 1e9. For hourly data (24H), format axis as time; for daily data, format as dates.

**Testing**: Vitest uses `src/setupTests.ts`. `src/test/setup.ts` exists but is not wired into vitest.config.ts. MSW scaffolding exists under `src/test/msw/` but is not globally wired into tests.

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
- **Risk page formatting**: When display shows "--" for 0/undefined values (use guard like `value > 0 ? formatted : '--'`)

## RISK PAGE

The Risk page (`src/app/dashboard/risk/page.tsx`) shows portfolio risk assessment with:

1. **Risk Summary Banner**: Health score (0-100), total bonded RUNE, status pills (active/standby/jailed/at-risk), Incentive Pendulum status, unbond countdown, network TVL

2. **Risk KPIs Row**: 4 compact pills - Earning (active nodes), Slash (nodes with slash points), Jailed, Next Churn

3. **Incentive Pendulum Card**: Full pendulum showing Nodes (Bond) amount + %, LPs (Liquidity) amount + %, bond-to-pool ratio with visual bar, target vs current

4. **Your Nodes List**: All positions sorted by severity, showing status, bond amount, action alerts

5. **Show Details**: Toggles expanded sections (SlashMonitor, ChurnOutRisk, UnbondWindowTracker, NetworkSecurityMetrics)

**Formatting**: Network values need special handling - `runeToNumber()` divides by 1e8, so only multiply back before `formatRuneAmount()` when you still have a numeric RUNE value. If you already have a formatted string from `formatRuneFromNumber()`, render it directly instead of wrapping it in `formatRuneAmount()` again. Use `--` when value is 0 or undefined to indicate missing data.

## RECENT CHANGES
- **Performance Summary live**: Portfolio Performance Summary now shows real 7d/24h RUNE price impact, weighted APY, avg operator fee, active positions, and estimated daily earnings. Replaced the old placeholder.
- **use-bond-history parsing fix**: Bond action detection now uses metadata.txType → action.type → memo fallback, matching the robust parser in transaction-history.tsx. Removed the broken retry loop that re-called getActions with identical params.
- **Unified address key**: All address persistence now uses `BONDTRACK_ADDRESS` localStorage key. Old keys are migrated and deleted.
- **Portfolio is canonical dashboard**: `/dashboard` and `/dashboard/overview` both redirect to `/dashboard/portfolio`. Overview nav item removed from sidebar.
- **LP trust rebuild**: `/dashboard/lp` now uses typed USD valuation data, a USD portfolio hero, investor-language LP cards/rows, an honest missing-address state, and a pricing-confidence banner when historical entry pricing is unavailable.
- **Transaction history fix**: Fetch bond history using `type=bond` filter. Fixed amount display by multiplying parsed amounts by 1e8 before passing to `formatRuneAmount()`. Fixed timestamp parsing (divide by 1e9).
- **Removed confusing APY chart**: Removed Estimated Network APY chart from Rewards page.
- **Risk page redesign**: Streamlined layout with health score banner, compact KPIs, always-visible nodes list, and collapsible details section.
- **Incentive Pendulum fix**: Show Node/LP amounts (not user's share), use network data, and keep both pendulum surfaces aligned (`LP Favored` below `1.5x`, `Node Favored` above `2.5x`).
- **Formatting fix**: Show '--' instead of '00' when values are 0 or undefined.
- **Real APY benchmarks**: Calculate actual network percentiles from node data instead of hardcoded values.
- **CORS workaround**: Created server-side API proxy routes at `/api/midgard/[...path]` and `/api/thorchain/[...path]` to bypass browser CORS restrictions.
- **Risk dashboard overhaul**: Refactor all components to show user's nodes only (not network-wide).
- **useNodeRankings hook**: Computes user's node rank in active set, percentile, at-risk status.
- **Incentive Pendulum card**: Shows Node/LP reward split, effective security, bond-to-pool ratio.
- **EarningStatusSummary**: Quick view of Active (earning) vs Standby (not earning) vs Jailed.

## KNOWN ISSUES
- Deployed dev QA still has confirmed non-wallet regressions under remediation:
  - notification prompt can block header controls and its `Enable` CTA does not visibly resolve
  - repeated THORName reverse-lookup 502s on dashboard routes
  - LP Status now degrades honestly on member/history failures; remaining live LP issue is upstream pool-history `502` responses that force `current-only` valuation
  - changelog year buttons work, but search/filter/entry controls do not yet behave correctly on deployed dev
  - overview quick actions do not preserve intended transaction mode
  - transactions UNBOND/copy UX still needs deployed verification/fixes
  - rewards controls still have dead/unclear deployed behavior, including the `30D,` label oddity

## RECENT CHANGES
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
- **Incentive Pendulum card**: Shows Node/LP reward split, effective security, pendulum status
- **EarningStatusSummary**: Quick view of Active (earning) vs Standby (not earning) vs Jailed

## KNOWN ISSUES
- Bond history may show empty for addresses that should have transactions — check `getActions()` type=bond filter
- 6 pre-existing test failures in `use-watchlist.test.ts` and `use-bond-positions.test.ts`

## COMMANDS
```bash
npm run dev          # Next.js dev (Turbopack)
npm run build        # Production build + type check
npm run start        # Production server
npm run test         # Vitest unit tests
npm run test:coverage # Vitest with coverage
npm run e2e          # Playwright e2e tests
npx tsc --noEmit     # Type check only
```
