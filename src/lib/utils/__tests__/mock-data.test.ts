import { describe, expect, it, vi, afterEach } from 'vitest';
import { isDevelopmentMode } from '../../mock-data';

describe('isDevelopmentMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not enable mock data just because tests run on localhost', () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });

    expect(isDevelopmentMode()).toBe(false);
  });

  it('disables mock mode in test environment regardless of env flag', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_DATA', 'true');

    // Mock mode should be disabled in test environment
    expect(isDevelopmentMode()).toBe(false);
  });

  it('enables mock data through explicit env flag outside test env', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_DATA', 'true');

    expect(isDevelopmentMode()).toBe(true);
  });
});
