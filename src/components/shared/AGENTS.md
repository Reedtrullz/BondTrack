# Shared Components

Reusable UI primitives and cross-cutting components used across dashboard pages.

**9 components** — no external dependencies beyond project utils and Tailwind.

## COMPONENTS

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `dashboard-card.tsx` | Consistent card wrapper with optional title, icon, highlight border | `title`, `icon`, `highlight` (`emerald`\| `amber`\| `red`\| `cyan`) |
| `export-button.tsx` | Bond position CSV export trigger | `bondPositions` |
| `api-health-banner.tsx` | Shows "X API is temporarily unavailable" when `useApiHealth` flips Midgard or THORNode to `degraded`/`down` (≥3 consecutive failed probes against `getHealth()` and `getAllNodes()`). If this banner reappears, the proxy routes — not the upstream APIs — are usually the culprit; see `src/lib/api/AGENTS.md` for the THORNode `thorchain/`-prefix normalisation rule. | — |
| `address-input.tsx` | THORChain address input with validation | `value`, `onChange`, `onSubmit` |
| `status-badge.tsx` | Color-coded status pill (Active/Standby/Ready/Disabled/Jailed) | `status`, `isJailed?` |
| `badge.tsx` | Generic numeric/status badge | `children`, `variant` |
| `breadcrumbs.tsx` | Dashboard page breadcrumbs | — |
| `recent-addresses.tsx` | Recently viewed addresses list | `addresses`, `onSelect` |
| `loading-skeleton.tsx` | Pulse skeleton for loading states | `className` |

## CONVENTIONS

**DashboardCard**: Always wrap dashboard sections in `DashboardCard` for consistent styling. Use `highlight` only for critical states (e.g., `red` for risk warnings).

**StatusBadge**: Use `status` prop for node status strings. Set `isJailed` explicitly — a node can be `Active` but jailed.

**LoadingSkeleton**: Use `animate-pulse bg-zinc-200 dark:bg-zinc-800` pattern. Prefer skeletons over spinners for data-heavy sections.

## ANTI-PATTERNS
- Never create ad-hoc card divs — use `DashboardCard`
- Never hardcode status colors — use `StatusBadge` or `Badge`
- Never show raw loading text — use `LoadingSkeleton`
