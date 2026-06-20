import { expect, test } from './fixtures';

test.describe('Learn index', () => {
  test('prioritizes provider playbook guidance before the guide library', async ({ page }) => {
    await page.goto('/learn');

    const triage = page.getByLabel('Learning triage');
    await expect(page.getByRole('heading', { name: 'Provider playbook' })).toBeVisible();
    await expect(triage).toContainText('Start with provider exposure review states');
    await expect(triage).not.toContainText('Start with provider exposure scoring');
    await expect(triage.getByRole('link', { name: /Open Provider Exposure Guide/i })).toBeVisible();
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

  test('renders article pages as provider guidance before deep reading', async ({ page }) => {
    await page.goto('/learn/health-score-guide');

    const decision = page.getByLabel('Learning article decision');
    const sections = page.getByLabel('Article sections');

    await expect(page.getByRole('heading', { level: 1, name: 'Provider Exposure Guide' })).toBeVisible();
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

    await expect(sections.getByRole('list', { name: 'Review State Guide points' })).toBeVisible();
    await expect(sections).not.toContainText('Score Scale');
  });

  test('renders bonding guidance as candidate evidence review instead of a healthy-status shortcut', async ({ page }) => {
    await page.goto('/learn/bonding-basics');

    const sections = page.getByLabel('Article sections');
    const chooseNodeStep = sections.getByRole('listitem', { name: /Choose a Node/i });

    await expect(chooseNodeStep).toContainText('candidate evidence');
    await expect(chooseNodeStep).toContainText('source checks');
    await expect(chooseNodeStep).toContainText('wallet preview');
    await expect(chooseNodeStep).not.toContainText(/healthy status/i);
  });

  test('frames LP confidence as source-loaded review material, not trusted certainty', async ({ page }) => {
    await page.goto('/learn/lp-impermanent-loss');

    const sections = page.getByLabel('Article sections');
    await expect(sections).toContainText('source context to support an action');
    await expect(sections).toContainText('Source-loaded values');
    await expect(sections).not.toContainText(/trusted enough/i);
    await expect(sections).not.toContainText(/Trusted values/i);
  });
});
