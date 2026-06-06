# API Layer — THORNode + Midgard

**7 files**: `client.ts` (base fetch + retry), `thornode.ts` (THORNode API), `midgard.ts` (Midgard API), `coinapi.ts` (RUNE price), `coingecko.ts` (RUNE price fallback), `rate-limit.ts` (per-route rate limiting)
**8 API proxy routes**: `/api/midgard/[...path]`, `/api/thorchain/[...path]`, `/api/coingecko/[...path]`, `/api/coinapi/rune-price`, `/api/health`, `/api/address/[address]`, `/api/pools/[pool]`, `/api/tax-report`

## WHERE TO LOOK
| Need | File |
|------|------|
| Add new THORNode endpoint | `thornode.ts` — add interface + function using `fetchThornode<T>()` |
| Add new Midgard endpoint | `midgard.ts` — add interface + function using `fetchMidgard<T>()` |
| Change caching/retry | `client.ts` — `next: { revalidate: 60 }`, retry logic |
| Base URLs | `src/lib/config.ts` — `ENDPOINTS` object |
| API proxy config | `src/app/api/midgard/` and `src/app/api/thorchain/` routes |
| RUNE price (CoinAPI) | `coinapi.ts` — `getRunePriceAtDate()`, `getRunePriceRange()` |
| RUNE price (CoinGecko) | `coingecko.ts` — `getCoingeckoRunePrice()` |
| Rate limiting | `rate-limit.ts` — per-route request limits |

## CLIENT ARCHITECTURE

`client.ts` exports `fetchApi()`, `fetchThornode()`, `fetchMidgard()`:
- Retry up to 3 times with backoff on network/5xx errors
- `RetryableError` class for status-aware retry decisions
- `next: { revalidate: 60 }` default caching
- All requests go through local `/api/*` proxy routes (never direct to upstream)

## API PROXY (CORS Workaround)

All API calls go through Next.js server-side proxy routes to bypass browser CORS restrictions.

### Security headers

All API proxy responses must include the shared security header set from `src/lib/api/cors.ts`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`

Keep these merged with the CORS headers on every proxy response. Do not add CSP or HSTS here.

### THORNode proxy path normalisation (do not remove)

`fetchThornode()` calls paths like `/thorchain/nodes`, so the browser requests `/api/thorchain/thorchain/nodes`. The proxy:

1. Strips a leading `thorchain/` segment before applying the allowlist regex (`/^nodes$/`, `/^network$/`, …).
2. Appends what's left to `THORNODE_API_URL`, which already ends in `/thorchain`.

Wallet balances are the one root-level Cosmos SDK exception: `/api/thorchain/cosmos/bank/v1beta1/balances/{address}` is allowed and strips the final `/thorchain` from the Liquify base so it targets `.../chain/thorchain_api/cosmos/...`, not `.../thorchain/cosmos/...`.

If you remove the leading-segment strip, every request 403s, `useApiHealth` flips to `down`, and the "THORNode API is temporarily unavailable" banner appears.

### Liquify endpoint paths

- THORNode: `gateway.liquify.com/chain/thorchain_api/thorchain`
- Midgard: `gateway.liquify.com/chain/thorchain_midgard`
- Legacy `gateway.liquify.com/chain/thorchain_mainnet` returns HTTP 500 — **not valid**

### Rate limits
| Route | Limit |
|-------|-------|
| `/api/thorchain`, `/api/midgard` | 300/min |
| `/api/health`, `/api/coingecko` | 60/min |
| `/api/pools`, `/api/address` | 30/min |
| `/api/tax-report` | 10/min |
| `/api/coinapi` | 80/day |

### Proxy cache headers

- `/api/thorchain/*` successful responses add `Cache-Control: public, max-age=5`
- `/api/midgard/*` successful responses add `Cache-Control: public, max-age=30`
- Error responses stay uncached so rate-limit, auth, and upstream failure payloads are not reused by intermediaries
- CORS headers remain on the same responses; cache headers are additive, not a replacement

## CONVENTIONS

**Type pattern**: Every endpoint function returns a typed `Promise<T>`. Define `Raw` interfaces in the same file.

**THORNode amounts**: Strings in 1e8 units (e.g. `"2507476277808"`). Use `runeToNumber()` from formatters.

**Jail field**: `NodeRaw.jail` is `{ release_height, reason }` when jailed, or empty object when not. Jailed only when `jail.release_height > current_block_height`.

**Current block height**: Always from Midgard `/v2/health` (`lastThorNode.height`), NOT from node `active_block_height`.

**Midgard timestamps**: Nanosecond strings. Divide by `1e9` for seconds.

**Midgard actions**: `getActions()` uses `txType` parameter. Keep `limit <= 50`.

**Action type detection**: Check `metadata.refund.txType` first -> `action.type` -> memo prefixes.

**THORName reverse lookup**: Optional UX enrichment, not a hard dependency. Handle 502s as degraded non-fatal path.

## ANTI-PATTERNS
- Never modify `client.ts` when adding endpoints — only add to `thornode.ts` or `midgard.ts`
- Never use raw `fetch()` — always use `fetchThornode<T>()` or `fetchMidgard<T>()`
- Never hardcode base URLs — import `ENDPOINTS` from config
- Never call external APIs directly from browser — use the proxy routes
- Never let THORName reverse lookup failure break the dashboard
