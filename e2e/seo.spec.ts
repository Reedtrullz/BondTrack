import { expect, test } from './fixtures';

const CANONICAL_ORIGIN = 'https://bond.thorchain.no';

test.describe('Canonical production identity', () => {
  test('sitemap and robots use the canonical production host', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBe(true);
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain(CANONICAL_ORIGIN);
    expect(sitemapText).not.toContain('https://thorchain.no');

    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    const robotsText = await robots.text();
    expect(robotsText).toContain(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`);
    expect(robotsText).not.toContain('https://thorchain.no');
  });

  test('manifest uses conservative Heimdall product identity', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.ok()).toBe(true);

    const manifest = await response.json() as {
      description?: string;
      icons?: Array<{ src?: string }>;
    };
    expect(manifest.icons?.map((icon) => icon.src)).toContain('/heimdall-icon.svg');
    expect(manifest.icons?.map((icon) => icon.src)).not.toContain('/file.svg');
    expect(manifest.description).toMatch(/\bsource-checked\b/i);
    expect(manifest.description).not.toMatch(/\breal[- ]?time\b/i);
  });
});
