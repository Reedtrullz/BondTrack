## Learnings

- Centralized bond-risk thresholds in `src/lib/config.ts` keeps `calculations.ts`, `health-score.ts`, and `risk/page.tsx` aligned on slash, health, and bond-to-pool boundaries.
- SWR refresh intervals are now easier to audit because bond positions, price, and health polling all reference `NETWORK.REFRESH_INTERVALS`.
- The network security gauge progress bar now reads from a single config multiplier, which avoids duplicated visual tuning constants.
- Removing dead Midgard exports also surfaced stale local build artifacts; clearing `.next` let `next build` rerun cleanly after the API cleanup.
- Extracting `DashboardCard` worked best when the wrapper accepted `className`, `title`, `icon`, and highlight variants so page-level card shells could be swapped without touching inner reusable components.
- Tailwind merge preserved the old card appearance cleanly, so page wrappers could move to the shared component while keeping per-page padding and layout overrides intact.
- For health-monitoring hooks that need custom failure-counting logic (consecutive failures → down state), plain `useEffect` + `setInterval` is clearer than SWR because SWR's built-in retry and deduplication interfere with precise failure tracking.
- Parsing error messages with regex (`/API error:\s*(\d{3})/`) is a pragmatic way to detect HTTP status codes when the API client wraps fetch errors in generic `Error` objects rather than exposing status fields.
- Using `useRef` for failure counters inside interval callbacks avoids stale closure issues that would occur with `useState` counters; `useState` setter references remain stable, so refs are only needed for the mutable counters themselves.
- `DashboardCard`'s `highlight` prop (`amber` / `red`) is an effective way to reuse the shared card wrapper for alert banners, but `className` overrides (e.g., `px-4 py-3`) are needed to tune padding for compact banner layouts.
- Session-only dismissal state (`useState`) for transient API alerts avoids the complexity of localStorage keys and respects that API health can change within a single session.
- The `getAllNodes` THORNode endpoint is a suitable proxy for THORNode health because it exercises the full proxy pipeline (`/api/thorchain` → upstream) without requiring a dedicated health endpoint.
- Build passed cleanly on Next.js 16.2.2 + Turbopack with zero type errors after hook and component creation.
- Unified address persistence from `localStorage` key `thornode-watcher-last-address` and `sessionStorage` key `dashboard-address` into a single `localStorage` key `BONDTRACK_ADDRESS`.
- Migration logic in both `page.tsx` and `dashboard/layout.tsx` checks the old keys on first load, copies valid `thor1` addresses to the new key, and deletes the old keys to prevent drift.
- In `dashboard/layout.tsx`, the `useSyncExternalStore` getter was updated to fall back to old keys (`dashboard-address` in sessionStorage, `thornode-watcher-last-address` in localStorage) so the redirect effect still fires immediately on the first render after migration.
- Switching from `sessionStorage` to `localStorage` for the active address means the dashboard restore works across browser tabs and sessions, matching user expectations for a bookmarkable investment dashboard.
- The no-address state in `dashboard/layout.tsx` now returns a clear CTA ("Enter an address to get started" with a "Go to Home" link) instead of an infinite `<LoadingSkeleton />`, fixing the core UX regression.
- The `?address=` URL parameter continues to act as an override: when present it is persisted to `localStorage`, and when absent the stored address is restored via `router.replace`.
- Watchlist and recent-address buttons should use `router.push()` for address navigation; client-side transitions preserve dashboard state and avoid the full page reload caused by `window.location.href`.
- `/dashboard/overview` is now a tiny server redirect page that forwards every query param to `/dashboard/portfolio`, which keeps old bookmarks working without rehydrating the old overview UI.

## 2026-04-29 — Multi-node RiskRadar Enhancement

