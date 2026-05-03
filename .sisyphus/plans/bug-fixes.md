# BondTrack Bug Fixes & Enhancements Plan

## TL;DR

> **Summary**: Comprehensive fix plan addressing P0-P2 bugs found in BondTrack audit, plus LP page enhancements.
> **Deliverables**: 8 fixed bugs, 1 enhanced page (LP dashboard), reduced lint issues.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: TVL fix → Unbond history → Pendulum consolidation → LP enhancement

---

## Context

### Original Request
User asked: "What did we do so far? Make a comprehensive plan for implementing your bug fixes and enhancements"

### Audit Findings Summary
- Build: Passes ✓
- ESLint: 115 issues (46 errors, 69 warnings)
- Bugs found: 8 (5 confirmed real, 2 false positives, 1 already fixed)
- Feature surface: 9 pages, 18 components, 13 hooks

### Oracle Validation (Key Changes)
1. **TVL bug is REAL** - double-division at lines 76-78 and 174
2. **Unbond history missing** - use-bond-history.ts line 28 hardcodes `type='bond'`
3. **Pendulum thresholds differ** - risk/page.tsx uses 1.5, network-security-metrics.tsx uses 1.2
4. **Date.now() in render** - dashboard-shell.tsx lines 44 and 59
5. **LP page has placeholder data** - use-lp-positions.ts lines 41-43 hardcodes healthScore:100, status:'active'

---

## Work Objectives

### Core Objective
Fix all P0-P2 bugs found in audit and enhance the weakest page (LP dashboard).

### Deliverables
- Risk page shows correct TVL (~$10B, not ~$100M)
- Transaction history shows BOND + UNBOND + LEAVE actions
- Unified pendulum threshold across components
- Clean lint errors related to the bugs
- LP page shows real data (not placeholders)

### Definition of Done
- [ ] Risk page TVL displays ~$10B (within 10% of actual ~$10.5B)
- [ ] Transactions page shows unbond/leave events
- [ ] Both components show same pendulum threshold
- [ ] No React purity warnings in dashboard-shell
- [ ] LP page shows live health/slash data from API
- [ ] `npm run build` passes with 0 errors

### Must Have
- Correct TVL display (P0)
- Complete transaction history (P0)
- Unified pendulum logic (P1)
- Functional LP dashboard (P1)

### Must NOT Have
- Hardcoded test data in production pages
- Duplicate business logic thresholds
- React purity violations

---

## Execution Strategy

### Parallel Execution Waves
> Target: 2-3 tasks per wave for max parallelism while maintaining safety.

**Wave 1 (Foundation - P0 bugs)**
- Fix risk page TVL double-format
- Add unbond/leave fetch to use-bond-history

**Wave 2 (P1 - Logic consolidation)**
- Consolidate pendulum thresholds
- Clean dashboard-shell Date.now()

**Wave 3 (P1 - LP enhancement)**
- Enhance LP page with real data
- Fix lint issues

---

## TODOs

- [x] Task 1: Fix Risk Page TVL Double-Format
- [x] Task 2: Add Unbond/Leave to Transaction History
- [x] Task 3: Consolidate Pendulum Thresholds
- [x] Task 4: Clean Dashboard Shell Date.now() in Render
- [x] Task 5: Enhance LP Page with Real Data
- [x] Task 6: Address Key Lint Errors

### Task 1: Fix Risk Page TVL Double-Format

**What to do**:
1. Read `src/app/dashboard/risk/page.tsx` lines 76-78 and 174
2. Remove the double-format: `networkLiquidityDisplay` is already formatted via `formatRuneFromNumber()`, then passed to `formatRuneAmount()` which divides again
3. Fix: Use either `formatRuneFromNumber()` OR `formatRuneAmount()`, not both
4. The correct approach: Pass raw numeric value to `formatRuneAmount()` (which divides by 1e8 internally), OR pass already-formatted string to a non-dividing display function

**Expected code change**:
```typescript
// BEFORE (broken - double divide):
const networkLiquidityDisplay = networkLiquidity > 0 
  ? formatRuneFromNumber(networkLiquidity)  // returns "10.5B" 
  : '0';
// ...
{networkLiquidity > 0 ? formatRuneAmount(networkLiquidityDisplay) : '--'}  // divides again!

// AFTER (fixed - single divide):
// Option A: Use raw numeric, let formatRuneAmount handle division
{networkLiquidity > 0 ? formatRuneAmount(String(Math.floor(networkLiquidity * 1e8))) : '--'}

// Option B: Use pre-formatted string directly (no second division)
{networkLiquidityDisplay}
```

**Must NOT do**:
- Don't remove formatting entirely
- Don't use `Number()` on raw RUNE amounts

**Recommended Agent Profile**:
- Category: `quick` - Reason: Single file fix, well-contained
- Skills: [] - no additional skills needed

**Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [] | Blocked By: []

