# API Layer — THORNode + Midgard

**3 files**: `client.ts` (base fetch), `thornode.ts` (THORNode API), `midgard.ts` (Midgard API)

## WHERE TO LOOK
| Need | File |
|------|------|
| Add new THORNode endpoint | `thornode.ts` — add interface + function using `fetchThornode<T>()` |
| Add new Midgard endpoint | `midgard.ts` — add interface + function using `fetchMidgard<T>()` |
| Change caching/retry | `client.ts` — `next: { revalidate: 60 }` |
| Base URLs | `src/lib/config.ts` — `ENDPOINTS` object |

## CONVENTIONS

**Type pattern**: Every endpoint function returns a typed `Promise<T>`. Define the `Raw` interface in the same file.

**THORNode amounts**: All numeric amounts are strings in 1e8 units (e.g. `"2507476277808"`). Never parse as `Number()` directly — use `runeToNumber()` from formatters.

**Jail field**: `NodeRaw.jail` is `{ release_height: number; reason: string }` when jailed, or `Record<string, never>` (empty object) when not. A node is ONLY jailed when `jail.release_height > current_block_height`. Use `getHealth()` to get current block height from Midgard.

**Current block height**: Always fetch from Midgard `/v2/health` (returns `lastThorNode.height`), NOT from node `active_block_height` which can be stale by thousands of blocks.

**Midgard timestamps**: All timestamps are nanosecond strings. Divide by `1e9` for seconds.

## ENDPOINTS

**THORNode** (base: `gateway.liquify.com/chain/thorchain_api`):
- `getAllNodes()` → `/thorchain/nodes`
- `getNode(address)` → `/thorchain/node/{address}`
- `getNetworkConstants()` → `/thorchain/constants`
- `getSupply()` → `/thorchain/supply`

**Midgard** (base: `gateway.liquify.com/chain/thorchain_midgard`):
- `getHealth()` → `/v2/health` — returns `lastThorNode.height` for current block (use for jail detection)
- `getBondDetails(address)` → `/v2/bonds/{address}`
- `getChurns()` → `/v2/churns`
- `getEarningsHistory(interval?, count?)` → `/v2/history/earnings`
- `getRunePriceHistory(interval, count)` → `/v2/history/rune`
- `getNetwork()` → `/v2/network`
- `getActions(address, count)` → `/v2/actions`

## ANTI-PATTERNS
- Never modify `client.ts` when adding endpoints — only add to `thornode.ts` or `midgard.ts`
- Never use raw `fetch()` — always use `fetchThornode<T>()` or `fetchMidgard<T>()`
- Never hardcode base URLs — import `ENDPOINTS` from config
