import { describe, expect, it } from 'vitest';
import {
  formatDecimalPercent,
  formatPercent,
  formatRuneAmount,
  formatRuneDisplayNumber,
  formatUsd,
  rawRuneToDisplayNumber,
  runeToNumber,
} from './formatters';

describe('THORChain unit formatting regressions', () => {
  it('converts raw RUNE 1e8 strings exactly at the API boundary', () => {
    expect(runeToNumber('100000000')).toBe(1);
    expect(rawRuneToDisplayNumber('100000000')).toBe(1);
    expect(runeToNumber('123456789')).toBe(1.23456789);
    expect(formatRuneAmount('123456789', 4)).toBe('ᚱ1.2345');
  });

  it('names display-only BigInt-to-number conversion and handles edge values safely', () => {
    expect(rawRuneToDisplayNumber(undefined)).toBe(0);
    expect(rawRuneToDisplayNumber('not-a-number')).toBe(0);
    expect(rawRuneToDisplayNumber('900719925474099312345')).toBeGreaterThan(9007199254);
    expect(rawRuneToDisplayNumber('1'.padEnd(400, '0'))).toBe(0);
  });

  it('keeps decimal APY and display-percent values on separate formatter paths', () => {
    expect(formatDecimalPercent(0.125)).toBe('12.50%');
    expect(formatPercent(12.5)).toBe('12.50%');
    expect(formatPercent(0.125)).toBe('0.13%');
  });

  it('centralizes USD display formatting and invalid-value fallback', () => {
    expect(formatUsd(1234.56, 2)).toBe('$1,234.56');
    expect(formatUsd(1, 4, 2)).toBe('$1.00');
    expect(formatUsd(Number.NaN)).toBe('--');
  });

  it('centralizes display-only RUNE number formatting for already-converted values', () => {
    expect(formatRuneDisplayNumber(1234.5, 2)).toBe('1,234.50');
    expect(formatRuneDisplayNumber(Number.NaN)).toBe('--');
  });
});
