# LP Status Trust Rebuild Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Rebuild the LP Status page so its numbers are financially trustworthy, its summary metrics are meaningful, and its UX explains LP positions in investor language instead of raw protocol language.

**Architecture:** Extract LP-specific valuation logic into a dedicated utility that returns numeric USD facts plus pricing-confidence metadata. Keep `src/app/dashboard/lp/page.tsx` focused on routing/state/layout, move the portfolio hero into a dedicated component, and render all LP cards/table rows from typed valuation data rather than preformatted strings or mixed-unit rollups.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, SWR, Vitest, Testing Library, Tailwind CSS

---

## Read This First

Before writing code, read these files in order:

1. `src/lib/api/AGENTS.md`
2. `src/lib/utils/AGENTS.md`
3. `src/components/dashboard/AGENTS.md`
4. `docs/lp-dashboard-plan.md`
5. `src/hooks/use-lp-positions.ts`
6. `src/app/dashboard/lp/page.tsx`

Implementation guardrails:
- Use `write_file`, not fuzzy patching, for complex TSX files.
- Do not aggregate heterogeneous asset units into a single portfolio KPI.
- Never value the non-RUNE asset with the current RUNE price.
- If historical entry pricing cannot be proven, show an honest degraded state instead of fake precision.
- Keep tests green after every task; the current LP tests are stale and must be repaired as part of the work.

---

### Task 1: Create LP analytics test scaffolding

**Objective:** Introduce a dedicated LP analytics test file that captures the exact pricing bugs from the audit before any implementation changes land.

**Files:**
- Create: `src/lib/utils/__tests__/lp-analytics.test.ts`
- Create: `src/lib/utils/lp-analytics.ts`

**Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest';
import { getLpAssetSymbol, getCurrentAssetPriceUsd } from '../lp-analytics';

describe('LP analytics primitives', () => {
  it('uses the asset symbol, not the chain name, for CHAIN.ASSET pools', () => {
    expect(getLpAssetSymbol('GAIA.ATOM')).toBe('ATOM');
    expect(getLpAssetSymbol('DOGE.DOGE')).toBe('DOGE');
    expect(getLpAssetSymbol('BCH.BCH')).toBe('BCH');
  });

  it('prefers pool assetPriceUSD over the current RUNE price', () => {
    const assetPriceUsd = getCurrentAssetPriceUsd(
      {
        assetPriceUSD: '1.8644753822037146',
        runeDepth: '32657324978656',
        assetDepth: '8583594114048',
      },
      0.48854841521048686
    );

    expect(assetPriceUsd).toBeCloseTo(1.8644753822, 6);
    expect(assetPriceUsd).not.toBeCloseTo(0.4885484152, 6);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- --run src/lib/utils/__tests__/lp-analytics.test.ts`
Expected: FAIL — `Cannot find module '../lp-analytics'`

**Step 3: Write minimal implementation**

```ts
import { calculateAssetPriceFromPoolDepth } from './calculations';

export function getLpAssetSymbol(pool: string): string {
  const parts = pool.split('.');
  if (parts.length < 2) return parts[0] || 'Unknown';
  return parts[1] || parts[0] || 'Unknown';
}

export function getCurrentAssetPriceUsd(
  pool: { assetPriceUSD?: string; runeDepth?: string; assetDepth?: string },
  runePriceUsd: number
): number {
  const directPrice = Number(pool.assetPriceUSD ?? 0);
  if (Number.isFinite(directPrice) && directPrice > 0) {
    return directPrice;
  }

  return calculateAssetPriceFromPoolDepth(
    pool.runeDepth ?? '0',
    pool.assetDepth ?? '0',
    runePriceUsd
  );
}
```

**Step 4: Run test to verify pass**

Run: `npm test -- --run src/lib/utils/__tests__/lp-analytics.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/utils/lp-analytics.ts src/lib/utils/__tests__/lp-analytics.test.ts
git commit -m "test: scaffold lp analytics primitives"
```

---

### Task 2: Add valuation and impermanent-loss regression tests

**Objective:** Lock in correct LP valuation behavior so the app cannot silently ship another fake `0.00%` IL or RUNE-priced-ATOM bug.

**Files:**
- Modify: `src/lib/utils/__tests__/lp-analytics.test.ts`
- Modify: `src/lib/utils/lp-analytics.ts`

**Step 1: Write failing test**

Append these tests:

```ts
import { calculateLpPositionValuation } from '../lp-analytics';

describe('calculateLpPositionValuation', () => {
  it('values withdrawable balances with the correct current asset USD price', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '4313455076023',
      assetDeposit: '1074400000000',
      runeWithdrawable: '7341195037498',
      assetWithdrawable: '1930780800838',
      runeCurrentPriceUsd: 0.48854841521048686,
      assetCurrentPriceUsd: 1.8644753822037146,
      runeEntryPriceUsd: 0.4900000000,
      assetEntryPriceUsd: 1.8600000000,
    });

    expect(result.currentTotalValueUsd).toBeGreaterThan(71000);
    expect(result.currentTotalValueUsd).toBeLessThan(73000);
    expect(result.currentTotalValueUsd).not.toBeCloseTo(45298.09, 0);
  });

  it('returns non-zero impermanent loss when LP balances diverge from HODL balances', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '1000000000',
      assetDeposit: '500000000',
      runeWithdrawable: '1200000000',
      assetWithdrawable: '400000000',
      runeCurrentPriceUsd: 2,
      assetCurrentPriceUsd: 4,
      runeEntryPriceUsd: 1,
      assetEntryPriceUsd: 2,
    });

    expect(result.hodlValueUsd).toBe(40);
    expect(result.currentTotalValueUsd).toBe(40);
    expect(result.impermanentLossPercent).not.toBe(0);
  });

  it('suppresses pnl and il when historical entry pricing is unavailable', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '1000000000',
      assetDeposit: '500000000',
      runeWithdrawable: '1200000000',
      assetWithdrawable: '400000000',
      runeCurrentPriceUsd: 2,
      assetCurrentPriceUsd: 4,
      runeEntryPriceUsd: null,
      assetEntryPriceUsd: null,
    });

    expect(result.currentTotalValueUsd).toBe(40);
    expect(result.depositedTotalValueUsd).toBeNull();
    expect(result.netProfitLossUsd).toBeNull();
    expect(result.impermanentLossPercent).toBeNull();
  });
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- --run src/lib/utils/__tests__/lp-analytics.test.ts`
Expected: FAIL — `calculateLpPositionValuation is not a function`

**Step 3: Write minimal implementation**

Add this to `src/lib/utils/lp-analytics.ts`:

```ts
import { runeToNumber } from './formatters';

