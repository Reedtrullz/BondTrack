import { describe, it, expect } from 'vitest';
import { calculatePersonalFeeLeakage } from '../fee-calculations';

describe('calculatePersonalFeeLeakage TDD', () => {
  it('should not return absurd percentages when gross rewards are zero', () => {
    const positions = [
      { 
        bondAmount: '0', 
        operatorFee: 0.01, 
      } as any
    ];
    const result = calculatePersonalFeeLeakage(positions);
    expect(result.leakagePercent).toBe(0);
  });

  it('should cap leakage at 100% if fees exceed gross rewards', () => {
    const positions = [
      { 
        bondAmount: '1000', 
        operatorFee: 2.0, // 200% fee
      } as any
    ];
    const result = calculatePersonalFeeLeakage(positions);
    expect(result.leakagePercent).toBe(100);
  });
});
