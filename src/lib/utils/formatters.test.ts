import { describe, expect, it } from 'vitest';
import { formatDecimalPercent, formatPercent, formatRuneAmount, runeToNumber } from './formatters';

describe('THORChain unit formatting regressions', () => {
  it('converts raw RUNE 1e8 strings exactly at the API boundary', () => {
    expect(runeToNumber('100000000')).toBe(1);
    expect(runeToNumber('123456789')).toBe(1.23456789);
    expect(formatRuneAmount('123456789', 4)).toBe('ᚱ1.2345');
  });

  it('keeps decimal APY and display-percent values on separate formatter paths', () => {
    expect(formatDecimalPercent(0.125)).toBe('12.50%');
    expect(formatPercent(12.5)).toBe('12.50%');
    expect(formatPercent(0.125)).toBe('0.13%');
  });
});