export interface LpPositionValuationInput {
  runeDeposit: string;
  assetDeposit: string;
  runeWithdrawable: string;
  assetWithdrawable: string;
  runeCurrentPriceUsd: number;
  assetCurrentPriceUsd: number;
  runeEntryPriceUsd: number | null;
  assetEntryPriceUsd: number | null;
}

export interface LpPositionValuation {
  currentTotalValueUsd: number;
  depositedTotalValueUsd: number | null;
  netProfitLossUsd: number | null;
  netProfitLossPercent: number | null;
  hodlValueUsd: number | null;
  impermanentLossUsd: number | null;
  impermanentLossPercent: number | null;
}

export function calculateLpPositionValuation(input: LpPositionValuationInput): LpPositionValuation {
  const runeDeposit = runeToNumber(input.runeDeposit);
  const assetDeposit = runeToNumber(input.assetDeposit);
  const runeWithdrawable = runeToNumber(input.runeWithdrawable);
  const assetWithdrawable = runeToNumber(input.assetWithdrawable);

  const currentTotalValueUsd =
    runeWithdrawable * input.runeCurrentPriceUsd +
    assetWithdrawable * input.assetCurrentPriceUsd;

  if (input.runeEntryPriceUsd === null || input.assetEntryPriceUsd === null) {
    return {
      currentTotalValueUsd,
      depositedTotalValueUsd: null,
      netProfitLossUsd: null,
      netProfitLossPercent: null,
      hodlValueUsd: null,
      impermanentLossUsd: null,
      impermanentLossPercent: null,
    };
  }

  const depositedTotalValueUsd =
    runeDeposit * input.runeEntryPriceUsd +
    assetDeposit * input.assetEntryPriceUsd;

  const netProfitLossUsd = currentTotalValueUsd - depositedTotalValueUsd;
  const netProfitLossPercent = depositedTotalValueUsd > 0
    ? (netProfitLossUsd / depositedTotalValueUsd) * 100
    : null;

  const hodlValueUsd =
    runeDeposit * input.runeCurrentPriceUsd +
    assetDeposit * input.assetCurrentPriceUsd;

  const impermanentLossUsd = currentTotalValueUsd - hodlValueUsd;
  const impermanentLossPercent = hodlValueUsd > 0
    ? (impermanentLossUsd / hodlValueUsd) * 100
    : null;

  return {
    currentTotalValueUsd,
    depositedTotalValueUsd,
    netProfitLossUsd,
    netProfitLossPercent,
    hodlValueUsd,
    impermanentLossUsd,
    impermanentLossPercent,
  };
}
```

**Step 4: Run test to verify pass**

Run: `npm test -- --run src/lib/utils/__tests__/lp-analytics.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/utils/lp-analytics.ts src/lib/utils/__tests__/lp-analytics.test.ts
git commit -m "test: lock lp valuation and il regressions"
```

---

### Task 3: Make historical pricing honest instead of fake

**Objective:** Stop pretending that a 90-day history window represents 2021/2022 entry pricing; fetch enough history when possible and fall back to `current-only` when it is not.

**Files:**
- Modify: `src/lib/api/midgard.ts:220-247`
- Modify: `src/lib/api/midgard.ts:346-385`
- Test: `src/hooks/use-lp-positions.test.ts`

**Step 1: Write failing test**

Add this test near the top of `src/hooks/use-lp-positions.test.ts`:

```ts
vi.mock('../lib/api/thornode', () => ({
  getLiquidityProvider: vi.fn().mockResolvedValue(null),
}));

