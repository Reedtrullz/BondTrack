# LP Dashboard Plan

## 1. Overview
Create a page on dev.thorchain.no where users can view the status of their THORChain LP positions at a glance.

## 2. Metrics to Display
- Total bonded RUNE
- Weighted APY
- Health score (0-100)
- Slash risk (fixed `0` for LP positions — LPs are not slashable like node bonds)
- Unbond window remaining (hours)
- Status per position (currently mapped from Midgard pool status: `available -> active`, `staged -> standby`)

## 3. Data Sources
- Midgard API: `GET /v2/member/{address}` for LP positions
- Midgard API: `GET /v2/pools` for pool status and APY
- Current implementation does not require THORNode or Cosmos RPC for LP summary/status mapping

**Live QA note**: the deployed dev site currently shows that `/v2/member/{address}` can fail for real addresses. The LP dashboard must distinguish:
- successful LP data load
- valid empty/no-position state
- upstream member lookup failure with an explicit degraded/error state

## 4. UI Components
- **LpStatusBadge**: status pill (active/standby/jailed/at-risk)
- **LpSummaryCard**: per-pool card with key metrics
- **LpNodeRow**: table row for list view
- **Dashboard Page**: container with grid of cards and table

## 5. Implementation Steps
1. Define types in `src/lib/types/lp.ts` (done)
2. Create status badge component (done)
3. Create summary card component (done)
4. Build node list/table view (done)
5. Integrate Midgard fetch via SWR hook (done)
6. Add wallet auth (Keplr/XDEFI) to retrieve user addresses (pending)
7. Make layout responsive (done)
8. Write tests (pending)
9. QA & review (done)
10. Deploy to staging (done)

## 6. File Structure
```
src/
  lib/
    types/
      lp.ts
  components/
    dashboard/
      lp-status-badge.tsx
      lp-summary-card.tsx
      lp-node-row.tsx
      lp-dashboard-page.tsx (new)
  hooks/
    use-lp-positions.ts (new)
```

## 7. Next Actions
- Add explicit LP-focused tests for `use-lp-positions.ts` and the LP dashboard components
- Wire auth or address selection flows for LP-specific users
- Expand LP health/status derivation beyond `available/staged` if Midgard exposes more pool/member state in the future
- Fix the current dev-site degraded-state gap so member lookup failures do not leave users on a partial shell-only route
- Re-test the LP route on `https://dev.thorchain.no` after each change until success/empty/error states are all confirmed
