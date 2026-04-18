# SWR Hooks — Data Fetching Layer

**13 hooks**: `use-bond-positions`, `use-bond-history`, `use-earnings`, `use-network-constants`, `use-rune-price`, `use-watchlist`, `use-wallet`, `use-all-nodes`, `use-churn-countdown`, `use-network-metrics`, `use-current-block-height`, `use-node-rankings`, `use-changelogs`

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
| Changelogs | `use-changelogs.ts` — returns sorted changelog entries from TCC/TCU Medium publication |

## useChangelogs

Data source for the Changelogs dashboard page (`/dashboard/changelogs`). Returns changelog entries sorted newest-first by `sortDate`.

**Interface:**
```typescript
interface ChangelogItem {
  id: string;           // Unique identifier (e.g., '2023-09', '2026-03')
  title: string;        // Key highlights from the period (NOT the date!)
  date: string;         // Short display: "Mar 2026"
  fullDate: string;     // Full display: "March 2026" 
  sortDate?: string;   // For sorting: "2026-03" or "2022-08-15" for bi-weekly
  content: ChangelogEntry[];
}

interface ChangelogEntry {
  type: 'update' | 'adr' | 'chain' | 'feature' | 'bug';
  title: string;
  description: string;
  links?: { text: string; url: string }[];
}
```

**URL Sync**: Search and filter state sync to URL params:
- `?q=Solana` — search query
- `?type=bug` — type filter (update|adr|chain|feature|bug)
- `?q=Solana&type=bug` — combined

**Current deployed QA caveat**: On `dev.thorchain.no`, changelog year navigation works, but search input, type filters, and entry-button interactions are currently part of the active remediation scope. Keep docs and tests aligned with the deployed behavior being fixed.

**Search Highlighting**: Matching text in titles and descriptions is highlighted with yellow background.

**Keyboard Shortcuts**:
- `/` — focus search input
- `Esc` — clear search/filters and close search

**localStorage**: Collapsed/expanded state persists across sessions (key: `changelogs-expanded`).

**Sorting**: Entries sorted newest-first using `sortDate`. Format: `YYYY-MM` for monthly, `YYYY-MM-DD` for bi-weekly.

**Adding new entries**: When adding entries from TCC/TCU Medium:
1. Use the period from the article title (e.g., "End Aug 2022" → id: "2022-08", sortDate: "2022-08")
2. Set `title` to key highlights (extract from article content), NOT just the date
3. Set `date` to short month/year format (e.g., "Aug 2022")
4. Set `fullDate` to same as date or descriptive (e.g., "August 2022")
5. Add multiple content entries with appropriate `type`
6. ID format: `YYYY-MM` for monthly, `YYYY-MM-DD` for bi-weekly entries

## CONVENTIONS

**SWR pattern**: All hooks use `useSWR<T>(key, fetcher, options)`. Key is string or array. Null key = skip fetch.

**Refresh intervals**:
- Bond positions: 60s (`refreshInterval: 60_000`)
- Earnings: 300s (`refreshInterval: 300_000`)
- Price: 300s (`refreshInterval: 300_000`)
- Network constants: no auto-refresh (`revalidateOnFocus: false`)

**Return shape**: Always `{ data, isLoading, error }` plus any derived values.

**useBondPositions**: Fetches ALL nodes then filters by address via `extractBondPositions()`. Returns derived `BondPosition[]` with `yieldGuardFlags: YieldGuardFlag[]` property. Fetches network constants (OptimalBondD) for Yield Guard calculation — skips when address is null. Uses Midgard health for current block height to correctly determine jail status.

**useBondHistory**: Fetches bond details via Midgard `/v2/bonds/{address}` and action history via `/v2/actions?txType=bond,unbond,leave&limit=50`. Returns `history: BondHistory` (initialBond, currentBond, bondGrowth, dates) and `bondActions: BondAction[]` where bond/addLiquidity events map to `BOND` and exit events (`unbond`, `unstake`, `leave`) map to `UNBOND`.

**useWatchlist**: Client-only (`'use client'`). Uses localStorage. Returns `addAddress`, `removeAddress`, `getAddresses`, `isAddressSaved`, plus `isLoaded` flag for hydration safety.

**useWallet**: Returns `{ address, walletType, chainId, isConnected, isConnecting, error, networkMismatch, connect, disconnect }`. Supports `keplr`, `xdefi`, `vultisig`. Detects network mismatch (mainnet vs stagenet).

**LP/member-backed hooks**: Any hook using Midgard member data must distinguish `empty` from `upstream failure`. The deployed LP route currently needs an explicit degraded/error state when `/v2/member/{address}` fails.

**useCurrentBlockHeight**: Fetches real-time block height from Midgard `/v2/health`. Returns `currentBlockHeight` (primary source for jail detection). Falls back to node-derived height if unavailable. Use this for any jail-related calculations.

## ANTI-PATTERNS
- Never call API functions directly in components — always use hooks
- Never use `useSearchParams()` inside a hook — pass address as parameter
- Never mutate SWR cache directly — use `mutate()` from the hook return