it('marks positions as current-only when historical entry pricing cannot be resolved', async () => {
  vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce(successfulMemberDetails as never);
  vi.mocked(midgard.getPools).mockResolvedValueOnce(successfulPools as never);
  vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
    intervals: [{ startTime: '1776902400', endTime: '1776988800', runePriceUSD: '0.48' }],
    meta: { startTime: '1776902400', endTime: '1776988800', startRunePriceUSD: '0.48', endRunePriceUSD: '0.48' },
  } as never);
  vi.mocked(midgard.getHistoricalRunePrice).mockResolvedValueOnce(null as never);
  vi.mocked(midgard.getPoolHistoryAtTimestamp).mockResolvedValueOnce(null as never);

  const { result } = renderHook(() => useLpPositions('thor1currentonly'), { wrapper });

  await waitFor(() => expect(result.current.state).toBe('ready'));
  expect(result.current.positions[0]).toMatchObject({
    pricingSource: 'current-only',
    netProfitLossUsd: null,
    impermanentLossPercent: null,
  });
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- --run src/hooks/use-lp-positions.test.ts`
Expected: FAIL — historical helpers still return `number` and the position type has no `pricingSource`

**Step 3: Write minimal implementation**

Replace the fixed `90` count logic in `src/lib/api/midgard.ts` with a timestamp-aware helper:

```ts
const MIN_HISTORY_DAYS = 30;
const HISTORY_BUFFER_DAYS = 7;

function getHistoryCountForTimestamp(timestamp: number): number {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const secondsBack = Math.max(0, nowSeconds - timestamp);
  const daysBack = Math.ceil(secondsBack / 86_400) + HISTORY_BUFFER_DAYS;
  return Math.max(MIN_HISTORY_DAYS, daysBack);
}

export async function getHistoricalRunePrice(timestamp: number): Promise<number | null> {
  try {
    const history = await getRunePriceHistory('day', getHistoryCountForTimestamp(timestamp));
    if (!history.intervals.length) return null;

    const closest = history.intervals.reduce((best, interval) => {
      const currentDiff = Math.abs(Number(interval.startTime) - timestamp);
      const bestDiff = Math.abs(Number(best.startTime) - timestamp);
      return currentDiff < bestDiff ? interval : best;
    });

    return Number(closest.runePriceUSD);
  } catch {
    return null;
  }
}

