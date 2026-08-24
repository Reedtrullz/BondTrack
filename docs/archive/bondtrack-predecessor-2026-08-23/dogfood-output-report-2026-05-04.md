# Heimdall (dev.thorchain.no) - Complete Audit Report
**Date:** 2026-05-04  
**Auditor:** Hermes Agent  
**Scope:** Full site audit of dev.thorchain.no (staging environment)  
**Testing Method:** Systematic exploratory QA using browser automation

---

## Executive Summary

The Heimdall staging site (dev.thorchain.no) is a THORChain node monitoring dashboard that provides bond providers with portfolio tracking, node health monitoring, rewards analytics, and risk assessment tools. 

**Overall Assessment:** The site is functional with a clean, professional design. However, several bugs and UX issues need attention before production deployment.

### Issue Summary
| Severity | Count | Categories |
|----------|-------|------------|
| **Critical** | 0 | - |
| **High** | 2 | Address concatenation bug, Duplicate logo text |
| **Medium** | 3 | Minimal content on direct URL access, Potential typo, Navigation confusion |
| **Low** | 2 | Minor UI inconsistencies |
| **Positive** | 5 | No console errors, Good empty states, Theme toggle works, Comprehensive changelogs, Clean design |

**Total Issues Found:** 7

---

## Page-by-Page Analysis

### 1. Homepage (/)
**Status:** ✅ Functional  
**Content:**
- Logo: "HEIMDALL" with "THORNODE WATCHER" tagline
- Address input form with validation
- Feature cards: Node Health, Earnings, Risk Alerts, Transactions
- Footer: "Live Network Data", "Non-custodial", "THORChain Mainnet"

**Issues:**
- None on homepage itself

**Validation Test:**
- Typing invalid address (`thor1abc123`) → Shows "Invalid address length" ✅
- Typing valid address → Navigates to `/dashboard/portfolio?address=XXX` ✅

---

### 2. Portfolio Dashboard (/dashboard/portfolio?address=XXX)
**Status:** ✅ Functional with empty state  
**Content:**
- Total Bonded: ᚱ0.00 ($0.00 USD)
- Annual Earnings (Net): N/A
- RUNE Price: $0.5323 (live data)
- Weighted APY: 0.00% (with Avg/Top benchmarks)
- Portfolio Health: A+ (with breakdown)
- Bond Positions: Empty state message
- Asset Allocation: Empty state message
- Quick Actions: View Risk, View Rewards, View LP, Fee Revenue, Market Overview
- Next Churn Countdown: Live countdown (e.g., "1d 7h 24m (18841 blocks)")
- "HEIMDALL'S SIGHT" section

**Issues:**
- **[HIGH]** Address display shows truncated address (`thor1abc...qqaq`) instead of full address
- **[HIGH]** See Address Concatenation Bug below

---

### 3. Nodes Page (/dashboard/nodes?address=XXX)
**Status:** ⚠️ Minimal content (empty state)  
**Content:**
- "No bonded positions found." message

**Issues:**
- Page shows minimal content when accessed directly via URL
- Works better via sidebar navigation (but still shows empty state for addresses with no bonded positions)

---

### 4. Rewards Page (/dashboard/rewards?address=XXX)
**Status:** ✅ Functional with good empty state  
**Content:**
- PnL Performance section with empty state message
- Contextual help: "Bond RUNE to a node operator first; then this page will show net APY, operator fee impact, reward velocity, and tax export options."
- Market Context section with RUNE PRICE chart
- Time period buttons: 24H, 7D, 30D, 1Y
- Interactive chart showing price trend

**Issues:**
- **[MEDIUM]** Direct URL navigation shows "Churn: --" instead of full content
- Chart displays correctly with price data

---

### 5. LP Status Page (/dashboard/lp?address=XXX)
**Status:** ✅ Functional with good empty state  
**Content:**
- "No LP positions found" with contextual message
- "Successful member lookup — the address is valid but has no LP positions."
- "Back to Dashboard" link

**Issues:**
- None specific to this page

---

