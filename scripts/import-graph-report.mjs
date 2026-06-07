#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const srcRoot = join(root, 'src');
const exts = new Set(['.ts', '.tsx']);
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (exts.has(extname(entry.name))) files.push(path);
  }
}

function normalizeSource(importer, source) {
  if (source.startsWith('@/')) return join(srcRoot, source.slice(2));
  if (source.startsWith('.')) return resolve(dirname(importer), source);
  return null;
}

function resolveImport(importer, source) {
  const base = normalizeSource(importer, source);
  if (!base) return null;
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')];
  return candidates.find((candidate) => files.includes(candidate)) ?? null;
}

walk(srcRoot);
const imported = new Set();
const importsByFile = new Map();
const importRe = /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const sources = [];
  for (const match of text.matchAll(importRe)) {
    const resolved = resolveImport(file, match[1]);
    if (resolved) {
      imported.add(resolved);
      sources.push(resolved);
    }
  }
  importsByFile.set(file, sources);
}

const entryLike = files.filter((file) => /(?:^|\/)(page|layout|route|middleware|instrumentation|setupTests|setup)\.(ts|tsx)$/.test(relative(root, file)) || /\.test\.(ts|tsx)$/.test(file));
const candidates = files
  .filter((file) => !imported.has(file))
  .filter((file) => !entryLike.includes(file))
  .map((file) => relative(root, file))
  .sort();

const lines = [
  '# Import graph report',
  '',
  `Scanned ${files.length} TypeScript/TSX files under src/.`,
  '',
  'This is a lightweight static import report (no dependency changes). Treat candidates as review prompts; no files were deleted by this script.',
  '',
  '## Unimported non-entry candidates',
  '',
];

if (candidates.length === 0) {
  lines.push('No unimported non-entry candidates found.');
} else {
  candidates.forEach((candidate) => lines.push(`- ${candidate}`));
}

const outPath = join(root, '.hermes-agent-notes', 'import-graph-report.md');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${lines.join('\n')}\n`);
console.log(`Wrote ${relative(root, outPath)} with ${candidates.length} candidate(s).`);