export async function getPoolHistoryAtTimestamp(pool: string, timestamp: number): Promise<PoolHistoryEntry | null> {
  try {
    const history = await getPoolHistory(pool, 'day', getHistoryCountForTimestamp(timestamp));
    if (!history.intervals.length) return null;

    return history.intervals.reduce<PoolHistoryEntry | null>((best, interval) => {
      const candidate: PoolHistoryEntry = {
        timestamp: Number(interval.startTime),
        runeDepth: interval.runeDepth,
        assetDepth: interval.assetDepth,
        liquidityUnits: interval.liquidityUnits,
      };

      if (!best) return candidate;
      const currentDiff = Math.abs(candidate.timestamp - timestamp);
      const bestDiff = Math.abs(best.timestamp - timestamp);
      return currentDiff < bestDiff ? candidate : best;
    }, null);
  } catch {
    return null;
  }
}
```

**Step 4: Run test to verify pass**

Run: `npm test -- --run src/hooks/use-lp-positions.test.ts`
Expected: the new test passes, even if older unrelated expectations still need updates in later tasks

**Step 5: Commit**

```bash
git add src/lib/api/midgard.ts src/hooks/use-lp-positions.test.ts
git commit -m "feat: make lp history resolution honest"
```

---

### Task 4: Replace stringly-typed LP fields with typed valuation data

**Objective:** Extend the LP position type so components can render trustworthy USD metrics, asset symbols, and pricing confidence without recomputing or guessing.

**Files:**
- Modify: `src/lib/types/lp.ts`
- Modify: `src/hooks/use-lp-positions.ts`
- Test: `src/hooks/use-lp-positions.test.ts`

**Step 1: Write failing test**

Update the existing successful hook test expectation so it requires the new fields:

```ts
expect(result.current.positions[0]).toMatchObject({
  assetSymbol: 'BTC',
  currentRunePriceUsd: 0,
  currentAssetPriceUsd: 0,
  currentTotalValueUsd: 0,
  pricingSource: 'current-only',
  netProfitLossUsd: null,
  netProfitLossPercent: null,
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- --run src/hooks/use-lp-positions.test.ts`
Expected: FAIL — `assetSymbol` / `pricingSource` / `currentTotalValueUsd` are missing

**Step 3: Write minimal implementation**

Update `src/lib/types/lp.ts` to this shape:

```ts
export type LpPoolStatus = 'available' | 'staged' | 'suspended' | 'unknown';
export type LpPricingSource = 'historical' | 'current-only';

export interface LpPosition {
  address: string;
  pool: string;
  assetSymbol: string;
  runeDeposit: string;
  asset2Deposit: string;
  liquidityUnits: string;
  runeAdded: string;
  runePending: string;
  runeWithdrawn: string;
  asset2Added: string;
  asset2Pending: string;
  asset2Withdrawn: string;
  volume24h: string;
  runeDepth: string;
  asset2Depth: string;
  dateFirstAdded: string;
  dateLastAdded: string;
  poolApy: number;
  poolStatus: LpPoolStatus;
  ownershipPercent: number;
  hasPending: boolean;
  runeWithdrawable: string;
  asset2Withdrawable: string;
  currentRunePriceUsd: number;
  currentAssetPriceUsd: number;
  entryRunePriceUsd: number | null;
  entryAssetPriceUsd: number | null;
  pricingSource: LpPricingSource;
  currentTotalValueUsd: number;
  depositedTotalValueUsd: number | null;
  netProfitLossUsd: number | null;
  netProfitLossPercent: number | null;
  hodlValueUsd: number | null;
  impermanentLossUsd: number | null;
  impermanentLossPercent: number | null;
}
```

Then refactor `useLpPositions` to derive those fields through `getLpAssetSymbol`, `getCurrentAssetPriceUsd`, and `calculateLpPositionValuation`.

**Step 4: Run test to verify pass**

Run: `npm test -- --run src/hooks/use-lp-positions.test.ts`
Expected: updated expectations pass, though page/component tests will still fail until later tasks migrate their UI

**Step 5: Commit**

```bash
git add src/lib/types/lp.ts src/hooks/use-lp-positions.ts src/hooks/use-lp-positions.test.ts
git commit -m "refactor: type lp positions with usd valuation data"
```

---

### Task 5: Build a real portfolio hero summary

**Objective:** Replace the broken mixed-unit summary cards with a USD-based LP portfolio hero that answers “what is my LP book worth and how is it doing?”.

**Files:**
- Create: `src/components/dashboard/lp-portfolio-hero.tsx`
- Modify: `src/lib/utils/lp-analytics.ts`
- Modify: `src/app/dashboard/lp/page.tsx:112-178`
- Test: `src/app/dashboard/lp/page.test.tsx`

**Step 1: Write failing test**

Replace the stale expectation block in `src/app/dashboard/lp/page.test.tsx` with this:

```tsx
expect(await screen.findByText('Total LP Value')).toBeInTheDocument();
expect(screen.getByText('Net P/L')).toBeInTheDocument();
expect(screen.getByText('Positions')).toBeInTheDocument();
expect(screen.getByText('Last Activity')).toBeInTheDocument();
expect(screen.queryByText('ASSET 2 Deposit')).not.toBeInTheDocument();
expect(screen.queryByText('Total Withdrawable')).not.toBeInTheDocument();
```

**Step 2: Run test to verify failure**

Run: `npm test -- --run src/app/dashboard/lp/page.test.tsx`
Expected: FAIL — the current page still renders `ASSET 2 Deposit` and `Total Withdrawable`

**Step 3: Write minimal implementation**

Add this helper to `src/lib/utils/lp-analytics.ts`:

```ts
export interface LpPortfolioSummary {
  positionCount: number;
  totalValueUsd: number;
  totalNetProfitLossUsd: number | null;
  totalNetProfitLossPercent: number | null;
  latestActivityTimestamp: number | null;
  historicalCount: number;
  currentOnlyCount: number;
}

export function calculateLpPortfolioSummary(positions: LpPosition[]): LpPortfolioSummary {
  const totalValueUsd = positions.reduce((sum, position) => sum + position.currentTotalValueUsd, 0);
  const historicalPositions = positions.filter((position) => position.pricingSource === 'historical');
  const totalCostBasis = historicalPositions.reduce((sum, position) => sum + (position.depositedTotalValueUsd ?? 0), 0);
  const totalNetProfitLossUsd = historicalPositions.length > 0 ? totalValueUsd - totalCostBasis : null;
  const totalNetProfitLossPercent = totalCostBasis > 0
    ? ((totalNetProfitLossUsd ?? 0) / totalCostBasis) * 100
    : null;
  const latestActivityTimestamp = positions.reduce<number | null>((latest, position) => {
    const next = Number(position.dateLastAdded);
    if (!Number.isFinite(next) || next <= 0) return latest;
    return latest === null || next > latest ? next : latest;
  }, null);

  return {
    positionCount: positions.length,
    totalValueUsd,
    totalNetProfitLossUsd,
    totalNetProfitLossPercent,
    latestActivityTimestamp,
    historicalCount: historicalPositions.length,
    currentOnlyCount: positions.length - historicalPositions.length,
  };
}
```

Create `src/components/dashboard/lp-portfolio-hero.tsx`:

```tsx
'use client';

import { formatUsd, formatPercent } from '@/lib/utils/formatters';
import type { LpPortfolioSummary } from '@/lib/utils/lp-analytics';

export function LpPortfolioHero({ summary }: { summary: LpPortfolioSummary }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <HeroCard label="Total LP Value" value={formatUsd(summary.totalValueUsd)} detail="Current withdrawable market value" />
      <HeroCard
        label="Net P/L"
        value={summary.totalNetProfitLossUsd === null ? 'Historical pricing unavailable' : formatUsd(summary.totalNetProfitLossUsd)}
        detail={summary.totalNetProfitLossPercent === null ? 'Using current value only' : formatPercent(summary.totalNetProfitLossPercent)}
      />
      <HeroCard label="Positions" value={String(summary.positionCount)} detail={`${summary.historicalCount} with full history`} />
      <HeroCard label="Last Activity" value={summary.latestActivityTimestamp ? new Date(summary.latestActivityTimestamp * 1000).toLocaleDateString() : '--'} detail="Most recent add-liquidity date" />
    </section>
  );
}

function HeroCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-950 dark:text-zinc-50">{value}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  );
}
```

Wire it into `src/app/dashboard/lp/page.tsx` and delete the two current summary-card sections that produce `ASSET 2 Deposit`, `Total Withdrawable`, and the broken `Net PnL` aggregate.

**Step 4: Run test to verify pass**

Run: `npm test -- --run src/app/dashboard/lp/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/utils/lp-analytics.ts src/components/dashboard/lp-portfolio-hero.tsx src/app/dashboard/lp/page.tsx src/app/dashboard/lp/page.test.tsx
git commit -m "feat: replace lp mixed-unit summary with usd hero"
```

---

### Task 6: Add a truthful missing-address state

**Objective:** Distinguish “no address provided” from “valid address has no LP positions” so the route stops lying on `/dashboard/lp`.

**Files:**
- Modify: `src/app/dashboard/lp/page.tsx:229-299`
- Test: `src/app/dashboard/lp/page.test.tsx`

**Step 1: Write failing test**

Add this test:

```tsx
it('shows a missing-address prompt when no address query param is present', async () => {
  mocks.searchParams.current = new URLSearchParams('');
  mockUseLpPositions.mockReturnValue({
    positions: [],
    isLoading: false,
    state: 'empty',
    error: undefined,
    retry: vi.fn(),
  });

  render(<LpDashboardPage />);

  expect(await screen.findByText('Enter a THORChain address')).toBeInTheDocument();
  expect(screen.getByText(/paste an address to inspect live liquidity positions/i)).toBeInTheDocument();
  expect(screen.queryByText('No LP positions found')).not.toBeInTheDocument();
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- --run src/app/dashboard/lp/page.test.tsx`
Expected: FAIL — the route still renders “No LP positions found” without an address

**Step 3: Write minimal implementation**

At the top of `DashboardContent`, before calling `useLpPositions`, add:

```tsx
if (!address) {
  return (
    <LpStatePanel
      tone="empty"
      title="Enter a THORChain address"
      description="Paste an address to inspect live liquidity positions, withdrawable balances, and pool-level performance."
      detail="This route only becomes an LP empty state after a real member lookup succeeds. Without an address, there is nothing to query yet."
    />
  );
}
```

Then call `useLpPositions(address)` only after the guard.

**Step 4: Run test to verify pass**

Run: `npm test -- --run src/app/dashboard/lp/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/dashboard/lp/page.tsx src/app/dashboard/lp/page.test.tsx
git commit -m "fix: separate missing-address from empty lp state"
```

---

### Task 7: Repair the hook tests and integrate correct pricing end-to-end

**Objective:** Update `useLpPositions` so the live page uses typed LP analytics, correct asset pricing, and honest performance status instead of the current RUNE-priced-asset shortcut.

**Files:**
- Modify: `src/hooks/use-lp-positions.ts`
- Modify: `src/hooks/use-lp-positions.test.ts`
- Modify: `src/lib/utils/pool.ts`

**Step 1: Write failing test**

Add this targeted assertion to the successful hook test:

```ts
expect(result.current.positions[0]).toMatchObject({
  assetSymbol: 'BTC',
  currentAssetPriceUsd: 0,
  pricingSource: 'current-only',
});
```

Then add a second test using a non-zero pool price:

```ts
it('uses pool assetPriceUSD for current asset valuation', async () => {
  vi.mocked(midgard.getMemberDetails).mockResolvedValueOnce({
    pools: [{ ...successfulMemberDetails.pools[0], pool: 'GAIA.ATOM', assetAddress: 'cosmos1asset' }],
  } as never);
  vi.mocked(midgard.getPools).mockResolvedValueOnce([
    { ...successfulPools[0], asset: 'GAIA.ATOM', assetPriceUSD: '1.8644', poolAPY: '7.5', status: 'available' },
  ] as never);
  vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
    intervals: [{ startTime: '1776902400', endTime: '1776988800', runePriceUSD: '0.4885' }],
    meta: { startTime: '1776902400', endTime: '1776988800', startRunePriceUSD: '0.4885', endRunePriceUSD: '0.4885' },
  } as never);

  const { result } = renderHook(() => useLpPositions('thor1gaia'), { wrapper });

  await waitFor(() => expect(result.current.state).toBe('ready'));
  expect(result.current.positions[0].assetSymbol).toBe('ATOM');
  expect(result.current.positions[0].currentAssetPriceUsd).toBeCloseTo(1.8644, 4);
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- --run src/hooks/use-lp-positions.test.ts`
Expected: FAIL — `assetSymbol` still returns `GAIA` and current asset price is still wrong

**Step 3: Write minimal implementation**

In `src/hooks/use-lp-positions.ts`, replace this block:

```ts
const runePrice = data?.runePriceUSD ?? 0;
const assetPrice = runePrice;
```

with:

```ts
const runePrice = data?.runePriceUSD ?? 0;
const assetPrice = getCurrentAssetPriceUsd(
  {
    assetPriceUSD: poolData?.assetPriceUSD,
    runeDepth: poolData?.runeDepth,
    assetDepth: poolData?.assetDepth,
  },
  runePrice
);
```

Then populate the new `LpPosition` fields:

```ts
const assetSymbol = getLpAssetSymbol(poolRaw.pool);
const valuation = calculateLpPositionValuation({
  runeDeposit: withdrawable.runeDeposited,
  assetDeposit: withdrawable.asset2Deposited,
  runeWithdrawable: withdrawable.runeWithdrawable,
  assetWithdrawable: withdrawable.asset2Withdrawable,
  runeCurrentPriceUsd: runePrice,
  assetCurrentPriceUsd: assetPrice,
  runeEntryPriceUsd: historicalEntryPrices?.runeEntryPrice ?? null,
  assetEntryPriceUsd: historicalEntryPrices?.asset2EntryPrice ?? null,
});

return {
  ...existingRawFields,
  assetSymbol,
  currentRunePriceUsd: runePrice,
  currentAssetPriceUsd: assetPrice,
  entryRunePriceUsd: historicalEntryPrices?.runeEntryPrice ?? null,
  entryAssetPriceUsd: historicalEntryPrices?.asset2EntryPrice ?? null,
  pricingSource: historicalEntryPrices ? 'historical' : 'current-only',
  currentTotalValueUsd: valuation.currentTotalValueUsd,
  depositedTotalValueUsd: valuation.depositedTotalValueUsd,
  netProfitLossUsd: valuation.netProfitLossUsd,
  netProfitLossPercent: valuation.netProfitLossPercent,
  hodlValueUsd: valuation.hodlValueUsd,
  impermanentLossUsd: valuation.impermanentLossUsd,
  impermanentLossPercent: valuation.impermanentLossPercent,
};
```

Finally, make `src/lib/utils/pool.ts` delegate to the new helper so old imports do not keep the bug alive:

```ts
export { getLpAssetSymbol as getAssetNameSymbolOnly } from './lp-analytics';
```

Or delete the old helper entirely and migrate imports in the next task.

**Step 4: Run test to verify pass**

Run: `npm test -- --run src/hooks/use-lp-positions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/use-lp-positions.ts src/hooks/use-lp-positions.test.ts src/lib/utils/pool.ts
git commit -m "fix: use correct lp asset pricing end to end"
```

---

### Task 8: Refactor LP cards and table rows to investor language

**Objective:** Update the visible LP UI so it reads like a portfolio tool, not a protocol dump, while staying within the existing page shell.

**Files:**
- Modify: `src/components/dashboard/lp-summary-card.tsx`
- Modify: `src/components/dashboard/lp-node-row.tsx`
- Modify: `src/components/dashboard/lp-summary-card.test.tsx`
- Modify: `src/components/dashboard/lp-node-row.test.tsx`
- Modify: `src/lib/utils/formatters.ts`

**Step 1: Write failing test**

Update `src/components/dashboard/lp-summary-card.test.tsx` to assert investor-facing labels:

```tsx
expect(screen.getByText('ATOM Deposited')).toBeInTheDocument();
expect(screen.getByText('Current Value')).toBeInTheDocument();
expect(screen.getByText('Net P/L')).toBeInTheDocument();
expect(screen.queryByText('24H Volume')).not.toBeInTheDocument();
expect(screen.queryByText('Pool Depth')).not.toBeInTheDocument();
```

Update `src/components/dashboard/lp-node-row.test.tsx` to assert:

```tsx
expect(screen.getByText('ATOM: 2.50')).toBeInTheDocument();
expect(screen.getByText('Historical pricing unavailable')).toBeInTheDocument();
expect(screen.queryByText('ASSET: 2.50')).not.toBeInTheDocument();
```

**Step 2: Run test to verify failure**

Run: `npm test -- --run src/components/dashboard/lp-summary-card.test.tsx src/components/dashboard/lp-node-row.test.tsx`
Expected: FAIL — components still render `ASSET`/`24H Volume`/`Pool Depth`

**Step 3: Write minimal implementation**

First, add simple formatting helpers in `src/lib/utils/formatters.ts`:

```ts
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  return `${value.toFixed(digits)}%`;
}
```

Then rewrite `LpSummaryCard` so its metric grid is:
- `RUNE Deposited`
- `{position.assetSymbol} Deposited`
- `Current Value`
- `Net P/L`
- `Impermanent Loss`
- `Pool APY`

And rewrite `LpNodeRow` so the deposited/withdrawable labels use `position.assetSymbol`, not `ASSET`.

When `position.netProfitLossUsd === null`, render:

```tsx
<p className="text-sm text-amber-600 dark:text-amber-400">Historical pricing unavailable</p>
```

instead of `0.00%`.

**Step 4: Run test to verify pass**

Run: `npm test -- --run src/components/dashboard/lp-summary-card.test.tsx src/components/dashboard/lp-node-row.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/dashboard/lp-summary-card.tsx src/components/dashboard/lp-node-row.tsx src/components/dashboard/lp-summary-card.test.tsx src/components/dashboard/lp-node-row.test.tsx src/lib/utils/formatters.ts
git commit -m "refactor: present lp cards and rows in investor language"
```

---

### Task 9: Add a pricing-confidence banner to the live page

**Objective:** Make degraded pricing explicit so the user knows whether LP performance is fully historical or current-value-only.

**Files:**
- Modify: `src/app/dashboard/lp/page.tsx`
- Test: `src/app/dashboard/lp/page.test.tsx`

**Step 1: Write failing test**

Add this case:

```tsx
it('shows a warning banner when any position lacks historical pricing', async () => {
  mockUseLpPositions.mockReturnValue({
    positions: [{
      ...basePosition,
      assetSymbol: 'ATOM',
      pricingSource: 'current-only',
      currentTotalValueUsd: 72014,
      netProfitLossUsd: null,
      netProfitLossPercent: null,
      impermanentLossUsd: null,
      impermanentLossPercent: null,
    }],
    isLoading: false,
    state: 'ready',
    error: undefined,
    retry: vi.fn(),
  });

  render(<LpDashboardPage />);
  expect(await screen.findByText('Historical entry pricing is unavailable for 1 position.')).toBeInTheDocument();
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- --run src/app/dashboard/lp/page.test.tsx`
Expected: FAIL — no banner exists

**Step 3: Write minimal implementation**

In `src/app/dashboard/lp/page.tsx`, derive the count:

```tsx
const currentOnlyCount = positions.filter((position) => position.pricingSource === 'current-only').length;
```

Then render this under the page header and above the hero:

```tsx
{currentOnlyCount > 0 ? (
  <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
    Historical entry pricing is unavailable for {currentOnlyCount} position{currentOnlyCount === 1 ? '' : 's'}.
    Current market value is still accurate, but P/L and impermanent-loss metrics are hidden until a real historical baseline is available.
  </div>
) : null}
```

**Step 4: Run test to verify pass**

Run: `npm test -- --run src/app/dashboard/lp/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/dashboard/lp/page.tsx src/app/dashboard/lp/page.test.tsx
git commit -m "feat: surface lp pricing confidence banner"
```

---

### Task 10: Remove stale LP dead code and align the test suite with reality

**Objective:** Delete unused LP components that encode the old UX and keep only the tested path alive.

**Files:**
- Remove: `src/app/dashboard/lp/components/LPPositionCard.tsx`
- Remove: `src/app/dashboard/lp/components/PoolStatusBadge.tsx`
- Remove: `src/components/dashboard/lp-deposit-withdraw-breakdown.tsx`
- Modify: `src/components/dashboard/lp-status-badge.test.tsx` (only if import paths change)

**Step 1: Verify they are unused**

Run: `npm run lint -- src/app/dashboard/lp/components/LPPositionCard.tsx src/app/dashboard/lp/components/PoolStatusBadge.tsx src/components/dashboard/lp-deposit-withdraw-breakdown.tsx`
Expected: no import references from live code paths

**Step 2: Delete the dead files**

Delete exactly:
- `src/app/dashboard/lp/components/LPPositionCard.tsx`
- `src/app/dashboard/lp/components/PoolStatusBadge.tsx`
- `src/components/dashboard/lp-deposit-withdraw-breakdown.tsx`

**Step 3: Run targeted tests**

Run: `npm test -- --run src/components/dashboard/lp-status-badge.test.tsx src/components/dashboard/lp-summary-card.test.tsx src/components/dashboard/lp-node-row.test.tsx src/app/dashboard/lp/page.test.tsx src/hooks/use-lp-positions.test.ts src/lib/utils/__tests__/lp-analytics.test.ts`
Expected: PASS

**Step 4: Run lint/build**

Run:

```bash
npm run lint -- src/app/dashboard/lp/page.tsx src/hooks/use-lp-positions.ts src/components/dashboard/lp-summary-card.tsx src/components/dashboard/lp-node-row.tsx src/lib/utils/lp-analytics.ts src/lib/utils/formatters.ts src/lib/api/midgard.ts src/lib/types/lp.ts
npm run build
```

Expected:
- lint: 0 errors, ideally 0 warnings
- build: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove stale lp dashboard code paths"
```

---

### Task 11: Re-test the live LP route on dev.thorchain.no

**Objective:** Confirm the production-like deployment now behaves honestly and predictably for the real user address from the audit.

**Files:**
- No code changes required unless QA finds regressions

**Step 1: Deploy to dev/staging**

Use the existing project deployment workflow. Do not continue until the dev URL is serving the new build.

**Step 2: Validate the audited address**

Open:
`https://dev.thorchain.no/dashboard/lp?address=thor14wtqzhe9cj7jjtwkv4436jz00xphwr6m3zq9z8`

Verify:
- page loads without skeleton lockups
- hero shows `Total LP Value`
- non-RUNE asset labels use `ATOM`, `DOGE`, `BCH`, not `ASSET 2` or `GAIA`
- no mixed-unit summary cards remain
- if historical coverage exists, P/L and IL are non-zero where expected
- if historical coverage does not exist, banner clearly says so and P/L/IL are hidden instead of `0.00%`

**Step 3: Validate missing-address state**

Open:
`https://dev.thorchain.no/dashboard/lp`

Verify:
- shows `Enter a THORChain address`
- does not claim a successful Midgard lookup happened

**Step 4: Validate error/empty states**

Manually verify these scenarios:
- genuine empty address with no LP positions
- temporary upstream failure from Midgard
- valid address with at least one `current-only` position

**Step 5: Commit QA notes**

```bash
git add docs/plans/2026-04-23-lp-status-trust-rebuild.md
git commit -m "docs: record lp trust rebuild verification plan"
```

### Execution Outcome (2026-04-23)

Implemented and committed:
- `1ef0588` — typed LP USD valuation data
- `d7185ec` — USD portfolio hero
- `301f589` — truthful missing-address state
- `6fbbdef` — correct LP asset pricing end-to-end
- `9738f75` — investor-language LP cards and rows
- `5a68c0d` — pricing-confidence banner
- `795169e` — stale LP code-path cleanup

Local verification completed:
- targeted LP tests passed
- targeted LP lint passed
- production build passed

Live dev verification completed:
- `https://dev.thorchain.no/dashboard/lp?address=thor14wtqzhe9cj7jjtwkv4436jz00xphwr6m3zq9z8`
  - hero shows `Total LP Value`
  - labels show `ATOM`, `DOGE`, `BCH`
  - mixed-unit summary cards removed
  - route shows a pricing-confidence banner instead of fake `0.00%` P/L/IL values
- `https://dev.thorchain.no/dashboard/lp`
  - shows `Enter a THORChain address`
  - does not claim a successful empty LP lookup

Live caveat discovered during verification:
- Midgard pool-history lookups still return upstream `502` responses for some long-lookback LP positions.
- The route now handles that honestly by falling back to `current-only` mode while preserving current market value.
- Dashboard layout also auto-restores the last viewed address from `sessionStorage` key `dashboard-address`, so browser QA for the no-address state may require clearing that value first.

---

## Final Verification Checklist

Run this full command set before calling the work done:

```bash
npm test -- --run \
  src/lib/utils/__tests__/lp-analytics.test.ts \
  src/hooks/use-lp-positions.test.ts \
  src/app/dashboard/lp/page.test.tsx \
  src/components/dashboard/lp-summary-card.test.tsx \
  src/components/dashboard/lp-node-row.test.tsx \
  src/components/dashboard/lp-status-badge.test.tsx

npm run lint -- \
  src/app/dashboard/lp/page.tsx \
  src/hooks/use-lp-positions.ts \
  src/components/dashboard/lp-summary-card.tsx \
  src/components/dashboard/lp-node-row.tsx \
  src/lib/utils/lp-analytics.ts \
  src/lib/utils/formatters.ts \
  src/lib/api/midgard.ts \
  src/lib/types/lp.ts

npm run build
```

Expected final state:
- all targeted LP tests pass
- build passes
- live dev route no longer shows meaningless mixed-unit portfolio totals
- the page either shows correct performance numbers or honestly says historical performance is unavailable

## Out of Scope for This Plan

Do not add these in this pass:
- internal LP drilldown route/panel
- fee-earned attribution vs impermanent loss decomposition
- historical charts
- wallet-connect changes

Those are good follow-up work, but this plan is about trust repair first.

---

Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?
