# App Router — Pages & API Routes

Next.js 16 App Router entry points, dashboard pages, learn section, and server-side API proxies.

## STRUCTURE
```
src/app/
├── layout.tsx              # Root — fonts (Exo2, Open Sans), ThemeProvider
├── page.tsx                # Landing — address input, last-address redirect
├── globals.css             # Tailwind v4 + global styles
├── api/                    # Server-side proxy routes (CORS bypass)
│   ├── midgard/[...path]/  # Midgard proxy + fallback endpoint
│   ├── thorchain/[...path]/ # THORNode proxy + path normalization
│   ├── coingecko/[...path]/ # CoinGecko proxy + caching
│   ├── coinapi/rune-price/ # CoinAPI-backed historical price
│   ├── address/[address]/  # Midgard bond+action aggregation
│   ├── pools/[pool]/       # Pool earnings aggregation
│   ├── health/             # Health check endpoint
│   └── tax-report/         # Tax CSV export (server-side)
├── dashboard/
│   ├── layout.tsx          # Suspense + DashboardShell + address restore
│   ├── page.tsx            # Redirects to /dashboard/portfolio
│   ├── portfolio/          # Unified Bond + LP portfolio view
│   ├── overview/           # Portfolio summary + fee revenue + market
│   ├── nodes/              # Node health monitoring
│   ├── rewards/            # PnL + tax export button
│   ├── risk/               # Network security gauge + risk panels
│   ├── transactions/       # BOND/UNBOND composer + history
│   ├── lp/                 # LP positions + IL calculator
│   ├── simulator/          # Bond projection simulator
│   ├── explorer/           # Network-wide node explorer
│   ├── changelogs/         # TCC/TCU changelog browser
│   └── settings/
│       └── notifications/  # Local browser/in-app alert preferences; email/Telegram are visibly not connected yet
└── learn/
    ├── layout.tsx          # Learn section layout
    ├── page.tsx            # Learn index
    └── [slug]/page.tsx     # Dynamic article route
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Add dashboard page | `src/app/dashboard/<page>/page.tsx` |
| Add API route | `src/app/api/<name>/route.ts` |
| Root layout changes | `src/app/layout.tsx` |
| Address state logic | `src/app/dashboard/layout.tsx` |
| Upgrade alert | `src/app/dashboard/layout.tsx` (injected in shell) |
| Learn articles | `src/app/learn/[slug]/page.tsx` |

## CONVENTIONS

**Pages using `useSearchParams`**: Must be `'use client'` and wrapped in `Suspense`. `dashboard/layout.tsx` provides this.

**API routes**: All proxies use `export const dynamic = 'force-dynamic'`. Rate-limited via `src/lib/api/rate-limit.ts`. Custom endpoints (address, pools, tax-report) aggregate Midgard data server-side. `/api/address/[address]` action amounts expose `amountBaseUnits` (string, 1e8 base units) and `amountRune` (number); do not return raw base units as an unlabeled `amount`.

**Health endpoint**: `/api/health` returns `{ status, timestamp, version }`. Version: `process.env.VERSION` -> `"unknown"`.

**Address persistence**: Unified `BONDTRACK_ADDRESS` localStorage key (legacy name; do not rename). Dashboard layout restores on load.

**Changelogs layout**: `changelogs/layout.tsx` imports and renders `./page` directly inside Suspense — atypical but intentional.

## ANTI-PATTERNS
- Never use `useSearchParams()` outside a `Suspense` boundary
- Never call external APIs directly from browser components — use proxy routes
- Never forget `dynamic = 'force-dynamic'` on API routes that proxy live data
