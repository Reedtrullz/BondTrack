import { describe, expect, it } from 'vitest';
import {
  formatMidgardDate,
  getMidgardDataFreshness,
  normalizeMidgardTimestampToDate,
  normalizeMidgardTimestampToSeconds,
} from '../midgard-time';

describe('Midgard timestamp normalization', () => {
  it('keeps second timestamps unchanged', () => {
    expect(normalizeMidgardTimestampToSeconds('1700000000')).toBe(1700000000);
    expect(normalizeMidgardTimestampToDate('1700000000')?.toISOString()).toBe('2023-11-14T22:13:20.000Z');
  });

  it('normalizes nanosecond timestamps to seconds', () => {
    expect(normalizeMidgardTimestampToSeconds('1700000000000000000')).toBe(1700000000);
    expect(normalizeMidgardTimestampToDate('1700000000000000000')?.toISOString()).toBe('2023-11-14T22:13:20.000Z');
  });

  it('defensively handles millisecond fixtures without treating them as nanoseconds', () => {
    expect(normalizeMidgardTimestampToSeconds(1700000000000)).toBe(1700000000);
  });

  it('formats Midgard dates without locale-dependent hydration drift', () => {
    expect(formatMidgardDate('1700000000')).toBe('2023-11-14');
    expect(formatMidgardDate('not-a-date', 'Unknown')).toBe('Unknown');
  });

  it('rejects invalid and ambiguous oversized timestamps instead of rendering misleading dates', () => {
    expect(normalizeMidgardTimestampToSeconds('not-a-date')).toBe(0);
    expect(normalizeMidgardTimestampToSeconds('12345678901234')).toBe(0);
    expect(normalizeMidgardTimestampToDate('not-a-date')).toBeNull();
  });

  it('marks data stale when the normalized timestamp is outside the freshness window', () => {
    const stale = getMidgardDataFreshness('1700000000000000000', 60_000, 1_700_000_061_000);
    expect(stale.updatedAtTimestampSeconds).toBe(1700000000);
    expect(stale.ageMs).toBe(61_000);
    expect(stale.isStale).toBe(true);

    const fresh = getMidgardDataFreshness('1700000000', 60_000, 1_700_000_059_000);
    expect(fresh.isStale).toBe(false);
  });
});
