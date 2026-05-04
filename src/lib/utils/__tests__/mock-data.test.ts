import { describe, expect, it, vi, afterEach } from 'vitest';
import { isDevelopmentMode } from '../../mock-data';

describe('isDevelopmentMode', () => {
  const originalEnv = {
    NEXT_PUBLIC_USE_MOCK_DATA: process.env.NEXT_PUBLIC_USE_MOCK_DATA,
    NODE_ENV: process.env.NODE_ENV,
  };

  afterEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = originalEnv.NEXT_PUBLIC_USE_MOCK_DATA;
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    vi.unstubAllGlobals();
  });

  it('does not enable mock data just because tests run on localhost', () => {
    delete process.env.NEXT_PUBLIC_USE_MOCK_DATA;
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });

    expect(isDevelopmentMode()).toBe(false);
  });

  it('disables mock mode in test environment regardless of env flag', () => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'true';

    // Mock mode should be disabled in test environment
    expect(isDevelopmentMode()).toBe(false);
  });

  it('enables mock data through explicit env flag outside test env', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'true';

    expect(isDevelopmentMode()).toBe(true);
  });
});
