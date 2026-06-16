import { describe, expect, it } from 'vitest';
import type { RunePriceInterval } from '@/lib/hooks/use-rune-price';
import type { LpPosition } from '@/lib/types/lp';
import type { BondPosition } from '@/lib/types/node';
import { buildPortfolioPageModel } from './portfolio-context';

function bond(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    bondAmount: 100,
    bondSharePercent: 100,
    isJailed: false,
    jailReleaseHeight: 0,
    netAPY: 10,
    nodeAddress: 'thor1node000000000000000000000000000000000000',
    nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
    operatorFee: 1000,
    operatorFeeFormatted: '10.0%',
    requestedToLeave: false,
    slashPoints: 0,
    status: 'Active',
    totalBond: 100,
    version: '3.19.0',
    yieldGuardFlags: [],
    ...overrides,
  };
}

function lp(overrides: Partial<LpPosition> = {}): LpPosition {
  return {
    address: 'thor1lpaddress',
    asset2Added: '0',
    asset2Depth: '0',
    asset2Deposit: '0',
    asset2DepositedValue: '0',
    asset2EntryPrice: null,
    asset2Pending: '0',
    asset2Withdrawable: '0',
    asset2Withdrawn: '0',
    assetSymbol: 'BTC',
    currentAssetPriceUsd: 0,
    currentRunePriceUsd: 0,
    currentTotalValueUsd: 50,
    dateFirstAdded: '1700000000',
    dateLastAdded: '1700000000',
    depositedTotalValueUsd: null,
    entryAssetPriceUsd: null,
    entryRunePriceUsd: null,
    hasPending: false,
    hodlValueUsd: null,
    impermanentLossPercent: null,
    impermanentLossUsd: null,
    impermanentLossValue: null,
    liquidityUnits: '0',
    netProfitLoss: '--',
    netProfitLossPercent: null,
    netProfitLossUsd: null,
    ownershipPercent: 0,
    pool: 'BTC.BTC',
    poolApy: 0,
    poolStatus: 'available',
    pricingSource: 'historical',
    runeAdded: '0',
    runeDepth: '0',
    runeDeposit: '0',
    runeDepositedValue: '0',
    runeEntryPrice: null,
    runePending: '0',
    runeWithdrawable: '0',
    runeWithdrawn: '0',
    redeemQuoteSource: 'thornode',
    claimableTrusted: true,
    volume24h: '0',
    ...overrides,
  };
}

function interval(price: number, hour: number): RunePriceInterval {
  return {
    runePriceUSD: price,
    timestamp: new Date(Date.UTC(2026, 0, 1, hour)),
  };
}

describe('buildPortfolioPageModel', () => {
  it('calculates bond, LP, allocation, and weighted APY exposure', () => {
    const model = buildPortfolioPageModel({
      bondPositions: [
        bond({ bondAmount: 100, netAPY: 10 }),
        bond({ bondAmount: 300, netAPY: 20 }),
      ],
      lpError: undefined,
      lpPositions: [lp({ currentTotalValueUsd: 600 })],
      runePrice: 2,
      runePriceHistory: [],
      runePriceIsStale: false,
    });

    expect(model.totalBondedRune).toBe(400);
    expect(model.totalBondedValueUsd).toBe(800);
    expect(model.totalLpValueUsd).toBe(600);
    expect(model.totalPortfolioValueUsd).toBe(1400);
    expect(model.weightedAPY).toBe(17.5);
    expect(model.pieData).toEqual([
      { name: 'Bond', value: 800, fill: '#10b981' },
      { name: 'LP', value: 600, fill: '#f59e0b' },
    ]);
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'bond-exposure', value: '2 nodes', severity: 'healthy' }),
      expect.objectContaining({ id: 'lp-valuation', value: 'Ready', detail: '1 LP position included', severity: 'healthy' }),
      expect.objectContaining({ id: 'allocation', value: 'Mixed', detail: 'Bond and LP exposure', severity: 'healthy' }),
    ]));
  });

  it('excludes LP value and labels valuation as degraded when LP data fails', () => {
    const model = buildPortfolioPageModel({
      bondPositions: [bond({ bondAmount: 100, netAPY: 12 })],
      lpError: new Error('Midgard member lookup failed'),
      lpPositions: [lp({ currentTotalValueUsd: 900 })],
      runePrice: 3,
      runePriceHistory: [],
      runePriceIsStale: false,
    });

    expect(model.effectiveLpPositions).toEqual([]);
    expect(model.totalLpValueUsd).toBe(0);
    expect(model.totalPortfolioValueUsd).toBe(300);
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'lp-valuation',
        value: 'Degraded',
        detail: 'LP value excluded from totals',
        severity: 'warning',
      }),
    ]));
  });

  it('keeps LP valuation partial when current value uses non-canonical redeem quotes', () => {
    const model = buildPortfolioPageModel({
      bondPositions: [bond({ bondAmount: 100, netAPY: 12 })],
      lpError: undefined,
      lpPositions: [
        lp({
          currentTotalValueUsd: 900,
          redeemQuoteSource: 'derived',
          claimableTrusted: false,
        }),
      ],
      runePrice: 3,
      runePriceHistory: [],
      runePriceIsStale: false,
    });

    expect(model.totalLpValueUsd).toBe(900);
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'lp-valuation',
        value: 'Partial',
        detail: '1 LP value not THORNode-confirmed',
        severity: 'warning',
      }),
    ]));
  });

  it('returns null RUNE price changes when history is too short or invalid', () => {
    const tooShort = buildPortfolioPageModel({
      bondPositions: [],
      lpError: undefined,
      lpPositions: [],
      runePrice: 0,
      runePriceHistory: [interval(1, 0), interval(2, 1)],
      runePriceIsStale: false,
    });
    const invalid = buildPortfolioPageModel({
      bondPositions: [],
      lpError: undefined,
      lpPositions: [],
      runePrice: 0,
      runePriceHistory: Array.from({ length: 169 }, (_, index) => interval(index === 0 ? 0 : 2, index)),
      runePriceIsStale: false,
    });

    expect(tooShort.runePriceChange24h).toBeNull();
    expect(tooShort.runePriceChange7d).toBeNull();
    expect(invalid.runePriceChange7d).toBeNull();
  });

  it('calculates 24h and 7d RUNE price changes from hourly history', () => {
    const history = Array.from({ length: 169 }, (_, index) => interval(100 + index, index));
    const model = buildPortfolioPageModel({
      bondPositions: [],
      lpError: undefined,
      lpPositions: [],
      runePrice: 268,
      runePriceHistory: history,
      runePriceIsStale: true,
    });

    expect(model.runePriceChange24h).toBeCloseTo(((268 - 244) / 244) * 100);
    expect(model.runePriceChange7d).toBeCloseTo(168);
    expect(model.confidenceMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'rune-price', value: 'Stale', detail: 'USD values use last quote', severity: 'warning' }),
    ]));
  });
});
