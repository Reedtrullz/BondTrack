# LP Status Page Audit Report

## Executive Summary

This audit captured the pre-rebuild LP Status route. Its major trust and UX issues have now been addressed by the LP trust-rebuild work completed on `staging` and verified on `https://dev.thorchain.no`.

Resolved from this audit:
- mixed-unit LP summary cards removed
- honest degraded/error handling for LP member and pricing failures
- asset labels now use actual symbols (`ATOM`, `DOGE`, `BCH`) instead of `ASSET 2`
- investor-facing LP cards/rows now show USD current value and honest P/L availability
- pricing-confidence banner added when historical entry pricing is unavailable
- stale LP components removed from the live path

Still relevant from a live-ops perspective:
- upstream Midgard history endpoints can return `502` for deep historical pool lookups
- when that happens, the route now correctly falls back to `current-only` instead of showing fake precision

Treat the remaining sections of this document as historical audit context and implementation rationale, not as the current live status of the route.

---

## 🔴 Critical Issues

### 1. Performance: Sequential API Calls
**Location:** Lines 73-82
**Issue:** `getLiquidityProvider` is called sequentially in a for loop, causing slow page load for users with multiple LP positions.

**Current Code:**
```typescript
const thorNodeLpData = new Map<string, any>();
for (const pool of memberDetails?.pools || []) {
  try {
    const lpData = await getLiquidityProvider(pool.pool, addr);
    if (lpData) {
      thorNodeLpData.set(pool.pool, lpData);
    }
  } catch (e) {
    // Ignore errors for individual pools
  }
}
```

**Impact:** With 3+ LP positions, page load time increases linearly. Each API call adds ~200-500ms latency.

**Recommendation:** Use `Promise.allSettled` for parallel fetching:
```typescript
const thorNodeLpData = new Map<string, any>();
const poolPromises = (memberDetails?.pools || []).map(async (pool) => {
  try {
    const lpData = await getLiquidityProvider(pool.pool, addr);
    if (lpData) {
      thorNodeLpData.set(pool.pool, lpData);
    }
  } catch (e) {
    // Ignore errors for individual pools
  }
});
await Promise.allSettled(poolPromises);
```

---

### 2. Type Safety: Using `any` Types
**Location:** Lines 48-50
**Issue:** `LPData` interface uses `any` types, defeating TypeScript's type safety.

**Current Code:**
```typescript
interface LPData {
  memberDetails: any;
  pools: any[];
  thorNodeLpData: Map<string, any>;
  runePriceUSD: number;
}
```

**Impact:** No compile-time type checking, potential runtime errors.

**Recommendation:** Define proper types:
```typescript
interface MemberPoolRaw {
  pool: string;
  assetAddress: string;
  runeDeposit: string;
  assetDeposit: string;
  // ... other fields
}

interface PoolDetailsRaw {
  asset: string;
  status: string;
  poolAPY: string;
  volume24h: string;
  runeDepth: string;
  assetDepth: string;
  liquidityUnits: string;
  // ... other fields
}

interface LiquidityProviderRaw {
  rune_redeem_value: string;
  asset_redeem_value: string;
  rune_deposit_value: string;
  asset_deposit_value: string;
}

interface LPData {
  memberDetails: { pools: MemberPoolRaw[] } | null;
  pools: PoolDetailsRaw[];
  thorNodeLpData: Map<string, LiquidityProviderRaw>;
  runePriceUSD: number;
}
```

---

### 3. Code Duplication: Double Calculation
**Location:** Lines 149 and 186
**Issue:** `ownershipPercent` is calculated twice for the same position.

**Impact:** Unnecessary computation, potential for inconsistent results.

