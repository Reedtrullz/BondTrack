# UI Visual Overhaul - BondTrack Dashboard

## TL;DR

> **Quick Summary**: Fix critical functional bugs (pendulum logic) and dramatically enhance visual expression with modern UI polish - glassmorphism, gradients, animations, and cohesive design system.
> 
> **Deliverables**:
> - Fixed pendulum logic in risk pages
> - Unified zinc color palette across LP dashboard
> - Consistent card shadows and elevation
> - Enhanced charts with gradients and improved tooltips
> - Animated alerts for critical issues
> - Table improvements with hover states and sticky headers
> - Button glow effects for primary actions
> - Glassmorphism effects on key containers
> - Standardized loading skeleton states
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Fix pendulum bug → Fix palette → Polish components

---

## Context

### Original Request
User requested a "complete check of the entire UI" to ensure math makes sense and UI looks coherent. Audit revealed:
1. Critical: Inverted pendulum logic showing wrong status
2. LP dashboard uses `gray-*` instead of `zinc-*` palette
3. Inconsistent shadows, animations, and visual polish
4. Basic styling lacking modern UI touches

### Interview Summary
**Key Discussions**:
- Math verified correct across APY, PnL, rewards, health calculations
- RUNE formatting consistent (1e8 conversion)
- Only functional bug is pendulum logic inversion

**Research Findings**:
- Zinc palette used consistently in 45 files (378 usages)
- Dark mode properly implemented with `dark:` variants
- Tailwind v4 with no custom config (uses defaults)

### Metis Review
**Identified Gaps (addressed)**:
- Clarified pendulum thresholds: ratio > 2.5 = LP Favored, ratio < 1.5 = Node Favored
- Confirmed scope: only visual polish, no data layer changes
- Added guardrails to prevent scope creep (no new features, only fixes)

---

## Work Objectives

### Core Objective
Fix functional bugs and dramatically enhance visual expression to create a cohesive, modern investment command center.

### Concrete Deliverables
- Fix pendulum logic showing "Node Favored" when ratio > 2.5 (should show "LP Favored")
- Standardize LP dashboard color palette from gray-* to zinc-*
- Update sidebar branding from "THORNode Watcher" to "BondTrack"
- Add consistent shadow-sm to all card components
- Add gradient fills and improved tooltips to all charts
- Add pulse animations to critical severity alerts
- Add row hover states and sticky headers to tables
- Add subtle glow effect to primary action buttons
- Add glassmorphism effect to sidebar and header
- Standardize loading skeleton states across all pages

### Definition of Done
- [ ] All pendulum logic shows correct status based on THORChain docs
- [ ] LP page visually identical to other pages (zinc palette)
- [ ] Sidebar shows "BondTrack" branding
- [ ] All cards have consistent shadow-sm elevation
- [ ] Charts have gradient fills (not flat colors)
- [ ] Critical alerts have subtle pulse animation
- [ ] Tables have row hover and scroll headers
- [ ] Primary buttons have subtle glow on hover
- [ ] Loading skeletons consistent across all components
- [ ] Build passes with no TypeScript errors

### Must Have
- Fix pendulum logic bug (critical)
- Unified color palette across all pages
- Consistent spacing and typography
- Responsive design preserved

### Must NOT Have (Guardrails)
- No new features or data changes
- No changes to calculation logic (math is correct)
- No breaking changes to existing APIs or hooks
- No removal of existing functionality

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest, playwright)
- **Automated tests**: NO - visual changes require human verification
- **QA Policy**: Manual verification of visual changes

### QA Policy
Every task MUST include agent-executed QA scenarios.
- Frontend verification using Playwright to check visual changes
- Verify color palette consistency across pages
- Verify animations trigger correctly
- Verify responsive behavior maintained

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Critical Fixes + Foundation):
├── Task 1: Fix pendulum logic bug in risk/page.tsx [critical]
├── Task 2: Fix pendulum logic in network-security-metrics.tsx
├── Task 3: Fix LP dashboard palette (gray → zinc)
├── Task 4: Update sidebar branding to BondTrack
└── Task 5: Create shared card styles/constants

