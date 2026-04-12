# Changelogs Page Improvements Plan

## TL;DR

> **Quick Summary**: Fix data quality issues, add search/filter/collapse features, improve mobile experience, and add polish enhancements to the Changelogs page.

> **Deliverables**:
> - Deduplicated/cleaned changelog data with consistent IDs
> - Search bar with real-time filtering
> - Type filter pills (update/ADR/chain/feature/bug)
> - Collapsible entries with smooth animations
> - Mobile-responsive timeline layout
> - Year quick-nav for large lists
> - Deep linking via anchor IDs

> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Data cleanup → UI features → Polish

---

## Context

### Original Request
Audit and improve the Changelogs page based on identified issues around data quality, search/filter, and UX.

### Analysis Findings

**Data Quality Issues**:
- Duplicate months: `q3-2023`, `sep-2023`, `aug-2023` all represent similar periods
- Inconsistent ID schema: mix of `end-aug-2022`, `mar-2026`, `q3-2023`, `may-jun-2024`
- Duplicate content: Network halt Oct 27, 2022 appears twice
- Sparse entries: Some months have only 1-2 items

**UI/UX Issues**:
- No search functionality
- No type filtering
- All entries expanded by default (long scroll)
- Timeline breaks on mobile
- No keyboard navigation
- No deep linking

---

## Work Objectives

### Core Objective
Transform Changelogs page from basic display to fully-featured protocol update browser with search, filter, and navigation.

### Concrete Deliverables
1. Cleaned data with consistent IDs (no duplicates, consistent schema)
2. Search input with real-time filtering
3. Type filter pills (update/ADR/chain/feature/bug)
4. Collapsible sections with smooth animations
5. Mobile-responsive timeline
6. Year quick-nav pills
7. Deep linking via anchor IDs
8. Entry count and filter state display

### Definition of Done
- [ ] Search filters by title and content text
- [ ] Type filter shows only matching entries
- [ ] Clicking entry header collapses/expands content
- [ ] Mobile view shows usable timeline
- [ ] Year pills allow jumping to sections
- [ ] URL hash updates when clicking entry (#mar-2026)
- [ ] No duplicate entries in data
- [ ] Consistent ID naming convention

### Must Have
- Search and type filter
- Collapsible entries
- Mobile responsiveness

### Must NOT Have
- Breaking changes to other pages
- Changes to API interface (backward compatible)
- Over-engineering (keep it simple)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (simple UI components)
- **Automated tests**: None needed
- **Agent-Executed QA**: YES - manual verification via Playwright

### QA Policy
Every task includes agent-executed QA scenarios. Verification via Playwright:
- Navigate to /dashboard/changelogs
- Test search: type "Solana", verify filtered results
- Test filter: click "Bug Fix" pill, verify only bugs show
- Test collapse: click entry header, verify content hides
- Test mobile: resize to 375px, verify layout works

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Data & Foundation):
├── Task 1: Deduplicate and clean changelog data
├── Task 2: Add consistent ID schema to all entries
├── Task 3: Add search/filter state management
└── Task 4: Update hook to expose filter functions