**Recommendation:** Calculate once and reuse:
```typescript
const ownershipPercent = calculateOwnershipPercent(pool.liquidityUnits, poolData?.liquidityUnits);

let withdrawableData;
if (thorNodeData) {
  withdrawableData = {
    runeWithdrawable: thorNodeData.rune_redeem_value,
    asset2Withdrawable: thorNodeData.asset_redeem_value,
    runeDeposited: thorNodeData.rune_deposit_value,
    asset2Deposited: thorNodeData.asset_deposit_value,
  };
} else {
  withdrawableData = calculateLpWithdrawableAmounts(
    pool.runeDeposit,
    pool.assetDeposit,
    poolData?.runeDepth ?? '0',
    poolData?.assetDepth ?? '0',
    pool.runeAdded,
    pool.runeWithdrawn,
    pool.assetAdded,
    pool.assetWithdrawn,
    ownershipPercent,
    poolData?.liquidityUnits
  );
}
```

---

## 🟡 High Priority Issues

### 4. Missing Feature: Impermanent Loss Calculation
**Issue:** LP positions don't show impermanent loss, which is critical for LP decision-making.

**Impact:** Users can't assess the true cost of providing liquidity.

**Recommendation:** Add impermanent loss calculation:
```typescript
function calculateImpermanentLoss(
  runeDeposit: string,
  assetDeposit: string,
  runeCurrentPrice: number,
  assetCurrentPrice: number,
  runeEntryPrice: number,
  assetEntryPrice: number
): { ilPercent: number; ilValue: number } {
  const runeDepositedValue = runeToNumber(runeDeposit) * runeEntryPrice;
  const assetDepositedValue = runeToNumber(assetDeposit) * assetEntryPrice;
  const totalDepositedValue = runeDepositedValue + assetDepositedValue;

  const runeCurrentValue = runeToNumber(runeDeposit) * runeCurrentPrice;
  const assetCurrentValue = runeToNumber(assetDeposit) * assetCurrentPrice;
  const totalCurrentValue = runeCurrentValue + assetCurrentValue;

  const hodlValue = runeDepositedValue * (runeCurrentPrice / runeEntryPrice) +
                    assetDepositedValue * (assetCurrentPrice / assetEntryPrice);

  const ilValue = totalCurrentValue - hodlValue;
  const ilPercent = hodlValue > 0 ? (ilValue / hodlValue) * 100 : 0;

  return { ilPercent, ilValue };
}
```

Display in UI:
```typescript
<StatCard
  label="Impermanent Loss"
  value={`${il.ilPercent.toFixed(2)}%`}
  subValue={`$${il.ilValue.toFixed(2)} IL`}
/>
```

---

### 5. Missing Feature: Asset Names
**Issue:** Shows "ASSET 2" instead of actual asset names (e.g., "ATOM", "BTC").

**Impact:** Poor user experience, harder to identify positions.

**Recommendation:** Parse asset names from pool strings:
```typescript
function getAssetName(pool: string): { rune: string; asset: string } {
  const [asset, chain] = pool.split('.');
  return {
    rune: 'RUNE',
    asset: asset || chain || 'Unknown'
  };
}

// Usage in LPPositionCard:
const { rune, asset } = getAssetName(position.pool);
<p className="text-sm text-zinc-500 dark:text-zinc-400">{asset} Deposited</p>
```

---

### 6. Missing Feature: Fee Breakdown
**Issue:** Doesn't show breakdown of impermanent loss vs trading fees earned.

**Impact:** Users can't understand the composition of their returns.

**Recommendation:** Add fee breakdown calculation:
```typescript
function calculateFeeBreakdown(
  runeWithdrawable: string,
  assetWithdrawable: string,
  runeDeposit: string,
  assetDeposit: string,
  runeCurrentPrice: number,
  assetCurrentPrice: number,
  runeEntryPrice: number,
  assetEntryPrice: number
): {
  tradingFees: number;
  impermanentLoss: number;
  netReturn: number;
} {
  const pnl = calculateLpPnl(
    runeDeposit, assetDeposit,
    runeWithdrawable, assetWithdrawable,
    runeCurrentPrice, assetCurrentPrice,
    runeEntryPrice, assetEntryPrice
  );

  const il = calculateImpermanentLoss(
    runeDeposit, assetDeposit,
    runeCurrentPrice, assetCurrentPrice,
    runeEntryPrice, assetEntryPrice
  );

  // Trading fees = Total PnL - Impermanent Loss
  const tradingFees = pnl.pnl - il.ilValue;

  return {
    tradingFees,
    impermanentLoss: il.ilValue,
    netReturn: pnl.pnl,
  };
}
```

