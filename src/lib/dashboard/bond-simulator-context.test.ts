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
    expect(model.statusLabel).toBe('Manual Estimate');
    expect(model.topRisk).toBe('Rewards-only projection');
    expect(model.primaryAction.label).toBe('Verify node risk before bonding');
    expect(model.headerMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Lock period',
          detail: 'Manual APY window',
        }),
      ])
    );
    expect(model.assumptionMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Estimate model',
          value: 'Manual APY',
          detail: 'No live source or compounding',
        }),
        expect.objectContaining({
          label: 'Risk coverage',
          value: 'Excludes slash and jail',
          severity: 'warning',
        }),
        expect.objectContaining({
          label: 'Fee input',
          value: '15.00%',
        }),
        expect.objectContaining({
          id: 'minimum-bond',
          label: 'Minimum bond',
          value: 'Meets active minimum',
          detail: 'ᚱ10K threshold only',
          severity: 'info',
        }),
      ])
    );
    expect(model.assumptionMetrics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'minimum-bond',
          severity: 'healthy',
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
    expect(model.diagnosis).toContain('cannot be evaluated as an active-node scenario');
    expect(model.diagnosis).not.toContain('active-node-ready');
  });

  it('keeps long-lock scenarios in review instead of calling reward math ready', () => {
    const model = buildBondSimulatorInsight({
      bondAmountRune: 200_000,
      currentBondRune: 25_000,
      lockDays: 365,
      networkApyPercent: 65,
      operatorFeeBps: 1500,
      hasResult: true,
    });

    expect(model.topRisk).toBe('Long lock window needs risk review');
    expect(model.diagnosis).toContain('The reward estimate can be reviewed');
    expect(model.diagnosis).not.toContain('reward math is ready');
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

  it('treats operator fees above 100 percent as invalid instead of aggressive assumptions', () => {
    const model = buildBondSimulatorInsight({
      bondAmountRune: 200_000,
      currentBondRune: 25_000,
      lockDays: 180,
      networkApyPercent: 65,
      operatorFeeBps: 12_000,
      hasResult: false,
    });

    expect(model.severity).toBe('warning');
    expect(model.statusLabel).toBe('Needs Attention');
    expect(model.topRisk).toBe('Operator fee input is impossible');
    expect(model.diagnosis).toContain('Operator fee must be between 0% and 100%');
    expect(model.diagnosis).not.toContain('stress case');
    expect(model.primaryAction).toEqual({ label: 'Fix operator fee', href: '#simulator-inputs' });
    expect(model.assumptionMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'fee-input',
          label: 'Fee input',
          value: 'Invalid',
          detail: '0% to 100% only',
          severity: 'warning',
        }),
      ])
    );
  });

  it('treats a missing manual APY as missing input instead of a zero-percent estimate', () => {
    const model = buildBondSimulatorInsight({
      bondAmountRune: 200_000,
      currentBondRune: 25_000,
      lockDays: 180,
      networkApyPercent: 0,
      operatorFeeBps: 1_500,
      hasResult: false,
      missingInput: 'network-apy',
    });

    expect(model.severity).toBe('warning');
    expect(model.statusLabel).toBe('Needs Attention');
    expect(model.topRisk).toBe('Network APY input is missing');
    expect(model.diagnosis).toContain('Enter an estimated network APY');
    expect(model.diagnosis).not.toContain('zero-percent');
    expect(model.primaryAction).toEqual({ label: 'Enter APY estimate', href: '#simulator-inputs' });
    expect(model.assumptionMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'estimate-model',
          label: 'Estimate model',
          value: 'Missing APY',
          detail: 'Enter estimated APY',
          severity: 'warning',
        }),
      ])
    );
  });

  it('treats a missing operator fee as missing input instead of a zero-fee estimate', () => {
    const model = buildBondSimulatorInsight({
      bondAmountRune: 200_000,
      currentBondRune: 25_000,
      lockDays: 180,
      networkApyPercent: 65,
      operatorFeeBps: 0,
      hasResult: false,
      missingInput: 'operator-fee',
    });

    expect(model.severity).toBe('warning');
    expect(model.statusLabel).toBe('Needs Attention');
    expect(model.topRisk).toBe('Operator fee input is missing');
    expect(model.diagnosis).toContain('Enter an operator fee');
    expect(model.primaryAction).toEqual({ label: 'Enter operator fee', href: '#simulator-inputs' });
    expect(model.assumptionMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'fee-input',
          label: 'Fee input',
          value: 'Missing',
          detail: 'Enter 0% to 100%',
          severity: 'warning',
        }),
      ])
    );
  });
});
