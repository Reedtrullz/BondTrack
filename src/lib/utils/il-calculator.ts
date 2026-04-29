import type { LpPosition } from '../types/lp';
import { runeToNumber } from './formatters';

/**
 * Calculate impermanent loss using the XYK constant-product formula.
 *
 * IL = 2*sqrt(priceRatio) / (1 + priceRatio) - 1
 *
 * Where priceRatio = (currentRuneDepth/currentAssetDepth) / (entryRuneDepth/entryAssetDepth)
 *
 * @returns IL as a percentage (e.g., -4.08 for -4.08%)
 */
export function calculateIL(
  entryRuneDepth: string,
  entryAssetDepth: string,
  currentRuneDepth: string,
  currentAssetDepth: string
): number {
  const entryRune = runeToNumber(entryRuneDepth);
  const entryAsset = runeToNumber(entryAssetDepth);
  const currentRune = runeToNumber(currentRuneDepth);
  const currentAsset = runeToNumber(currentAssetDepth);

  if (
    !Number.isFinite(entryRune) ||
    !Number.isFinite(entryAsset) ||
    !Number.isFinite(currentRune) ||
    !Number.isFinite(currentAsset) ||
    entryRune <= 0 ||
    entryAsset <= 0 ||
    currentRune <= 0 ||
    currentAsset <= 0
  ) {
    return 0;
  }

  const entryPriceRatio = entryRune / entryAsset;
  const currentPriceRatio = currentRune / currentAsset;
  const priceRatio = currentPriceRatio / entryPriceRatio;

  if (!Number.isFinite(priceRatio) || priceRatio <= 0) {
    return 0;
  }

  const il = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  return il * 100;
}

/**
 * Calculate impermanent loss in USD for a specific LP position.
 *
 * Compares the value if the user had simply HODL'd their initial deposits
 * versus the actual withdrawable LP value at current prices.
 *
 * @returns IL in USD (negative means loss, positive means gain)
 */
export function calculateILUSD(position: LpPosition, runePriceUSD: number): number {
  const runeDeposit = runeToNumber(position.runeDeposit);
  const assetDeposit = runeToNumber(position.asset2Deposit);
  const runeWithdrawable = runeToNumber(position.runeWithdrawable);
  const assetWithdrawable = runeToNumber(position.asset2Withdrawable);

  const safeRunePrice = Number.isFinite(runePriceUSD) && runePriceUSD >= 0 ? runePriceUSD : 0;
  const safeAssetPrice =
    Number.isFinite(position.currentAssetPriceUsd) && position.currentAssetPriceUsd >= 0
      ? position.currentAssetPriceUsd
      : 0;

  if (
    !Number.isFinite(runeDeposit) ||
    !Number.isFinite(assetDeposit) ||
    !Number.isFinite(runeWithdrawable) ||
    !Number.isFinite(assetWithdrawable)
  ) {
    return 0;
  }

  const hodlValue = runeDeposit * safeRunePrice + assetDeposit * safeAssetPrice;
  const actualValue = runeWithdrawable * safeRunePrice + assetWithdrawable * safeAssetPrice;

  return actualValue - hodlValue;
}