---

### 7. UX: No Refresh Button on Success
**Issue:** Refresh button only appears on error, not on successful load.

**Impact:** Users can't manually refresh data without reloading the page.

**Recommendation:** Add refresh button to header:
```typescript
<div className="flex items-center gap-3">
  <Button
    onClick={() => mutate()}
    variant="outline"
    size="sm"
    disabled={isLoading}
  >
    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
    Refresh
  </Button>
  {address && (
    <p className="max-w-full truncate rounded-full border border-zinc-200 bg-zinc-100/80 px-4 py-2 font-mono text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
      {address}
    </p>
  )}
</div>
```

---

### 8. UX: No Loading Progress for Individual Pools
**Issue:** No indication of progress when fetching multiple pools.

**Impact:** Users don't know if the page is still loading or stuck.

**Recommendation:** Add loading progress indicator:
```typescript
const [loadingProgress, setLoadingProgress] = useState(0);

// In the fetcher:
const poolPromises = (memberDetails?.pools || []).map(async (pool, index) => {
  try {
    const lpData = await getLiquidityProvider(pool.pool, addr);
    if (lpData) {
      thorNodeLpData.set(pool.pool, lpData);
    }
    setLoadingProgress(((index + 1) / memberDetails.pools.length) * 100);
  } catch (e) {
    // Ignore errors
  }
});

// Display progress:
{isLoading && (
  <div className="mb-4">
    <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div
        className="h-2 rounded-full bg-blue-500 transition-all duration-300"
        style={{ width: `${loadingProgress}%` }}
      />
    </div>
    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
      Loading pool data... {Math.round(loadingProgress)}%
    </p>
  </div>
)}
```

---

## 🟢 Medium Priority Issues

### 9. Code Organization: Large Monolithic File
**Issue:** 773 lines in a single file with multiple components.

**Impact:** Harder to maintain, test, and reuse components.

**Recommendation:** Split into separate files:
```
src/app/dashboard/lp/
├── page.tsx (main component)
├── components/
│   ├── LPPositionCard.tsx
│   ├── LPTableRow.tsx
│   ├── PoolStatusBadge.tsx
│   ├── StatCard.tsx
│   └── LPStatsSummary.tsx
├── hooks/
│   └── useLPPositions.ts
└── types/
    └── lp.ts
```

---

### 10. Performance: No Memoization
**Issue:** Complex calculations run on every render.

**Impact:** Unnecessary re-computations, potential performance issues.

**Recommendation:** Use `useMemo` for expensive calculations:
```typescript
const positions = useMemo(() => {
  return (data?.memberDetails?.pools || []).map((pool: any) => {
    // ... existing calculation logic
  });
}, [data?.memberDetails?.pools, data?.pools, data?.thorNodeLpData, data?.runePriceUSD]);

const summaryStats = useMemo(() => {
  return {
    totalPositions: positions.length,
    totalRuneDeposit: positions.reduce((sum, p) => sum + BigInt(p.runeDeposit || '0'), BigInt(0)),
    // ... other calculations
  };
}, [positions]);
```

---

### 11. UX: No Sorting or Filtering
**Issue:** Table can't be sorted or filtered.

**Impact:** Harder to find specific positions or analyze data.

