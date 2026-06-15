import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const e2eAgentsPath = path.join(root, 'e2e/AGENTS.md');

describe('E2E agent guidance', () => {
  it('keeps selector guidance fail-closed instead of recommending broad first matches', () => {
    const guidance = readFileSync(e2eAgentsPath, 'utf8');

    expect(guidance).toContain('Prefer semantic locators');
    expect(guidance).toContain('Do not use broad `.first()`, `.nth()`, or `.last()`');
    expect(guidance).toContain('allowed only inside a scoped repeated collection');
    expect(guidance).toContain('e2e-selector-order-ok: <reason>');
    expect(guidance).toContain("Do not bypass this with computed access such as `locator['first']()`");
    expect(guidance).not.toMatch(/^\s*-\s*(?:use|prefer|rely on|reach for)\s+`\.first\(\)`/im);
    expect(guidance).not.toMatch(/-\s*Use\s+`\.first\(\)`\s+when text locators match multiple elements/i);
  });
});