Wave 2 (UI Features):
├── Task 5: Add search input component
├── Task 6: Add type filter pills
├── Task 7: Make entries collapsible
├── Task 8: Add year quick-nav pills
├── Task 9: Add anchor IDs for deep linking
├── Task 10: Fix mobile timeline layout
└── Task 11: Add filter state display (count badges)
```

### Dependency Matrix
- **1-4**: Can run in parallel - foundation tasks
- **5-11**: Can run in parallel - UI implementation

---

## TODOs

- [x] 1. **Deduplicate and clean changelog data**

  **What to do**:
  - Remove duplicate entries (e.g., network halt appears twice)
  - Merge sparse entries into appropriate months
  - Keep most comprehensive version of each entry
  - Result: ~40 entries instead of 48

  **Must NOT do**:
  - Delete historical data, just consolidate

  **Recommended Agent Profile**:
  > **Category**: `quick` - This is a data cleanup task, not complex logic
  > - Reason: Simple data transformation, no architectural decisions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-4)
  - **Blocks**: Task 5 (depends on clean data)
  - **Blocked By**: None

  **References**:
  - `src/lib/hooks/use-changelogs.ts` - Data source to clean

  **Acceptance Criteria**:
  - [x] No duplicate content entries
  - [x] Entry count reduced from 48 to ~40

  **QA Scenarios**:
  ```
  Scenario: Data deduplication verification
    Tool: Bash (node script or manual count)
    Preconditions: None
    Steps:
      1. Read use-changelogs.ts
      2. Count entries and check for duplicates
    Expected Result: 40 entries, no duplicates
    Evidence: Console output with entry count
  ```

  **Commit**: YES
  - Message: `refactor(changelogs): deduplicate data entries`
  - Files: `src/lib/hooks/use-changelogs.ts`

---

- [x] 2. **Add consistent ID schema to all entries**

  **What to do**:
  - Convert all IDs to consistent format: `YYYY-MM` or `YYYY-MM-DD`
  - Remove mixed formats like `q3-2023`, `end-aug-2022`, `may-jun-2024`
  - Use period from article title for sorting

  **Must NOT do**:
  - Change the actual data, just the IDs

  **Recommended Agent Profile**:
  > **Category**: `quick` - Simple ID normalization

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-4)

  **References**:
  - `src/lib/hooks/use-changelogs.ts` - Data source

  **Acceptance Criteria**:
  - [x] All IDs follow `YYYY-MM` or `YYYY-MM-DD` format
  - [x] Sorting still works correctly

  **QA Scenarios**:
  ```
  Scenario: ID schema verification
    Tool: Bash (grep/validate format)
    Steps:
      1. Verify all IDs match pattern
    Expected Result: All IDs in consistent format
  ```

  **Commit**: YES (can combine with Task 1)
  - Message: `refactor(changelogs): standardize entry IDs`
  - Files: `src/lib/hooks/use-changelogs.ts`

---

- [x] 3. **Add search/filter state management**

  **What to do**:
  - Add `searchQuery` state to page component
  - Add `typeFilter` state to page component
  - Create filtered changelogs computed value

  **Must NOT do**:
  - Modify hook interface (backward compatible)

  **Recommended Agent Profile**:
  > **Category**: `quick` - State management is straightforward

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4)

  **References**:
  - `src/app/dashboard/changelogs/page.tsx` - Page component
  - `src/lib/hooks/use-changelogs.ts` - Existing hook pattern

  **Acceptance Criteria**:
  - [x] Search state updates on input
  - [x] Filter state updates on pill click
  - [x] Computed filtered list works

  **Commit**: YES (can combine with Task 4)
  - Message: `feat(changelogs): add search and filter state`
  - Files: `src/app/dashboard/changelogs/page.tsx`

---

- [x] 4. **Update hook to expose filter helpers**

  **What to do**:
  - Export `getTypeColor` and `getTypeLabel` (already done)
  - Export a helper to check if entry matches filter
  - Keep hook return shape backward compatible

  **Must NOT do**:
  - Change existing exports or interfaces

  **Recommended Agent Profile**:
  > **Category**: `quick` - Simple utility export

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3)

  **References**:
  - `src/lib/hooks/use-changelogs.ts` - Existing exports

  **Acceptance Criteria**:
  - [x] Helper functions available for page component

  **Commit**: NO (part of Task 3)

---

- [x] 5. **Add search input component**

  **What to do**:
  - Add search input with icon in header area
  - Real-time filtering as user types
  - Search through title and content fields
  - Show "X results" count

  **Must NOT do**:
  - Break existing layout

  **Recommended Agent Profile**:
  > **Category**: `visual-engineering` - UI component design
  > - Reason: Need to match existing design system

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-11)
  - **Blocks**: None
  - **Blocked By**: Tasks 1-4 (need filter state first)

  **References**:
  - `src/app/dashboard/changelogs/page.tsx` - Existing layout
  - `src/components/shared/` - Reusable input patterns

  **Acceptance Criteria**:
  - [x] Search input renders in header
  - [x] Typing filters results in real-time
  - [x] Clear button resets search

  **Commit**: YES
  - Message: `feat(changelogs): add search functionality`
  - Files: `src/app/dashboard/changelogs/page.tsx`

---

- [x] 6. **Add type filter pills**

  **What to do**:
  - Add row of clickable pills: All, Update, ADR, Chain, Feature, Bug
  - "All" selected by default
  - Clicking pill filters to that type only
  - Active pill shows highlighted state

  **Must NOT do**:
  - Make pills too large or break mobile layout

  **Recommended Agent Profile**:
  > **Category**: `visual-engineering` - UI component matching existing style

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7-11)
  - **Blocked By**: Tasks 1-4

  **References**:
  - Existing type badges in the entries

  **Acceptance Criteria**:
  - [x] 6 filter pills render
  - [x] Click filters to matching entries
  - [x] Active state visually distinct
  - [x] Works with search combined

  **Commit**: YES
  - Message: `feat(changelogs): add type filter pills`
  - Files: `src/app/dashboard/changelogs/page.tsx`

---

- [x] 7. **Make entries collapsible**

  **What to do**:
  - Add click handler on entry header to toggle content
  - Chevron icon rotates on expand/collapse
  - Smooth height animation
  - Default: expanded (current behavior)
  - Store collapsed state in localStorage

  **Must NOT do**:
  - Break accessibility (keyboard nav, screen reader)

  **Recommended Agent Profile**:
  > **Category**: `visual-engineering` - Animation and interaction design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-6, 8-11)
  - **Blocked By**: Tasks 1-4

  **References**:
  - Existing entry card design

  **Acceptance Criteria**:
  - [x] Click header toggles content visibility
  - [x] Chevron rotates on toggle
  - [x] Smooth animation (200-300ms)
  - [x] Remembers state on reload

  **Commit**: YES
  - Message: `feat(changelogs): add collapsible entries`
  - Files: `src/app/dashboard/changelogs/page.tsx`

---

- [x] 8. **Add year quick-nav pills**

  **What to do**:
  - Sticky bar below main header
  - Shows years present in data: 2022, 2023, 2024, 2025, 2026
  - Click scrolls to that year's section
  - Active year highlights based on scroll position

  **Must NOT do**:
  - Make it too tall or intrusive

  **Recommended Agent Profile**:
  > **Category**: `visual-engineering` - Navigation UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-7, 9-11)
  - **Blocked By**: Tasks 1-4

  **References**:
  - Similar pattern in other dashboard pages

  **Acceptance Criteria**:
  - [x] Year pills render
  - [x] Clicking scrolls to section
  - [x] Scroll position updates active pill
  - [x] Works on mobile (horizontal scroll)

  **Commit**: YES
  - Message: `feat(changelogs): add year quick-nav`
  - Files: `src/app/dashboard/changelogs/page.tsx`

---

- [x] 9. **Add anchor IDs for deep linking**

  **What to do**:
  - Each entry gets `id` attribute matching changelog ID
  - URL updates to `#mar-2026` format on click
  - Direct URL navigation opens page scrolled to entry

  **Must NOT do**:
  - Break existing sorting (ID is separate from sortDate)

  **Recommended Agent Profile**:
  > **Category**: `quick` - Simple HTML attribute addition

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-8, 10-11)
  - **Blocked By**: Tasks 1-4

  **References**:
  - Standard anchor linking patterns

  **Acceptance Criteria**:
  - [x] Entry cards have ID attributes
  - [x] URL hash updates on interaction
  - [x] Direct URL works (copy/paste URL with hash)

  **Commit**: YES
  - Message: `feat(changelogs): add anchor IDs for deep linking`
  - Files: `src/app/dashboard/changelogs/page.tsx`

