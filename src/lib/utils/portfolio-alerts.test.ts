import { describe, expect, it } from 'vitest';

import { generatePortfolioAlerts } from './portfolio-alerts';
import type { BondPosition } from '@/lib/types/node';

function position(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    nodeAddress: 'thor1node0000000000000000000000000000000000',
    nodeOperatorAddress: 'thor1operator000000000000000000000000000',
    bondAmount: 50_000,
    bondSharePercent: 50,
    status: 'Active',
    operatorFee: 1_000,
    operatorFeeFormatted: '10.00%',
    netAPY: 8,
    totalBond: 100_000,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '2.3.0',
    requestedToLeave: false,
    ...overrides,
  };
}

describe('generatePortfolioAlerts', () => {
  it('keeps high-slash alerts in risk-review language', () => {
    const alerts = generatePortfolioAlerts([
      position({ slashPoints: 250 }),
    ]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: 'SLASH',
      severity: 'warning',
      actionLabel: 'Review slash risk',
      actionLink: '/dashboard/risk',
    });
    expect(alerts[0].suggestion).toMatch(/review/i);
    expect(alerts[0].suggestion).toMatch(/before deciding/i);
    expect(alerts[0].suggestion).not.toMatch(/^Consider reducing bond/i);
  });

  it('routes churn-risk alerts to risk review before transaction action', () => {
    const alerts = generatePortfolioAlerts([
      position({ yieldGuardFlags: ['lowest_bond'] }),
    ]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: 'CHURN',
      severity: 'warning',
      actionLabel: 'Review churn risk',
      actionLink: '/dashboard/risk',
    });
    expect(alerts[0].suggestion).toMatch(/review/i);
    expect(alerts[0].suggestion).toMatch(/before deciding/i);
    expect(alerts[0].suggestion).not.toMatch(/^Increase bond amount/i);
    expect(alerts[0].actionLabel).not.toMatch(/Optimize/i);
  });
});