**Recommendation:** Add sorting and filtering:
```typescript
const [sortField, setSortField] = useState<'pool' | 'pnl' | 'apy' | 'date'>('pool');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'staged' | 'suspended'>('all');

const sortedPositions = useMemo(() => {
  return [...positions]
    .filter(p => filterStatus === 'all' || p.poolStatus === filterStatus)
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'pool':
          comparison = a.pool.localeCompare(b.pool);
          break;
        case 'pnl':
          comparison = a.netProfitLossPercent - b.netProfitLossPercent;
          break;
        case 'apy':
          comparison = a.poolApy - b.poolApy;
          break;
        case 'date':
          comparison = a.dateLastAdded - b.dateLastAdded;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
}, [positions, sortField, sortDirection, filterStatus]);
```

---

### 12. UX: No Export Functionality
**Issue:** Can't export LP data for analysis.

**Impact:** Users can't perform offline analysis or share data.

**Recommendation:** Add export functionality:
```typescript
function exportLPData(positions: LPPosition[]) {
  const csv = [
    ['Pool', 'Status', 'RUNE Deposit', 'Asset Deposit', 'RUNE Withdrawable', 'Asset Withdrawable', 'PnL %', 'APY %', 'First Added', 'Last Added'],
    ...positions.map(p => [
      p.pool,
      p.poolStatus,
      p.runeDeposit,
      p.asset2Deposit,
      p.runeWithdrawable,
      p.asset2Withdrawable,
      p.netProfitLossPercent.toFixed(2),
      p.poolApy.toFixed(2),
      new Date(p.dateFirstAdded > 1e12 ? p.dateFirstAdded / 1e9 : p.dateFirstAdded).toISOString(),
      new Date(p.dateLastAdded > 1e12 ? p.dateLastAdded / 1e9 : p.dateLastAdded).toISOString(),
    ])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lp-positions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Add to header:
<Button onClick={() => exportLPData(positions)} variant="outline" size="sm">
  <Download className="mr-2 h-4 w-4" />
  Export CSV
</Button>
```

---

### 13. UX: No Pool Details Link
**Issue:** Can't click on pool to see more details.

**Impact:** Users can't get more information about specific pools.

**Recommendation:** Add clickable pool names:
```typescript
<Link
  href={`https://thorchain.netlify.app/pools/${position.pool}`}
  target="_blank"
  rel="noopener noreferrer"
  className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
>
  {position.pool}
</Link>
```

---

### 14. Code Quality: Magic Numbers
**Issue:** `1e12` used for timestamp detection in multiple places.

**Impact:** Hard to understand, potential for bugs.

**Recommendation:** Define constants:
```typescript
const NANOSECOND_THRESHOLD = 1e12;

function formatDate(timestamp: number): string {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return '--';
  return new Date(ts > NANOSECOND_THRESHOLD ? ts / 1e9 : ts).toLocaleDateString();
}
```

---

### 15. Code Quality: Unused Import
**Issue:** `runeToNumber` imported but not used.

**Impact:** Unnecessary import, slightly larger bundle.

**Recommendation:** Remove unused import:
```typescript
// Remove this line:
import { formatRuneAmount, runeToNumber } from '@/lib/utils/formatters';

// Keep only:
import { formatRuneAmount } from '@/lib/utils/formatters';
```

---

## 🔵 Low Priority Issues

### 16. Accessibility: Missing ARIA Labels
**Issue:** Some interactive elements lack ARIA labels.

**Impact:** Poor screen reader experience.

**Recommendation:** Add ARIA labels:
```typescript
<button
  onClick={() => mutate()}
  aria-label="Refresh LP data"
  variant="destructive"
>
  <RefreshCw className="mr-2 h-4 w-4" />
  Try again