---

- [x] 10. **Fix mobile timeline layout**

  **What to do**:
  - Current absolute positioning breaks on narrow screens
  - Change to flexbox or grid with horizontal scroll
  - Test at 375px width

  **Must NOT do**:
  - Break desktop layout

  **Recommended Agent Profile**:
  > **Category**: `visual-engineering` - Responsive design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-9, 11)
  - **Blocked By**: Tasks 1-4

  **References**:
  - Timeline layout logic

  **Acceptance Criteria**:
  - [x] Mobile (375px) shows usable layout
  - [x] Desktop (1440px) unchanged
  - [x] Timeline still visible on mobile

  **Commit**: YES
  - Message: `fix(changelogs): improve mobile timeline layout`
  - Files: `src/app/dashboard/changelogs/page.tsx`

---

- [x] 11. **Add filter state display (count badges)**

  **What to do**:
  - Show "Showing X of Y entries" below filters
  - Show active filter badges with clear option
  - Example: "Showing 5 of 48 entries" or "Bug Fix (3)"

  **Must NOT do**:
  - Make it cluttered

  **Recommended Agent Profile**:
  > **Category**: `quick` - Simple UI addition

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-10)
  - **Blocked By**: Tasks 1-4

  **References**:
  - Similar patterns in other dashboard pages

  **Acceptance Criteria**:
  - [x] Count displays correctly
  - [x] Updates on filter/search change

  **Commit**: YES
  - Message: `feat(changelogs): add filter state display`
  - Files: `src/app/dashboard/changelogs/page.tsx`

---

## Final Verification Wave

- [x] F1. **Functional Verification** — Playwright tests for all features
- [x] F2. **Visual Verification** — Screenshot comparison
- [x] F3. **Mobile Verification** — Test at 375px width
- [x] F4. **Accessibility** — Keyboard navigation works

---

## Commit Strategy

- **1**: `refactor(changelogs): clean and deduplicate data` - use-changelogs.ts
- **2**: `feat(changelogs): add search, filter, collapse, and navigation` - page.tsx

---

## Success Criteria

### Verification Commands
```bash
# Search works
npx playwright test --grep "Search"

# Filter works  
npx playwright test --grep "Filter"

# Collapse works
npx playwright test --grep "Collapse"

# Mobile works
npx playwright test --grep "Mobile"
```

### Final Checklist
- [x] Search filters entries in real-time
- [x] Type filter pills work correctly
- [x] Entries collapse/expand on click
- [x] Year navigation scrolls to section
- [x] Deep linking works (#mar-2026)
- [x] Mobile layout is usable
- [x] Data is deduplicated (~40 entries)
- [x] No breaking changes to other pages