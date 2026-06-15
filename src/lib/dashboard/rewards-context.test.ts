import { describe, expect, it } from 'vitest';
import type { BondHistory } from '@/lib/hooks/use-bond-history';
import type { BondPosition } from '@/lib/types/node';
import { buildRewardsPageModel } from './rewards-context';

function position(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    bondAmount: 100_000,
    bondSharePercent: 100,
    isJailed: false,
    jailReleaseHeight: 0,
    netAPY: 12,
    nodeAddress: 'thor1rewardnode',
    nodeOperatorAddress: 'thor1operator',
    operatorFee: 1000,
    operatorFeeFormatted: '10.0%',
    requestedToLeave: false,
    slashPoints: 0,
    status: 'Active',
    totalBond: 100_000,
    version: '3.19.0',
    yieldGuardFlags: [],
    ...overrides,
  };
}

function history(overrides: Partial<BondHistory> = {}): BondHistory {
  return {
    bondGrowth: 0,
    currentBond: 100_000,
    firstBondAmount: 25_000,
    firstBondDate: new Date('2026-01-01T00:00:00.000Z'),
    initialBond: 25_000,
    lastBondDate: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('buildRewardsPageModel', () => {
  it('uses node-level APY as the trusted basis when positions include node APY', () => {
    const model = buildRewardsPageModel({
      actionsError: undefined,
      bondHistory: null,
      isLoadingActions: false,
      networkBondingAPY: '0.20',
      positions: [position()],
      runePrice: 0,
      runePriceIsStale: false,
    });

    expect(model.weightedApy).toBe(12);
    expect(model.hasNodeApy).toBe(true);
    expect(model.runePriceMetric).toEqual({
      value: '--',
      detail: 'Waiting for quote',
    });
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'reward-history', value: 'Current-only', detail: 'No bond action history', severity: 'warning' }),
      expect.objectContaining({ id: 'apy-basis', value: 'Node-level', detail: '12.00% weighted from 1 node', severity: 'healthy' }),
      expect.objectContaining({ id: 'rune-price', value: 'Missing', detail: 'USD returns unavailable', severity: 'warning' }),
      expect.objectContaining({ id: 'forecast', value: 'Estimated', detail: 'Simple projection from node APY', severity: 'info' }),
      expect.objectContaining({ id: 'tax-export', value: 'Limited', detail: 'Current bond only', severity: 'warning' }),
    ]));
    expect(model.primaryConfidenceIssue).toEqual(expect.objectContaining({
      id: 'reward-history',
      value: 'Current-only',
    }));
  });

  it('falls back to THORNode network APY only when node APY is unavailable', () => {
    const model = buildRewardsPageModel({
      actionsError: undefined,
      bondHistory: null,
      isLoadingActions: false,
      networkBondingAPY: '0.000031',
      positions: [position({ netAPY: 0 })],
      runePrice: 0.6,
      runePriceIsStale: false,
    });

    expect(model.hasNodeApy).toBe(false);
    expect(model.networkApy).toBeCloseTo(0.0031);
    expect(model.weightedApy).toBeGreaterThan(0);
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'apy-basis', value: 'Network fallback', detail: '<0.01% THORNode fallback', severity: 'info' }),
      expect.objectContaining({ id: 'forecast', value: 'Estimated', detail: 'Simple projection from network fallback', severity: 'info' }),
      expect.objectContaining({ id: 'rune-price', value: 'Fresh', detail: 'Current quote loaded', severity: 'healthy' }),
    ]));
  });

  it('blocks forecast confidence when neither node nor network APY is usable', () => {
    const model = buildRewardsPageModel({
      actionsError: undefined,
      bondHistory: null,
      isLoadingActions: false,
      networkBondingAPY: undefined,
      positions: [position({ netAPY: 0 })],
      runePrice: 0,
      runePriceIsStale: false,
    });

    expect(model.weightedApy).toBe(0);
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'apy-basis', value: 'Unavailable', detail: 'Forecasts withheld', severity: 'warning' }),
      expect.objectContaining({ id: 'forecast', value: 'Blocked', detail: 'Needs APY baseline', severity: 'warning' }),
    ]));
  });

  it('surfaces degraded action history and stale prices without claiming tax readiness', () => {
    const model = buildRewardsPageModel({
      actionsError: new Error('Midgard actions failed'),
      bondHistory: history(),
      isLoadingActions: false,
      networkBondingAPY: '0.20',
      positions: [position()],
      runePrice: 0.6,
      runePriceIsStale: true,
    });

    expect(model.runePriceMetric).toEqual({
      value: '$0.60',
      detail: 'Stale quote',
    });
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'reward-history', value: 'Degraded', detail: 'Using current bond baseline', severity: 'warning' }),
      expect.objectContaining({ id: 'rune-price', value: 'Stale', detail: 'Price returns use last quote', severity: 'warning' }),
      expect.objectContaining({ id: 'tax-export', value: 'Degraded', detail: 'Worksheet may include history warnings', severity: 'warning' }),
    ]));
  });

  it('marks reward history and tax worksheet ready only when bond action history is present', () => {
    const model = buildRewardsPageModel({
      actionsError: undefined,
      bondHistory: history(),
      isLoadingActions: false,
      networkBondingAPY: '0.20',
      positions: [position()],
      runePrice: 0.6,
      runePriceIsStale: false,
    });

    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'reward-history', value: 'Trusted', detail: 'Bond actions loaded', severity: 'healthy' }),
      expect.objectContaining({ id: 'tax-export', value: 'Ready', detail: 'FIFO worksheet rows from bond history', severity: 'healthy' }),
    ]));
    expect(model.primaryConfidenceIssue).toBeUndefined();
  });
});
