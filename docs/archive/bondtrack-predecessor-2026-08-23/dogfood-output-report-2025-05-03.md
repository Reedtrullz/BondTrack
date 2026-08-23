# Dogfood QA Report

**Target:** https://dev.thorchain.no/dashboard/portfolio?address=thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2
**Date:** 2025-05-03
**Scope:** Full site testing - all pages and interactive features
**Tester:** Hermes Agent (automated exploratory QA)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 2 |
| 🟡 Medium | 3 |
| 🔵 Low | 1 |
| **Total** | **6** |

**Overall Assessment:** The Heimdall application is functional with data loading correctly across pages, but has several issues related to SEO/accessibility (duplicate h1 tags), missing pages (Settings 404), and console warnings that should be addressed.

---

## Issues

### Issue #1: Duplicate h1 Headings on All Pages

| Field | Value |
|-------|-------|
| **Severity** | 🟠 High |
| **Category** | Accessibility / SEO |
| **URL** | All pages (Dashboard, Nodes, Rewards, LP Status, Risk, Transactions, Changelogs) |

**Description:**
Every page renders TWO h1 elements:
1. "Dashboard" (incorrectly rendered on all pages)
2. The page-specific h1 (e.g., "ODIN'S JOURNAL" on Changelogs, "LP Positions" on LP Status)

This violates accessibility best practices (screen readers expect a single h1) and SEO guidelines.

**Steps to Reproduce:**
1. Navigate to any page (e.g., /dashboard/nodes, /dashboard/rewards)
2. Observe the page heading says "Dashboard"
3. Notice another h1 element exists with the correct page title

**Expected Behavior:**
Each page should have exactly ONE h1 element that matches the current page name (e.g., "Nodes", "Rewards", "Changelogs").

**Actual Behavior:**
All pages display "Dashboard" as h1, plus the correct page title as another h1.

**Screenshot:**
/Users/reidar/.hermes/cache/screenshots/browser_screenshot_2b146a2a67b349959dbaee9b953d09a9.png

**Console Errors:**
None specific to this issue.

---

### Issue #2: Settings Page Returns 404

| Field | Value |
|-------|-------|
| **Severity** | 🟠 High |
| **Category** | Functional |
| **URL** | https://dev.thorchain.no/dashboard/settings |

**Description:**
The navigation sidebar includes a "Settings" link with description "Notification preferences", but navigating to /dashboard/settings returns a 404 page.

**Steps to Reproduce:**
1. Click "Settings" in the left sidebar
2. Observe 404 error page

**Expected Behavior:**
Either:
- Settings page should load with notification preferences
- OR the Settings link should be removed from navigation until the page is implemented

**Actual Behavior:**
404 page displayed with "This page could not be found."

**Screenshot:**
None (browser showed generic 404)

**Console Errors:**
```
404 error in browser
```

---

### Issue #3: Vercel Scripts Still Loading

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Console |
| **URL** | All pages |

**Description:**
Console shows repeated errors about Vercel Speed Insights and Web Analytics scripts failing to load:
- "[Vercel Speed Insights] Failed to load script from /_vercel/speed-insights/script.js"
- "[Vercel Web Analytics] Failed to load script from /_vercel/insights/script.js"

These scripts are no longer in layout.tsx but are still being injected (likely from cached build artifacts in .next folder).

**Steps to Reproduce:**
1. Navigate to any page
2. Open browser console
3. Observe Vercel-related errors

**Expected Behavior:**
No Vercel script errors since the app is hosted on Coolify, not Vercel.

**Actual Behavior:**
Repeated console errors about failed Vercel script loads.

**Console Errors:**
```
[Vercel Speed Insights] Failed to load script from /_vercel/speed-insights/script.js. Please check if any content blockers are enabled and try again.
[Vercel Web Analytics] Failed to load script from /_vercel/insights/script.js. Be sure to enable Web Analytics for your project and deploy again. See https://vercel.com/docs/analytics/quickstart for more information.
```

**Fix Recommendation:**
Delete `.next` folder, rebuild (`npm run build`), and redeploy to Coolify.

---

### Issue #4: Chart Components Throwing Width/Height Warnings

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Console |
| **URL** | https://dev.thorchain.no/dashboard/changelogs |

**Description:**
Recharts components are throwing warnings about negative width/height values:
"The width(-1) and height(-1) of chart should be greater than 0"

This suggests chart containers don't have proper dimensions set.

**Steps to Reproduce:**
1. Navigate to Changelogs page
2. Open browser console
3. Observe chart-related warnings

**Expected Behavior:**
Charts should render without console warnings.

**Actual Behavior:**
Multiple warnings about chart dimensions.

**Console Errors:**
```
The width(-1) and height(-1) of chart should be greater than 0,
please check the style of container, or the props width(100%) and height(100%),
or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
height and width.
```

