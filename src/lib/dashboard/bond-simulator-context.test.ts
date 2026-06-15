import { describe, expect, it } from 'vitest';

import { buildBondSimulatorInsight } from './bond-simulator-context';

describe('buildBondSimulatorInsight', () => {
  it('labels the default estimate as rewards-only and exposes model confidence', () => {
    const model = buildBondSimulatorInsight({
      bondAmountRune: 100_000,
      currentBondRune: 0,
      lockDays: 180,
      networkApyPercent: 65,
      operatorFeeBps: 1500,
      hasResult: true,
    });

    expect(model.severity).toBe('info');
    expect(model.topRisk).toBe('Rewards-only projection');
    expect(model.primaryAction.label).toBe('Verify node risk before bonding');
    expect(model.assumptionMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Risk coverage',
          value: 'Excludes slash and jail',
          severity: 'warning',
        }),
        expect.objectContaining({
          label: 'Fee input',
          value: '15.00%',
        }),
      ])
    );
  });

  it('promotes below-minimum bond scenarios into the diagnosis', () => {
    const model = buildBondSimulatorInsight({
      bondAmountRune: 1,
      currentBondRune: 0,
      lockDays: 90,
      networkApyPercent: 50,
      operatorFeeBps: 1000,
      hasResult: true,
    });

    expect(model.severity).toBe('warning');
    expect(model.statusLabel).toBe('Needs Attention');
    expect(model.topRisk).toBe('Bond amount is below active node minimum');
    expect(model.diagnosis).toContain('cannot be evaluated as an active-node-ready scenario');
  });

  it('flags aggressive APY and fee assumptions before showing reward totals', () => {
    const model = buildBondSimulatorInsight({
      bondAmountRune: 200_000,
      currentBondRune: 25_000,
      lockDays: 365,
      networkApyPercent: 130,
      operatorFeeBps: 5500,
      hasResult: true,
    });

    expect(model.severity).toBe('warning');
    expect(model.topRisk).toBe('Scenario depends on aggressive assumptions');
    expect(model.headerMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Portfolio after',
          value: 'ᚱ225K',
        }),
      ])
    );
  });
});
