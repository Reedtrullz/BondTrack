import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isDevelopmentMode } from '../mock-data';

describe('isDevelopmentMode', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return false when NEXT_PUBLIC_USE_MOCK_DATA is not set', () => {
    expect(isDevelopmentMode()).toBe(false);
  });

  it('should return true when NEXT_PUBLIC_USE_MOCK_DATA is "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_DATA', 'true');
    expect(isDevelopmentMode()).toBe(true);
  });

  it('should return false when NODE_ENV is "test" (regardless of NEXT_PUBLIC_USE_MOCK_DATA)', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_DATA', 'true');
    expect(isDevelopmentMode()).toBe(false); // Should be disabled in test
  });

  it('should return false when NODE_ENV is "test" and NEXT_PUBLIC_USE_MOCK_DATA is not set', () => {
    vi.stubEnv('NODE_ENV', 'test');
    expect(isDevelopmentMode()).toBe(false);
  });
});
