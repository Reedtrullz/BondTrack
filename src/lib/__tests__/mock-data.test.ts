import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isDevelopmentMode } from '../mock-data';

describe('isDevelopmentMode', () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_USE_MOCK_DATA: process.env.NEXT_PUBLIC_USE_MOCK_DATA,
  };

  beforeEach(() => {
    // Clear env vars
    delete process.env.NODE_ENV;
    delete process.env.NEXT_PUBLIC_USE_MOCK_DATA;
  });

  afterEach(() => {
    // Restore
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = originalEnv.NEXT_PUBLIC_USE_MOCK_DATA;
  });

  it('should return false when NEXT_PUBLIC_USE_MOCK_DATA is not set', () => {
    expect(isDevelopmentMode()).toBe(false);
  });

  it('should return true when NEXT_PUBLIC_USE_MOCK_DATA is "true"', () => {
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'true';
    expect(isDevelopmentMode()).toBe(true);
  });

  it('should return false when NODE_ENV is "test" (regardless of NEXT_PUBLIC_USE_MOCK_DATA)', () => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'true';
    expect(isDevelopmentMode()).toBe(false); // Should be disabled in test
  });

  it('should return false when NODE_ENV is "test" and NEXT_PUBLIC_USE_MOCK_DATA is not set', () => {
    process.env.NODE_ENV = 'test';
    expect(isDevelopmentMode()).toBe(false);
  });
});
