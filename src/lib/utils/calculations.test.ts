import { describe, expect, it } from 'vitest';
import { calculateAPY } from './calculations';

describe('calculateAPY', () => {
  it('returns plausible APY within 0-100% for THORChain', () => {
    // Audit P0-3: current_award = '0.6334' (63.34% APY as decimal)
    // ORIGINAL code: runeToNumber('0.6334') = ERROR → catch → returns 0
    // So apy = 0% (wrong!)
    const apy = calculateAPY(100, '0.6334', 0, '100000000000');

    // APY should be ~63.34% (not 0%)
    expect(apy).toBeGreaterThan(0); // THIS WILL FAIL (apy = 0)
    expect(apy).toBeLessThan(100);
  });

  it('calculates APY correctly using Midgard bondingAPY semantics', () => {
    // current_award = '0.6334' (63.34% APY as decimal)
    // With 100% share, 0% fee, APY should be ~63.34%
    const apy = calculateAPY(100, '0.6334', 0, '100000000000');

    // Should be close to 63.34%
    expect(apy).toBeCloseTo(63.34, 0); // THIS WILL FAIL (apy = 0)
  });

  it('handles current_award as 1e8 units (250 RUNE per churn)', () => {
    // Some nodes might have current_award in 1e8 units
    // 250000000 = 250 RUNE per churn
    // Original code: runeToNumber('250000000') = 250 RUNE
    // Then annualize: 250 * 730 = 182500 RUNE/year
    // APY = (182500 / 1000) * 100 = 18250% (way too high!)
    const apy = calculateAPY(100, '250000000', 0, '100000000000');

    // Should be less than 100%
    expect(apy).toBeLessThan(100); // THIS WILL FAIL (apy = 18250%)
  });
});
