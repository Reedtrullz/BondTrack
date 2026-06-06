# Shared Components

Reusable UI primitives and cross-cutting components used across dashboard pages.

**11 components** — no external dependencies beyond project utils and Tailwind.

## COMPONENTS

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `dashboard-card.tsx` | Consistent card wrapper with optional title, icon, highlight border | `title`, `icon`, `highlight` (`emerald`\| `amber`\| `red`\| `cyan`) |
| `export-button.tsx` | Bond position CSV export trigger | `bondPositions` |
| `api-health-banner.tsx` | "X API is temporarily unavailable" banner. Triggers when `useApiHealth` flips to `degraded`/`down` (≥3 consecutive failed probes). If banner reappears, check proxy routes first — see `src/lib/api/AGENTS.md`. | — |
| `address-input.tsx` | THORChain address input with validation + THORName lookup | `value`, `onChange`, `onSubmit` |
| `status-badge.tsx` | Color-coded status pill (Active/Standby/Ready/Disabled/Jailed) | `status`, `isJailed?` |
| `badge.tsx` | Generic numeric/status badge | `children`, `variant` |
| `breadcrumbs.tsx` | Dashboard page breadcrumbs | — |
| `recent-addresses.tsx` | Recently viewed addresses list | `addresses`, `onSelect` |
| `loading-skeleton.tsx` | Pulse skeleton for loading states | `className` |
| `skeleton.tsx` | Minimal skeleton primitive | `className` |
| `metric-tooltip.tsx` | Info tooltip for metric explanations | `aria-label="Explain ..."` |

## CONVENTIONS

**DashboardCard**: Always wrap dashboard sections in `DashboardCard` for consistent styling. Use `highlight` only for critical states (e.g., `red` for risk warnings).

**StatusBadge**: Use `status` prop for node status strings. Set `isJailed` explicitly — a node can be `Active` but jailed.

**LoadingSkeleton**: Use `animate-pulse bg-zinc-200 dark:bg-zinc-800` pattern. Prefer skeletons over spinners for data-heavy sections.

**MetricTooltip**: Uses `aria-label="Explain ..."` for accessibility. Used across dashboard widgets for metric descriptions.

## ANTI-PATTERNS
- Never create ad-hoc card divs — use `DashboardCard`
- Never hardcode status colors — use `StatusBadge` or `Badge`
- Never show raw loading text — use `LoadingSkeleton` or `Skeleton`
