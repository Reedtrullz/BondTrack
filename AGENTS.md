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
│   │   │   └── thorchain/[...path]/route.ts # THORNode proxy (bypasses CORS)
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
- **Liquidity Provider (LP) Dashboard**: Monitor LP positions, rewards, and pool-specific metrics.
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
| New calculation | `src/lib/utils/calculations.ts` |
| New formatter | `src/lib/utils/formatters.ts` |
| Change API URLs | `src/lib/config.ts` — env vars override defaults |
| Wallet integration | `src/lib/hooks/use-wallet.ts` + `src/lib/types/wallet.ts` |
| Transaction signing | `src/lib/transactions/bond.ts` |

## CONVENTIONS

**RUNE amounts**: All API returns are strings in 1e8 units. Use `runeToNumber()` for display, `BigInt()` for math. Never use `Number()` directly on raw amounts.

**Amount display**: When displaying parsed amounts in UI, multiply by `1e8` before passing to `formatRuneAmount()` because the parsing divides by 1e8, but the formatter expects 1e8 units. Example: `formatRuneAmount(String(Math.floor(tx.amount * 1e8)))`.

**useSearchParams**: Must be wrapped in Suspense boundary. `dashboard/layout.tsx` provides this. Pages using it must be `'use client'`.

**Midgard Proxy**: The proxy in `src/app/api/midgard/[...path]/route.ts` passes through 4xx errors from the upstream Midgard API. Ensure any new API client calls use the proxy to avoid CORS issues.

**THORName reverse lookup**: Reverse lookup failures on the deployed dev site are currently a known live-QA concern. Treat "lookup unavailable" and "no THORName found" as degraded/non-fatal states in user-facing flows unless the feature explicitly requires a successful reverse lookup.

**Midgard bond history**: Use `type=` (not `txType=`) for bond history. The `txType` filter is deprecated/unreliable. The API function `getActions()` accepts a `typeParam` argument for this.

**Address prop**: Dashboard pages get address from `useSearchParams().get('address')`. The `/dashboard` redirect passes it through.

**API client**: `src/lib/api/client.ts` provides `fetchThornode<T>()` and `fetchMidgard<T>()`. Next.js `fetch` with `next: { revalidate: 60 }` for caching. All calls go through server-side proxy routes to bypass CORS.

**Endpoints**: Default to ninerealms (`midgard.ninerealms.com`) with liquify fallback and `midgard.thorchain.network` as the final Midgard fallback. Override via `NEXT_PUBLIC_MIDGARD_API`, `NEXT_PUBLIC_THORNODE_API`, and related fallback env vars.

**Dark mode**: Uses next-themes with `attribute="class"`. All components use `dark:` Tailwind variants.

**Charts**: Recharts with ResponsiveContainer. Data from Midgard history endpoints. Timestamps are nanoseconds — divide by 1e9. For hourly data (24H), format axis as time; for daily data, format as dates.

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
- **Transaction history fix**: Fetch bond history using `type=bond` instead of deprecated `txType` - the proxy returns empty for `txType` but works with `type`.
- **RUNE price chart axis fix**: Y-axis now shows dollar amounts with 2 decimals instead of "$0,$0,$0,$0,$1".
- **24H price chart fix**: X-axis shows time (e.g., "10 AM") instead of repeating dates for hourly data.
- **Removed confusing APY chart**: Removed Estimated Network APY chart from Rewards page - it was confusing and added no value.
- **Risk page redesign**: Streamlined layout with health score banner, compact KPIs, always-visible nodes list, and collapsible details section
- **Incentive Pendulum fix**: Show Node/LP amounts (not user's share), use network data, and keep both pendulum surfaces aligned (`LP Favored` below `1.5x`, `Node Favored` above `2.5x`).
- **Risk TVL fix**: Risk Summary Banner now renders the already-formatted network liquidity string directly, avoiding the old double-format/double-divide bug.
- **Transaction history fix**: Midgard action history now uses `txType=bond,unbond,leave` with `limit=50`, so bond history and the Transactions page surface unbond/leave exits without 502s.
- **Dashboard freshness fix**: `DashboardShell` now derives the freshness label from tick state instead of calling `Date.now()` during render.
- **LP status/health fix**: `use-lp-positions.ts` maps live Midgard pool statuses (`available`, `staged`) to LP UI status/health instead of hardcoded placeholders.
- **Formatting fix**: Show '--' instead of '00' when values are 0 or undefined
- **Real APY benchmarks**: Calculate actual network percentiles from node data instead of hardcoded values
- **Transaction history fix**: Fixed amount display (0.00 → correct amounts) by multiplying parsed amounts by 1e8 before passing to `formatRuneAmount()`. Also fixed timestamp parsing.
- **CORS workaround**: Created server-side API proxy routes at `/api/midgard/[...path]` and `/api/thorchain/[...path]` to bypass browser CORS restrictions.
- `risk/page.tsx`: Added YourNodesAtRisk card, improved Your All Positions section
- `rewards/page.tsx`: Fixed bond history empty states, timestamps divide by 1e9
- `pnl-dashboard.tsx`: Manual initial bond input with localStorage
- **Risk dashboard overhaul**: Refactor all components to show user's nodes only (not network-wide)
- **useNodeRankings hook**: Computes user's node rank in active set, percentile, at-risk status
- **Incentive Pendulum card**: Shows Node/LP reward split, effective security, bond-to-pool ratio
- **EarningStatusSummary**: Quick view of Active (earning) vs Standby (not earning) vs Jailed

## KNOWN ISSUES
- Deployed dev QA still has confirmed non-wallet regressions under remediation:
  - notification prompt can block header controls and its `Enable` CTA does not visibly resolve
  - repeated THORName reverse-lookup 502s on dashboard routes
  - LP Status needs a more honest degraded/error state when `/v2/member/{address}` fails
  - changelog year buttons work, but search/filter/entry controls do not yet behave correctly on deployed dev
  - overview quick actions do not preserve intended transaction mode
  - transactions UNBOND/copy UX still needs deployed verification/fixes
  - rewards controls still have dead/unclear deployed behavior, including the `30D,` label oddity

## COMMANDS
```bash
npm run dev     # Next.js dev (Turbopack)
npm run build   # Production build + type check
npm run start   # Production server
npx tsc --noEmit  # Type check only
```
