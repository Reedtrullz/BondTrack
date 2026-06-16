import { describe, expect, it } from 'vitest';
import { calculateAPY } from './calculations';

// Regression coverage for historical audit findings around APY units.
describe('calculateAPY', () => {
  it('treats small decimal current_award values as already annualized APY fractions', () => {
    const apy = calculateAPY(100, '0.6334', 0, '100000000000');

    expect(apy).toBeCloseTo(63.34, 2);
  });

  it('applies provider share and operator fee to decimal APY inputs at the display percent boundary', () => {
    const apy = calculateAPY(50, '0.125', 500, '100000000000');

    expect(apy).toBeCloseTo(5.9375, 4);
  });

  it('converts raw 1e8 RUNE current_award values before annualizing', () => {
    const apy = calculateAPY(100, '10000000', 0, '146000000000');

    expect(apy).toBeCloseTo(1, 4);
  });

  it('returns unknown when current_award units are ambiguous', () => {
    expect(calculateAPY(100, '9999999', 0, '146000000000')).toBeNaN();
    expect(calculateAPY(100, '1', 0, '146000000000')).toBeNaN();
    expect(calculateAPY(100, 'not-an-award', 0, '146000000000')).toBeNaN();
  });
});
