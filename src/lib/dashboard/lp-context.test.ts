import { describe, expect, it } from 'vitest';
import type { LpPosition } from '@/lib/types/lp';
import { buildLpPageModel } from './lp-context';

function lpPosition(overrides: Partial<LpPosition> = {}): LpPosition {
  return {
    address: 'thor1lp',
    asset2Added: '10000000',
    asset2Deposit: '250000000',
    asset2DepositedValue: '250000000',
    asset2Depth: '125000000000',
    asset2EntryPrice: 1.8,
    asset2Pending: '0',
    asset2Withdrawable: '275000000',
    asset2Withdrawn: '0',
    assetSymbol: 'BTC',
    currentAssetPriceUsd: 1.92,
    currentRunePriceUsd: 0.48,
    currentTotalValueUsd: 31.68,
    dateFirstAdded: '1700000000',
    dateLastAdded: '1700500000',
    depositedTotalValueUsd: 27,
    entryAssetPriceUsd: 1.8,
    entryRunePriceUsd: 0.45,
    hasPending: false,
    hodlValueUsd: 31.5,
    impermanentLossPercent: 0.57,
    impermanentLossUsd: 0.18,
    impermanentLossValue: 0.18,
    liquidityUnits: '100',
    netProfitLoss: '+$4.68',
    netProfitLossPercent: 17.33,
    netProfitLossUsd: 4.68,
    ownershipPercent: 25,
    pool: 'BTC.BTC',
    poolApy: 12.5,
    poolStatus: 'available',
    pricingSource: 'historical',
    runeAdded: '100000000',
    runeDeposit: '5000000000',
    runeDepositedValue: '5000000000',
    runeDepth: '250000000000',
    runeEntryPrice: 0.45,
    runePending: '0',
    runeWithdrawable: '5500000000',
    runeWithdrawn: '0',
    volume24h: '900000000',
    ...overrides,
  };
}

describe('buildLpPageModel', () => {
  it('separates trusted historical performance from estimated and current-only LP values', () => {
    const model = buildLpPageModel({
      isHistoricalEnrichmentLoading: false,
      isLoading: false,
      positions: [
        lpPosition(),
        lpPosition({
          assetSymbol: 'ETH',
          currentTotalValueUsd: 50,
          impermanentLossUsd: -2,
          netProfitLossUsd: 7,
          pool: 'ETH.ETH',
          pricingSource: 'estimated',
        }),
        lpPosition({
          assetSymbol: 'ATOM',
          currentTotalValueUsd: 72,
          entryAssetPriceUsd: null,
          entryRunePriceUsd: null,
          impermanentLossPercent: null,
          impermanentLossUsd: null,
          impermanentLossValue: null,
          netProfitLoss: 'Current value only',
          netProfitLossPercent: null,
          netProfitLossUsd: null,
          pool: 'GAIA.ATOM',
          pricingSource: 'current-only',
        }),
      ],
      runePriceFreshness: {
        ageMs: 1_000,
        isStale: false,
        staleAfterMs: 129_600_000,
        updatedAt: new Date('2026-06-12T10:00:00.000Z'),
        updatedAtTimestampSeconds: 1781258400,
      },
    });

    expect(model.totalLpValueUsd).toBe(153.68);
    expect(model.trustedHistoricalCount).toBe(1);
    expect(model.estimatedCount).toBe(1);
    expect(model.currentOnlyCount).toBe(1);
    expect(model.hasUntrustedPerformance).toBe(true);
    expect(model.performancePendingLabel).toBe('Historical only');
    expect(model.totalValueDetail).toBe('Current value includes all pools; 1 estimated position and 1 current-only position need confidence review');
    expect(model.aggregatePnlDetail).toBe('+$4.68 from historical positions; 1 estimated position and 1 current-only position excluded');
    expect(model.aggregateIlDetail).toBe('+$0.18 from historical positions; 1 estimated position and 1 current-only position excluded');
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'trusted-lp-values', value: '1', severity: 'healthy' }),
      expect.objectContaining({ id: 'estimated-lp-values', value: '1', detail: 'Excluded from aggregate P/L', severity: 'info' }),
      expect.objectContaining({ id: 'current-only-lp-values', value: '1', detail: 'History unavailable', severity: 'warning' }),
      expect.objectContaining({ id: 'lp-price-feed', value: 'Fresh', severity: 'healthy' }),
    ]));
    expect(model.primaryConfidenceIssue).toEqual(expect.objectContaining({
      id: 'current-only-lp-values',
      value: '1',
    }));
  });

  it('keeps historical enrichment in-flight distinct from unavailable history', () => {
    const model = buildLpPageModel({
      isHistoricalEnrichmentLoading: true,
      isLoading: false,
      positions: [
        lpPosition({
          entryAssetPriceUsd: null,
          entryRunePriceUsd: null,
          impermanentLossPercent: null,
          impermanentLossUsd: null,
          impermanentLossValue: null,
          netProfitLoss: 'Current value only',
          netProfitLossPercent: null,
          netProfitLossUsd: null,
          pricingSource: 'current-only',
        }),
      ],
      runePriceFreshness: undefined,
    });

    expect(model.hasUntrustedPerformance).toBe(true);
    expect(model.performancePendingLabel).toBe('Enriching...');
    expect(model.aggregatePnlDetail).toBe('Historical entry pricing is still loading');
    expect(model.aggregateIlDetail).toBe('Historical entry pricing is still loading');
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'current-only-lp-values', detail: 'Enriching now', severity: 'warning' }),
      expect.objectContaining({ id: 'lp-price-feed', value: 'Unknown', detail: 'No Midgard quote loaded', severity: 'warning' }),
    ]));
  });

  it('labels RUNE price confidence without implying fresh values before data exists', () => {
    expect(buildLpPageModel({
      isHistoricalEnrichmentLoading: false,
      isLoading: true,
      positions: [],
      runePriceFreshness: undefined,
    }).confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'lp-price-feed', value: 'Pending', detail: 'Waiting for Midgard quote', severity: 'info' }),
    ]));

    expect(buildLpPageModel({
      isHistoricalEnrichmentLoading: false,
      isLoading: false,
      positions: [],
      runePriceFreshness: undefined,
    }).confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'lp-price-feed', value: 'Not used', detail: 'No LP values', severity: 'info' }),
    ]));

    expect(buildLpPageModel({
      isHistoricalEnrichmentLoading: false,
      isLoading: false,
      positions: [lpPosition()],
      runePriceFreshness: {
        ageMs: 200_000_000,
        isStale: true,
        staleAfterMs: 129_600_000,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAtTimestampSeconds: 1704067200,
      },
    }).confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'lp-price-feed', value: 'Stale', severity: 'warning' }),
    ]));
  });

  it('has no primary confidence issue when all LP values are historically priced and fresh', () => {
    const model = buildLpPageModel({
      isHistoricalEnrichmentLoading: false,
      isLoading: false,
      positions: [lpPosition()],
      runePriceFreshness: {
        ageMs: 1_000,
        isStale: false,
        staleAfterMs: 129_600_000,
        updatedAt: new Date('2026-06-12T10:00:00.000Z'),
        updatedAtTimestampSeconds: 1781258400,
      },
    });

    expect(model.primaryConfidenceIssue).toBeUndefined();
    expect(model.aggregatePnlDetail).toBe('+$4.68 from historical positions');
    expect(model.aggregateIlDetail).toBe('LP value minus HODL value for historical positions');
  });
});
