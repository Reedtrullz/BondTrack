# THORChain Data Conventions

Shared reference for Heimdall and tcwiki. Use this before changing THORChain API clients, live-data charts, LP valuation, APY/yield display, or explanatory copy.

## Scope

- Heimdall is the canonical provider-exposure command center for THORChain bond providers and liquidity providers.
- tcwiki is the public knowledge layer.
- Both projects may show THORChain live data, but neither should invent precision or silently change units at UI boundaries.

## Endpoint routing

### Midgard

Default order:

1. `https://gateway.liquify.com/chain/thorchain_midgard`
2. `https://midgard.thorchain.network`

Use Midgard for:

- Network health and block height (`/v2/health`).
- Pools, pool stats, volume, earnings, liquidity history.
- Actions/transaction history.

Rules:

- tcwiki currently uses `/v2`-suffixed Midgard base URLs in `src/lib/api/midgard.ts`; keep both Liquify and public Midgard fallback.
- Heimdall proxies Midgard through Next.js API routes to avoid browser CORS and centralize fallback/error handling.
- Treat Midgard upstream 5xx as degraded data, not as proof that the user has no positions or that protocol values are zero.

### THORNode / Thornode

Default Liquify THORNode path:

- `https://gateway.liquify.com/chain/thorchain_api/thorchain`

Use THORNode for:

- Node objects and bond state.
- Network constants and supply where Midgard is not the correct source.
- Transaction composition inputs where live node state matters.

Rules:

- Do not use or document `gateway.liquify.com/chain/thorchain_mainnet`; it is a legacy invalid path and has returned HTTP 500.
- In Heimdall, the `/api/thorchain/[...path]` proxy strips one leading `thorchain/` segment before allowlist checks. Do not remove this normalization; frontend calls may already include `/thorchain/...` and the upstream base URL also ends in `/thorchain`.
- Keep proxy allowlists explicit. Adding a route means adding a typed client function and a reason for why the endpoint is safe to expose.

## Units and numeric boundaries

### RUNE base units

- THORChain RUNE amounts are commonly represented as integer strings in base units where `1 RUNE = 100_000_000` (`1e8`) base units.
- Keep raw API amounts as strings or bigint-safe values until the final calculation/display boundary.
- Convert exactly once. Do not divide by `1e8` in a data hook and then pass the already-converted number to a formatter that expects base units.
- When precision matters, prefer integer math or explicit conversion helpers over `parseFloat`/`Number` sprinkled through UI components.

Boundary labels:

- `baseUnits`: integer string/bigint in 1e8 units.
- `rune`: decimal RUNE value after exactly one 1e8 conversion.
- `usd`: fiat valuation after applying a price source.

### APY and percentages

APY fields can cross project boundaries as either decimals or percentages. Make the boundary explicit:

- Decimal: `0.12` means `12%`.
- Percentage: `12` means `12%`.

Rules:

- Normalize once at the API/client boundary and name the value accordingly (`apyDecimal`, `apyPercent`).
- Never infer APY scale from display formatting alone.
- Tests or fixtures must include at least one value below `1` and one value above `100` to catch double-multiply / missed-multiply errors.
- UI labels should say `APY` or `%` only after the value has been normalized to a display percentage.

### Timestamps

- Midgard action timestamps may arrive as nanosecond strings. Convert nanoseconds to seconds before `Date` construction.
- Store/display timestamps with a source and freshness boundary where user trust depends on recency.

## LP valuation provenance

Historical LP P/L, impermanent loss, and realized performance require historical pricing and position state.

Required inputs for historical P/L / IL claims:

- Deposit/withdrawal action history for the address and pool.
- Asset units and RUNE units at the relevant event times.
- Historical RUNE price and asset price at those event times.
- Current pool state for current valuation.

If any required historical input is missing:

- Show `current-only` valuation instead of historical P/L.
- Do not label current-only fallback as realized P/L, net profit, historical return, or IL.
- Show copy such as `Current-only estimate` or `Estimated from current pool state; historical entry pricing unavailable`.
- Keep raw missing-data reason visible to developers/operators when useful, but sanitize noisy upstream errors for end users.

Recommended labels:

- `Current value` — OK when based on current pool and price data.
- `Current-only estimate` — OK when entry history/pricing is missing.
- `Historical P/L` — only when historical inputs are complete.
- `Impermanent loss` — only when the entry basis and current state are both known.

Forbidden labels for incomplete provenance:

- `Realized P/L` without withdrawal/settlement basis.
- `Net P/L` when only current value is known.
- `0.00%` as a fallback for unknown performance.

## UI copy and trust posture

Use careful copy when provenance is incomplete:

- Prefer `estimated`, `current-only`, `unavailable`, `degraded`, or `source did not respond` over silent zeros.
- Include source names when it affects trust: Midgard, THORNode, CoinAPI, CoinGecko, Liquify gateway, public fallback.
- Distinguish `no positions found` from `positions could not be loaded`.
- Avoid fake precision: round user-facing values and show confidence/provenance rather than many decimals.
- Do not present dashboard estimates as financial, tax, or transaction advice.

## Test and review checklist

Before shipping live-data or valuation changes:

- [ ] Unit tests cover 1e8 conversion exactly once.
- [ ] APY tests cover decimal and percent-shaped inputs.
- [ ] Upstream failure tests show degraded/error copy, not zero data.
- [ ] LP valuation tests distinguish historical P/L from current-only valuation.
- [ ] UI copy uses `estimated/current-only` when provenance is incomplete.
- [ ] README/CONTRIBUTING links remain in sync across Heimdall and tcwiki.
