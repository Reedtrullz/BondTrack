# Layout Components

Shell and navigation components that frame the dashboard experience.

**5 components** — all client-side (`'use client'`).

## COMPONENTS

| Component | Purpose | Key Features |
|-----------|---------|-------------|
| `dashboard-shell.tsx` | Main app shell — header, refresh, THORName, wallet, API health | Address hydration, SWR cache refresh, THORName reverse lookup, RUNE balance display |
| `sidebar.tsx` | Dashboard navigation — desktop + mobile drawer | 7 nav items, mobile hamburger, address-preserving links |
| `theme-toggle.tsx` | Dark/light mode toggle | next-themes integration |
| `bifrost-status.tsx` | Bifrost bridge status indicator | Live connection status |

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add nav item | `sidebar.tsx` — append to `navItems` array |
| Add header control | `dashboard-shell.tsx` — top-right action area |
| Change refresh behavior | `dashboard-shell.tsx` — `handleRefresh()` + `SWR_KEYS` |
| Mobile layout changes | `sidebar.tsx` — `isOpen` / `onClose` props |

## CONVENTIONS

**Address preservation**: All sidebar links append `?address=` when an address is active. Never navigate without preserving address context.

**Mobile**: Sidebar is a slide-out drawer on mobile. `MobileMenuButton` toggles it.

**Refresh**: Dashboard shell exposes a refresh button that revalidates all `SWR_KEYS`. Individual pages should not add their own refresh buttons.

## ANTI-PATTERNS
- Never add nav items without updating both desktop and mobile views
- Never call `mutate()` directly in child components — use the shell's refresh mechanism
- Never show THORName lookup errors as blocking UI — degrade silently