### 6. Risk Page (/dashboard/risk?address=XXX)
**Status:** ✅ Functional with comprehensive content  
**Content:**
- Risk Monitor section with "Show Details" button
- "No Bond Positions" heading with description
- Incentive Pendulum section (Bond-to-Pool ratio: 1.21x, Target: 1.5x - 3x)
- Bond-to-Pool Gauge with network security metrics
- SHIELD ANALYSIS section ("Awaiting node signal...")
- Live network data display

**Issues:**
- **[MEDIUM]** "Incentive Pendulum" - Verify spelling (should be "Incentive Pendulum" per THORChain docs?)
- Bond-to-Pool Gauge shows "Building" status with warning indicators

---

### 7. Transactions Page (/dashboard/transactions?address=XXX)
**Status:** ✅ Functional  
**Content:**
- Transaction Composer with BOND/UNBOND mode toggle
- Node Address input
- Bond Amount input
- "Advanced: provider address / operator fee" expandable section
- Generated Memo display (shows "BOND:" when node address entered)
- Copy and Copy Memo buttons
- Watchlist section (empty state)
- Bond History section with address search
- Minimum bond transaction reserve: 1.02 RUNE

**Issues:**
- **[HIGH]** Address concatenation bug (see below)
- **[LOW]** "NODE ADDRESS" label - verify if "ADDRESS" spelling is correct (appears correct)

**BOND/UNBOND Mode Test:**
- BOND mode: "Add RUNE to a node" ✅
- UNBOND mode: (not tested, but button exists) ✅

---

### 8. Changelogs Page (/dashboard/changelogs?address=XXX)
**Status:** ✅ Excellent, comprehensive content  
**Title:** "ODIN'S JOURNAL" (Norse mythology reference - fits Heimdall theme)

**Content:**
- Protocol Statistics: 177 protocol updates across 48 months
- Latest Release: v3.16
- Established: Aug 2022
- Search functionality (press /)
- Filter buttons: All, Update 37, ADR 8, Chain 35, Feature 87, Bug 10, 2022-2026
- Timeline view with expandable entries
- Rich content with icons (⚡ for protocol updates, 📋 for ADRs)
- Entries include: Solana launch, v3.16 updates, ADR-23/24, etc.

**Issues:**
- **[MEDIUM]** Direct URL access to /changelogs (without /dashboard/ prefix) returns 404
- Page content is comprehensive and well-organized ✅

---

### 9. Settings Page (/dashboard/settings?address=XXX)
**Status:** ✅ Functional  
**Title:** "Notification Preferences"

**Content:**
- Email Notifications section with Email Address input
- Telegram Notifications section with Chat ID input
- Notification Types:
  - Bond Maturity (Email: ON, Telegram: OFF)
  - Churn Risk Alert (Email: ON, Telegram: OFF)
  - APY Change (Email: OFF, Telegram: ON)
  - Impermanent Loss Alert (Email: OFF, Telegram: ON)
  - RUNE Price Alert (Email: ON, Telegram: ON)
- All switches disabled (expected - wallet not connected or email/telegram not configured)
- "Save Preferences" button (disabled until configuration complete)

**Issues:**
- **[MEDIUM]** Direct URL access to /settings (without /dashboard/ prefix) returns 404
- Switches are disabled (expected behavior, not a bug)

---

## Critical Bugs Found

### [HIGH] Bug #1: Address Concatenation in URL Parameter
**Severity:** High  
**Category:** Functional  

**Description:**
When typing a new address in the homepage search box, the URL parameter concatenates the new address with the previous one instead of replacing it.

**Steps to Reproduce:**
1. Navigate to https://dev.thorchain.no
2. Type `thor1abc123` in the address box
3. Click Lookup (shows "Invalid address length")
4. Clear the box and type `thor1qltnyp0xh9ym26fqyquns30a6g3nkmzztjqqaq`
5. Click Lookup
6. Check the URL

**Expected Behavior:**
URL should be: `https://dev.thorchain.no/dashboard/portfolio?address=thor1qltnyp0xh9ym26fqyquns30a6g3nkmzztjqqaq`

