import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCurrentRunePrice, getRunePriceAtDate, getRunePriceRange } from '../coinapi';

describe('CoinAPI Security', () => {
  const originalEnv = process.env.COINAPI_KEY;

  beforeEach(() => {
    delete process.env.COINAPI_KEY;
  });

  afterEach(() => {
    process.env.COINAPI_KEY = originalEnv;
  });

  it('should return 0 when COINAPI_KEY is not configured (graceful fallback)', async () => {
    // After fix: no hardcoded key, so coinApiFetch throws, getCurrentRunePrice catches and returns 0
    const price = await getCurrentRunePrice();
    expect(price).toBe(0);
  });

  it('should not have a hardcoded fallback API key in source', () => {
    // Verify no fallback key pattern exists in the module
    // This is a static check for the anti-pattern: process.env.X || 'key'
    const moduleSource = require('fs').readFileSync(require('path').join(__dirname, '../coinapi.ts'), 'utf8');
    expect(moduleSource).not.toMatch(/process\.env\.COINAPI_KEY\s*\|\|/);
  });
});