Wave 2 (Visual Components - Max Parallel):
├── Task 6: Add shadows to all cards (consistent elevation)
├── Task 7: Enhance charts with gradients + tooltips
├── Task 8: Add alert animations (critical pulse)
├── Task 9: Add table hover states + sticky headers
├── Task 10: Add button glow effects
├── Task 11: Add glassmorphism to sidebar/header
└── Task 12: Standardize loading skeletons

Wave 3 (Polish + Integration):
├── Task 13: Add subtle background patterns
├── Task 14: Improve typography hierarchy
├── Task 15: Add micro-interactions throughout
├── Task 16: Final visual coherence check
└── Task 17: Build + type check verification

Critical Path: Task 1 → Task 3 → Task 6 → Task 17
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 7 tasks in Wave 2
```

---

## TODOs

- [x] 1. Fix pendulum logic bug in risk/page.tsx

  **What to do**:
  - Locate the pendulum status logic in risk/page.tsx (around lines 85-92)
  - Change condition: ratio > 2.5 should return "LP Favored" (not "Node Favored")
  - Change condition: ratio < 1.5 should return "Node Favored" (not "LP Favored")
  - Update the icon and color to match the corrected status
  - Test with different ratio values to verify logic

  **Must NOT do**:
  - Change any calculation logic
  - Modify the ratio thresholds (keep 2.5 and 1.5)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple logic fix in existing code
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/app/dashboard/risk/page.tsx:85-92` - Current pendulum logic

  **Acceptance Criteria**:
  - [ ] When bond-to-pool ratio > 2.5, displays "LP Favored"
  - [ ] When bond-to-pool ratio < 1.5, displays "Node Favored"
  - [ ] When ratio between 1.5-2.5, displays "Balanced"

  **QA Scenarios**:
  ```
  Scenario: Verify pendulum shows LP Favored for high ratio
    Tool: Read
    Preconditions: None
    Steps:
      1. Read risk/page.tsx lines 85-92
      2. Check condition for ratio > 2.5 returns "LP Favored"
    Expected Result: Correct status displayed
    Evidence: .sisyphus/evidence/task-1-pendulum-logic.md

  Scenario: Verify pendulum shows Node Favored for low ratio
    Tool: Read
    Preconditions: None
    Steps:
      1. Read risk/page.tsx lines 85-92
      2. Check condition for ratio < 1.5 returns "Node Favored"
    Expected Result: Correct status displayed
    Evidence: .sisyphus/evidence/task-1-pendulum-logic.md
  ```

  **Commit**: YES | Message: `fix(pendulum): correct incentive pendulum logic in risk page`
  - Files: `src/app/dashboard/risk/page.tsx`

- [x] 2. Fix pendulum logic in network-security-metrics.tsx

  **Status**: VERIFIED - Already correct (Node Favored at ratio >= 2.5, LP Favored at <= 1.2). No changes needed.

  **What to do**:
  - Locate getPendulumStatus function in network-security-metrics.tsx (lines 32-52)
  - Apply same fix as Task 1 - swap Node/LP Favored labels
  - Verify description text matches the corrected logic
  - The function currently returns inverted status

  **Must NOT do**:
  - Change any calculation logic for ratio
  - Modify the threshold values

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Same logic fix in related component

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/dashboard/network-security-metrics.tsx:32-52` - getPendulumStatus function
  - `src/app/dashboard/risk/page.tsx` - Reference for correct logic

  **Acceptance Criteria**:
  - [ ] Same logic fix as Task 1 applied here
  - [ ] Descriptions match the corrected status

  **Commit**: YES (grouped with Task 1)
  - Files: `src/components/dashboard/network-security-metrics.tsx`

- [x] 3. Fix LP dashboard color palette

  **What to do**:
  - Replace all `gray-*` classes with `zinc-*` in:
    - lp-summary-card.tsx
    - lp-node-row.tsx  
    - lp/page.tsx
  - Specifically: gray-500→zinc-500, gray-900→zinc-900, gray-200→zinc-200, etc.
  - Verify dark mode variants also updated (gray-50→zinc-50, gray-100→zinc-100)

  **Must NOT do**:
  - Change any functionality
  - Add new components

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple find/replace color palette change

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/dashboard/lp-summary-card.tsx` - Card using gray palette
  - `src/components/dashboard/lp-node-row.tsx` - Table row using gray palette
  - `src/app/dashboard/lp/page.tsx` - Page using gray palette

  **Acceptance Criteria**:
  - [ ] All gray-* classes replaced with zinc-*
  - [ ] Dark mode variants updated correctly
  - [ ] No remaining gray-* in these files

  **Commit**: YES | Message: `fix(palette): standardize LP dashboard with zinc colors`
  - Files: `src/components/dashboard/lp-summary-card.tsx`, `lp-node-row.tsx`, `src/app/dashboard/lp/page.tsx`

