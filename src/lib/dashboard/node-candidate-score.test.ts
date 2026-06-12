import { describe, expect, it } from 'vitest';
import { scoreNodeCandidate } from './node-candidate-score';

describe('scoreNodeCandidate', () => {
  it('penalizes high slash enough to beat APY-only ranking', () => {
    const cleanCandidate = scoreNodeCandidate({
      adjustedAPY: 55,
      totalBond: 250_000,
      operatorFeePercent: 0.05,
      slashPoints: 0,
      status: 'Active',
      capacityTrust: 'available',
    });
    const highSlashCandidate = scoreNodeCandidate({
      adjustedAPY: 120,
      totalBond: 250_000,
      operatorFeePercent: 0.05,
      slashPoints: 220,
      status: 'Active',
      capacityTrust: 'available',
    });

    expect(cleanCandidate.score).toBeGreaterThan(highSlashCandidate.score);
    expect(highSlashCandidate.quality).not.toBe('Strong');
    expect(highSlashCandidate.reasons).toContain('220 slash points');
  });

  it('surfaces unavailable or unknown bond/capacity trust as visible labels', () => {
    const unknownCandidate = scoreNodeCandidate({
      adjustedAPY: 80,
      totalBond: 0,
      operatorFeePercent: 0.08,
      slashPoints: 0,
      status: 'Active',
      capacityTrust: 'unknown',
    });

    expect(unknownCandidate.trustLabel).toBe('Capacity unknown');
    expect(unknownCandidate.reasons).toEqual(expect.arrayContaining([
      'capacity unknown',
      'bond data unavailable',
    ]));
  });
});