- Extending `RiskRadar` from a single `position` prop to `positions: BondPosition[]` required minimal internal state (`selectedPositionIndex`) and a conditional `<select>` dropdown.
- The dropdown is only rendered when `positions.length > 1`, preserving the existing single-node UX without visual clutter.
- Option labels combine truncated `nodeAddress`, formatted `bondAmount` via `formatRuneFromNumber`, and `status` for quick node identification: `{addr.slice(0,8)}...{addr.slice(-4)} — ᚱ{bond} ({status})`.
- Increasing the container height from `h-[240px]` to `h-[280px]` accommodates the dropdown while keeping the radar chart fully visible.
- The parent page (`risk/page.tsx`) now passes the full `positions` array, decoupling the radar from hardcoded `positions[0]` selection.
- Build passed cleanly with zero type errors on Next.js 16.2.2 + Turbopack.

## 2026-04-29 — Sortable Node Comparison Table

- Added a sortable comparison table to `src/app/dashboard/nodes/page.tsx` between the existing `NodeStatusCard` grid and the `NetworkComparisonTable`.
- Table columns: Node Address, Status, Bond Amount, APY, Slash Points, Operator Fee, Risk Score — all clickable for asc/desc sorting with arrow indicators (`↑`/`↓`).
- Risk score is computed inline from `BondPosition` data: `isJailed ? 100 : Math.min((slashPoints / 200) * 100, 100)`, producing a 0-100 scale.
- Row color-coding uses conditional Tailwind classes on `<tr>`:
  - Red: `bg-red-50 dark:bg-red-950/30` for jailed or critical slash (`slashPoints >= 200`).
  - Amber: `bg-amber-50 dark:bg-amber-950/30` for warning slash (`slashPoints >= 50`).
  - Default: no override for healthy nodes.
- The LP table in `lp/page.tsx` provides the canonical styling pattern: `overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800` container, `min-w-full divide-y divide-zinc-200 dark:divide-zinc-800` table, sticky `bg-zinc-50 dark:bg-zinc-950/60` header, and `cursor-pointer` headers with `hover:text-zinc-700 dark:hover:text-zinc-300`.
- Using a `SortHeader` sub-component keeps the table header markup DRY and avoids repeating the sort-toggle logic seven times.
- Default sort is `riskScore` descending so the highest-risk nodes surface first — this is the most actionable view for a bond provider.
- `formatRuneFromNumber` works cleanly for `bondAmount` because `BondPosition` already stores parsed numeric RUNE values (not raw 1e8 strings).
- Build passed cleanly with zero type errors on Next.js 16.2.2 + Turbopack.

## 2026-04-29 — Mobile-Optimized LP Table

- Added a responsive mobile card view (`LpMobileCard`) to `src/app/dashboard/lp/page.tsx` that replaces the desktop table below the `md` breakpoint (~768px).
- Desktop table container uses `hidden md:block`; mobile card container uses `md:hidden space-y-4` — standard Tailwind responsive toggle pattern.
- Each mobile card displays: Pool name, `LpStatusBadge`, Net PnL (emerald-600/red-600 color-coded), Pool APY, IL %, and an expandable section (tap-to-toggle via `useState`) showing deposited amounts, withdrawable amounts, and ownership share.
- Card styling follows the project's established card pattern: `rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4`.
- The mobile cards reuse the same `sortedPositions` array as the desktop table, so sorting and data remain perfectly in sync.
- `LpStatusBadge` and formatter utilities (`formatPercent`, `formatRuneAmount`, `formatAmount`) had to be explicitly imported into the page file since they were not previously used there.
- Build passed cleanly on Next.js 16.2.2 + Turbopack with zero type errors.

## 2026-04-29 — Config Constant Coverage

- Centralized config tests are simplest when they assert order and bounds directly against `NETWORK` rather than snapshotting the whole object.
- Refresh interval checks should enforce a practical upper bound (1 hour here) so accidental ms/sec mixups fail fast.
- `Number.isInteger()` is a clean fit for limit constants like `MAX_ACTIONS_LIMIT` without needing extra casts.
- Nodes risk scoring now reads slash thresholds from `NETWORK.SLASH_POINT_THRESHOLDS` instead of raw literals, preserving the same warning/critical behavior while keeping the page aligned with centralized protocol config.