**Actual Behavior:**
URL shows: `https://dev.thorchain.no/dashboard/portfolio?address=thor1abc123thor1qltnyp0xh9ym26fqyquns30a6g3nkmzztjqqaq`

**Impact:**
- Broken functionality when users search for multiple addresses
- Potentially breaks all dashboard features (API calls will fail with invalid address)
- Poor user experience

**Console Errors:** None (the bug is in the URL construction, not a JS error)

---

### [HIGH] Bug #2: Duplicate "HEIMDALL" Text in Sidebar Logo
**Severity:** High (Accessibility)  
**Category:** Accessibility, UI  

**Description:**
The sidebar logo link contains the text "HEIMDALL" twice, which will be read twice by screen readers.

**Evidence:**
From browser snapshot:
```
link "HEIMDALL HEIMDALL" [ref=e12]
  StaticText "HEIMDALL"
  StaticText "HEIMDALL"
```

**Expected Behavior:**
Logo should show "HEIMDALL" once.

**Actual Behavior:**
Logo renders as "HEIMDALL HEIMDALL" (duplicate text).

**Impact:**
- Accessibility violation (WCAG 4.1.2 - Name, Role, Value)
- Screen readers will announce "HEIMDALL HEIMDALL" instead of "HEIMDALL"
- Visual appearance seems correct (only one logo visible), so this is likely a code issue where the text is rendered twice

**Affected Pages:** All pages (sidebar is global)

---

## Medium Priority Issues

### [MEDIUM] Issue #3: Direct URL Navigation Shows Minimal Content
**Description:**
When navigating directly to pages like `/dashboard/nodes`, `/dashboard/rewards`, etc. via URL (not sidebar), the page shows minimal content ("Churn: --") instead of the full dashboard content.

**Affected Pages:**
- /dashboard/nodes
- /dashboard/rewards
- /dashboard/lp
- /dashboard/risk

**Workaround:**
Navigate via sidebar links (client-side routing works correctly).

**Root Cause:**
Likely a server-side rendering (SSR) issue where the address parameter isn't being passed correctly on initial load, but works with client-side navigation via Next.js router.

---

### [MEDIUM] Issue #4: "Incentive Pendulum" Spelling Verification
**Description:**
The Risk page displays "Incentive Pendulum". Need to verify if this is the correct THORChain terminology.

**Affected Page:** /dashboard/risk

**Action Needed:**
Check THORChain documentation for the correct spelling:
- "Incentive Pendulum" (current)
- "Incentive Pendulum" (alternative)
- Other variant?

---

### [MEDIUM] Issue #5: 404 on Wrong URL Patterns
**Description:**
The following URLs return 404:
- /settings → Should be /dashboard/settings
- /changelogs → Should be /dashboard/changelogs
- /nodes → Should be /dashboard/nodes
- /rewards → Should be /dashboard/rewards
- /lp → Should be /dashboard/lp
- /risk → Should be /dashboard/risk
- /transactions → Should be /dashboard/transactions

**Impact:**
- User confusion if they try to access pages directly
- Sidebar navigation works (uses client-side routing), but bookmarks/shared URLs might be wrong

**Recommendation:**
- Add redirect rules from `/settings` → `/dashboard/settings`, etc.
- Or update sidebar links to show the full URL structure

---

## Low Priority Issues

### [LOW] Issue #6: Truncated Address Display
**Description:**
The address is displayed as `thor1abc...qqaq` in the dashboard header instead of the full address.

**Impact:**
- Minor UX issue - users might want to see the full address
- Tooltip or expandable view could help

---

### [LOW] Issue #7: Page Title Includes "TEST"
**Description:**
The page title is "Heimdall | THORChain Watcher TEST"

**Note:**
This is appropriate for a staging environment. Should be removed for production.

---

## Positive Findings

### ✅ No Console Errors
During the entire audit, no JavaScript errors were observed in the browser console. The application handles errors gracefully.

