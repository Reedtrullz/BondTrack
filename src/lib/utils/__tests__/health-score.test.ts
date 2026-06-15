import { describe, expect, it } from 'vitest';
import type { BondPosition } from '@/lib/types/node';
import { calculatePortfolioHealth } from '../health-score';

function position(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    nodeAddress: 'thor1node0000000000000000000000000000000000000',
    nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
    bondAmount: 12_500,
    bondSharePercent: 50,
    status: 'Active',
    operatorFee: 2000,
    operatorFeeFormatted: '20.0%',
    netAPY: 12.5,
    totalBond: 25_000,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '3.19.0',
    requestedToLeave: false,
    yieldGuardFlags: [],
    ...overrides,
  };
}

describe('calculatePortfolioHealth', () => {
  it('bounds active slash exposure so high historical slash does not produce a zero score by itself', () => {
    const health = calculatePortfolioHealth([
      position({ nodeAddress: 'thor1highslashone', slashPoints: 284_890 }),
      position({ nodeAddress: 'thor1highslashtwo', slashPoints: 291_434 }),
      position({ nodeAddress: 'thor1highslashthree', slashPoints: 284_788 }),
    ]);

    expect(health.score).toBe(65);
    expect(health.breakdown.slashPenalty).toBe(35);
    expect(health.isCritical).toBe(false);
    expect(health.reason).toBe('High slash exposure detected');
  });

  it('keeps jailed nodes critical even when slash exposure is bounded', () => {
    const health = calculatePortfolioHealth([
      position({ isJailed: true, slashPoints: 284_890 }),
    ]);

    expect(health.isCritical).toBe(true);
    expect(health.score).toBe(25);
    expect(health.reason).toContain('node(s) jailed');
  });
});
