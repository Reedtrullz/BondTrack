# LP Dashboard Plan

## 1. Overview
Create a page on dev.thorchain.no where users can view the status of their THORChain LP positions at a glance.

## 2. Metrics to Display
- Total bonded RUNE
- Weighted APY
- Health score (0-100)
- Slash risk (%)
- Unbond window remaining (hours)
- Status per position (active, standby, jailed, at-risk)

## 3. Data Sources
- Midgard API: `GET /v2/member/{address}` for LP positions
- THORNode API: node health and status
- Cosmos RPC: reward balances

## 4. UI Components
- **LpStatusBadge**: status pill (active/standby/jailed/at-risk)
- **LpSummaryCard**: per-pool card with key metrics
- **LpNodeRow**: table row for list view
- **Dashboard Page**: container with grid of cards and table

## 5. Implementation Steps
1. Define types in `src/lib/types/lp.ts` (done)
2. Create status badge component (done)
3. Create summary card component (done)
4. Build node list/table view (pending)
5. Integrate Midgard fetch via SWR hook (pending)
6. Add wallet auth (Keplr/XDEFI) to retrieve user addresses (pending)
7. Make layout responsive (pending)
8. Write tests (pending)
9. QA & review (pending)
10. Deploy to staging (pending)

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
- Complete node row component
- Create SWR hook for Midgard data
- Wire auth to fetch user's LP addresses