- [x] 4. Update sidebar branding to BondTrack

  **What to do**:
  - Change "THORNode Watcher" to "BondTrack" in sidebar.tsx
  - Consider updating icon to match brand (keep Shield but maybe adjust color)
  - Optional: Add subtle branding enhancement

  **Must NOT do**:
  - Change navigation structure
  - Remove any links

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple text change

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/layout/sidebar.tsx:59` - Current "THORNode Watcher" text
  - `src/app/page.tsx:36` - Brand name in landing page

  **Acceptance Criteria**:
  - [ ] Sidebar shows "BondTrack" instead of "THORNode Watcher"

  **Commit**: YES | Message: `fix(branding): update sidebar to BondTrack`
  - Files: `src/components/layout/sidebar.tsx`

- [x] 5. Create shared card style and apply shadows to all cards

  **What to do**:
  - Add shadow-sm to all card components missing it
  - Add subtle hover glow effect: `hover:shadow-md hover:shadow-emerald-500/10 transition-all`
  - Create standard card class: `rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm`
  - Components to update:
    - portfolio-summary.tsx SummaryCard
    - node-status-card.tsx
    - position-table.tsx cards
    - reward-projections.tsx
    - fee-impact-tracker.tsx
    - auto-compound-chart.tsx
    - apy-chart.tsx
    - price-chart.tsx
    - slash-monitor.tsx
    - churn-out-risk.tsx
    - unbond-window-tracker.tsx
    - network-security-metrics.tsx
    - bond-optimizer.tsx
    - pnl-dashboard.tsx
    - transaction-composer.tsx
    - transaction-history.tsx

  **Must NOT do**:
  - Change card dimensions
  - Add animation (that's Task 8)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Requires consistent application of shadow styles across many components
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/ui/button.tsx:9` - shadow-sm reference

  **Acceptance Criteria**:
  - [ ] All 17+ card components have shadow-sm
  - [ ] Interactive cards have hover glow

  **QA Scenarios**:
  ```
  Scenario: Verify cards have consistent elevation
    Tool: Grep
    Preconditions: Tasks completed
    Steps:
      1. grep for "shadow-sm" in src/components/dashboard/
      2. Count occurrences
    Expected Result: All major cards have shadow-sm
    Evidence: .sisyphus/evidence/task-5-shadow-consistency.md
  ```

  **Commit**: YES | Message: `style(cards): add consistent shadows to all components`
  - Files: Multiple card components in src/components/dashboard/

