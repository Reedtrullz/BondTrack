import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const reportPath = path.join(root, '.hermes-agent-notes/import-graph-report.md');

describe('import graph report', () => {
  it('ignores framework entrypoints and intentional public modules', () => {
    execFileSync('node', ['scripts/import-graph-report.mjs'], {
      cwd: root,
      encoding: 'utf8',
    });

    const report = readFileSync(reportPath, 'utf8');

    expect(report).toContain('No unimported non-entry candidates found.');
    expect(report).not.toContain('src/app/sitemap.ts');
    expect(report).not.toContain('src/app/manifest.ts');
    expect(report).not.toContain('src/components/ui/index.ts');
    expect(report).not.toContain('src/lib/types/index.ts');
    expect(report).not.toContain('src/test/msw/browser.ts');
  });
});
