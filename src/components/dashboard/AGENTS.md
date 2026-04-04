# Dashboard Components

**14 components** across 4 categories: data display, charts, risk monitors, transaction tools.

## DATA DISPLAY (4)
| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `portfolio-summary.tsx` | 4-card grid: total bonded, RUNE price, weighted APY, position count | `totalBonded`, `runePrice`, `weightedAPY`, `positionCount` |
| `position-table.tsx` | Table of bond positions with share%, fee, APY columns | `positions: BondPosition[]` |
| `node-status-card.tsx` | Single node detail card with status, bond, slash points, warnings | `position: BondPosition`, `currentBlockHeight?` |
| `status-badge.tsx` | Color-coded status pill (Active/Standby/Ready/Disabled/Jailed) | `status`, `isJailed?` |

## CHARTS (4) — All use Recharts ResponsiveContainer
| Component | Data Source | Chart Type |
|-----------|-------------|------------|
| `price-chart.tsx` | Midgard `/v2/history/rune` | LineChart |
| `apy-chart.tsx` | Midgard `/v2/history/earnings` | AreaChart |
| `fee-impact-tracker.tsx` | Earnings + operator fee calc | BarChart |
| `auto-compound-chart.tsx` | Earnings intervals → cumulative bond | AreaChart |

## RISK MONITORS (4)
| Component | Purpose |
|-----------|---------|
| `slash-monitor.tsx` | Per-node slash points (OK/Warning/Critical), jail countdown |
| `churn-out-risk.tsx` | Bond rank among all active nodes, bottom 33% flagged |
| `network-security-metrics.tsx` | TVL, bond-to-pool ratio, network health |
| `unbond-window-tracker.tsx` | Detects when node churns out and unbond is possible |

## TRANSACTION TOOLS (2)
| Component | Purpose |
|-----------|---------|
| `transaction-composer.tsx` | BOND/UNBOND memo generator with copy-to-clipboard |
| `transaction-history.tsx` | Past BOND/UNBOND events from Midgard `/v2/actions` |

## CONVENTIONS

**Styling**: Tailwind zinc palette, `border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg`. Numbers use `font-mono`. Labels use `text-zinc-500 text-sm`.

**Charts**: Always wrap in `<ResponsiveContainer width="100%" height={300}>`. Timestamps from Midgard are nanoseconds — divide by `1e9` then format with `new Date(seconds * 1000)`.

**Empty states**: Show centered text-zinc-500 message when data is empty.

**Loading states**: Use `animate-pulse` with `bg-zinc-200 dark:bg-zinc-800` skeleton divs.

## ANTI-PATTERNS
- Never import API functions directly — use hooks from `src/lib/hooks/`
- Never use raw `Number()` on RUNE amounts — use formatters
- Never create new chart components without ResponsiveContainer
- Never hardcode colors — use Tailwind zinc/emerald/red/yellow/blue palette
