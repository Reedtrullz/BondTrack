import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DASHBOARD_COMPONENTS_DIR = join(process.cwd(), 'src/components/dashboard');

async function collectComponentFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return [];
      return collectComponentFiles(entryPath);
    }

    if (!entry.name.endsWith('.tsx') || entry.name.endsWith('.test.tsx')) {
      return [];
    }

    return [entryPath];
  }));

  return files.flat();
}

describe('dashboard trust copy', () => {
  it('does not ship absolute optimization claims in dashboard components', async () => {
    const files = await collectComponentFiles(DASHBOARD_COMPONENTS_DIR);
    const bannedPhrases = [
      'Certified Optimal',
      'Portfolio Optimized',
      'sees no threats',
      'positions are optimal',
      'bond distribution is optimal',
    ];

    const violations: string[] = [];

    for (const filePath of files) {
      const source = await readFile(filePath, 'utf8');
      for (const phrase of bannedPhrases) {
        if (source.includes(phrase)) {
          violations.push(`${filePath}: ${phrase}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
