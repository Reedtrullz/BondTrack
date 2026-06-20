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
  const mergedHistory = {
    bondGrowth: 0,
    currentBond: 100_000,
    firstBondAmount: 25_000,
    firstBondDate: new Date('2026-01-01T00:00:00.000Z'),
    initialBond: 25_000,
    lastBondDate: new Date('2026-01-01T00:00:00.000Z'),
    actionLimit: 50,
    loadedActionCount: 12,
    totalActionCount: 12,
    isPartial: false,
    isLocalActionCapReached: false,
    ...overrides,
  };

  return {
    ...mergedHistory,
    isLocalActionCapReached: mergedHistory.isLocalActionCapReached ?? false,
  };
}

describe('buildRewardsPageModel', () => {
  it('uses node-level APY as an informational estimate basis when positions include node APY', () => {
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
      expect.objectContaining({ id: 'apy-basis', value: 'Node-level', detail: '12.00% node-weighted estimate from 1 node', severity: 'info' }),
      expect.objectContaining({ id: 'rune-price', value: 'Missing', detail: 'USD returns unavailable', severity: 'warning' }),
      expect.objectContaining({ id: 'forecast', value: 'Estimated', detail: 'Simple projection from node APY', severity: 'info' }),
      expect.objectContaining({ id: 'tax-export', value: 'Limited', detail: 'Current bond only', severity: 'warning' }),
    ]));
    expect(model.confidenceMetrics.find((metric) => metric.id === 'apy-basis')).not.toEqual(
      expect.objectContaining({ severity: 'healthy' })
    );
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
      runePriceUpdatedAt: new Date('2026-06-12T00:00:00.000Z'),
    });

    expect(model.hasNodeApy).toBe(false);
    expect(model.networkApy).toBeCloseTo(0.0031);
    expect(model.weightedApy).toBeGreaterThan(0);
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'apy-basis', value: 'Network fallback', detail: '<0.01% THORNode fallback', severity: 'info' }),
      expect.objectContaining({ id: 'forecast', value: 'Estimated', detail: 'Simple projection from network fallback', severity: 'info' }),
      expect.objectContaining({ id: 'rune-price', value: 'Recent', detail: 'Recent quote loaded', severity: 'info' }),
    ]));
  });

  it('does not mark a numeric non-stale RUNE quote fresh when freshness is missing', () => {
    const model = buildRewardsPageModel({
      actionsError: undefined,
      bondHistory: history(),
      isLoadingActions: false,
      networkBondingAPY: '0.20',
      positions: [position()],
      runePrice: 0.6,
      runePriceIsStale: false,
    });

    expect(model.runePriceMetric).toEqual({
      value: '$0.60',
      detail: 'Quote loaded without freshness',
    });
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'rune-price',
        value: 'Unverified',
        detail: 'Quote loaded without freshness',
        severity: 'warning',
      }),
    ]));
    expect(model.confidenceMetrics).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'rune-price',
        value: 'Recent',
      }),
    ]));
  });

  it('blocks forecast checks when neither node nor network APY is usable', () => {
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
      runePriceUpdatedAt: new Date('2026-06-12T00:00:00.000Z'),
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

  it('marks complete reward history as source-loaded while keeping tax worksheet in review', () => {
    const model = buildRewardsPageModel({
      actionsError: undefined,
      bondHistory: history(),
      isLoadingActions: false,
      networkBondingAPY: '0.20',
      positions: [position()],
      runePrice: 0.6,
      runePriceIsStale: false,
      runePriceUpdatedAt: new Date('2026-06-12T00:00:00.000Z'),
    });

    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'reward-history',
        value: 'Source-loaded',
        detail: 'Bond action rows loaded; returns are app-calculated review metrics',
        severity: 'info',
      }),
      expect.objectContaining({ id: 'tax-export', value: 'Review', detail: 'Bond history rows available; not filing-ready', severity: 'info' }),
    ]));
    expect(model.confidenceMetrics.find((metric) => metric.id === 'reward-history')).not.toEqual(
      expect.objectContaining({ value: 'Trusted' })
    );
    expect(model.confidenceMetrics.find((metric) => metric.id === 'reward-history')).not.toEqual(
      expect.objectContaining({ value: 'Source-backed' })
    );
    expect(model.confidenceMetrics.find((metric) => metric.id === 'tax-export')).not.toEqual(
      expect.objectContaining({ value: 'Ready' })
    );
    expect(model.primaryConfidenceIssue).toBeUndefined();
  });

  it('warns when reward history is only a partial recent action window', () => {
    const model = buildRewardsPageModel({
      actionsError: undefined,
      bondHistory: history({ loadedActionCount: 50, totalActionCount: 76, isPartial: true }),
      isLoadingActions: false,
      networkBondingAPY: '0.20',
      positions: [position()],
      runePrice: 0.6,
      runePriceIsStale: false,
      runePriceUpdatedAt: new Date('2026-06-12T00:00:00.000Z'),
    });

    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'reward-history',
        value: 'Partial',
        detail: 'Loaded 50 of 76; auto returns need full history or manual baseline',
        severity: 'warning',
      }),
      expect.objectContaining({
        id: 'tax-export',
        value: 'Review',
        detail: 'Visible history is partial; export may include history warnings',
        severity: 'warning',
      }),
    ]));
    expect(model.primaryConfidenceIssue).toEqual(expect.objectContaining({
      id: 'reward-history',
      value: 'Partial',
    }));
  });

  it('calls out when reward history is capped locally before Midgard count is exhausted', () => {
    const cappedHistory = history({
      actionLimit: 1000,
      loadedActionCount: 1000,
      totalActionCount: 1001,
      isPartial: true,
    }) as BondHistory & { isLocalActionCapReached: boolean };
    cappedHistory.isLocalActionCapReached = true;

    const model = buildRewardsPageModel({
      actionsError: undefined,
      bondHistory: cappedHistory,
      isLoadingActions: false,
      networkBondingAPY: '0.20',
      positions: [position()],
      runePrice: 0.6,
      runePriceIsStale: false,
      runePriceUpdatedAt: new Date('2026-06-12T00:00:00.000Z'),
    });

    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'reward-history',
        value: 'Capped',
        detail: 'Local 1000-action cap reached; set a manual baseline before relying on returns',
        severity: 'warning',
      }),
      expect.objectContaining({
        id: 'tax-export',
        value: 'Review',
        detail: 'Local action cap reached; worksheet may omit older bond history',
        severity: 'warning',
      }),
    ]));
    expect(model.primaryConfidenceIssue).toEqual(expect.objectContaining({
      id: 'reward-history',
      value: 'Capped',
    }));
  });
});