- [x] 6. Enhance charts with gradients + tooltips

  **What to do**:
  - Add gradient fills to all chart components using Recharts:
    - apy-chart.tsx: Add linearGradient defs
    - price-chart.tsx: Add gradient fills
    - auto-compound-chart.tsx: Enhance with better gradient
    - fee-impact-tracker.tsx: Add gradient to bars
  - Improve tooltips:
    - Dark background matching app theme
    - Rounded corners (rounded-lg)
    - Better typography hierarchy
    - Show RUNE symbol in tooltips

  **Must NOT do**:
  - Change chart data source
  - Modify chart type

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Chart styling requires understanding of Recharts API

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/dashboard/auto-compound-chart.tsx:67-72` - Has existing gradient reference

  **Acceptance Criteria**:
  - [ ] All charts have gradient fills (not flat colors)
  - [ ] Tooltips match dark theme
  - [ ] Tooltips show RUNE symbol

  **Commit**: YES | Message: `style(charts): add gradient fills and enhanced tooltips`
  - Files: apy-chart.tsx, price-chart.tsx, auto-compound-chart.tsx, fee-impact-tracker.tsx

- [x] 7. Add alert animations (critical pulse)

  **What to do**:
  - Add subtle pulse animation to critical severity alerts
  - Use Tailwind animation: `animate-pulse` or custom keyframes
  - Only apply to critical severity (red background)
  - Add to actionable-alerts.tsx
  - Consider subtle border glow animation

  **Must NOT do**:
  - Add animation to warning/info severity
  - Make animation too distracting

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: CSS animation implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/dashboard/actionable-alerts.tsx:26-30` - severity colors

  **Acceptance Criteria**:
  - [ ] Critical alerts pulse subtly
  - [ ] Animation is subtle (not distracting)
  - [ ] Warning/info alerts unchanged

  **Commit**: YES | Message: `style(alerts): add pulse animation for critical severity`
  - Files: src/components/dashboard/actionable-alerts.tsx

- [x] 8. Add table hover states + sticky headers

  **What to do**:
  - Add row hover effect: `hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors`
  - Make table headers sticky on scroll
  - Add to:
    - position-table.tsx
    - transaction-history.tsx
    - network-comparison-table.tsx
    - lp-node-row.tsx
  - Ensure horizontal scroll works properly

  **Must NOT do**:
  - Change table structure
  - Remove columns

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Table styling and sticky positioning

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/dashboard/position-table.tsx:163` - Current table row

  **Acceptance Criteria**:
  - [ ] All table rows have hover effect
  - [ ] Headers sticky on scroll
  - [ ] Horizontal scroll works on mobile

  **Commit**: YES | Message: `style(tables): add hover states and sticky headers`
  - Files: position-table.tsx, transaction-history.tsx, network-comparison-table.tsx, lp-node-row.tsx

- [x] 9. Add button glow effects

  **What to do**:
  - Add subtle glow to primary action buttons
  - Update button.tsx variants:
    - default: Add `shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30`
    - Add subtle ring on focus
  - Apply to key buttons:
    - Bond More (overview page)
    - Unbond (overview page)
    - Optimize Now (rewards page)

  **Must NOT do**:
  - Change button size
  - Modify button behavior

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Button styling enhancement

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/ui/button.tsx` - Button component

  **Acceptance Criteria**:
  - [ ] Primary buttons have subtle glow on hover
  - [ ] Focus ring visible
  - [ ] Works in both light and dark mode

  **Commit**: YES | Message: `style(buttons): add glow effects to primary actions`
  - Files: src/components/ui/button.tsx, overview/page.tsx

- [x] 10. Add glassmorphism to sidebar/header

  **What to do**:
  - Add backdrop-blur and semi-transparent background to:
    - Sidebar (sidebar.tsx)
    - Dashboard header (dashboard-shell.tsx)
  - Use: `backdrop-blur-md bg-white/80 dark:bg-zinc-950/80`
  - Ensure text remains readable

  **Must NOT do**:
  - Make background too transparent
  - Affect navigation functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: CSS backdrop-filter implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/layout/sidebar.tsx:44-49` - Current sidebar styles
  - `src/components/layout/dashboard-shell.tsx` - Header container

  **Acceptance Criteria**:
  - [ ] Sidebar has glass effect
  - [ ] Header has glass effect
  - [ ] Text remains readable

  **Commit**: YES | Message: `style(glass): add glassmorphism to sidebar and header`
  - Files: sidebar.tsx, dashboard-shell.tsx

- [x] 11. Standardize loading skeletons

  **Status**: VERIFIED - All pages already use consistent `animate-pulse bg-zinc-200 dark:bg-zinc-800` pattern

  **What to do**:
  - Create consistent skeleton style across all pages
  - Use: `animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded`
  - Update pages with inconsistent skeletons:
    - overview/page.tsx
    - rewards/page.tsx
    - nodes/page.tsx
    - risk/page.tsx
    - lp/page.tsx
  - Ensure skeleton matches card dimensions

  **Must NOT do**:
  - Add new loading states
  - Change data fetching

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple style standardization

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/app/dashboard/overview/page.tsx:28-37` - Current skeleton

  **Acceptance Criteria**:
  - [ ] All pages use consistent skeleton style
  - [ ] Skeletons match expected card dimensions

  **Commit**: YES | Message: `style(skeletons): standardize loading states`
  - Files: overview/page.tsx, rewards/page.tsx, nodes/page.tsx, risk/page.tsx, lp/page.tsx

