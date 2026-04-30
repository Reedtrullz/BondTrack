import { describe, expect, it, vi, afterEach } from 'vitest';
import { isDevelopmentMode } from '../../mock-data';

describe('isDevelopmentMode', () => {
  const originalEnv = process.env.NEXT_PUBLIC_USE_MOCK_DATA;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_USE_MOCK_DATA;
    } else {
      process.env.NEXT_PUBLIC_USE_MOCK_DATA = originalEnv;
    }
    vi.unstubAllGlobals();
  });

  it('does not enable mock data just because tests run on localhost', () => {
    delete process.env.NEXT_PUBLIC_USE_MOCK_DATA;
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });

    expect(isDevelopmentMode()).toBe(false);
  });

  it('enables mock data only through the explicit public env flag', () => {
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'true';

    expect(isDevelopmentMode()).toBe(true);
  });
});
