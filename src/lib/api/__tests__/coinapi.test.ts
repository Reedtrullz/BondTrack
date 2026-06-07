import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('CoinAPI Security', () => {
  const originalEnv = process.env.COINAPI_KEY;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.COINAPI_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalEnv === undefined) {
      delete process.env.COINAPI_KEY;
    } else {
      process.env.COINAPI_KEY = originalEnv;
    }
  });

  it('should return null when COINAPI_KEY is not configured (graceful fallback)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { getCurrentRunePrice } = await import('../coinapi');

      // After fix: no hardcoded key, so coinApiFetch throws, getCurrentRunePrice catches and returns null
      const price = await getCurrentRunePrice();

      expect(price).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        'CoinAPI fetch error:',
        expect.objectContaining({ message: 'CoinAPI key is not configured' })
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('should not have a hardcoded fallback API key in source', () => {
    // Verify no fallback key pattern exists in the module
    // This is a static check for the anti-pattern: process.env.X || 'key'
    const moduleSource = readFileSync('src/lib/api/coinapi.ts', 'utf8');
    expect(moduleSource).not.toMatch(/process\.env\.COINAPI_KEY\s*\|\|/);
  });
});
