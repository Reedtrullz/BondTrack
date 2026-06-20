import { describe, expect, it } from 'vitest';
import { getDirectBondAccessTrust, scoreNodeCandidate } from './node-candidate-score';

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

  it('surfaces unavailable or unknown direct-bond access as visible labels', () => {
    const unknownCandidate = scoreNodeCandidate({
      adjustedAPY: 80,
      totalBond: 0,
      operatorFeePercent: 0.08,
      slashPoints: 0,
      status: 'Active',
      capacityTrust: 'unknown',
    });

    expect(unknownCandidate.capacityTrust).toBe('unknown');
    expect(unknownCandidate.trustLabel).toBe('Direct-bond access unknown');
    expect(unknownCandidate.reasons).toEqual(expect.arrayContaining([
      'direct-bond access unknown',
      'bond data unavailable',
    ]));
  });

  it('keeps malformed candidate metrics from producing a NaN quality score', () => {
    const malformedCandidate = scoreNodeCandidate({
      adjustedAPY: Number.NaN,
      totalBond: Number.NEGATIVE_INFINITY,
      operatorFeePercent: Number.POSITIVE_INFINITY,
      slashPoints: Number.NaN,
      status: 'Active',
      capacityTrust: 'available',
    });

    expect(Number.isFinite(malformedCandidate.score)).toBe(true);
    expect(malformedCandidate.score).toBeGreaterThanOrEqual(0);
    expect(malformedCandidate.score).toBeLessThanOrEqual(100);
    expect(malformedCandidate.quality).toBe('Avoid');
    expect(malformedCandidate.reasons).toEqual(expect.arrayContaining([
      'slash data unavailable',
      'operator fee unavailable',
      'bond data unavailable',
    ]));
  });

  it('uses conservative fallback evidence when no candidate blockers are visible', () => {
    const candidate = scoreNodeCandidate({
      adjustedAPY: 80,
      totalBond: 250_000,
      operatorFeePercent: 0.05,
      slashPoints: 0,
      status: 'Active',
      capacityTrust: 'available',
    });

    expect(candidate.reasons).toEqual(['No obvious candidate blockers in current inputs']);
    expect(candidate.reasons).not.toContain('healthy candidate signals');
    expect(candidate.trustLabel).toBe('Provider listed by THORNode');
    expect(candidate.trustLabel).not.toBe('Provider whitelisted');
  });

  it('derives direct-bond trust from the watched address provider listing', () => {
    expect(getDirectBondAccessTrust({
      maxBondProviders: 100,
      providers: [{ bond_address: 'thor1provider' }],
      userAddress: 'thor1provider',
    })).toBe('available');
    expect(getDirectBondAccessTrust({
      maxBondProviders: 100,
      providers: [{ bond_address: 'thor1other' }],
      userAddress: 'thor1provider',
    })).toBe('needs_whitelist');
    expect(getDirectBondAccessTrust({
      maxBondProviders: 1,
      providers: [{ bond_address: 'thor1other' }],
      userAddress: 'thor1provider',
    })).toBe('full');
    expect(getDirectBondAccessTrust({
      maxBondProviders: 100,
      providers: [],
      userAddress: null,
    })).toBe('unknown');

    const fullCandidate = scoreNodeCandidate({
      adjustedAPY: 80,
      totalBond: 25_000,
      operatorFeePercent: 0.05,
      slashPoints: 0,
      status: 'Active',
      capacityTrust: getDirectBondAccessTrust({
        maxBondProviders: 1,
        providers: [{ bond_address: 'thor1other' }],
        userAddress: 'thor1provider',
      }),
    });

    expect(fullCandidate.trustLabel).toBe('Provider slots full');
    expect(fullCandidate.reasons).toContain('provider slots full');

    const unlistedCandidate = scoreNodeCandidate({
      adjustedAPY: 80,
      totalBond: 25_000,
      operatorFeePercent: 0.05,
      slashPoints: 0,
      status: 'Active',
      capacityTrust: 'needs_whitelist',
    });

    expect(unlistedCandidate.trustLabel).toBe('Provider not listed by THORNode');
    expect(unlistedCandidate.trustLabel).not.toMatch(/whitelist/i);
    expect(unlistedCandidate.reasons).toContain('provider not listed by THORNode');
    expect(unlistedCandidate.reasons).not.toContain('needs operator whitelist');
  });
});
