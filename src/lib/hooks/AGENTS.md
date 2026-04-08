# SWR Hooks — Data Fetching Layer

**12 hooks**: `use-bond-positions`, `use-bond-history`, `use-earnings`, `use-network-constants`, `use-rune-price`, `use-watchlist`, `use-wallet`, `use-all-nodes`, `use-churn-countdown`, `use-network-metrics`, `use-current-block-height`, `use-node-rankings`

## WHERE TO LOOK
| Need | File |
|------|------|
| Bond position data | `use-bond-positions.ts` — returns `BondPosition[]` with `yieldGuardFlags` |
| Bond history | `use-bond-history.ts` — returns `history` and `bondActions` from Midgard |
| Earnings/rewards data | `use-earnings.ts` — returns `EarningsHistoryRaw` from Midgard |
| RUNE price | `use-rune-price.ts` — returns current USD price |
| Network params | `use-network-constants.ts` — returns `int_64_values` from `/constants` |
| Saved addresses | `use-watchlist.ts` — localStorage persistence |
| Wallet connection | `use-wallet.ts` — Keplr/XDEFI/Vultisig support |
| All network nodes | `use-all-nodes.ts` — returns all nodes from THORNode |
| Churn countdown | `use-churn-countdown.ts` — returns time to next churn |
| Network metrics | `use-network-metrics.ts` — returns TVL, bond-to-pool ratio, total bond |
| Current block height | `use-current-block-height.ts` — returns real-time block height from Midgard `/v2/health` |
| Node rankings | `use-node-rankings.ts` — computes user's node rank in active set, percentile, at-risk status |

## CONVENTIONS

**SWR pattern**: All hooks use `useSWR<T>(key, fetcher, options)`. Key is string or array. Null key = skip fetch.

**Refresh intervals**:
- Bond positions: 60s (`refreshInterval: 60_000`)
- Earnings: 300s (`refreshInterval: 300_000`)
- Price: 300s (`refreshInterval: 300_000`)
- Network constants: no auto-refresh (`revalidateOnFocus: false`)

**Return shape**: Always `{ data, isLoading, error }` plus any derived values.

**useBondPositions**: Fetches ALL nodes then filters by address via `extractBondPositions()`. Returns derived `BondPosition[]` with `yieldGuardFlags: YieldGuardFlag[]` property. Fetches network constants (OptimalBondD) for Yield Guard calculation — skips when address is null. Uses Midgard health for current block height to correctly determine jail status.

**useBondHistory**: Fetches bond details via Midgard `/v2/bonds/{address}` and actions via `/v2/actions?type=bond`. Returns `history: BondHistory` (initialBond, currentBond, bondGrowth, dates) and `bondActions: BondAction[]` (type, amount, date).

**useWatchlist**: Client-only (`'use client'`). Uses localStorage. Returns `addAddress`, `removeAddress`, `getAddresses`, `isAddressSaved`, plus `isLoaded` flag for hydration safety.

**useWallet**: Returns `{ address, walletType, chainId, isConnected, isConnecting, error, networkMismatch, connect, disconnect }`. Supports `keplr`, `xdefi`, `vultisig`. Detects network mismatch (mainnet vs stagenet).

**useCurrentBlockHeight**: Fetches real-time block height from Midgard `/v2/health`. Returns `currentBlockHeight` (primary source for jail detection). Falls back to node-derived height if unavailable. Use this for any jail-related calculations.

## ANTI-PATTERNS
- Never call API functions directly in components — always use hooks
- Never use `useSearchParams()` inside a hook — pass address as parameter
- Never mutate SWR cache directly — use `mutate()` from the hook return