**References**:
- Pattern: risk/page.tsx lines 76-78 for current broken pattern
- Pattern: formatters.ts `formatRuneAmount` and `formatRuneFromNumber` for contract

**Acceptance Criteria**:
- [ ] Check that displayed TVL is ~$10B (actual is ~$10.5B as of Apr 2026)
- [ ] Verify fix doesn't break other displays (networkBond, etc.)

**QA Scenarios**:
```
Scenario: TVL displays correctly
  Tool: Bash
  Steps: npm run build && grep -A5 "TVL" src/app/dashboard/risk/page.tsx
  Expected: No double-format pattern found
  Evidence: .sisyphus/evidence/tvl-fix.{ext}
```

**Commit**: YES | Message: `fix(risk): resolve TVL double-format showing 100x too small` | Files: [src/app/dashboard/risk/page.tsx]

---

### Task 2: Add Unbond/Leave to Transaction History

**What to do**:
1. Read `src/lib/hooks/use-bond-history.ts`
2. Current issue: Line 28 only fetches `type='bond'`
3. Fix: Change to fetch all action types or add separate fetches for unbond/leave
4. Map action types correctly:
   - `type: 'bond'` → 'BOND'
   - `type: 'unbond'` → 'UNBOND'  
   - `type: 'leave'` → 'LEAVE' (node leaving network)

**Expected code change**:
```typescript
// BEFORE:
() => getActions(address!, 100, 'bond')

// AFTER:
// Option A: Fetch all types
() => getActions(address!, 100, 'bond,unbond,leave')

// Option B: Fetch separately and merge
// Add second useSWR for unbond, then merge results
```

**Must NOT do**:
- Don't change the UI component unless necessary
- Don't fetch more than needed (100 limit is fine)

**Recommended Agent Profile**:
- Category: `quick` - Reason: Single hook fix, well-contained
- Skills: [] - no additional skills needed

**Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [] | Blocked By: []

**References**:
- API: Midgard `/v2/actions?type=bond,unbond,leave`
- Pattern: use-bond-history.ts current implementation

**Acceptance Criteria**:
- [ ] Transaction history shows UNBOND events for test addresses
- [ ] Transaction history shows LEAVE events (if any exist)

**QA Scenarios**:
```
Scenario: Unbond events appear in history
  Tool: Read
  Steps: Look at use-bond-history.ts return type
  Expected: bondActions array includes 'UNBOND' type
  Evidence: .sisyphus/evidence/unbond-fix.{ext}
```

**Commit**: YES | Message: `fix(transactions): fetch unbond/leave actions in history` | Files: [src/lib/hooks/use-bond-history.ts]

---

### Task 3: Consolidate Pendulum Thresholds

**What to do**:
1. Read `src/app/dashboard/risk/page.tsx` line 89 and `src/components/dashboard/network-security-metrics.tsx` line 40
2. Current discrepancy:
   - Risk page: `< 1.5` = LP Favored (line 89)
   - NetworkSecurityMetrics: `<= 1.2` = LP Favored (line 40)
3. Decide on unified threshold (recommend 2.0 based on THORChain docs or keep risk page's 1.5 as it's more conservative)
4. Update network-security-metrics.tsx to match

**Expected code change**:
```typescript
// network-security-metrics.tsx line 40
// BEFORE:
if (bondToPoolRatio <= 1.2) {

// AFTER:
// Use same threshold as risk page
if (bondToPoolRatio <= 1.5) {
```