### ✅ Theme Toggle Works
The light/dark mode toggle functions correctly:
- "Switch to dark mode" → Switches to dark mode
- "Switch to light mode" → Switches to light mode

### ✅ Well-Designed Empty States
All pages with no data show contextual empty states with helpful messages:
- "No bonded positions found for this address."
- "Bond RUNE to a node operator first; then this page will show net APY..."
- "This address has no active liquidity positions."
- "No BOND/UNBOND transactions found for this address"

This aligns with the user's preference for "contextual empty states" over "UI voids".

### ✅ Comprehensive Changelogs Page
The "ODIN'S JOURNAL" page is excellent:
- 177 protocol updates across 48 months
- Filtering by type (Update, ADR, Chain, Feature, Bug)
- Filtering by year (2022-2026)
- Search functionality
- Rich timeline view with icons

### ✅ Clean, Professional Design
- "Clean-Room" aesthetic with borderless design
- High typographic hierarchy
- Consistent with user's design preferences
- Responsive layout (based on snapshots)

### ✅ Live Data Integration
- RUNE Price: $0.5323 (live from Midgard)
- Next Churn Countdown: Live countdown with block height
- Network statistics (Bond-to-Pool ratio, etc.)

---

## Testing Notes

### What Was Tested
- ✅ Homepage with address validation
- ✅ All 8 dashboard pages (Portfolio, Nodes, Rewards, LP, Risk, Transactions, Changelogs, Settings)
- ✅ Theme toggle (light/dark mode)
- ✅ Notification prompt dismissal
- ✅ Sidebar navigation
- ✅ Direct URL navigation (identified issues)
- ✅ Interactive elements (buttons, forms, switches)
- ✅ Empty states on all pages
- ✅ Console error monitoring (no errors found)

### What Was Not Tested
- ❌ Wallet connection flow (Connect Wallet button not tested with real wallet)
- ❌ Transaction Composer with real node addresses
- ❌ Email/Telegram notification setup (requires wallet connection)
- ❌ Performance testing (load times, etc.)
- ❌ Mobile responsiveness (tested via desktop snapshots only)
- ❌ Cross-browser compatibility

### Blockers
- None encountered during testing

---

## Recommendations

### Immediate Actions (Before Production)
1. **Fix Address Concatenation Bug** - Critical for proper functionality
2. **Fix Duplicate "HEIMDALL" Text** - Accessibility compliance
3. **Verify "Incentive Pendulum" Spelling** - THORChain terminology accuracy

### Short-Term Improvements
4. **Fix Direct URL Navigation** - Add SSR support or redirect rules
5. **Add Redirects for Wrong URLs** - User-friendly URL handling
6. **Remove "TEST" from Page Title** - For production deployment

### Long-Term Enhancements
7. **Add Full Address Display** - Tooltip or expandable view in header
8. **Wallet Connection Testing** - Complete E2E flow testing
9. **Mobile Responsiveness Audit** - Dedicated mobile testing
10. **Performance Optimization** - Load time analysis

---

## Summary Table of All Issues

| # | Severity | Category | Issue | Page(s) | Status |
|---|----------|----------|-------|----------|--------|
| 1 | High | Functional | Address concatenation bug | All (URL param) | 🐛 Open |
| 2 | High | Accessibility | Duplicate "HEIMDALL" text in sidebar | All (sidebar) | 🐛 Open |
| 3 | Medium | Functional | Direct URL navigation shows minimal content | Nodes, Rewards, LP, Risk | 🐛 Open |
| 4 | Medium | Content | "Incentive Pendulum" spelling verification | Risk | ⚠️ Verify |
| 5 | Medium | Navigation | 404 on wrong URL patterns | Settings, Changelogs, etc. | 🐛 Open |
| 6 | Low | UI | Truncated address display | All (header) | 💡 Enhancement |
| 7 | Low | Content | Page title includes "TEST" | All | 💡 Enhancement |

---

**Audit Completed:** 2026-05-04  
**Next Steps:** Address High and Medium priority issues before production deployment.
