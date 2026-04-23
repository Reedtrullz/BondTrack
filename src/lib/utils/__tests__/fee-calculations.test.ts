import { describe, it, expect } from 'vitest';
import type { BondPosition } from '@/lib/types/node';
import { calculatePersonalFeeLeakage, calculateWeightedApy } from '../fee-calculations';

function createPosition(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    nodeAddress: 'thor-node-address',
    nodeOperatorAddress: 'thor-operator-address',
    bondAmount: 0,
    bondSharePercent: 0,
    status: 'Active',
    operatorFee: 0,
    operatorFeeFormatted: '0.00%',
    netAPY: 0,
    totalBond: 0,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '1.0.0',
    requestedToLeave: false,
    ...overrides,
  };
}

describe('calculatePersonalFeeLeakage TDD', () => {
  it('should not return absurd percentages when gross rewards are zero', () => {
    const positions = [
      createPosition({
        bondAmount: 0,
        operatorFee: 1,
      }),
    ];
    const result = calculatePersonalFeeLeakage(positions);
    expect(result.leakagePercent).toBe(0);
  });

  it('should cap leakage at 100% if fees exceed gross rewards', () => {
    const positions = [
      createPosition({
        bondAmount: 1000,
        operatorFee: 20000,
      }),
    ];
    const result = calculatePersonalFeeLeakage(positions);
    expect(result.leakagePercent).toBe(100);
  });

  it('should return a sentinel value or 0 when there is no reward activity to avoid "100% loss" logic', () => {
    const result = calculatePersonalFeeLeakage([], 'monthly');
    expect(result.leakagePercent).toBe(0);
  });
});

describe('calculateWeightedApy TDD', () => {
  it('should correctly calculate the weighted average APY for multiple positions', () => {
    const positions = [
      createPosition({ bondAmount: 1000, netAPY: 0.10 }), // 10%
      createPosition({ bondAmount: 3000, netAPY: 0.20 }), // 20%
    ];
    // Total Bond: 4000
    // Weighted: ((1000 * 0.10) + (3000 * 0.20)) / 4000 
    // = (100 + 600) / 4000 = 700 / 4000 = 0.175 (17.5%)
    
    const result = calculateWeightedApy(positions);
    expect(result).toBeCloseTo(0.175, 5);
  });

  it('should return 0 if total bond is zero', () => {
    const positions = [
      createPosition({ bondAmount: 0, netAPY: 0.10 }),
    ];
    const result = calculateWeightedApy(positions);
    expect(result).toBe(0);
  });
});
