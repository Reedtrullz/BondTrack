import { describe, expect, it } from 'vitest';
import { calculateAPYHistory } from '../use-apy-chart-data';

const network = {
  bondMetrics: { totalActiveBond: '100000000000' },
  bondingAPY: '12.5',
};

describe('calculateAPYHistory', () => {
  it('renders second timestamps as calendar labels instead of treating them as milliseconds or nanoseconds', () => {
    const [point] = calculateAPYHistory(
      { intervals: [{ startTime: '1700000000', bondingEarnings: '100000000' }] },
      network
    );

    expect(point.date).toBe('Nov 14');
    expect(point.apy).toBe(12.5);
  });

  it('normalizes nanosecond Midgard timestamps before rendering chart labels', () => {
    const [point] = calculateAPYHistory(
      { intervals: [{ startTime: '1700000000000000000', bondingEarnings: '100000000' }] },
      network
    );

    expect(point.date).toBe('Nov 14');
    expect(point.apy).toBe(12.5);
  });

  it('drops invalid timestamps instead of rendering misleading epoch labels', () => {
    const data = calculateAPYHistory(
      { intervals: [{ startTime: 'not-a-date', bondingEarnings: '100000000' }] },
      network
    );

    expect(data).toEqual([]);
  });
});
