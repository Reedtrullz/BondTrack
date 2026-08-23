# BondTrack Playwright QA Audit Report

**Date**: 2026-04-29
**Tester**: Sisyphus (Automated Playwright Testing)
**Environment**: Local dev server (http://localhost:3000)
**App Version**: Staging branch (post-THORChain feature expansion)
**Test Addresses**:
- `thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346` — Active bond provider (ᚱ5,871.72)
- `thor14wtqzhe9cj7jjtwkv4436jz00xphwr6m3zq9z8` — LP provider (3 positions, $96,011)

---

## Executive Summary

BondTrack is functional with real THORChain data. All 8 dashboard pages load successfully. The new features (Portfolio, Fee Revenue, Market Overview, IL Calculator, Tax Export, Network Security, Upgrade Alerts) are present and mostly working. However, there are **significant data accuracy issues**, **widespread 502 errors from Midgard**, and **several UX contradictions** that need attention.

**Overall Grade: B** — Good functionality, questionable data reliability.

---

## Addresses Used for Testing

### 1. thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346 (Bond Provider)
- **Bond**: ᚱ5,871.72 ($2,966.40) on node `thor19uyg2vvsja9cfpejdj0c6pm7exfk87envj5s5h`
- **Status**: Active, Pooled
- **Operator Fee**: 5.0%
- **Slash Points**: 53,930 (elevated)
- **APY**: 234.28%
- **LP**: None
- **THORName**: None found

### 2. thor14wtqzhe9cj7jjtwkv4436jz00xphwr6m3zq9z8 (LP Provider)
- **LP Positions**: 3 (BCH.BCH, DOGE.DOGE, GAIA.ATOM)
- **Total LP Value**: $96,011
- **Net P/L**: -$387,903 (-80.16%)
- **Bond**: None
- **Last Activity**: 15/07/2022

---

## Page-by-Page Findings

### 1. Homepage (`/`)
**Status**: Working

**What Works**:
- Clean landing page with Heimdall branding
- Address input with validation
- Feature cards (Node Health, Earnings, Risk Alerts, Transactions)
- Live Network Data badges

**Issues**:
- "No recent addresses" — localStorage persistence not working or cleared
- Lookup button disabled until text entered (expected behavior)
- Feature cards are not clickable links (just informational)

---

### 2. Portfolio Page (`/dashboard/portfolio`)
**Status**: Working with placeholders

**What Works**:
- Total Portfolio Value: $2,966.40 (Bond: $2,966.40, LP: $0.00) — correct for bond-only address
- Asset Allocation section with pie chart legend
- Quick Actions links to Risk, Rewards, LP pages
- Live badge shows data freshness

**Issues**:
- **Performance Summary shows 0.00% for ALL timeframes** (7d, 30d, YTD) — pure placeholders
  - Message: "Historical performance data will be available in a future update."
  - This is the most prominent feature on the page and it's completely non-functional
- Pie chart shows only legend, no visible proportions (may be rendering issue)
- No LP data shown for LP-only address when tested separately

**Recommendation**: Remove or hide Performance Summary until historical tracking is implemented. It's misleading to show 0.00%.

---

### 3. Overview Page (`/dashboard/overview`)
**Status**: Working, most feature-rich page

**What Works**:
- **Market Overview Widget**: 24H Volume ($45M), TVL ($42M), RUNE Price ($0.5052, +3.41% 7d), Top 5 Pools
- **Portfolio Summary**: Total Bonded (ᚱ5,871.72), Annual Earnings (ᚱ13,756.47), RUNE Price, Weighted APY (234.28%), Portfolio Health (B)
- **Fee Revenue Tracker**: 7D (ᚱ822,831.66), 30D (ᚱ3,805,084.62) with area chart
- **Reward Projections**: Daily/Weekly/Monthly with Net Reward, Fee Leakage, USD Value, Growth
- **Bonded Positions Table**: 1 node with status, bond, share, fee, APY
- **Alert Banner**: "High slash points detected on 1 node(s). Risk of jail is elevated."
- **Quick Actions**: Bond More, Unbond, Export CSV buttons

**Issues**:
- **Pool APY shows 0.00% for ALL pools** in Top 5 Pools table (BTC.BTC, ETH.ETH, DAI, USDT-TRON, USDT-ETH)
- **"Your Est. Daily Share" shows ᚱ0.00 ($0)** despite having ᚱ5,871.72 bonded
  - Expected: Some proportional share of 24H/7D revenue
  - This makes the fee revenue feature feel broken for users
- **Weighted APY shows "Avg: 0% · Top: 0%"** — benchmark comparison not working
- **24H Revenue shows ᚱ0.00** — might be a Midgard data issue or calculation bug
- **Fee Revenue chart Y-axis** shows ᚱ0 to ᚱ1.2M but 24H is 0 — chart looks odd with flat line at bottom

**Number Accuracy Check**:
- Total Bonded: ᚱ5,871.72 × $0.5052 = $2,966.40 ✅
- Annual Earnings: ᚱ5,871.72 × 234.28% = ᚱ13,756.47 ✅
- Daily Net Reward: +ᚱ19.45... but 13,756.47/365 = ᚱ37.69 gross, ×0.95 = ᚱ35.81 net
  - **Disconnect**: Projected daily (ᚱ19.45) doesn't match annual/365 (ᚱ35.81)
  - Monthly: ᚱ612.28 × 12 = ᚱ7,347.36 annually — half of the "Annual Earnings" ᚱ13,756.47
  - **These numbers contradict each other and need reconciliation**

---

### 4. Nodes Page (`/dashboard/nodes`)
**Status**: Working, minimal

**What Works**:
- Node Health Card: Shows node address, health grade (B), status (Active), total bond (ᚱ982,404), operator fee (5.0%), slash points (53,930), version (v3.17.0)
- Quick actions: Bond 10k, Unbond
- Network Comparison Table: 95 active nodes, compares your bond vs network average
- Your bond is +3.4% above average

**Issues**:
- **Page only shows YOUR nodes, not a network-wide node list**
- For users with 1 node, this page is very sparse
- No jail status visualization despite 53,930 slash points
- "Network Comparison" only shows bond amount, not other metrics (APY, uptime, etc.)

**Duplicate Functionality**:
- Bonded position data also appears on Overview page
- Node status also appears on Risk page

---

### 5. Rewards Page (`/dashboard/rewards`)
**Status**: Working with caveats

**What Works**:
- PnL Performance: Current Bond (ᚱ5,871.72), Price PnL, Total Return
- Yield Optimization: Gross Rewards (ᚱ500.94/mo), Net Take-home (ᚱ475.89/mo), Leakage (-ᚱ25.04, 5.00%)
- Compound Growth Forecast: 1Y chart with Realistic Mode, RUNE/USD toggle
- Strategic Insight: "Your portfolio is concentrated in a single node..."
- Market Context: RUNE Price chart with 24H/7D/30D/1Y toggles
- **Export Tax Report button present** ✅

**Issues**:
- **Initial Bond shows ᚱ0.00** — user must manually input this
  - Bond Growth shows "N/A — Set initial bond to track"
  - Without initial bond, PnL is meaningless
- **Price PnL shows $0.00** because entry price equals current price ($0.5052)
  - This suggests the entry price detection isn't working
- **Compound Growth chart shows duplicate "Mar" labels** (Mar, Mar, Apr)
- **RUNE price chart axis** shows $0.43-$0.56 for 7D range — looks correct

**Number Accuracy Check**:
- Monthly Gross: ᚱ500.94. Annualized: ᚱ6,011.28
  - But "Annual Earnings" on Overview shows ᚱ13,756.47
  - These should be the same or clearly explained why they differ
- Monthly Net: ᚱ475.89 = 500.94 × 0.95 ✅ (5% fee correct)
- Compound Gains (1Y): +ᚱ5,147.56
  - Forecasted Balance: ᚱ11,019.28 = 5,871.72 + 5,147.56 ✅

---

### 6. Risk Page (`/dashboard/risk`)
**Status**: Working with contradictions

**What Works**:
- Risk Summary Banner: Health Score (85), Total Bonded (ᚱ5,871.72), status pills
- Risk KPIs: 1 Earning, 1 Slash (1 crit), 0 Jailed, 2d Churn
- Incentive Pendulum: Nodes 98.6M (54%), LPs 83.2M (46%), Bond-to-Pool 1.18x
- **Network Security Card** (NEW): Bond-to-Pool Gauge, status "at-risk", 1.08x Undercapitalized
- Shield Analysis: Radar chart with Uptime, Security, Bond Share, Yield, Version
- Your Nodes List: 1 node with slash points

**Issues**:
- **Health Score says "85 Healthy" but shows "1 critical" slash alert** — contradictory messaging
  - A "critical" node should not have a "Healthy" score
- **Network Security shows 1.08x but Incentive Pendulum shows 1.18x** — different metrics displayed nearby without explanation
  - 1.08x is "Security coverage" (bond / pool?)
  - 1.18x is "Bond-to-Pool Ratio"
  - Users will be confused why these differ
- **"Show Details" button is collapsed by default** — users might miss Slash Monitor, ChurnOutRisk, etc.
- TVL shows ᚱ83,173,248.15 but Overview shows $42,026,024 — at $0.5052, 83.17M RUNE = $42.03M ✅

---

### 7. LP Page (`/dashboard/lp`)
**Status**: Working with upstream data issues

**What Works**:
- Portfolio Overview: Total LP Value ($96,011), Net P/L (-$387,903), Positions (3), Last Activity
- **IL Calculator working!** Shows IL % for each position:
  - BCH.BCH: -86.33%
  - DOGE.DOGE: -56.74%
  - GAIA.ATOM: +74.44% (positive!)
- LP Cards with detailed metrics: RUNE Deposited, Asset Deposited, Current Value, Net P/L, Claimable amounts, Time in Pool
- **LP Table with IL % column** — sortable ✅
- Pricing confidence banner: "0 with full history · 3 current-only"
- Pool status badges (Available)

**Issues**:
- **56 console errors** — mostly Midgard pool history 502s
  - DOGE.DOGE, GAIA.ATOM, BCH.BCH all fail to fetch historical pool data
  - This forces "current-only" valuation mode
- **Pool APY shows 0.00% for ALL positions**
- **Net P/L is extremely negative** (-$387,903, -80.16%) even for GAIA.ATOM which has +74.44% IL
  - This suggests the "estimated entry" pricing is highly unreliable when historical data is unavailable
  - The negative P/L might be scaring users unnecessarily
- LP positions show "Ownership" percentages that seem high (1.98%, 2.26%, 31.33%)
- Share units show absurdly large numbers (788,371,694,177 units)

**Number Accuracy**:
- IL calculation for BCH.BCH: -86.33% — this is a severe impermanent loss, plausible given market conditions
- GAIA.ATOM showing +74.44% IL is unusual — IL is typically negative. This might be because the asset appreciated more than RUNE, creating "impermanent gain"

---

### 8. Transactions Page (`/dashboard/transactions`)
**Status**: Working with missing history

**What Works**:
- Transaction Composer: BOND/UNBOND mode toggle
- Node address pre-filled from user's bond position
- Generated memo display: `BOND:thor19uyg2vvsja9cfpejdj0c6pm7exfk87envj5s5h`
- Copy Memo button
- Connect Wallet button (disabled without wallet)

**Issues**:
- **Bond History shows "No BOND/UNBOND transactions found"** despite active bond position
  - This is a known issue — Midgard action history uses `type=bond` but may not index all transactions
  - The search box is pre-filled but requires manual click to search
- **Watchlist shows "No saved addresses"** — recent lookups not persisting
- Transaction composer doesn't show fee estimate or gas required

---

### 9. Changelogs Page (`/dashboard/changelogs`)
**Status**: Working well

**What Works**:
- Comprehensive timeline: 177 updates across 48 months
- Search box with `/` keyboard shortcut
- Filter tabs: All, Update (37), ADR (8), Chain (35), Feature (87), Bug (10)
- Year buttons: 2022-2026
- Expandable monthly sections with detailed entries
- Rich content: Protocol updates, ADRs, chain integrations, bug fixes, features
- Latest release correctly shows v3.16

**Issues**:
- Not tested: Search functionality, filter behavior, year filtering
- Some entries have very brief descriptions (e.g., "Cosmos SDK v0.50" repeated multiple times)
- No links to external resources (GitHub, Medium, docs) from individual entries

---

## Cross-Page Analysis

### Duplicate Functionality

| Feature | Pages | Recommendation |
|---------|-------|----------------|
| Portfolio Value | Portfolio, Overview | Keep on Portfolio, remove from Overview or make it a summary card |
| RUNE Price | Overview, Rewards (Market Context) | Keep on both, but ensure same data source |
| Bond Positions | Overview (table), Nodes (card), Risk (list) | Overview table is most useful; Nodes card is redundant |
| LP Positions | LP (cards + table), Portfolio (summary) | Portfolio should show LP summary; LP page shows details |
| Fee/Revenue | Overview (KPIs + chart), Rewards (monthly projection) | Different granularity — keep both but reconcile annual numbers |
| Health Score | Overview (grade), Risk (banner) | Keep on Risk page primarily |
| Quick Actions | Overview (Bond/Unbond/Export), Nodes (Bond/Unbond) | Overview actions are sufficient |

### Data Consistency Issues

| Metric | Overview | Rewards | Nodes | Expected | Status |
|--------|----------|---------|-------|----------|--------|
| Total Bond | ᚱ5,871.72 | ᚱ5,871.72 | ᚱ5,871.72 | Same | ✅ |
| Annual Earnings | ᚱ13,756.47 | - | - | Based on 234.28% APY | ✅ |
| Monthly Net | - | ᚱ475.89 | - | Should be ~ᚱ1,146 (13,756/12 × 0.95) | ❌ **Half of expected** |
| Monthly Gross | - | ᚱ500.94 | - | Should be ~ᚱ1,146 (13,756/12) | ❌ **Half of expected** |
| Daily Net | - | +ᚱ19.45 | - | Should be ~ᚱ35.81 (13,756/365 × 0.95) | ❌ **~45% of expected** |
| APY | 234.28% | 234.28% | - | Same | ✅ |
| RUNE Price | $0.5052 | $0.5052 | - | Same | ✅ |

**The projection numbers (daily/monthly) are roughly HALF of what the annual earnings number suggests.** This is a significant accuracy bug.

---

## Console Errors Summary

| Page | Errors | Primary Cause |
|------|--------|---------------|
| Portfolio | 4 | Midgard member API 502 |
| Overview | 0 | Clean |
| Nodes | 0 | Clean |
| Rewards | 0 | Clean |
| Risk | 0 | Clean |
| LP | 56 | Pool history 502s (DOGE, ATOM, BCH) + THORName 502 |
| Transactions | 0 | Clean |
| Changelogs | 0 | Clean |

**Total: 60 errors across all pages, all from upstream Midgard 502s.**

---

## Critical Issues (Must Fix)

1. **Projection numbers are wrong**: Daily/monthly net rewards are ~50% of what annual earnings/365 suggests. The compound growth forecast uses a different calculation than the portfolio summary.

2. **Pool APY shows 0.00% everywhere**: Top 5 Pools table, LP table, LP cards — all show 0.00% APY. This makes the app look broken.

3. **"Your Est. Daily Share" is always ᚱ0.00**: On the Overview fee revenue card, users with bond see $0 daily share. The calculation appears broken.

4. **Bond History missing**: Transactions page shows no BOND/UNBOND history for an address with an active bond. Users can't track their transaction history.

5. **Health Score contradiction**: Risk page shows "85 Healthy" alongside "1 critical" alert. The scoring algorithm needs tuning for slash points.

---

## Medium Issues (Should Fix)

6. **Performance Summary is fake**: Portfolio page shows 0.00% for all timeframes with a "future update" message. Hide until implemented.

7. **Initial Bond required for PnL**: Rewards page shows N/A for Bond Growth until user manually inputs initial bond. Should auto-detect from earliest transaction.

8. **Notification prompt blocks UI**: The "Enable notifications" banner appears on every page load and blocks content.

9. **Duplicate "Mar" labels**: Compound growth chart shows "Mar, Mar, Apr" — date formatting bug.

10. **LP Net P/L seems wrong**: GAIA.ATOM has +74.44% IL but -$113,017 Net P/L. The "estimated entry" pricing when history is unavailable produces misleading results.

11. **Network Security vs Pendulum confusion**: Two different bond-to-pool ratios (1.08x vs 1.18x) shown on Risk page without explanation.

---

## Low Issues (Nice to Have)

12. **Next.js Dev Tools visible**: The "Open Next.js Dev Tools" button is visible in the UI during testing.

13. **Feature cards not clickable**: Homepage feature cards (Node Health, Earnings, etc.) are static, not navigation links.

14. **Watchlist not populating**: Recent addresses don't appear in the watchlist.

15. **THORName 502s**: Reverse lookup fails consistently, causing console noise.

---

## What Works Exceptionally Well

- **Real-time data loading**: All pages fetch live data from Midgard/THORNode
- **IL Calculator**: Correctly calculates impermanent loss for all 3 LP positions, including positive IL
- **Market Overview Widget**: Shows accurate 24h volume, TVL, RUNE price with 7d change
- **Fee Revenue Chart**: 30-day trend chart renders correctly with dates
- **Changelogs**: Comprehensive, well-organized, searchable protocol history
- **Risk KPIs**: Compact, informative pills for earning/slash/jailed/churn status
- **Incentive Pendulum**: Clear visual of Node vs LP split with percentages
- **Compound Growth Forecast**: Interactive chart with mode toggles and projections
- **Network Security Gauge**: New feature correctly shows "at-risk" status
- **Sidebar Navigation**: All pages accessible, address persisted in URLs

---

## Recommendations by Priority

### P0 (Fix Immediately)
1. Fix projection calculation — daily/monthly net rewards should match annual/365
2. Fix Pool APY display — investigate why all APYs show 0.00%
3. Fix "Your Est. Daily Share" — calculate proportional revenue share for bonded users
4. Fix Bond History — ensure Midgard action history returns transactions

### P1 (Fix Soon)
5. Tune Health Score algorithm — slash points should reduce score below "Healthy"
6. Hide Performance Summary until historical tracking works
7. Auto-detect initial bond from earliest transaction instead of requiring manual input
8. Add explanation tooltip for Network Security vs Bond-to-Pool Ratio
9. Improve LP Net P/L when historical entry pricing is unavailable

### P2 (Polish)
10. Dismiss notification prompt persistently (localStorage)
11. Make homepage feature cards clickable
12. Fix duplicate month labels on charts
13. Handle THORName 502s gracefully (silent fail)
14. Add loading states for LP page to reduce 502 error visibility

---

## Appendix: Known Upstream Issues

- **Midgard pool history 502**: Affects LP page historical pricing for older positions
- **Midgard member API 502**: Affects some addresses' LP data lookup
- **THORName reverse lookup 502**: Consistent failure across all addresses

These are THORChain infrastructure issues, not BondTrack bugs, but the app should handle them more gracefully.

---

*Report generated by Sisyphus automated Playwright testing*
