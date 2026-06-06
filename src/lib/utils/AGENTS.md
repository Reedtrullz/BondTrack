# Utils — Utility Functions

**15 files** — pure functions for formatting, calculations, health scoring, LP analytics, and export.

## FILES

| File | Purpose | Key Exports |
|------|---------|-------------|
| `calculations.ts` | Bond math, APY, rank, security | `calculateAPY`, `calculateBondShare`, `calculateBondRank`, `calculateJailBlocksRemaining`, `calculateNetworkSecurityState` |
| `formatters.ts` | Number/amount formatting | `runeToNumber`, `formatRuneAmount`, `formatBasisPoints` |
| `yield-benchmarks.ts` | Network APY percentiles | `fetchYieldBenchmarks`, `YieldBenchmarks`, `getYieldPerformanceColor` |
| `bond-optimizer.ts` | Optimization suggestions | `analyzeBondOptimization`, `OptimizationSuggestion` |
| `bond-export.ts` | Bond position export helpers | Bond CSV formatting |
| `health-score.ts` | Portfolio health | `calculatePortfolioHealth`, `getGradeColor`, `HealthGrade` |
| `portfolio-alerts.ts` | Alert generation | `generateActionableAlerts`, `ActionableAlert` |
| `fee-calculations.ts` | Fee impact | `calculateFeeImpact`, `calculateNetEarnings` |
| `il-calculator.ts` | Impermanent Loss | `calculateIL`, `calculateILUSD` — XYK formula-based |
| `lp-analytics.ts` | LP position analytics | LP valuation helpers, performance calculations |
| `pool.ts` | Pool data utilities | Pool-specific helpers |
| `tax-export.ts` | Tax reporting | `generateTaxReport`, `exportToCSV` — FIFO cost basis for bond + LP income |
| `export.ts` | CSV export | `exportPositionsToCSV` |

## CONVENTIONS

**RUNE amounts**: Always in 1e8 units. Use `runeToNumber()` for display, `BigInt()` for math.

**APY benchmarks**: Fetched from network data — compute real percentiles from active node APYs.

**Tax export**: FIFO cost basis. Combines bond income + LP income. Server-side aggregation via `/api/tax-report`.

## TEST COVERAGE
Tests in `__tests__/` cover: calculations, config, network-security, lp-analytics, il-calculator, fee-calculations, fee-revenue, tax-export, mock-data. Plus colocated `calculations.test.ts` and `formatters.test.ts`.

## ANTI-PATTERNS
- Never use raw `Number()` on RUNE strings — use `runeToNumber()`
- Never divide APY by 100 when it's already a decimal — check `docs/thorchain-data-conventions.md`
