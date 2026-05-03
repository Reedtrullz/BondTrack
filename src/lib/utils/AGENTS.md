# Utils — Utility Functions

## FILES

| File | Purpose | Exports |
|------|---------|----------|
| `calculations.ts` | Bond math, APY, rank, security | `calculateAPY`, `calculateBondShare`, `calculateBondRank`, `calculateJailBlocksRemaining`, `calculateNetworkSecurityState` |
| `formatters.ts` | Number/amount formatting | `runeToNumber`, `formatRuneAmount`, `formatBasisPoints` |
| `yield-benchmarks.ts` | Network APY percentiles | `fetchYieldBenchmarks`, `YieldBenchmarks`, `getYieldPerformanceColor` |
| `bond-optimizer.ts` | Optimization suggestions | `analyzeBondOptimization`, `OptimizationSuggestion` |
| `health-score.ts` | Portfolio health | `calculatePortfolioHealth`, `getGradeColor`, `HealthGrade` |
| `portfolio-alerts.ts` | Alert generation | `generateActionableAlerts`, `ActionableAlert` |
| `fee-calculations.ts` | Fee impact | `calculateFeeImpact`, `calculateNetEarnings` |
| `il-calculator.ts` | Impermanent Loss | `calculateIL`, `calculateILUSD` — XYK formula-based IL for LP positions |
| `tax-export.ts` | Tax reporting | `generateTaxReport`, `exportToCSV` — FIFO cost basis for bond + LP income |
| `export.ts` | CSV export | `exportPositionsToCSV` |

## CONVENTIONS

**RUNE amounts**: Always in 1e8 units. Use `runeToNumber()` for display, `BigInt()` for math.

**APY benchmarks**: Fetched from network data — compute real percentiles from active node APYs.