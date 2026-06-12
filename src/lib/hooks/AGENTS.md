# SWR Hooks — Data Fetching Layer

**24 hooks** — all follow `useSWR<T>(key, fetcher, options)` pattern. Return `{ data, isLoading, error }` plus derived values.

## WHERE TO LOOK
| Need | File |
|------|------|
| Bond position data | `use-bond-positions.ts` — `BondPosition[]` with `yieldGuardFlags` |
| Bond history | `use-bond-history.ts` — `history` + `bondActions` from Midgard |
| Earnings/rewards | `use-earnings.ts` — `EarningsHistoryRaw` from Midgard |
| RUNE price (Midgard) | `use-rune-price.ts` — current USD price |
| RUNE price (CoinAPI) | `use-coinapi-price.ts` — historical price lookups |
| Historical APY | `use-historical-apy.ts` — APY time series |
| Network params | `use-network-constants.ts` — `int_64_values` from `/constants` |
| Saved addresses | `use-watchlist.ts` — localStorage persistence |
| Wallet connection | `use-wallet.ts` — Keplr/XDEFI/Vultisig support |
| All network nodes | `use-all-nodes.ts` — all nodes from THORNode |
| Churn countdown | `use-churn-countdown.ts` — time to next churn |
| Network metrics | `use-network-metrics.ts` — TVL, bond-to-pool ratio, total bond |
| Current block height | `use-current-block-height.ts` — from Midgard `/v2/health` |
| Node rankings | `use-node-rankings.ts` — rank in active set, percentile, at-risk |
| Protocol version | `use-protocol-version.ts` — version compare, upgrade alert trigger |
| Changelogs | `use-changelogs.ts` — sorted changelog entries from TCC/TCU |
| LP positions | `use-lp-positions.ts` — combined Thornode/Midgard LP valuation |
| API health | `use-api-health.ts` — probes THORNode/Midgard, flips to `down` after 3 failures |
| THORName | `use-thorname.ts` — reverse lookup (non-blocking, degraded-safe) |
| Wallet balance | `use-wallet-balance.ts` — connected wallet RUNE balance |
| Yield benchmarks | `use-yield-benchmarks.ts` — network APY percentiles |
| Alerts | `use-alerts.ts` — provider-backed dashboard alert state and generated actionable alerts |
| Pending transactions | `use-pending-transactions.ts` — in-flight tx tracking |

## REFRESH INTERVALS
| Hook | Interval |
|------|----------|
| Bond positions | 60s |
| Earnings | 300s |
| Price | 300s |
| Network constants | no auto-refresh (`revalidateOnFocus: false`) |
| API health | 30s |

## KEY PATTERNS

**useBondPositions**: Fetches ALL nodes then filters by address via `extractBondPositions()`. Returns `BondPosition[]` with `yieldGuardFlags: YieldGuardFlag[]`. Uses Midgard health for current block height (jail status). Skips when address is null.

**useBondHistory**: Fetches via Midgard `/v2/bonds/{address}` + `/v2/actions`. Action type detection fallback chain: `metadata.refund.txType` -> `action.type` -> `metadata.bond` -> `memo.startsWith('BOND:')`.

**useLpPositions**: Combines Thornode pool data + Midgard member data. Distinguishes `empty` from `upstream failure`. Degrades to `current-only` when historical entry pricing unavailable. Never surfaces fake `0.00%` performance metrics.

**useApiHealth**: Probes `getHealth()` + `getAllNodes()`. Three consecutive failures mark API `down`. Triggers `ApiHealthBanner`.

**useChangelogs**: Embedded changelog dataset. Returns `ChangelogItem[]` sorted newest-first by `sortDate`. URL sync: `?q=` search, `?type=` filter.

**useWallet**: Returns `{ address, walletType, chainId, isConnected, isConnecting, error, networkMismatch, connect, disconnect }`. Persists to `localStorage`. Detection order: Keplr -> XDEFI -> Vultisig.

**useAlerts**: Dashboard routes share alert preferences and generated alerts through `AlertProvider` / `useAlertsContext()`. Settings pages must consume the provider state so preference changes immediately affect live alert checks.

## ANTI-PATTERNS
- Never call API functions directly in components — always use hooks
- Never use `useSearchParams()` inside a hook — pass address as parameter
- Never mutate SWR cache directly — use `mutate()` from the hook return
- Never let THORName lookup failure break dashboard rendering