**Fix Recommendation:**
Add `minWidth={0} minHeight={0}` to Recharts ResponsiveContainer components.

---

### Issue #5: Page Heading Says "Dashboard" on Sub-Pages

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Content / UX |
| **URL** | /dashboard/nodes, /dashboard/rewards, /dashboard/risk, /dashboard/transactions |

**Description:**
The main heading (h1) on sub-pages says "Dashboard" instead of the page name. This is confusing for users who might think they're on the main Dashboard page.

**Steps to Reproduce:**
1. Navigate to /dashboard/nodes
2. Observe the h1 says "Dashboard" instead of "Nodes"

**Expected Behavior:**
Heading should reflect the current page (e.g., "Nodes", "Rewards", "Risk").

**Actual Behavior:**
All sub-pages show "Dashboard" as the main heading.

---

### Issue #6: Duplicate "Watchlist" Headings on Transactions Page

| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | Content |
| **URL** | https://dev.thorchain.no/dashboard/transactions |

**Description:**
The Transactions page has TWO consecutive h3 headings both saying "Watchlist". One of them should be removed or renamed.

**Steps to Reproduce:**
1. Navigate to /dashboard/transactions
2. Scroll to the Watchlist section
3. Observe two "Watchlist" headings

**Expected Behavior:**
Single "Watchlist" heading.

**Actual Behavior:**
Two duplicate "Watchlist" h3 elements.

---

## Issues Summary Table

| # | Title | Severity | Category | URL |
|---|-------|----------|----------|-----|
| 1 | Duplicate h1 Headings on All Pages | 🟠 High | Accessibility/SEO | All pages |
| 2 | Settings Page Returns 404 | 🟠 High | Functional | /dashboard/settings |
| 3 | Vercel Scripts Still Loading | 🟡 Medium | Console | All pages |
| 4 | Chart Width/Height Warnings | 🟡 Medium | Console | /dashboard/changelogs |
| 5 | Page Heading Says "Dashboard" | 🟡 Medium | Content/UX | Sub-pages |
| 6 | Duplicate "Watchlist" Headings | 🔵 Low | Content | /dashboard/transactions |

---

## Testing Coverage

### Pages Tested
- Dashboard/Portfolio (https://dev.thorchain.no/dashboard/portfolio)
- Nodes (https://dev.thorchain.no/dashboard/nodes)
- Rewards (https://dev.thorchain.no/dashboard/rewards)
- LP Status (https://dev.thorchain.no/dashboard/lp-status)
- Risk (https://dev.thorchain.no/dashboard/risk)
- Transactions (https://dev.thorchain.no/dashboard/transactions)
- Changelogs (https://dev.thorchain.no/dashboard/changelogs)
- Settings (https://dev.thorchain.no/dashboard/settings) - returns 404

### Features Tested
- Theme toggle (light/dark mode) - WORKS
- Refresh dashboard data button - WORKS
- Search functionality on Changelogs - WORKS
- Navigation links (sidebar) - PARTIAL (Settings 404)
- Form inputs (Transactions page) - NOT FULLY TESTED
- Connect Wallet button - NOT TESTED (requires wallet extension)
- Tabs on LP Status page - NOT TESTED
- Year filter buttons on Changelogs - NOT TESTED

### Not Tested / Out of Scope
- Connect Wallet flow (requires actual wallet extension)
- Bond/Unbond transaction composition
- Mobile/responsive design
- Performance testing
- Load testing

### Blockers
- Settings page 404 prevents testing of notification preferences
- Connect Wallet requires manual testing with wallet extension

---

## Notes

### Working Features ✓
1. **Theme Toggle** - Successfully switches between light and dark mode
2. **Refresh Dashboard** - Updates timestamp (verified: "40s ago" → "20s ago")
3. **Search on Changelogs** - Filters results correctly ("Showing 5 entries of 177 total")
4. **Data Loading** - All pages successfully load and display THORChain data
5. **Node Health Display** - Correctly shows 3 nodes with bond amounts, slash points, etc.
6. **Transaction History** - Displays bond history with correct data

### Recommendations
1. **Clean .next folder and rebuild** to remove Vercel script references
2. **Fix duplicate h1 tags** - audit layout.tsx and page components
3. **Either create Settings page or remove the link** from navigation
4. **Add minWidth/minHeight to Recharts containers** to fix console warnings
5. **Remove duplicate "Watchlist" heading** on Transactions page

### Deployment Notes
- New layout.tsx (without Vercel imports) IS deployed at dev.thorchain.no
- Page title correctly shows "Heimdall | THORChain Watcher" (not "THORNode Watcher")
- Commit hashes deployed: a52b550, d21c106, ddf118f, 462168b, ccf67da
