# LP Status Trust Rebuild — Resolution Summary

## Status

Completed on the `staging` branch and verified on `https://dev.thorchain.no`.

Key commits:
- `1ef0588` — typed LP USD valuation data
- `d7185ec` — USD portfolio hero
- `301f589` — truthful missing-address state
- `6fbbdef` — correct LP asset pricing end-to-end
- `9738f75` — investor-language LP cards and rows
- `5a68c0d` — pricing-confidence banner
- `795169e` — stale LP code-path cleanup

## What was fixed

### 1. Mixed-unit LP summary metrics were removed
The LP route no longer aggregates heterogeneous asset units into misleading portfolio KPIs like `ASSET 2 Deposit` or `Total Withdrawable`.

Replaced with a USD-based portfolio hero that shows:
- Total LP Value
- Net P/L
- Positions
- Last Activity

### 2. LP positions now carry typed valuation facts
`useLpPositions()` now returns typed LP valuation data instead of forcing components to infer or recompute meaning from stringly-typed fields.

Added position fields include:
- `assetSymbol`
- `currentRunePriceUsd`
- `currentAssetPriceUsd`
- `entryRunePriceUsd`
- `entryAssetPriceUsd`
- `pricingSource`
- `currentTotalValueUsd`
- `depositedTotalValueUsd`
- `netProfitLossUsd`
- `netProfitLossPercent`
- `hodlValueUsd`
- `impermanentLossUsd`
- `impermanentLossPercent`

### 3. Current-only pricing is now honest
If historical entry pricing cannot be proven, the route does not fake precision.

Current-only positions now:
- keep accurate current market value when live prices are available
- hide P/L and IL metrics instead of showing fake `0.00%`
- render a pricing-confidence banner explaining why historical metrics are unavailable

### 4. Non-RUNE assets now use the correct symbol and price
The LP route and its components now show real asset symbols such as:
- `ATOM`
- `DOGE`
- `BCH`

The non-RUNE side is valued using pool asset pricing / pool depth logic instead of incorrectly reusing the current RUNE price.

### 5. The missing-address state is now truthful
`/dashboard/lp` without an address no longer lies by implying a successful empty LP lookup.

It now renders:
- `Enter a THORChain address`
- explanatory copy that nothing has been queried yet

### 6. LP cards and rows were rewritten in investor language
The route now emphasizes investor-facing metrics:
- `{ASSET} Deposited`
- `Current Value`
- `Net P/L`
- `Impermanent Loss`
- `Pool APY`

Legacy protocol-dump labels such as `ASSET 2` and the mixed-unit summary cards were removed from the live path.

### 7. Dead LP code paths were removed
Deleted unused legacy files:
- `src/app/dashboard/lp/components/LPPositionCard.tsx`
- `src/app/dashboard/lp/components/PoolStatusBadge.tsx`
- `src/components/dashboard/lp-deposit-withdraw-breakdown.tsx`

## Verification completed

### Local verification
Passed:
- targeted LP tests: 34 assertions across 6 files
- targeted lint on touched LP files
- production build (`next build`)

### Live dev verification
Verified on:
- `https://dev.thorchain.no/dashboard/lp?address=thor14wtqzhe9cj7jjtwkv4436jz00xphwr6m3zq9z8`
- `https://dev.thorchain.no/dashboard/lp`

Confirmed live behavior:
- hero renders `Total LP Value`
- non-RUNE asset labels render as `ATOM`, `DOGE`, `BCH`
- mixed-unit summary cards are gone
- current-only positions show a warning banner and hide P/L/IL metrics
- missing-address route shows `Enter a THORChain address`

## Remaining live caveat

The live dev site still experiences upstream Midgard pool-history `502` failures for some pools when trying to resolve historical entry pricing over long lookback windows.

Current behavior is now correct:
- the route degrades to `current-only`
- current market value remains visible
- the user is told historical entry pricing is unavailable

This is an upstream data-availability issue, not a UI honesty issue.

## Additional implementation note

Dashboard routes currently auto-restore the last viewed address from `sessionStorage` key `dashboard-address`. That behavior can mask the no-address state during browser QA unless the stored address is cleared first.

## Conclusion

The LP trust rebuild is complete for the scoped pass.

BondTrack now either:
- shows trustworthy LP valuation and labeling, or
- explicitly communicates when historical performance cannot be computed.

That is a major improvement over the previous behavior, which mixed units, mislabeled assets, and implied false precision.
