import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MOCK_ACTIVE_NODE_ADDRESS,
  MOCK_ACTIVE_OPERATOR_ADDRESS,
  MOCK_BOND_POSITIONS,
  MOCK_MEMBER_DATA,
  MOCK_NODES,
  MOCK_PROVIDER_ADDRESS,
  MOCK_SECONDARY_PROVIDER_ADDRESS,
  MOCK_STANDBY_NODE_ADDRESS,
  MOCK_STANDBY_OPERATOR_ADDRESS,
  isDevelopmentMode,
} from '../mock-data';
import { validateTHORChainAddress } from '../utils/address-validation';

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
    vi.stubEnv('NODE_ENV', 'development');
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

describe('mock dashboard data', () => {
  it('uses checksum-valid THORChain account addresses', () => {
    const canonicalMockAddresses = [
      MOCK_PROVIDER_ADDRESS,
      MOCK_SECONDARY_PROVIDER_ADDRESS,
      MOCK_ACTIVE_NODE_ADDRESS,
      MOCK_STANDBY_NODE_ADDRESS,
      MOCK_ACTIVE_OPERATOR_ADDRESS,
      MOCK_STANDBY_OPERATOR_ADDRESS,
    ];
    const mockAddresses = [
      ...canonicalMockAddresses,
      MOCK_MEMBER_DATA.runeAddress,
      ...MOCK_BOND_POSITIONS.map((position) => position.nodeAddress),
      ...MOCK_NODES.map((node) => node.address),
    ];

    expect(canonicalMockAddresses).toHaveLength(new Set(canonicalMockAddresses).size);

    for (const address of mockAddresses) {
      expect(validateTHORChainAddress(address)).toMatchObject({
        valid: true,
        prefix: 'thor',
      });
    }
  });

  it('keeps the demo provider address aligned with LP and node mock data', () => {
    expect(MOCK_MEMBER_DATA.runeAddress).toBe(MOCK_PROVIDER_ADDRESS);
    expect(MOCK_NODES.map((node) => node.address)).toEqual([MOCK_ACTIVE_NODE_ADDRESS]);
    expect(MOCK_BOND_POSITIONS.map((position) => position.nodeAddress)).toEqual([
      MOCK_ACTIVE_NODE_ADDRESS,
      MOCK_STANDBY_NODE_ADDRESS,
    ]);
  });
});
