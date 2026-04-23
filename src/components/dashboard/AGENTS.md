# Dashboard Components

**18 components** across 5 categories: data display, charts, risk monitors, transaction tools, network comparison.

## DATA DISPLAY (5)
| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `portfolio-summary.tsx` | 4-card grid: total bonded, RUNE price, weighted APY, position count | `totalBonded`, `runePrice`, `weightedAPY`, `positionCount` |
| `position-table.tsx` | Table of bond positions with share%, fee, APY columns | `positions: BondPosition[]` |
| `node-status-card.tsx` | Single node detail card with status, bond, slash points, warnings | `position: BondPosition`, `currentBlockHeight?` |
| `status-badge.tsx` | Color-coded status pill (Active/Standby/Ready/Disabled/Jailed) | `status`, `isJailed?` |
| `pooled-node-details.tsx` | Shows accumulated rewards from all bonded nodes | `positions: BondPosition[]` |

## CHARTS (4) — All use Recharts ResponsiveContainer
| Component | Data Source | Chart Type |
|-----------|-------------|------------|
| `price-chart.tsx` | Midgard `/v2/history/rune` | LineChart |
| `apy-chart.tsx` | Midgard `/v2/history/earnings` | AreaChart |
| `fee-impact-tracker.tsx` | Earnings + operator fee calc | BarChart |
| `auto-compound-chart.tsx` | Earnings intervals → cumulative bond | AreaChart |

## RISK MONITORS (5)
| Component | Purpose |
|-----------|---------|
| `slash-monitor.tsx` | Your nodes' slash points (OK/Warning/Critical), jail countdown. Shows only your bonded nodes. |
| `churn-out-risk.tsx` | Your nodes' rank in active set, bottom 33% flagged as at-risk. Shows only your nodes with ranking. |
| `network-security-metrics.tsx` | **Incentive Pendulum** - pendulum status (LP Favored below `1.5x`, Node Favored above `2.5x`), estimated reward split, effective security (bottom 2/3 nodes), bond-to-pool ratio. |
| `unbond-window-tracker.tsx` | Your nodes' unbond eligibility (can unbond vs locked), next churn countdown. Shows only your nodes. |
| `network-comparison-table.tsx` | Compare your bond positions vs network averages |

## NETWORK COMPARISON (1)
| Component | Purpose |
|-----------|---------|
| `network-comparison-table.tsx` | Compare bond/slash/fee vs network averages for each node |

## TRANSACTION TOOLS (2)
| Component | Purpose |
|-----------|---------|
| `transaction-composer.tsx` | BOND/UNBOND memo generator with copy-to-clipboard |
| `transaction-history.tsx` | Past BOND/UNBOND exit events from Midgard `/v2/actions` using `txType=bond,unbond,leave` |

## CURRENT DEPLOYED QA NOTES

- **Overview quick actions**: `Bond More` and `Unbond` must preserve the intended transaction mode. The deployed dev site currently does not.
- **Transaction composer UX**: the deployed dev site still needs clearer UNBOND-mode behavior and visible success feedback for copy actions.
- **Notification prompt**: any prompt or toast shown above the dashboard must never block top-right controls like refresh/theme toggle.
- **Rewards controls**: `Edit initial bond`, `Optimize Now`, and chart-range buttons need visible, intentional responses on the deployed dev site; the `30D,` label oddity is a known live issue.
- **Changelogs**: year buttons work on deployed dev, but search/filter/entry-button interactions remain under active remediation.
- **LP route**: the live LP route now renders an explicit degraded/error state for upstream member failures, a truthful missing-address state, and a pricing-confidence banner when historical entry pricing is unavailable. Remaining live caveat: upstream Midgard pool-history `502` responses can still force `current-only` valuation.

## CONVENTIONS

**Styling**: Tailwind zinc palette, `border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg`. Numbers use `font-mono`. Labels use `text-zinc-500 text-sm`.

**Charts**: Always wrap in `<ResponsiveContainer width="100%" height={300}>`. Timestamps from Midgard are nanoseconds — divide by `1e9` then format with `new Date(seconds * 1000)`.

**Empty states**: Show centered text-zinc-500 message when data is empty.

**Loading states**: Use `animate-pulse` with `bg-zinc-200 dark:bg-zinc-800` skeleton divs.

**Degraded states**: When upstream data fails, show an honest route/component-level degraded state. Do not rely on ambiguous empty shells or controls that appear interactive but do nothing.

## ANTI-PATTERNS
- Never import API functions directly — use hooks from `src/lib/hooks/`
- Never use raw `Number()` on RUNE amounts — use formatters
- Never create new chart components without ResponsiveContainer
- Never hardcode colors — use Tailwind zinc/emerald/red/yellow/blue palette