**Decision needed**: Which threshold is correct?
- Risk page uses 1.5 (more conservative, LP favored at lower ratio)
- NetworkSecurityMetrics uses 1.2 (less conservative)
- THORChain docs suggest ~1.5-2.0 is "optimal"
- **Default**: Use 1.5 (risk page's value, more conservative)

**Must NOT do**:
- Don't change risk page threshold (it already uses 1.5)
- Don't add new logic, just align existing

**Recommended Agent Profile**:
- Category: `quick` - Reason: Simple value alignment in one file
- Skills: [] - no additional skills needed

**Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [] | Blocked By: Task 1, Task 2

**References**:
- Pattern: risk/page.tsx line 89 for reference threshold
- Pattern: network-security-metrics.tsx line 40 for current divergent threshold

**Acceptance Criteria**:
- [ ] Both files use same threshold (1.5 for LP Favored)
- [ ] No comment mentions 1.2 as optimal

**Commit**: YES | Message: `fix(pendulum): align threshold to 1.5 across components` | Files: [src/components/dashboard/network-security-metrics.tsx]

---

### Task 4: Clean Dashboard Shell Date.now() in Render

**What to do**:
1. Read `src/components/layout/dashboard-shell.tsx` lines 44 and 59
2. Current issue:
   - Line 44: `useState<number>(Date.now())` - called at render time
   - Line 59: `const elapsed = Date.now() - lastUpdated` - recalculates every render
3. Fix: Use `useEffect` to set initial value, or only update on user interaction
4. The elapsed calculation only updates on manual refresh, so it's fine - issue is initial state

**Expected code change**:
```typescript
// BEFORE:
const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

// AFTER:
// Option A: Use undefined as initial, set in effect
const [lastUpdated, setLastUpdated] = useState<number | null>(null);
useEffect(() => {
  if (lastUpdated === null) setLastUpdated(Date.now());
}, []);

// Option B (simpler): Remove from initial state, set on first refresh only
// Current implementation already sets via handleRefresh, just remove from initial
const [lastUpdated, setLastUpdated] = useState<number>(0);
```

**Must NOT do**:
- Don't break the refresh functionality
- Don't introduce additional re-renders

**Recommended Agent Profile**:
- Category: `quick` - Reason: Simple useState fix
- Skills: [] - no additional skills needed

**Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [] | Blocked By: Task 1, Task 2

**References**:
- Pattern: dashboard-shell.tsx lines 44, 54-57 for handleRefresh

**Acceptance Criteria**:
- [ ] No `Date.now()` in useState initial value
- [ ] Refresh button still works

**Commit**: YES | Message: `fix(dashboard): remove Date.now() from initial state` | Files: [src/components/layout/dashboard-shell.tsx]

---

### Task 5: Enhance LP Page with Real Data

**What to do**:
1. Read `src/hooks/use-lp-positions.ts` lines 41-43
2. Current issue: Hardcoded placeholder values:
   ```typescript
   healthScore: 100,
   slashRisk: 0,
   status: 'active',
   ```
3. Fix: Derive real values from API data:
   - `healthScore`: Calculate from pool data (could use APY, pool status, etc.)
   - `slashRisk`: LP positions don't have slash risk (different from nodes) - remove or set to 0
   - `status`: Could derive from `pool.status` if available from pools API
4. For slashRisk: LP positions don't get slashed like nodes. This should likely be removed or always 0.
5. For status: Check pool data for "Available" vs "Staged" status

**Expected code change**:
```typescript
// BEFORE:
return {
  address: poolRaw.assetAddress,
  pool: poolRaw.pool,
  bondedRune: poolRaw.runeDeposit,
  rewards: poolRaw.runeAdded,
  apy: poolData ? parseFloat(poolData.poolAPY) : 0,
  healthScore: 100,  // hardcoded
  slashRisk: 0,  // hardcoded
  status: 'active',  // hardcoded
  unbondWindowRemaining: 0,
};

// AFTER:
// Real data from API
return {
  address: poolRaw.assetAddress,
  pool: poolRaw.pool,
  bondedRune: poolRaw.runeDeposit,
  rewards: poolRaw.runeAdded,
  apy: poolData ? parseFloat(poolData.poolAPY) : 0,
  healthScore: poolData ? calculateLpHealth(poolData) : 50,
  slashRisk: 0,  // LP positions don't get slashed
  status: poolData?.status || 'unknown',
  unbondWindowRemaining: poolData?.unbondingPeriod || 0,
};
```

**Must NOT do**:
- Don't break existing LP functionality
- Don't make up health scores

**Recommended Agent Profile**:
- Category: `quick` - Reason: Single hook enhancement
- Skills: [] - no additional skills needed

**Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [] | Blocked By: Task 3

**References**:
- API: `getPools()` returns PoolDetailRaw[] with status and APY
- Pattern: use-lp-positions.ts for current mapping

**Acceptance Criteria**:
- [ ] No hardcoded healthScore in return object
- [ ] Status reflects actual pool status
- [ ] slashRisk documented as 0 (LP not subject to slashing)

**Commit**: YES | Message: `enhance(lp): derive health/status from pool data instead of hardcoded` | Files: [src/hooks/use-lp-positions.ts]

---

### Task 6: Address Key Lint Errors

**What to do**:
1. Run `npm run lint` to see current errors
2. Address the most impactful ones:
   - Unused imports in modified files
   - setState patterns if any remain
3. Focus on files modified in Tasks 1-5

**Must NOT do**:
- Don't fix ALL lint issues (115 is too many for this plan)
- Don't modify files not touched by tasks 1-5

**Recommended Agent Profile**:
- Category: `quick` - Reason: Cleanup, well-scoped
- Skills: [] - no additional skills needed

**Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [] | Blocked By: Task 3

**Acceptance Criteria**:
- [ ] No new lint errors introduced by Tasks 1-5

---

## Final Verification Wave

- [x] Build passes: `npm run build` with 0 errors
- [x] TVL displays ~$10B (not ~$100M)
- [x] Transaction history shows unbond events
- [x] Both pendulum components use same threshold (1.5)
- [x] LP page shows real data from API

---

## Success Criteria

All P0 and P1 bugs fixed:
- TVL displays correctly (P0) ✓
- Transaction history complete (P0) ✓
- Unified pendulum threshold (P1) ✓
- LP page functional (P1) ✓

Remaining P2+ issues documented for future work.
