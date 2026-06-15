# Dashboard Components

**30 components** across 7 categories. All `'use client'`. Colocated tests + `__tests__/` grouping.

## PORTFOLIO & LP (6)
| Component | Purpose |
|-----------|---------|
| `portfolio-summary.tsx` | 4-card grid: total bonded, RUNE price, weighted APY, position count |
| `position-table.tsx` | Bond positions table with share%, fee, APY columns |
| `lp-summary-card.tsx` | Per-pool LP card with real asset symbols |
| `lp-node-row.tsx` | Single LP pool table row |
| `lp-status-badge.tsx` | LP position status pill (Active/Withdrawn/Unknown) |
| `il-calculator.tsx` | Impermanent Loss calculator column (default export) |

## NODE & NETWORK (5)
| Component | Purpose |
|-----------|---------|
| `node-status-card.tsx` | Single node detail: status, bond, slash points, warnings |
| `node-explorer.tsx` | Network-wide node browser with search/filter |
| `network-security-card.tsx` | Security metric display card |
| `network-security-metrics.tsx` | Incentive Pendulum: bond-to-pool ratio, reward split, effective security |
| `network-comparison-table.tsx` | Your bond/slash/fee vs network averages |

## CHARTS (5) — All Recharts ResponsiveContainer
| Component | Data Source | Chart Type |
|-----------|-------------|------------|
| `price-chart.tsx` | Midgard `/v2/history/rune` | LineChart |
| `apy-chart.tsx` | Midgard `/v2/history/earnings` | AreaChart |
| `fee-impact-tracker.tsx` | Earnings + operator fee calc | BarChart |
| `fee-revenue-chart.tsx` | 30-day fee revenue history | AreaChart |
| `auto-compound-chart.tsx` | Earnings intervals cumulative | AreaChart |

## RISK (4)
| Component | Purpose |
|-----------|---------|
| `slash-monitor.tsx` | Your nodes' slash points with severity (OK/Warning/Critical), jail countdown |
| `churn-out-risk.tsx` | Your nodes' rank in active set, bottom 33% flagged |
| `unbond-window-tracker.tsx` | Per-node unbond eligibility + next churn countdown |
| `risk-radar.tsx` | Multi-axis risk radar chart |

## REWARDS & FEES (4)
| Component | Purpose |
|-----------|---------|
| `pnl-dashboard.tsx` | PnL with editable initial bond, fee breakdown, summary cards |
| `bond-simulator.tsx` | Bond projection simulator with presets and result cards |
| `fee-revenue-summary.tsx` | Fee revenue aggregation display |
| `tax-export.tsx` | Tax CSV export trigger (default export) |

## TRANSACTION (2)
| Component | Purpose |
|-----------|---------|
| `transaction-composer.tsx` | BOND/UNBOND memo generator with wallet signing + copy feedback |
| `transaction-history.tsx` | Past BOND/UNBOND events from Midgard `/v2/actions` |

## MISC (4)
| Component | Purpose |
|-----------|---------|
| `churn-countdown.tsx` | Time-to-next-churn display |
| `upgrade-alert-banner.tsx` | Protocol version mismatch alert |
| `market-overview.tsx` | Market data summary panel |
| `intelligence-feed.tsx` | Network intelligence feed |

## CONVENTIONS

**Styling**: Tailwind zinc palette, `border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg`. Numbers: `font-mono`. Labels: `text-zinc-500 text-sm`.

**Charts**: Always use `<ResponsiveContainer>` with a stable positive height and `minWidth={1}` / `minHeight={1}` so Recharts never receives zero or negative layout measurements. Midgard timestamps are nanoseconds — divide by `1e9`.

**States**: Skeleton loaders (`animate-pulse bg-zinc-200 dark:bg-zinc-800`), centered `text-zinc-500` empty states, honest degraded states for upstream failures.

## ANTI-PATTERNS
- Never import API functions directly — use hooks from `src/lib/hooks/`
- Never use raw `Number()` on RUNE amounts — use `runeToNumber()`
- Never create charts without ResponsiveContainer
- Never hardcode colors — use Tailwind zinc/emerald/red/yellow/blue palette
