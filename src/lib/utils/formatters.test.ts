import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatBasisPoints,
  formatDecimalPercent,
  formatPercent,
  formatRuneAmount,
  formatRuneDisplayNumber,
  formatRuneFromNumber,
  formatUtcDateTime,
  formatUsd,
  rawRuneToPositiveDisplayNumber,
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

  it('does not turn malformed RUNE display amounts into real-looking zeroes', () => {
    expect(formatAmount('0')).toBe('0.00');
    expect(formatRuneAmount('0')).toBe('ᚱ0.00');
    expect(formatAmount('not-a-number')).toBe('--');
    expect(formatAmount(undefined)).toBe('--');
    expect(formatRuneAmount('not-a-number')).toBe('--');
    expect(formatRuneAmount(undefined)).toBe('--');
    expect(formatRuneFromNumber(Number.NaN)).toBe('--');
    expect(formatRuneFromNumber(Number.POSITIVE_INFINITY)).toBe('--');
    expect(formatRuneFromNumber(-1)).toBe('--');
  });

  it('names display-only BigInt-to-number conversion and handles edge values safely', () => {
    expect(rawRuneToDisplayNumber(undefined)).toBe(0);
    expect(rawRuneToDisplayNumber('not-a-number')).toBe(0);
    expect(rawRuneToDisplayNumber('900719925474099312345')).toBeGreaterThan(9007199254);
    expect(rawRuneToDisplayNumber('1'.padEnd(400, '0'))).toBe(0);
  });

  it('parses only positive usable raw RUNE values when source rows drive risk samples', () => {
    expect(rawRuneToPositiveDisplayNumber('100000000')).toBe(1);
    expect(rawRuneToPositiveDisplayNumber('0')).toBeNull();
    expect(rawRuneToPositiveDisplayNumber('not-a-number')).toBeNull();
    expect(rawRuneToPositiveDisplayNumber('1'.padEnd(400, '0'))).toBeNull();
  });

  it('keeps decimal APY and display-percent values on separate formatter paths', () => {
    expect(formatDecimalPercent(0.125)).toBe('12.50%');
    expect(formatPercent(12.5)).toBe('12.50%');
    expect(formatPercent(0.125)).toBe('0.13%');
  });

  it('formats operator-fee basis points without turning bad source data into percentages', () => {
    expect(formatBasisPoints(500)).toBe('5.0%');
    expect(formatBasisPoints('2500')).toBe('25.0%');
    expect(formatBasisPoints('')).toBe('--');
    expect(formatBasisPoints('not-a-fee')).toBe('--');
    expect(formatBasisPoints(Number.NaN)).toBe('--');
    expect(formatBasisPoints(Number.POSITIVE_INFINITY)).toBe('--');
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

  it('formats source freshness timestamps without browser locale drift', () => {
    expect(formatUtcDateTime(new Date('2026-06-12T10:05:30.000Z'))).toBe('2026-06-12 10:05 UTC');
  });
});
