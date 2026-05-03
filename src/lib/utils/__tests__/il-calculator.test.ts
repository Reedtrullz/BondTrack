import { describe, expect, it } from 'vitest';
import { calculateIL, calculateILUSD } from '../il-calculator';
import type { LpPosition } from '../../types/lp';

function makePosition(partial: Partial<LpPosition>): LpPosition {
  return {
    address: '',
    pool: 'BTC.BTC',
    assetSymbol: 'BTC',
    runeDeposit: '0',
    asset2Deposit: '0',
    liquidityUnits: '0',
    runeAdded: '0',
    runePending: '0',
    runeWithdrawn: '0',
    asset2Added: '0',
    asset2Pending: '0',
    asset2Withdrawn: '0',
    volume24h: '0',
    runeDepth: '0',
    asset2Depth: '0',
    dateFirstAdded: '0',
    dateLastAdded: '0',
    poolApy: 0,
    poolStatus: 'available',
    ownershipPercent: 0,
    hasPending: false,
    runeDepositedValue: '0',
    asset2DepositedValue: '0',
    runeWithdrawable: '0',
    asset2Withdrawable: '0',
    currentRunePriceUsd: 0,
    currentAssetPriceUsd: 0,
    entryRunePriceUsd: null,
    entryAssetPriceUsd: null,
    currentTotalValueUsd: 0,
    depositedTotalValueUsd: null,
    netProfitLoss: '',
    netProfitLossUsd: null,
    netProfitLossPercent: null,
    hodlValueUsd: null,
    impermanentLossUsd: null,
    impermanentLossPercent: null,
    impermanentLossValue: null,
    pricingSource: 'historical',
    runeEntryPrice: null,
    asset2EntryPrice: null,
    ...partial,
  };
}

describe('calculateIL', () => {
  it('returns ~-1.64% for the known test case from Task 3', () => {
    const entryRuneDepth = String(1000 * 1e8);
    const entryAssetDepth = String(1000 * 1e8);
    const currentRuneDepth = String(1200 * 1e8);
    const currentAssetDepth = String(833.33 * 1e8);

    const il = calculateIL(entryRuneDepth, entryAssetDepth, currentRuneDepth, currentAssetDepth);
    expect(il).toBeCloseTo(-1.64, 2);
  });

  it('returns 0% when entry and current depths are identical (no price change)', () => {
    const depth = String(5000 * 1e8);
    const il = calculateIL(depth, depth, depth, depth);
    expect(il).toBe(0);
  });

  it('returns a negative IL when the price ratio moves (XYK IL is always <= 0)', () => {
    const entryRuneDepth = String(1000 * 1e8);
    const entryAssetDepth = String(1000 * 1e8);
    const currentRuneDepth = String(800 * 1e8);
    const currentAssetDepth = String(1250 * 1e8);

    const il = calculateIL(entryRuneDepth, entryAssetDepth, currentRuneDepth, currentAssetDepth);
    expect(il).toBeLessThan(0);
  });

  it('returns 0 for invalid or zero depths', () => {
    expect(calculateIL('0', '1000', '1200', '833')).toBe(0);
    expect(calculateIL('1000', '0', '1200', '833')).toBe(0);
    expect(calculateIL('1000', '1000', '0', '833')).toBe(0);
    expect(calculateIL('1000', '1000', '1200', '0')).toBe(0);
    expect(calculateIL('abc', '1000', '1200', '833')).toBe(0);
    expect(calculateIL('1000', '1000', '1200', 'abc')).toBe(0);
  });

  it('is symmetric: swapping entry and current gives the same magnitude', () => {
    const entryRuneDepth = String(1000 * 1e8);
    const entryAssetDepth = String(1000 * 1e8);
    const currentRuneDepth = String(1200 * 1e8);
    const currentAssetDepth = String(833.33 * 1e8);

    const ilForward = calculateIL(entryRuneDepth, entryAssetDepth, currentRuneDepth, currentAssetDepth);
    const ilReverse = calculateIL(currentRuneDepth, currentAssetDepth, entryRuneDepth, entryAssetDepth);

    expect(ilForward).toBeCloseTo(ilReverse, 2);
  });
});

describe('calculateILUSD', () => {
  it('returns negative IL USD when withdrawable is less than HODL value', () => {
    const position = makePosition({
      runeDeposit: String(10 * 1e8),
      asset2Deposit: String(5 * 1e8),
      runeWithdrawable: String(7 * 1e8),
      asset2Withdrawable: String(6 * 1e8),
      currentAssetPriceUsd: 4,
    });

    const ilUsd = calculateILUSD(position, 2);
    const hodlValue = 10 * 2 + 5 * 4;
    const actualValue = 7 * 2 + 6 * 4;
    expect(ilUsd).toBe(actualValue - hodlValue);
    expect(ilUsd).toBeLessThan(0);
  });

  it('returns 0 when withdrawable equals deposited (no divergence)', () => {
    const position = makePosition({
      runeDeposit: String(10 * 1e8),
      asset2Deposit: String(5 * 1e8),
      runeWithdrawable: String(10 * 1e8),
      asset2Withdrawable: String(5 * 1e8),
      currentAssetPriceUsd: 4,
    });

    expect(calculateILUSD(position, 2)).toBe(0);
  });

  it('returns positive IL USD when LP outperforms HODL', () => {
    const position = makePosition({
      runeDeposit: String(10 * 1e8),
      asset2Deposit: String(5 * 1e8),
      runeWithdrawable: String(15 * 1e8),
      asset2Withdrawable: String(5 * 1e8),
      currentAssetPriceUsd: 4,
    });

    const ilUsd = calculateILUSD(position, 2);
    expect(ilUsd).toBeGreaterThan(0);
  });

  it('safely handles invalid prices by treating them as zero', () => {
    const position = makePosition({
      runeDeposit: String(10 * 1e8),
      asset2Deposit: String(5 * 1e8),
      runeWithdrawable: String(8 * 1e8),
      asset2Withdrawable: String(6 * 1e8),
      currentAssetPriceUsd: Number.NaN,
    });

    expect(calculateILUSD(position, Number.NaN)).toBe(0);
  });
});
