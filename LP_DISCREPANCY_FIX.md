# LP Data Discrepancy Analysis & Fix

## Issue Summary

BondTrack shows incorrect PnL calculations for liquidity positions compared to RUNE-Tools.

### Example: GAIA.ATOM Pool

**BondTrack (Incorrect):**
- Net Profit/Loss: +$17,044.25
- PnL Percentage: 74.59%

**RUNE-Tools (Correct):**
- Net Profit/Loss: $26,521
- PnL Percentage: 71.57%

**Difference:** $9,476.75 discrepancy in PnL calculation

## Root Cause

The `calculateLpPnl` function is being called with incorrect price parameters. The same RUNE price is being used for all 4 price parameters instead of using the correct prices for both RUNE and ASSET2.

### Current (Incorrect) Implementation

```typescript
const runePriceUSD = runePriceUSD ?? 0;
const pnl = calculateLpPnl(
  runeDeposited,      // RUNE deposited
  asset2Deposited,    // ATOM deposited
  runeWithdrawable,   // RUNE withdrawable
  asset2Withdrawable, // ATOM withdrawable
  runePriceUSD,       // RUNE current price ✓
  runePriceUSD,       // ATOM current price ✗ WRONG!
  runePriceUSD,       // RUNE entry price ✗ WRONG!
  runePriceUSD        // ATOM entry price ✗ WRONG!
);
```

### Expected (Correct) Implementation

```typescript
const runeCurrentPrice = runePriceUSD ?? 0;
const atomCurrentPrice = calculateAssetPrice(pool.runeDepth, pool.assetDepth, runeCurrentPrice);
const runeEntryPrice = calculateEntryPrice(runeDeposited, assetDeposited, runeCurrentPrice, atomCurrentPrice);
const atomEntryPrice = calculateEntryPrice(runeDeposited, assetDeposited, runeCurrentPrice, atomCurrentPrice);

const pnl = calculateLpPnl(
  runeDeposited,
  asset2Deposited,
  runeWithdrawable,
  asset2Withdrawable,
  runeCurrentPrice,   // RUNE current price ✓
  atomCurrentPrice,    // ATOM current price ✓
  runeEntryPrice,      // RUNE entry price ✓
  atomEntryPrice       // ATOM entry price ✓
);
```

## Solution

### 1. Calculate Asset Price from Pool Depth

In an AMM pool, the asset price is determined by the ratio of the two assets:

```typescript
function calculateAssetPrice(
  runeDepth: string,
  assetDepth: string,
  runePriceUSD: number
): number {
  const runeDepthNum = runeToNumber(runeDepth);
  const assetDepthNum = runeToNumber(assetDepth);
  
  if (assetDepthNum === 0) return 0;
  
  // Asset Price = (RUNE Depth / Asset Depth) * RUNE Price
  return (runeDepthNum / assetDepthNum) * runePriceUSD;
}
```

### 2. Calculate Entry Prices

The entry price can be estimated from the initial deposit ratio:

```typescript
function calculateEntryPrices(
  runeDeposit: string,
  assetDeposit: string,
  runeCurrentPrice: number,
  assetCurrentPrice: number
): { runeEntryPrice: number; assetEntryPrice: number } {
  // For simplicity, we can use current prices as entry prices
  // A more accurate approach would require historical price data
  return {
    runeEntryPrice: runeCurrentPrice,
    assetEntryPrice: assetCurrentPrice,
  };
}
```

### 3. Fixed PnL Calculation

The `calculateLpPnl` function now correctly calculates PnL using the proper prices:

```typescript
export function calculateLpPnl(
  runeDeposited: string,
  asset2Deposited: string,
  runeWithdrawable: string,
  asset2Withdrawable: string,
  runeCurrentPrice: number,
  asset2CurrentPrice: number,
  runeEntryPrice: number,
  asset2EntryPrice: number
): { pnl: number; pnlPercent: number; runePnl: number; asset2Pnl: number } {
  const runeDepositedValue = runeToNumber(runeDeposited) * runeEntryPrice;
  const asset2DepositedValue = runeToNumber(asset2Deposited) * asset2EntryPrice;
  const totalDepositedValue = runeDepositedValue + asset2DepositedValue;

  const runeWithdrawableValue = runeToNumber(runeWithdrawable) * runeCurrentPrice;
  const asset2WithdrawableValue = runeToNumber(asset2Withdrawable) * asset2CurrentPrice;
  const totalWithdrawableValue = runeWithdrawableValue + asset2WithdrawableValue;

  const runePnl = runeWithdrawableValue - runeDepositedValue;
  const asset2Pnl = asset2WithdrawableValue - asset2DepositedValue;
  const pnl = runePnl + asset2Pnl;

  const pnlPercent = totalDepositedValue > 0 ? (pnl / totalDepositedValue) * 100 : 0;

  return { pnl, pnlPercent, runePnl, asset2Pnl };
}
```

## Implementation Steps

1. ✅ Added `calculateLpPnl` function to `src/lib/utils/calculations.ts`
2. ✅ Added `calculateLpWithdrawableAmounts` function to `src/lib/utils/calculations.ts`
3. ✅ Added `formatPnlDisplay` function to `src/lib/utils/calculations.ts`
4. ✅ Created `src/lib/api/thornode.ts` with LP-related API functions
5. ⏳ Need to create LP page component with correct price calculations
6. ⏳ Need to add asset price calculation helper functions

## Files Modified

- `src/lib/utils/calculations.ts` - Added LP PnL calculation functions
- `src/lib/api/thornode.ts` - Created new file with THORNode API functions

## Next Steps

1. Create the LP page component (`src/app/dashboard/lp/page.tsx`)
2. Add helper functions for calculating asset prices from pool depths
3. Test the fix with the GAIA.ATOM pool data
4. Verify that PnL calculations match RUNE-Tools

## Testing

After implementing the fix, verify with the GAIA.ATOM pool:

**Expected Results:**
- Net Profit/Loss: ~$26,521 (matching RUNE-Tools)
- PnL Percentage: ~71.57% (matching RUNE-Tools)
- RUNE Balance: 76,135.27
- ATOM Balance: 17,932.32
