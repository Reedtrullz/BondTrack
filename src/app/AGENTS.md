# App Router — Pages & API Routes

Next.js 16 App Router entry points, dashboard pages, and server-side API proxies.

## STRUCTURE
```
src/app/
├── layout.tsx              # Root — fonts, ThemeProvider, analytics
├── page.tsx                # Landing — address input, last-address redirect
├── globals.css             # Tailwind + global styles
├── api/                    # Server-side proxy routes (CORS bypass)
│   ├── midgard/[...path]/
│   ├── thorchain/[...path]/
│   ├── coingecko/[...path]/
│   ├── coinapi/rune-price/
│   ├── address/[address]/
│   ├── pools/[pool]/
│   └── tax-report/         # Tax CSV export (server-side aggregation)
└── dashboard/
    ├── layout.tsx          # Suspense + DashboardShell + address restore
    ├── page.tsx            # Redirects to /dashboard/overview
    ├── portfolio/          # Unified Bond + LP portfolio view
    ├── overview/           # Portfolio summary + fee revenue + market overview
    ├── nodes/
    ├── rewards/            # PnL + tax export button
    ├── risk/               # Network security gauge
    ├── transactions/
    ├── lp/                 # IL calculator column
    └── changelogs/
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Add dashboard page | `src/app/dashboard/<page>/page.tsx` |
| Add portfolio page | `src/app/dashboard/portfolio/page.tsx` |
| Add API route | `src/app/api/<name>/route.ts` |
| Add tax export route | `src/app/api/tax-report/route.ts` |
| Root layout changes | `src/app/layout.tsx` |
| Address state logic | `src/app/dashboard/layout.tsx` |
| Upgrade alert banner | `src/app/dashboard/layout.tsx` (injected in dashboard shell) |

## CONVENTIONS

**Pages using `useSearchParams`**: Must be `'use client'` and wrapped in `Suspense`. `dashboard/layout.tsx` provides this.

**API routes**: All proxies use `export const dynamic = 'force-dynamic'`. Forward to external APIs with CORS headers. Custom endpoints (address, pools) aggregate Midgard data server-side.

**Address persistence**: `sessionStorage` key `dashboard-address`. Dashboard layout restores last address on load.

## ANTI-PATTERNS
- Never use `useSearchParams()` outside a `Suspense` boundary
- Never call external APIs directly from browser components — use proxy routes
- Never forget `dynamic = 'force-dynamic'` on API routes that proxy live data
