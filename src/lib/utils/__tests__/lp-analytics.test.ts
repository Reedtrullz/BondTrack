import { describe, expect, it } from 'vitest';
import { calculateLpPositionValuation, getCurrentAssetPriceUsd, getLpAssetSymbol } from '../lp-analytics';

describe('lp analytics', () => {
  it('returns a normalized asset symbol from common THORChain asset identifiers', () => {
    expect(getLpAssetSymbol('GAIA.ATOM')).toBe('ATOM');
    expect(getLpAssetSymbol('DOGE.DOGE')).toBe('DOGE');
    expect(getLpAssetSymbol('BCH.BCH')).toBe('BCH');
    expect(getLpAssetSymbol('ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48')).toBe('USDC');
    expect(getLpAssetSymbol('BTC/BTC')).toBe('BTC');
  });

  it('fails safely for missing or invalid pool identifiers', () => {
    expect(getLpAssetSymbol('')).toBe('Unknown');
    expect(getLpAssetSymbol('GAIA.')).toBe('Unknown');
  });

  it('prefers pool.assetPriceUSD over current RUNE price-derived fallback pricing', () => {
    const assetPriceUsd = getCurrentAssetPriceUsd(
      {
        assetPriceUSD: '1.8644753822037146',
        runeDepth: '32657324978656',
        assetDepth: '8583594114048',
      },
      0.48854841521048686
    );

    expect(assetPriceUsd).toBeCloseTo(1.8644753822, 6);
    expect(assetPriceUsd).not.toBeCloseTo(0.4885484152, 6);
  });

  it('falls back to pool depth pricing when the direct USD price is missing or invalid', () => {
    expect(
      getCurrentAssetPriceUsd(
        {
          assetPriceUSD: 'not-a-number',
          runeDepth: '250000000000',
          assetDepth: '500000000000',
        },
        2
      )
    ).toBeCloseTo(1, 8);

    expect(
      getCurrentAssetPriceUsd(
        {
          assetPriceUSD: 'Infinity',
          runeDepth: '250000000000',
          assetDepth: '500000000000',
        },
        2
      )
    ).toBeCloseTo(1, 8);
  });

  it('returns 0 when fallback pricing inputs are missing or non-finite', () => {
    expect(getCurrentAssetPriceUsd({}, 2)).toBe(0);
    expect(
      getCurrentAssetPriceUsd(
        {
          assetPriceUSD: 'not-a-number',
          runeDepth: '250000000000',
          assetDepth: '500000000000',
        },
        Number.NaN
      )
    ).toBe(0);
    expect(
      getCurrentAssetPriceUsd(
        {
          assetPriceUSD: 'not-a-number',
          runeDepth: '250000000000',
          assetDepth: '500000000000',
        },
        Number.POSITIVE_INFINITY
      )
    ).toBe(0);
    expect(
      getCurrentAssetPriceUsd(
        {
          assetPriceUSD: 'not-a-number',
          runeDepth: '250000000000',
          assetDepth: '500000000000',
        },
        -2
      )
    ).toBe(0);
  });
});

