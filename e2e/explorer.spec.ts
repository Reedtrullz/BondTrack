import { expect, test } from './fixtures';
import { DEFAULT_DASHBOARD_ADDRESS, mockDashboardApis } from './helpers/dashboard-api-mocks';

test.describe('Node explorer', () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardApis(page, DEFAULT_DASHBOARD_ADDRESS, {
      withBondPosition: false,
      primaryNodeOverrides: {
        bond_providers: {
          node_operator_fee: '2500',
          providers: [],
        },
        slash_points: 180,
      },
    });
  });

  test('ranks candidates by quality and blocks bond memo preparation for avoid-rated nodes', async ({ page }) => {
    await page.goto(`/dashboard/explorer?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await expect(page.getByText('Rank bond candidates by quality, slash history, operator fee, and capacity trust')).toBeVisible();
    await expect(page.getByText('No direct-bond candidates with confirmed capacity')).toBeVisible();
    const decision = page.getByLabel('Discovery decision diagnosis');
    await expect(decision).toContainText('Do not prepare a BOND from this set');
    await expect(decision).toContainText('Avoid');
    await expect(decision.getByRole('link', { name: 'Review risk evidence' })).toHaveAttribute(
      'href',
      `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef`
    );
    await expect(page.getByRole('button', { name: 'Low Slash' })).toBeVisible();
    await expect(page.getByText(/Avoid · \d+\/100/)).toBeVisible();
    const candidateCard = page.getByTestId('candidate-card');
    const recommendation = candidateCard.getByTestId('candidate-recommendation');
    const scoreEvidence = candidateCard.getByTestId('candidate-score-evidence');
    await expect(recommendation).toContainText('Avoid direct bond');
    await expect(recommendation).toContainText('Review risk context before preparing any BOND memo');
    await expect(scoreEvidence).toContainText('Score evidence · THORNode');
    await expect(scoreEvidence).toContainText('5/5 inputs usable');
    await expect(scoreEvidence).toContainText('Capacity: Watched address is not listed; operator whitelist is required.');
    await expect(candidateCard.getByTestId('candidate-risk-reason')).toContainText([
      '180 slash points',
      'high operator fee',
      'needs operator whitelist',
    ]);
    const recommendationOrder = await candidateCard.evaluate((card) => {
      const recommendationBox = card.querySelector('[data-testid="candidate-recommendation"]')?.getBoundingClientRect();
      const evidenceBox = card.querySelector('[data-testid="candidate-score-evidence"]')?.getBoundingClientRect();
      const apyBox = card.querySelector('[data-testid="candidate-apy"]')?.getBoundingClientRect();

      return {
        evidenceTop: Math.round(evidenceBox?.top ?? 0),
        recommendationTop: Math.round(recommendationBox?.top ?? 0),
        apyTop: Math.round(apyBox?.top ?? 0),
      };
    });
    expect(recommendationOrder.recommendationTop).toBeLessThan(recommendationOrder.apyTop);
    expect(recommendationOrder.recommendationTop).toBeLessThan(recommendationOrder.evidenceTop);
    expect(recommendationOrder.evidenceTop).toBeLessThan(recommendationOrder.apyTop);
    const riskFirstLink = page.getByRole('link', { name: 'Review risk first' });
    await expect(riskFirstLink).toHaveAttribute(
      'href',
      `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef`
    );
    await expect(page.getByRole('link', { name: 'Prepare BOND Memo' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Quick Bond' })).toBeHidden();

    await riskFirstLink.click();

    await expect(page).toHaveURL(
      `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef`
    );
    const focusedRiskContext = page.getByLabel('Focused node risk context');
    await expect(focusedRiskContext).toBeVisible();
    await expect(focusedRiskContext).toContainText('Provider access review');
    await expect(focusedRiskContext).toContainText('Avoid candidate');
    await expect(focusedRiskContext).toContainText('Slash points');
    await expect(focusedRiskContext).toContainText('Operator fee');
    await expect(focusedRiskContext).toContainText('Needs operator whitelist');
    await expect(focusedRiskContext).not.toContainText('candidate or stale-alert context');

    await page.getByRole('link', { name: 'Compare alternatives' }).click();

    await expect(page).toHaveURL(
      `/dashboard/explorer?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef`
    );
    const focusedCandidateContext = page.getByLabel('Focused candidate context');
    await expect(focusedCandidateContext).toBeVisible();
    await expect(focusedCandidateContext).toContainText('Focused candidate');
    await expect(focusedCandidateContext).toContainText('Avoid');
    await expect(focusedCandidateContext.getByTestId('focused-candidate-primary-action')).toContainText('Review provider access');
    await expect(focusedCandidateContext.getByTestId('focused-candidate-primary-action')).toHaveAttribute(
      'href',
      `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef`
    );
    await expect(focusedCandidateContext.getByTestId('focused-candidate-score-evidence')).toContainText('Score evidence · THORNode');
    await expect(focusedCandidateContext.getByTestId('focused-candidate-score-evidence')).toContainText('5/5 inputs usable');
    await expect(focusedCandidateContext.getByTestId('focused-candidate-score-evidence')).toContainText('Capacity: Watched address is not listed; operator whitelist is required.');
    await expect(focusedCandidateContext.getByTestId('focused-candidate-metric-details')).toContainText('Operational details');
    await expect(focusedCandidateContext.getByTestId('focused-candidate-metric-details')).toContainText('Whitelist needed · Slash 180 · Fee 25.0%');
    await expect(focusedCandidateContext.getByTestId('focused-candidate-metrics')).toBeHidden();
    await expect(focusedCandidateContext).toContainText('Grid status');
    await expect(focusedCandidateContext).toContainText('Highlighted');
    const focusedEvidenceOrder = await focusedCandidateContext.evaluate((context) => {
      const evidenceBox = context.querySelector('[data-testid="focused-candidate-score-evidence"]')?.getBoundingClientRect();
      const detailsBox = context.querySelector('[data-testid="focused-candidate-metric-details"]')?.getBoundingClientRect();

      return {
        detailsTop: Math.round(detailsBox?.top ?? 0),
        evidenceTop: Math.round(evidenceBox?.top ?? 0),
      };
    });
    expect(focusedEvidenceOrder.evidenceTop).toBeLessThan(focusedEvidenceOrder.detailsTop);
    await expect(page.getByLabel('Focused candidate node thor1nodemocked123456789abcdef')).toHaveAttribute('data-focused-node', 'true');
  });

  test('keeps candidate sort controls within the mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/explorer?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const sortControls = page.getByTestId('explorer-sort-controls');
    const sourceConfidence = page.getByLabel('Source confidence');
    const decision = page.getByLabel('Discovery decision diagnosis');
    await expect(sourceConfidence).toBeVisible();
    await expect(sourceConfidence).toContainText('THORNode');
    await expect(sourceConfidence).toContainText('Midgard');
    await expect(decision).toBeVisible();
    await expect(sortControls).toBeVisible();

    const hierarchy = await page.evaluate(() => {
      const sourceConfidence = document.querySelector('section[aria-label="Source confidence"]');
      const decision = document.querySelector('section[aria-label="Discovery decision diagnosis"]');
      const sortControls = document.querySelector('[data-testid="explorer-sort-controls"]');
      const box = (element: Element | null) => {
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom } : null;
      };

      return {
        sourceConfidence: box(sourceConfidence),
        decision: box(decision),
        sortControls: box(sortControls),
      };
    });

    expect(hierarchy.sourceConfidence).not.toBeNull();
    expect(hierarchy.decision).not.toBeNull();
    expect(hierarchy.sortControls).not.toBeNull();
    expect(hierarchy.sourceConfidence!.top).toBeLessThan(hierarchy.decision!.top);
    expect(hierarchy.decision!.top).toBeLessThan(hierarchy.sortControls!.top);

    const overflow = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const sourceConfidence = document.querySelector('section[aria-label="Source confidence"]');
      const sortControls = document.querySelector('[data-testid="explorer-sort-controls"]');
      return Array.from([
        ...(sourceConfidence ? Array.from(sourceConfidence.querySelectorAll('*')) : []),
        ...(sortControls ? Array.from(sortControls.querySelectorAll('button, span')) : []),
      ]).filter((element) => {
        const box = element.getBoundingClientRect();
        return box.left < -1 || box.right > viewportWidth + 1;
      }).map((element) => element.textContent?.trim());
    });

    expect(overflow).toEqual([]);
  });

  test('withholds average APY when filters return no candidates', async ({ page }) => {
    await page.goto(`/dashboard/explorer?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    await page.getByRole('button', { name: '<10%' }).click();

    await expect(page.getByText('No nodes match your filters. Try adjusting the fee filter.')).toBeVisible();
    await expect(page.getByText('No average APY shown because the current filters returned no candidates.')).toBeVisible();
    await expect(page.getByText('0.00%')).toHaveCount(0);
  });

  test('keeps candidate cards readable without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dashboard/explorer?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const cards = page.getByTestId('candidate-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.getByTestId('candidate-recommendation')).toContainText('Avoid direct bond');
    await expect(cards.getByTestId('candidate-score-evidence')).toContainText('Score evidence · THORNode');
    await expect(page.getByTestId('candidate-apy')).toBeVisible();
    await expect(page.getByText('Adj. APY')).toBeVisible();

    await cards.evaluate((card) => {
      card.scrollIntoView({ block: 'start' });
    });

    const firstViewportHierarchy = await cards.evaluate((card) => {
      const recommendation = card.querySelector('[data-testid="candidate-recommendation"]')?.getBoundingClientRect();
      const evidence = card.querySelector('[data-testid="candidate-score-evidence"]')?.getBoundingClientRect();
      const apy = card.querySelector('[data-testid="candidate-apy"]')?.getBoundingClientRect();

      return {
        evidenceTop: Math.round(evidence?.top ?? 0),
        recommendationTop: Math.round(recommendation?.top ?? 0),
        apyTop: Math.round(apy?.top ?? 0),
        viewportHeight: window.innerHeight,
      };
    });

    expect(firstViewportHierarchy.recommendationTop).toBeGreaterThan(0);
    expect(firstViewportHierarchy.recommendationTop).toBeLessThan(firstViewportHierarchy.viewportHeight);
    expect(firstViewportHierarchy.recommendationTop).toBeLessThan(firstViewportHierarchy.apyTop);
    expect(firstViewportHierarchy.recommendationTop).toBeLessThan(firstViewportHierarchy.evidenceTop);
    expect(firstViewportHierarchy.evidenceTop).toBeLessThan(firstViewportHierarchy.apyTop);

    const mobileOverflow = await cards.evaluateAll((candidateCards) => {
      return candidateCards.flatMap((card, cardIndex) => {
        const cardBox = card.getBoundingClientRect();
        return Array.from(card.querySelectorAll('*')).flatMap((element) => {
          const box = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const label = element.textContent?.replace(/\s+/g, ' ').trim();
          const outsideCard = box.width > 0 && (box.left < cardBox.left - 1 || box.right > cardBox.right + 1);
          const scrollOverflow = box.width > 0 && style.overflowX === 'visible' && element.scrollWidth > element.clientWidth + 2;

          if (!outsideCard && !scrollOverflow) {
            return [];
          }

          return [{
            cardIndex,
            label,
            outsideCard,
            scrollOverflow,
            width: Math.round(box.width),
            cardWidth: Math.round(cardBox.width),
          }];
        });
      });
    });

    expect(mobileOverflow).toEqual([]);

    await page.setViewportSize({ width: 1280, height: 720 });

    const desktopOverflow = await cards.evaluateAll((candidateCards) => {
      return candidateCards.flatMap((card, cardIndex) => {
        const cardBox = card.getBoundingClientRect();
        return Array.from(card.querySelectorAll('*')).flatMap((element) => {
          const box = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const label = element.textContent?.replace(/\s+/g, ' ').trim();
          const outsideCard = box.width > 0 && (box.left < cardBox.left - 1 || box.right > cardBox.right + 1);
          const scrollOverflow = box.width > 0 && style.overflowX === 'visible' && element.scrollWidth > element.clientWidth + 2;

          if (!outsideCard && !scrollOverflow) {
            return [];
          }

          return [{
            cardIndex,
            label,
            outsideCard,
            scrollOverflow,
            width: Math.round(box.width),
            cardWidth: Math.round(cardBox.width),
          }];
        });
      });
    });

    expect(desktopOverflow).toEqual([]);
  });

  test('keeps candidate risk capacity evidence readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(
      `/dashboard/risk?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef`
    );

    const focusedRiskContext = page.getByLabel('Focused node risk context');
    await expect(focusedRiskContext).toBeVisible();
    await expect(focusedRiskContext).toContainText('Provider access review');
    await expect(focusedRiskContext).toContainText('Needs operator whitelist');

    const mobileRiskLayout = await focusedRiskContext.evaluate((context) => {
      const contextBox = context.getBoundingClientRect();
      const overflow = Array.from(context.querySelectorAll('*')).flatMap((element) => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const outsideContext = box.width > 0 && (box.left < contextBox.left - 1 || box.right > contextBox.right + 1);
        const scrollOverflow = box.width > 0 && style.overflowX === 'visible' && element.scrollWidth > element.clientWidth + 2;

        return outsideContext || scrollOverflow
          ? [{
              label: element.textContent?.replace(/\s+/g, ' ').trim(),
              outsideContext,
              scrollOverflow,
            }]
          : [];
      });

      return {
        contextTop: Math.round(contextBox.top),
        viewportHeight: window.innerHeight,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
        overflow,
      };
    });

    expect(mobileRiskLayout.contextTop).toBeLessThan(mobileRiskLayout.viewportHeight);
    expect(mobileRiskLayout.pageOverflow).toBe(false);
    expect(mobileRiskLayout.overflow).toEqual([]);
  });

  test('keeps focused candidate score evidence readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(
      `/dashboard/explorer?address=${DEFAULT_DASHBOARD_ADDRESS}&node=thor1nodemocked123456789abcdef`
    );

    const focusedCandidateContext = page.getByLabel('Focused candidate context');
    const scoreEvidence = focusedCandidateContext.getByTestId('focused-candidate-score-evidence');
    const metricDetails = focusedCandidateContext.getByTestId('focused-candidate-metric-details');
    const metricGrid = focusedCandidateContext.getByTestId('focused-candidate-metrics');

    await expect(focusedCandidateContext).toBeVisible();
    await expect(focusedCandidateContext.getByTestId('focused-candidate-primary-action')).toContainText('Review provider access');
    await expect(scoreEvidence).toBeVisible();
    await expect(scoreEvidence).toContainText('Score evidence · THORNode');
    await expect(scoreEvidence).toContainText('Capacity: Watched address is not listed; operator whitelist is required.');
    await expect(metricDetails).toContainText('Operational details');
    await expect(metricDetails).toContainText('Whitelist needed · Slash 180 · Fee 25.0%');
    await expect(metricGrid).toBeHidden();

    const mobileFocusedLayout = await focusedCandidateContext.evaluate((context) => {
      const contextBox = context.getBoundingClientRect();
      const evidence = context.querySelector('[data-testid="focused-candidate-score-evidence"]')?.getBoundingClientRect();
      const details = context.querySelector('[data-testid="focused-candidate-metric-details"]')?.getBoundingClientRect();
      const overflow = Array.from(context.querySelectorAll('*')).flatMap((element) => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const outsideContext = box.width > 0 && (box.left < contextBox.left - 1 || box.right > contextBox.right + 1);
        const scrollOverflow = box.width > 0 && style.overflowX === 'visible' && element.scrollWidth > element.clientWidth + 2;

        return outsideContext || scrollOverflow
          ? [{
              label: element.textContent?.replace(/\s+/g, ' ').trim(),
              outsideContext,
              scrollOverflow,
            }]
          : [];
      });

      return {
        contextBottom: Math.round(contextBox.bottom),
        contextTop: Math.round(contextBox.top),
        detailsTop: Math.round(details?.top ?? 0),
        evidenceTop: Math.round(evidence?.top ?? 0),
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
        viewportHeight: window.innerHeight,
        overflow,
      };
    });

    expect(mobileFocusedLayout.contextTop).toBeGreaterThanOrEqual(0);
    expect(mobileFocusedLayout.contextTop).toBeLessThan(mobileFocusedLayout.viewportHeight);
    expect(mobileFocusedLayout.evidenceTop).toBeLessThan(mobileFocusedLayout.viewportHeight);
    expect(mobileFocusedLayout.evidenceTop).toBeLessThan(mobileFocusedLayout.detailsTop);
    expect(mobileFocusedLayout.pageOverflow).toBe(false);
    expect(mobileFocusedLayout.overflow).toEqual([]);

    await metricDetails.locator('summary').click();
    await expect(metricGrid).toBeVisible();
    const openedDetailsOverflow = await focusedCandidateContext.evaluate((context) => {
      const contextBox = context.getBoundingClientRect();
      return Array.from(context.querySelectorAll('*')).flatMap((element) => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const outsideContext = box.width > 0 && (box.left < contextBox.left - 1 || box.right > contextBox.right + 1);
        const scrollOverflow = box.width > 0 && style.overflowX === 'visible' && element.scrollWidth > element.clientWidth + 2;

        return outsideContext || scrollOverflow
          ? [{
              label: element.textContent?.replace(/\s+/g, ' ').trim(),
              outsideContext,
              scrollOverflow,
            }]
          : [];
      });
    });
    expect(openedDetailsOverflow).toEqual([]);
  });

  test('keeps desktop alert review entry out of candidate action buttons', async ({ context, page }) => {
    await context.addInitScript(() => {
      localStorage.setItem('heimdall-alerts', JSON.stringify({
        alerts: [
          {
            id: 'desktop-explorer-alert',
            type: 'SLASH_INCREASE',
            nodeAddress: 'thor1nodealertdesktop0000000000000000000',
            message: 'Node thor1nodealert... slashed: +2 points',
            timestamp: Date.now(),
            dismissed: false,
          },
        ],
        preferences: {
          slashAlerts: true,
          jailAlerts: true,
          churnAlerts: true,
          statusAlerts: true,
        },
      }));
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/dashboard/explorer?address=${DEFAULT_DASHBOARD_ADDRESS}`);

    const reviewTrigger = page.getByTestId('node-alert-review-trigger');
    await expect(page.getByTestId('node-alert-toast-region')).toHaveCount(0);
    await expect(reviewTrigger).toBeVisible();
    await expect(reviewTrigger).toHaveAttribute('data-placement', 'header-action');

    const overlap = await page.evaluate(() => {
      const reviewTrigger = document.querySelector('[data-testid="node-alert-review-trigger"]')?.getBoundingClientRect();
      const candidateActions = Array.from(document.querySelectorAll('[data-testid="candidate-card"] a'))
        .map((link) => {
          const box = link.getBoundingClientRect();
          const intersects = Boolean(
            reviewTrigger &&
            box.width > 0 &&
            reviewTrigger.left < box.right &&
            reviewTrigger.right > box.left &&
            reviewTrigger.top < box.bottom &&
            reviewTrigger.bottom > box.top
          );

          return {
            intersects,
            label: link.textContent?.replace(/\s+/g, ' ').trim(),
          };
        });

      return {
        actionOverlaps: candidateActions.filter((action) => action.intersects),
        fixedRegionCount: document.querySelectorAll('[data-testid="node-alert-toast-region"]').length,
        triggerWidth: reviewTrigger?.width ?? 0,
        triggerHeight: reviewTrigger?.height ?? 0,
      };
    });

    expect(overlap.actionOverlaps).toEqual([]);
    expect(overlap.fixedRegionCount).toBe(0);
    expect(overlap.triggerWidth).toBeGreaterThan(0);
    expect(overlap.triggerHeight).toBeGreaterThan(0);

    await reviewTrigger.click();
    const toastRegion = page.getByTestId('node-alert-toast-region');
    await expect(toastRegion).toBeVisible();
    await expect(toastRegion).toHaveAttribute('data-state', 'expanded');
    await expect(toastRegion).toHaveAttribute('data-placement', 'inspection-panel');
    await expect(toastRegion.getByRole('link', { name: /Inspect risk context/ })).toBeVisible();

    const expandedOverlap = await page.evaluate(() => {
      const regionElement = document.querySelector('[data-testid="node-alert-toast-region"]');
      const region = regionElement?.getBoundingClientRect();
      const candidateActions = Array.from(document.querySelectorAll('[data-testid="candidate-card"] a'))
        .map((link) => {
          const box = link.getBoundingClientRect();
          const intersects = Boolean(
            region &&
            box.width > 0 &&
            region.left < box.right &&
            region.right > box.left &&
            region.top < box.bottom &&
            region.bottom > box.top
          );

          return {
            intersects,
            label: link.textContent?.replace(/\s+/g, ' ').trim(),
          };
        });

      return {
        actionOverlaps: candidateActions.filter((action) => action.intersects),
        panelPosition: regionElement ? getComputedStyle(regionElement).position : null,
        panelRight: region?.right ?? 0,
        viewportWidth: window.innerWidth,
      };
    });

    expect(expandedOverlap.actionOverlaps).toEqual([]);
    expect(expandedOverlap.panelPosition).toBe('sticky');
    expect(expandedOverlap.panelRight).toBeLessThanOrEqual(expandedOverlap.viewportWidth);
  });
});
