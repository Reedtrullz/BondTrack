# API Layer — THORNode + Midgard

**3 files**: `client.ts` (base fetch), `thornode.ts` (THORNode API), `midgard.ts` (Midgard API)
**2 API proxy routes**: `/api/midgard/[...path]`, `/api/thorchain/[...path]`

## WHERE TO LOOK
| Need | File |
|------|------|
| Add new THORNode endpoint | `thornode.ts` — add interface + function using `fetchThornode<T>()` |
| Add new Midgard endpoint | `midgard.ts` — add interface + function using `fetchMidgard<T>()` |
| Change caching/retry | `client.ts` — `next: { revalidate: 60 }` |
| Base URLs | `src/lib/config.ts` — `ENDPOINTS` object |
| API proxy config | `src/app/api/midgard/` and `src/app/api/thorchain/` routes |

## API PROXY (CORS Workaround)

All API calls go through Next.js server-side proxy routes to bypass browser CORS restrictions:

- **THORNode proxy**: `src/app/api/thorchain/[...path]/route.ts`
- **Midgard proxy**: `src/app/api/midgard/[...path]/route.ts`

The proxies:
1. Receive requests from the frontend
2. Forward to external Midgard/THORNode APIs server-side (no CORS)
3. Return data to frontend with CORS headers

The proxy tries ninerealms first (`midgard.ninerealms.com`), then falls back to liquify (`gateway.liquify.com`), then `midgard.thorchain.network`.

## CONVENTIONS

**Type pattern**: Every endpoint function returns a typed `Promise<T>`. Define the `Raw` interface in the same file.

**THORNode amounts**: All numeric amounts are strings in 1e8 units (e.g. `"2507476277808"`). Never parse as `Number()` directly — use `runeToNumber()` from formatters.

**Jail field**: `NodeRaw.jail` is `{ release_height: number; reason: string }` when jailed, or `Record<string, never>` (empty object) when not. A node is ONLY jailed when `jail.release_height > current_block_height`. Use `getHealth()` to get current block height from Midgard.

**Current block height**: Always fetch from Midgard `/v2/health` (returns `lastThorNode.height`), NOT from node `active_block_height` which can be stale by thousands of blocks.

**Midgard timestamps**: All timestamps are nanosecond strings. Divide by `1e9` for seconds.

**Midgard actions**: `getActions()` uses the `txType` query parameter for bond/unbond/leave history lookups. Keep `limit <= 50` because Midgard documents 50 as the maximum for `/v2/actions`.

**THORName reverse lookup**: Any Midgard reverse-lookup endpoint used for THORName display should be treated as optional UX enrichment, not a hard dependency for dashboard rendering. On the deployed dev site, reverse lookup has produced repeated 502s; callers should document and handle that as a degraded non-fatal path.

**Amount display**: When displaying amounts in UI, multiply by `1e8` before passing to `formatRuneAmount()` because the parsed value is already in RUNE units (divided by 1e8), but the formatter expects 1e8 units.

## ENDPOINTS

**THORNode** (proxied via `/api/thorchain`):
- `getAllNodes()` → `/thorchain/nodes`
- `getNode(address)` → `/thorchain/node/{address}`
- `getNetworkConstants()` → `/thorchain/constants`
- `getSupply()` → `/thorchain/supply`

**Midgard** (proxied via `/api/midgard`):
- `getHealth()` → `/v2/health` — returns `lastThorNode.height` for current block (use for jail detection)
- `getBondDetails(address)` → `/v2/bonds/{address}`
- `getChurns()` → `/v2/churns`
- `getEarningsHistory(interval?, count?)` → `/v2/history/earnings`
- `getRunePriceHistory(interval, count)` → `/v2/history/rune`
- `getNetwork()` → `/v2/network`
- `getActions(address, limit, txType?)` → `/v2/actions` — use `txType` for `bond`, `unbond`, `leave`; reserve `type` for action categories like `swap` or `addLiquidity`

## ANTI-PATTERNS
- Never modify `client.ts` when adding endpoints — only add to `thornode.ts` or `midgard.ts`
- Never use raw `fetch()` — always use `fetchThornode<T>()` or `fetchMidgard<T>()`
- Never hardcode base URLs — import `ENDPOINTS` from config
- Never call external APIs directly from browser — use the proxy routes
- Never let THORName reverse lookup failure break the dashboard shell or spam user-facing flows without graceful fallback
