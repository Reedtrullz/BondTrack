import { expect, test } from './fixtures';

test.describe('Learn index', () => {
  test('prioritizes operator playbook guidance before the guide library', async ({ page }) => {
    await page.goto('/learn');

    const triage = page.getByLabel('Learning triage');
    await expect(page.getByRole('heading', { name: 'Operator playbook' })).toBeVisible();
    await expect(triage).toContainText('Start with health scoring');
    await expect(triage.getByRole('link', { name: /Open Health Score Guide/i })).toBeVisible();
    await expect(page.getByText(/More articles coming soon/i)).toHaveCount(0);

    const triageBeforeLibrary = await triage.evaluate((element) => {
      const library = document.querySelector('[aria-label="Operational guides"]');
      return Boolean(
        library
        && (element.compareDocumentPosition(library) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    });
    expect(triageBeforeLibrary).toBe(true);
  });

  test('renders article pages as operator guidance before deep reading', async ({ page }) => {
    await page.goto('/learn/health-score-guide');

    const decision = page.getByLabel('Learning article decision');
    const sections = page.getByLabel('Article sections');

    await expect(page.getByRole('heading', { level: 1, name: 'Health Score Guide' })).toBeVisible();
    await expect(decision).toContainText('Use this when a dashboard status needs explanation before action.');
    await expect(decision.getByRole('link', { name: 'Open Risk dashboard' })).toHaveAttribute('href', '/dashboard/risk');

    const decisionBeforeSections = await decision.evaluate((element) => {
      const articleSections = document.querySelector('[aria-label="Article sections"]');
      return Boolean(
        articleSections
        && (element.compareDocumentPosition(articleSections) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    });
    expect(decisionBeforeSections).toBe(true);

    await expect(sections.getByRole('list', { name: 'Score Scale points' })).toBeVisible();
  });
});
