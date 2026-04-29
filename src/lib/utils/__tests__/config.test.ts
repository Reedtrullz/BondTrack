import { describe, expect, it } from 'vitest';
import { NETWORK } from '@/lib/config';

describe('NETWORK config constants', () => {
  it('exposes slash point thresholds in ascending order', () => {
    expect(NETWORK.SLASH_POINT_THRESHOLDS.warning).toBeGreaterThan(0);
    expect(NETWORK.SLASH_POINT_THRESHOLDS.critical).toBeGreaterThan(NETWORK.SLASH_POINT_THRESHOLDS.warning);
  });

  it('exposes valid health score thresholds', () => {
    expect(NETWORK.HEALTH_SCORE_THRESHOLDS.warning).toBeGreaterThanOrEqual(0);
    expect(NETWORK.HEALTH_SCORE_THRESHOLDS.warning).toBeLessThanOrEqual(100);
    expect(NETWORK.HEALTH_SCORE_THRESHOLDS.healthy).toBeGreaterThan(0);
    expect(NETWORK.HEALTH_SCORE_THRESHOLDS.healthy).toBeLessThanOrEqual(100);
    expect(NETWORK.HEALTH_SCORE_THRESHOLDS.warning).toBeLessThan(NETWORK.HEALTH_SCORE_THRESHOLDS.healthy);
  });

  it('exposes bond to pool thresholds in ascending order', () => {
    expect(NETWORK.BOND_TO_POOL_THRESHOLDS.underSecured).toBeGreaterThan(0);
    expect(NETWORK.BOND_TO_POOL_THRESHOLDS.building).toBeGreaterThan(NETWORK.BOND_TO_POOL_THRESHOLDS.underSecured);
    expect(NETWORK.BOND_TO_POOL_THRESHOLDS.healthy).toBeGreaterThan(NETWORK.BOND_TO_POOL_THRESHOLDS.building);
  });

  it('exposes valid progress and action limits', () => {
    expect(NETWORK.PROGRESS_BAR_MULTIPLIER).toBeGreaterThan(0);
    expect(NETWORK.MAX_ACTIONS_LIMIT).toBeGreaterThan(0);
    expect(Number.isInteger(NETWORK.MAX_ACTIONS_LIMIT)).toBe(true);
  });

  it('exposes refresh intervals that are positive and under one hour', () => {
    const intervals = Object.values(NETWORK.REFRESH_INTERVALS);

    expect(intervals.length).toBe(4);

    for (const interval of intervals) {
      expect(interval).toBeGreaterThan(0);
      expect(interval).toBeLessThanOrEqual(3_600_000);
    }
  });

  it('exposes non-negative node severity scores', () => {
    const scores = Object.values(NETWORK.NODE_SEVERITY_SCORES);

    expect(scores.length).toBeGreaterThan(0);

    for (const score of scores) {
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });
});