</Button>
```

---

### 17. UX: No Historical Data
**Issue:** Only shows current state, no historical PnL chart.

**Impact:** Users can't see trends over time.

**Recommendation:** Add historical PnL chart (future enhancement):
- Fetch historical LP data from Midgard
- Display PnL trend over time
- Show impermanent loss trend

---

### 18. UX: No Actionable Insights
**Issue:** No suggestions for optimizing LP positions.

**Impact:** Users don't get guidance on improving their LP strategy.

**Recommendation:** Add actionable insights:
```typescript
function generateLPInsights(positions: LPPosition[]): string[] {
  const insights: string[] = [];

  // Check for high impermanent loss
  positions.forEach(p => {
    if (p.netProfitLossPercent < -10) {
      insights.push(`${p.pool} has significant impermanent loss (${p.netProfitLossPercent.toFixed(2)}%). Consider rebalancing.`);
    }
  });

  // Check for low APY
  const lowApyPools = positions.filter(p => p.poolApy < 5);
  if (lowApyPools.length > 0) {
    insights.push(`${lowApyPools.length} pool(s) have APY below 5%. Consider higher-yield pools.`);
  }

  // Check for pending adds
  const pendingPools = positions.filter(p => p.hasPending);
  if (pendingPools.length > 0) {
    insights.push(`${pendingPools.length} position(s) have pending adds. Monitor for completion.`);
  }

  return insights;
}
```

---

### 19. UX: No Mobile Optimization
**Issue:** Table may not display well on small screens.

**Impact:** Poor mobile experience.

**Recommendation:** Add responsive table:
```typescript
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
    {/* ... */}
  </table>
</div>
```

---

### 20. Code Quality: Inline IIFEs
**Issue:** Many inline IIFEs that could be extracted to helper functions.

**Impact:** Harder to read and test.

**Recommendation:** Extract to helper functions:
```typescript
// Instead of:
value={(() => {
  const netPnL = positions.reduce((sum, p) => { /* ... */ }, BigInt(0));
  const sign = netPnL < BigInt(0) ? '-' : '+';
  return `${sign}${formatRuneAmount((netPnL < BigInt(0) ? -netPnL : netPnL).toString())}`;
})()}

// Use:
value={calculateNetPnL(positions)}

function calculateNetPnL(positions: LPPosition[]): string {
  const netPnL = positions.reduce((sum, p) => { /* ... */ }, BigInt(0));
  const sign = netPnL < BigInt(0) ? '-' : '+';
  return `${sign}${formatRuneAmount((netPnL < BigInt(0) ? -netPnL : netPnL).toString())}`;
}
```

---

## Summary

### Critical Issues (3)
1. Sequential API calls causing slow page load
2. Type safety issues with `any` types
3. Code duplication with double calculations

### High Priority Issues (5)
4. Missing impermanent loss calculation
5. Missing asset names
6. Missing fee breakdown
7. No refresh button on success
8. No loading progress indicator

### Medium Priority Issues (6)
9. Large monolithic file
10. No memoization
11. No sorting or filtering
12. No export functionality
13. No pool details link
14. Magic numbers and unused imports

### Low Priority Issues (5)
15. Missing ARIA labels
16. No historical data
17. No actionable insights
18. No mobile optimization
19. Inline IIFEs

---

## Recommended Implementation Order

1. **Fix Critical Issues** (Week 1)
   - Implement parallel API calls
   - Add proper TypeScript types
   - Remove code duplication

2. **Add High Priority Features** (Week 2)
   - Implement impermanent loss calculation
   - Add asset names
   - Add fee breakdown
   - Add refresh button
   - Add loading progress

3. **Improve Medium Priority Items** (Week 3-4)
   - Split into smaller files
   - Add memoization
   - Implement sorting/filtering
   - Add export functionality
   - Add pool details links

4. **Address Low Priority Items** (Week 5+)
   - Add ARIA labels
   - Implement historical data
   - Add actionable insights
   - Improve mobile experience
   - Refactor inline IIFEs

---

## Conclusion

The LP Status page is functionally sound with accurate PnL calculations, but has significant room for improvement in performance, user experience, and feature completeness. Addressing the critical and high-priority issues will provide immediate value to users, while the medium and low-priority items will enhance the long-term maintainability and user satisfaction of the application.
