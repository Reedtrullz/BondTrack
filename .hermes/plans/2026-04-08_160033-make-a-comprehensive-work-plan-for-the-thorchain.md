# Work Plan: Transforming BondTrack into an Investment Command Center

## Goal
Elevate `thorchain.no` from a technical bond monitor to a professional-grade investment dashboard for THORChain bond providers. The focus shifts from reporting "what is" to providing "actionable insights" on health, yield, and optimization.

## Current Context & Assumptions
- **Current State**: Clean UI, accurate data fetching via Midgard/THORNode APIs, basic risk monitoring.
- **Key Gaps**: Lack of benchmarking, no aggregate health scoring, "empty void" UI components, and a lack of a "Net" financial view (Gross vs. Net of fees).
- **Target Audience**: Sophisticated RUNE holders who treat bonding as a financial investment.

---

## Proposed Approach
The transformation is broken into three thematic pillars: **Health**, **Yield**, and **Utility**. We will move from a "Data-First" to an "Insight-First" architecture.

### Pillar 1: The Health Grade (Risk)
Replace fragmented risk metrics with a single, intuitive "Investment Health Score."
- **Logic**: Develop a weighting algorithm:
    - `Slash Points` (High Weight)
    - `Churn Percentile` (Medium Weight)
    - `Node Operator Fee` (Low Weight / Stability factor)
- **UI**: A prominent "Health Grade" (A+ to F) on the Overview page.

### Pillar 2: The Yield Benchmark (Rewards)
Give the user a sense of relative performance.
- **Logic**: Fetch aggregate network metrics (Average APY and Top 10 Node APY).
- **UI**: Side-by-side comparison: `User APY` | `Network Avg` | `Top Tier`.

### Pillar 3: The Net-Earnings Ledger (Finance)
Clarify the true cost of the Operator Fee.
- **Logic**: Calculate `Gross Reward` $\rightarrow$ `Operator Fee Deduction` $\rightarrow$ `Net Provider Reward`.
- **UI**: A "Fee Leakage" metric and updated projections showing Net RUNE earnings.

---

## Step-by-Step Implementation Plan

### Phase 1: UI Polish & Low-Hanging Fruit (The "Feel")
1. **Empty State Overhaul**: 
    - Replace grey voids in the "Unbond Window" and "Risk" pages with descriptive, apathetic-free status messages.
    - Implement "Healthy" badges for zero-value risk metrics (e.g., "0 Jailed" $\rightarrow$ "Safe").
2. **Visual Consistency**:
    - Standardize "Export CSV" button styles.
    - Align the "Slash Point Monitor" and "Churn-Out Risk" layouts into a unified card style.

### Phase 2: The "Insight" Layer (Core Logic)
1. **Health Score Engine**:
    - Create `src/lib/utils/health-score.ts` to compute the A-F grade based on node lapping/slashing risk.
    - Integrate into `Overview` and `Risk` pages.
2. **Benchmarking Integration**:
    - Update `src/lib/api/thornode.ts` to fetch network-wide APY averages.
    - Add benchmarking badges to the `Weighted APY` card on the Overview page.
3. **Net Reward Calculator**:
    - Update `src/lib/utils/calculations.ts` to split rewards into Gross and Net.
    - Update the "Reward Projections" component to show the "Net" amount of RUNE.

### Phase 3: The Command Center (Advanced Utility)
1. **Actionable Alert Banner**:
    - Implement a global `AlertManager` that surfaces critical risks (High Slash/Near Churn) on the Overview page.
2. **Bond Optimizer Prototype**:
    - Create a "Suggested Moves" component that compares the current node's APY vs. the network's top-performing nodes.
3. **Unbond Simulator**:
    - Build a tool to calculate the exact "opportunity cost" of unbonding now vs. waiting for the window to close.

---

## Files Likely to Change
- **Logic**:
    - `src/lib/utils/calculations.ts` (New Net/Gross and Benchmark logic)
    - `src/lib/api/thornode.ts` (New network-wide data endpoints)
    - `src/lib/hooks/use-bond-positions.ts` (Integrating health score calculations)
- **Components**:
    - `src/components/dashboard/overview/portfolio-summary.tsx` (Added Health Grade/Benchmark)
    - `src/components/dashboard/risk/unbond-window.tsx` (Fixed empty states)
    - `src/components/dashboard/risk/risk-monitors.tsx` (UI unification)
    - `src/components/dashboard/rewards/projections.tsx` (Gross vs Net)

## Validation & Tests
- **Algorithm Verification**: Unit test the `health-score.ts` and `calculations.ts` with a set of "Edge Case" node data (e.g., a node with 0 slash but 99th percentile churn).
- **API Performance**: Ensure that adding benchmark data doesn't significantly increase page load time (implement SWR caching).
- **UX Walkthrough**: Verify that a user with a "High Risk" node is immediately notified upon landing on the Overview page.

## Risks & Trade-offs
- **Data Accuracy**: Network averages change rapidly; the benchmark must be clearly labeled as "Estimated" or "Recent."
- **Algorithm Subjectivity**: The "Health Grade" is an interpretation. We must provide a tooltip explaining *how* the grade is calculated to avoid user confusion.
- **Complexity**: Adding too many "insights" could clutter the clean design. The "Pulse" approach (summarize first, detail later) is critical.