describe('calculateLpPositionValuation', () => {
  it('values withdrawable balances with the correct current asset USD price', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '4313455076023',
      assetDeposit: '1074400000000',
      runeWithdrawable: '7341195037498',
      assetWithdrawable: '1930780800838',
      runeCurrentPriceUsd: 0.48854841521048686,
      assetCurrentPriceUsd: 1.8644753822037146,
      runeEntryPriceUsd: 0.4900000000,
      assetEntryPriceUsd: 1.8600000000,
    });

    expect(result.currentTotalValueUsd).toBeCloseTo(71864.22472914764, 10);
    expect(result.depositedTotalValueUsd).toBeCloseTo(41119.7698725127, 10);
    expect(result.netProfitLossUsd).toBeCloseTo(30744.45485663494, 10);
    expect(result.netProfitLossPercent).toBeCloseTo(74.76806157221873, 10);
    expect(result.hodlValueUsd).toBeCloseTo(41105.23992112338, 10);
    expect(result.impermanentLossUsd).toBeCloseTo(30758.98480802426, 10);
    expect(result.impermanentLossPercent).toBeCloseTo(74.82983888926937, 10);
    expect(result.currentTotalValueUsd).not.toBeCloseTo(45298.09, 0);
  });

  it('returns non-zero impermanent loss when LP balances diverge from HODL balances', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '1000000000',
      assetDeposit: '500000000',
      runeWithdrawable: '1200000000',
      assetWithdrawable: '400000000',
      runeCurrentPriceUsd: 2,
      assetCurrentPriceUsd: 4,
      runeEntryPriceUsd: 1,
      assetEntryPriceUsd: 2,
    });

    expect(result.currentTotalValueUsd).toBe(40);
    expect(result.depositedTotalValueUsd).toBe(20);
    expect(result.netProfitLossUsd).toBe(20);
    expect(result.netProfitLossPercent).toBe(100);
    expect(result.hodlValueUsd).toBe(40);
    expect(result.impermanentLossUsd).toBe(-4);
    // Intentional Task 2 behavior: balance divergence must not collapse to a fake 0% IL.
    expect(result.impermanentLossPercent).toBe(-10);
  });

  it('preserves the non-zero divergence IL signal using raw balance deltas when Number balances collapse together', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '900719925474099300000000',
      assetDeposit: '900719925474099300000000',
      runeWithdrawable: '900719925474099300000000',
      assetWithdrawable: '900719925474099299999999',
      runeCurrentPriceUsd: 1,
      assetCurrentPriceUsd: 1,
      runeEntryPriceUsd: 1,
      assetEntryPriceUsd: 1,
    });

    expect(result.currentTotalValueUsd).toBe(result.hodlValueUsd);
    expect(result.impermanentLossUsd).toBeCloseTo(-0.00000001, 16);
    expect(result.impermanentLossUsd).not.toBe(0);
    expect(result.impermanentLossPercent).toBeLessThan(0);
  });

  it('returns zero impermanent loss when withdrawable balances still match HODL balances', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '1000000000',
      assetDeposit: '500000000',
      runeWithdrawable: '1000000000',
      assetWithdrawable: '500000000',
      runeCurrentPriceUsd: 2,
      assetCurrentPriceUsd: 4,
      runeEntryPriceUsd: 1,
      assetEntryPriceUsd: 2,
    });

    expect(result.currentTotalValueUsd).toBe(40);
    expect(result.depositedTotalValueUsd).toBe(20);
    expect(result.netProfitLossUsd).toBe(20);
    expect(result.netProfitLossPercent).toBe(100);
    expect(result.hodlValueUsd).toBe(40);
    expect(result.impermanentLossUsd).toBe(0);
    expect(result.impermanentLossPercent).toBe(0);
  });

  it('treats NaN current prices as zero without propagating NaN valuation fields', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '1000000000',
      assetDeposit: '500000000',
      runeWithdrawable: '1200000000',
      assetWithdrawable: '400000000',
      runeCurrentPriceUsd: Number.NaN,
      assetCurrentPriceUsd: Number.NaN,
      runeEntryPriceUsd: 1,
      assetEntryPriceUsd: 2,
    });

    expect(result.currentTotalValueUsd).toBe(0);
    expect(result.depositedTotalValueUsd).toBe(20);
    expect(result.netProfitLossUsd).toBe(-20);
    expect(result.netProfitLossPercent).toBe(-100);
    expect(result.hodlValueUsd).toBe(0);
    expect(result.impermanentLossUsd).toBe(0);
    expect(result.impermanentLossPercent).toBeNull();
  });

  it('sanitizes invalid current prices so valuation fails safely', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '1000000000',
      assetDeposit: '500000000',
      runeWithdrawable: '1200000000',
      assetWithdrawable: '400000000',
      runeCurrentPriceUsd: Number.POSITIVE_INFINITY,
      assetCurrentPriceUsd: -4,
      runeEntryPriceUsd: 1,
      assetEntryPriceUsd: 2,
    });

    expect(result.currentTotalValueUsd).toBe(0);
    expect(result.depositedTotalValueUsd).toBe(20);
    expect(result.netProfitLossUsd).toBe(-20);
    expect(result.netProfitLossPercent).toBe(-100);
    expect(result.hodlValueUsd).toBe(0);
    expect(result.impermanentLossUsd).toBe(0);
    expect(result.impermanentLossPercent).toBeNull();
  });

  it('computes LP yield fallback when historical entry pricing is unavailable', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '1000000000',
      assetDeposit: '500000000',
      runeWithdrawable: '1200000000',
      assetWithdrawable: '400000000',
      runeCurrentPriceUsd: 2,
      assetCurrentPriceUsd: 4,
      runeEntryPriceUsd: null,
      assetEntryPriceUsd: null,
    });

    // Current value = 12*2 + 4*4 = 40
    // HODL value = 10*2 + 5*4 = 40
    // LP yield = 40 - 40 = 0
    expect(result.currentTotalValueUsd).toBe(40);
    expect(result.depositedTotalValueUsd).toBe(40);
    expect(result.netProfitLossUsd).toBe(0);
    expect(result.hasHistoricalPricing).toBe(false);
    expect(result.impermanentLossUsd).toBe(-4);
  });

  it('computes LP yield fallback when historical entry pricing is invalid', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '1000000000',
      assetDeposit: '500000000',
      runeWithdrawable: '1200000000',
      assetWithdrawable: '400000000',
      runeCurrentPriceUsd: 2,
      assetCurrentPriceUsd: 4,
      runeEntryPriceUsd: Number.NaN,
      assetEntryPriceUsd: -2,
    });

    expect(result.currentTotalValueUsd).toBe(40);
    expect(result.depositedTotalValueUsd).toBe(40);
    expect(result.netProfitLossUsd).toBe(0);
    expect(result.hasHistoricalPricing).toBe(false);
    expect(result.impermanentLossUsd).toBe(-4);
  });

  it('computes LP yield fallback when historical entry pricing is zero', () => {
    const result = calculateLpPositionValuation({
      runeDeposit: '1000000000',
      assetDeposit: '500000000',
      runeWithdrawable: '1200000000',
      assetWithdrawable: '400000000',
      runeCurrentPriceUsd: 2,
      assetCurrentPriceUsd: 4,
      runeEntryPriceUsd: 0,
      assetEntryPriceUsd: 2,
    });

    expect(result.currentTotalValueUsd).toBe(40);
    expect(result.depositedTotalValueUsd).toBe(40);
    expect(result.netProfitLossUsd).toBe(0);
    expect(result.hasHistoricalPricing).toBe(false);
    expect(result.impermanentLossUsd).toBe(-4);
  });
});
