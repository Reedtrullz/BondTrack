# Rewards Page Calculations

This document explains how each metric on the Rewards page is calculated.

## Data Sources

### Midgard API
- **Earnings History**: `/v2/history/earnings?interval=day&count=30`
- **Fields**:
  - `bondingEarnings`: String (1e8 units) — rewards from bonders
  - `blockRewards`: String (1e8 units) — block production rewards
  - `earnings`: String (1e8 units) — total (bonding + liquidity)
  - `runePriceUSD`: String (decimal) — USD price at interval start
  - `startTime` / `endTime`: Unix timestamps (seconds)

### THORNode API
- **Nodes**: `/thorchain/nodes`
- **Fields** (per position):
  - `bondAmount`: RUNE user deposited (from bond_providers)
  - `bondSharePercent`: User's share of node's total bond
  - `operatorFee`: Node's fee (basis points)

---

## Top Row Cards

### Per-Churn Reward (est.)
```
PerChurnReward = (bondSharePercent / 100) × currentAward × (1 - operatorFeeDecimal)

Where:
- bondSharePercent = User's % share of node's total bond
- currentAward = Block rewards per churn (~19,346 RUNE)
- operatorFeeDecimal = operatorFeeBps / 10000
```

### Operator Fees (per churn)
```
OperatorFee = PerChurnReward × operatorFeeDecimal
```
Same as above — the portion kept by the node operator.

### USD Value Per Churn
```
USD Value = PerChurnReward × currentRunePrice
```
Converts RUNE rewards to USD using current RUNE price.

---

## PnL Dashboard

### Initial Bond
```
InitialBond = Σ (bondAmount from each position)
```
Sum of all bond positions for the user's address. This is the **original deposited amount**.

### Bond Growth
```
BondGrowth = Σ (bondingEarnings from all intervals)
```
Sum of all `bondingEarnings` from earnings history. These are rewards that get **auto-compounded** back into the bond.

### Current Bond
```
CurrentBond = InitialBond + BondGrowth
```
The initial deposit plus accumulated rewards (before operator fees).

### Price PnL
```
PricePnL = InitialBond × (currentPrice - entryPrice)
```
Profit/loss from RUNE price change, calculated on the initial bond amount.

- **Entry Price**: Price at earliest available earnings interval
- **Current Price**: Latest RUNE price from API

### Total Return
```
TotalReturn = BondGrowth + PricePnL
```
Combined profit from bond growth (auto-compounding) plus price appreciation.

---

## Earnings History Table

### Bonding Earnings
```
Display: formatRuneAmount(interval.bondingEarnings, 2)
```
The raw `bondingEarnings` string divided by 1e8 to convert to RUNE.

### Block Rewards
```
Display: formatRuneAmount(interval.blockRewards, 2)
```
Rewards from block production (not shared with bonders).

### Total Earnings
```
Display: formatRuneAmount(interval.earnings, 2)
```
Combined bonding + liquidity earnings.

### RUNE Price
```
Display: $Number(interval.runePriceUSD).toFixed(4)
```
The `runePriceUSD` is already a USD decimal — no conversion needed.

---

## Per-Churn Reward Breakdown Table

For each position:

| Field | Formula |
|-------|---------|
| Bond Amount | `bondAmount.toFixed(2)` |
| Bond Share | `bondSharePercent.toFixed(2)%` |
| Operator Fee | `operatorFeeFormatted` (e.g., "10.0%") |
| Reward (RUNE) | `(runeToNumber(currentAward) × bondSharePercent / 100).toFixed(4)` |
| Fee Paid | `operatorFeePaid.toFixed(4)` |
| Net | `perChurnReward.toFixed(4)` |
| USD Value | `perChurnReward × currentRunePrice` |

---

## Unit Conversion

### THORChain Convention
All RUNE amounts in API responses are in **1e8 units** (Satoshi-style).

**Example**:
- API returns: `"3176921349379"`
- Actual RUNE: `3176921349379 / 1e8 = 31,769.21349379 RUNE`

### Conversion Functions
```typescript
// String (1e8) → Number (RUNE)
runeToNumber("3176921349379") // → 31769.21

// Number (RUNE) → String (1e8)
numberToRune(31769.21) // → "3176921000000"

// For display
formatRuneAmount("3176921349379", 2) // → "31,769.21"
```

### runePriceUSD Exception
`runePriceUSD` is already a **USD decimal**, not 1e8:
- API returns: `"0.40977717793487906"`
- This IS the USD price: $0.4097...

---

## Formulas Reference

```typescript
// Bond share percentage
calculateBondShare(providerBond, totalBond) = (provider / total) × 100

// APY estimate
calculateAPY(bondSharePercent, currentAward, operatorFeeBps, bondAmount)
  = ((bondSharePercent/100) × award × (1 - fee) × churnsPerYear / bond) × 100

// Per-churn reward
calculatePerChurnReward(bondSharePercent, currentAward, operatorFeeBps)
  = (bondSharePercent/100) × award × (1 - fee)

// Operator fee paid
calculateOperatorFeePaid(totalRewards, operatorFeeBps)
  = totalRewards × (operatorFeeBps / 10000)

// Price PnL
calculatePricePnL(bondAmount, entryPrice, currentPrice)
  = bondAmount × (currentPrice - entryPrice)

// Total return
calculateTotalReturn(initialBond, currentBond, entryPrice, currentPrice)
  = (currentBond - initialBond) + initialBond × (currentPrice - entryPrice)
```

---

## Network Constants (from config.ts)

```typescript
NETWORK = {
  CHURN_INTERVAL_BLOCKS: 43200,      // ~6 hours per churn
  CHURNS_PER_YEAR: 146,              // ~365 / 2.5 days
  RUNE_DECIMALS: 8,                   // 1e8 units
  MINIMUM_BOND_RUNE: 1_000_000_000_000 // 10,000 RUNE minimum
}
```

---

## Assumptions

1. **Auto-compounding**: Bonding earnings are assumed to auto-compound (reinvested into the bond)
2. **Entry price**: Uses earliest available `runePriceUSD` from earnings history as entry price
3. **Operator fee**: Uses per-position operator fee, defaults to 1000 bps (10%) if unavailable
4. **No withdrawals**: Does not account for UNBOND events (future enhancement)
5. **Price stability**: Assumes RUNE price at time of earning equals current price for USD conversion

---

## Personal Fee Audit

The Personal Fee Audit shows estimated monthly rewards and operator fee leakage.

### Data Source
- **Network API**: `/v2/network` returns `bondingAPY` as decimal (e.g., `"0.267"` = 26.7%)
- **Bond Position**: `bondAmount` is already converted to RUNE units (not 1e8)

### Calculation

```
Monthly Gross Rewards = totalBond × (bondingAPY / 12)

Monthly Fee Leakage = Monthly Gross Rewards × (operatorFeeBps / 10000)

Net Take-home = Monthly Gross Rewards - Monthly Fee Leakage
```

Where:
- `totalBond` = sum of all bond positions for the user (in RUNE)
- `bondingAPY` = network bonding APY from Midgard (decimal form, e.g., 0.267)
- `operatorFeeBps` = node operator fee in basis points (default: 500 bps = 5%)

### Important Notes

1. **bondingAPY is decimal**: The API returns `"0.267"` NOT `"26.7"`. Do NOT divide by 100.
2. **bondAmount already converted**: BondPosition.bondAmount is pre-converted to regular RUNE units (not 1e8).
3. **Requires network data**: Component shows "Loading..." until `networkApy` is available from API.