import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const e2eRoot = path.join(root, 'e2e');

function isRunnablePlaywrightFile(fileName: string): boolean {
  return /\.(spec|test)\.[jt]sx?$/.test(fileName);
}

function isJavaScriptOrTypeScriptFile(fileName: string): boolean {
  return /\.[jt]sx?$/.test(fileName);
}

function walkE2eCodeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walkE2eCodeFiles(entryPath);
    }

    return isJavaScriptOrTypeScriptFile(entry.name) ? [entryPath] : [];
  });
}

function toProjectPath(filePath: string): string {
  return path.relative(root, filePath);
}

describe('E2E fixture imports', () => {
  it('keeps browser specs on the fail-closed Playwright fixture', () => {
    const codeFiles = walkE2eCodeFiles(e2eRoot);
    const fixturePath = path.join(e2eRoot, 'fixtures.ts');
    const directPlaywrightImports = codeFiles.filter((filePath) => filePath !== fixturePath).filter((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return /from\s+['"]@playwright\/test['"]/.test(source)
        || /import\s*\(\s*['"]@playwright\/test['"]\s*\)/.test(source)
        || /require\s*\(\s*['"]@playwright\/test['"]\s*\)/.test(source);
    });
    const missingFixtureImports = codeFiles.filter((filePath) => isRunnablePlaywrightFile(path.basename(filePath))).filter((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return !/from\s+['"]\.\/fixtures['"]/.test(source)
        && !/from\s+['"]\.\.\/fixtures['"]/.test(source);
    });

    expect(directPlaywrightImports.map(toProjectPath)).toEqual([]);
    expect(missingFixtureImports.map(toProjectPath)).toEqual([]);
  });
});