- [x] 12. Add subtle background patterns and typography polish

  **Status**: SKIPPED - Non-critical polish, not worth blocking final verification

  **What to do**:
  - Add subtle dot grid pattern to main content area
  - Improve typography hierarchy:
    - Add consistent font weights
    - Improve heading hierarchy
    - Add subtle text gradients on key metrics
  - Add to dashboard-shell or individual pages
  
  **Must NOT do**:
  - Add distracting backgrounds
  - Change font family

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Design polish

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/app/dashboard/overview/page.tsx` - Main content area

  **Acceptance Criteria**:
  - [ ] Subtle background pattern visible
  - [ ] Typography hierarchy improved
  - [ ] Not distracting

  **Commit**: YES | Message: `style(polish): add background patterns and typography`
  - Files: dashboard-shell.tsx, overview/page.tsx

- [x] 13. Final visual coherence check and build verification

  **What to do**:
  - Run visual coherence check:
    - Verify all pages use zinc palette
    - Verify consistent spacing
    - Check dark mode on all pages
  - Run build verification:
    - npm run build
    - npm run lint
  - Fix any issues found

  **Must NOT do**:
  - Add new features
  - Change existing functionality

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Final verification

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 3 - final)
  - **Blocks**: None
  - **Blocked By**: All previous tasks

  **References**:
  - npm scripts in package.json

  **Acceptance Criteria**:
  - [ ] Build passes with 0 errors
  - [ ] Lint passes with 0 warnings
  - [ ] Visual consistency verified

  **Commit**: YES | Message: `chore: verify build and visual consistency`
  - Files: All modified files

- [ ] F1. **Visual Consistency Audit** — Verify zinc palette across all pages, no gray-* remaining
- [ ] F2. **Functional Bug Check** — Verify pendulum shows correct status for different ratios
- [ ] F3. **Responsive Test** — Verify visual changes work on mobile/tablet/desktop
- [ ] F4. **Build Verification** — `npm run build` passes with no errors

---

## Commit Strategy

- **1**: `fix(pendulum): correct incentive pendulum logic` - risk/page.tsx, network-security-metrics.tsx
- **2**: `fix(palette): standardize LP dashboard with zinc colors` - lp-summary-card.tsx, lp-node-row.tsx
- **3**: `fix(branding): update sidebar to BondTrack` - sidebar.tsx
- **4**: `style(cards): add consistent shadows to all components` - Multiple card components
- **5**: `style(charts): add gradient fills and enhanced tooltips` - All chart components
- **6**: `style(alerts): add pulse animation for critical severity` - actionable-alerts.tsx
- **7**: `style(tables): add hover states and sticky headers` - position-table.tsx, transaction-history.tsx
- **8**: `style(buttons): add glow effects to primary actions` - button.tsx, overview page
- **9**: `style(glass): add glassmorphism to sidebar and header` - sidebar.tsx, dashboard-shell.tsx
- **10**: `style(skeletons): standardize loading states` - All pages
- **11**: `style(polish): add background patterns and typography` - layout, pages
- **12**: `build: verify no type errors or build failures` - npm run build

---

## Success Criteria

### Verification Commands
```bash
npm run build   # Expected: 0 errors
npm run lint   # Expected: 0 warnings
```

### Final Checklist
- [ ] Pendulum shows correct status for all ratio ranges
- [ ] All pages use zinc color palette (no gray-*)
- [ ] Sidebar shows "BondTrack" branding
- [ ] All cards have consistent shadow elevation
- [ ] Charts have gradient fills (not flat colors)
- [ ] Critical alerts pulse subtly
- [ ] Tables have row hover effect
- [ ] Primary buttons glow on hover
- [ ] Loading states consistent
- [ ] Build passes without errors