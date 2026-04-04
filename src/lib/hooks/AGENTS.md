# SWR Hooks — Data Fetching Layer

**6 hooks**: `use-bond-positions`, `use-earnings`, `use-network-constants`, `use-rune-price`, `use-watchlist`, `use-wallet`

## WHERE TO LOOK
| Need | File |
|------|------|
| Bond position data | `use-bond-positions.ts` — returns `BondPosition[]` from THORNode nodes |
| Earnings/rewards data | `use-earnings.ts` — returns `EarningsHistoryRaw` from Midgard |
| RUNE price | `use-rune-price.ts` — returns current USD price |
| Network params | `use-network-constants.ts` — returns `int_64_values` from `/constants` |
| Saved addresses | `use-watchlist.ts` — localStorage persistence |
| Wallet connection | `use-wallet.ts` — Keplr/XDEFI/Vultisig support |

## CONVENTIONS

**SWR pattern**: All hooks use `useSWR<T>(key, fetcher, options)`. Key is string or array. Null key = skip fetch.

**Refresh intervals**:
- Bond positions: 60s (`refreshInterval: 60_000`)
- Earnings: 300s (`refreshInterval: 300_000`)
- Price: 300s (`refreshInterval: 300_000`)
- Network constants: no auto-refresh (`revalidateOnFocus: false`)

**Return shape**: Always `{ data, isLoading, error }` plus any derived values.

**useBondPositions**: Special — fetches ALL nodes then filters by address via `extractBondPositions()`. Returns derived `BondPosition[]` objects, not raw API data.

**useWatchlist**: Client-only (`'use client'`). Uses localStorage. Returns `addAddress`, `removeAddress`, `getAddresses`, `isAddressSaved`, plus `isLoaded` flag for hydration safety.

**useWallet**: Returns `{ address, walletType, chainId, isConnected, isConnecting, error, networkMismatch, connect, disconnect }`. Supports `keplr`, `xdefi`, `vultisig`. Detects network mismatch (mainnet vs stagenet).

## ANTI-PATTERNS
- Never call API functions directly in components — always use hooks
- Never use `useSearchParams()` inside a hook — pass address as parameter
- Never mutate SWR cache directly — use `mutate()` from the hook return
