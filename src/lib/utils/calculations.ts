import { NETWORK } from '../config';
import { runeToNumber } from './formatters';

/**
 * Calculate a bond provider's share of a node's total bond.
 */
export function calculateBondShare(providerBond: string, totalBond: string): number {
  const provider = BigInt(providerBond || '0');
  const total = BigInt(totalBond || '0');
  if (total === 0n) return 0;
  return Number((provider * 10000n) / total) / 100; // 2 decimal precision
}

/**
 * Calculate estimated APY for a bond provider position.
 * APY = (perChurnReward × churnsPerYear / bondAmount) × 100
 */
export function calculateAPY(
  bondSharePercent: number,
  currentAward: string,
  operatorFeeBps: number,
  bondAmount: string
): number {
  const award = runeToNumber(currentAward);
  const bond = runeToNumber(bondAmount);
  if (bond === 0) return 0;

  const operatorFeeDecimal = operatorFeeBps / 10000;
  const perChurnReward = (bondSharePercent / 100) * award * (1 - operatorFeeDecimal);
  const annualReward = perChurnReward * NETWORK.CHURNS_PER_YEAR;

  return (annualReward / bond) * 100;
}

/**
 * Calculate per-churn reward for a bond provider.
 */
export function calculatePerChurnReward(
  bondSharePercent: number,
  currentAward: string,
  operatorFeeBps: number
): number {
  const award = runeToNumber(currentAward);
  const operatorFeeDecimal = operatorFeeBps / 10000;
  return (bondSharePercent / 100) * award * (1 - operatorFeeDecimal);
}

/**
 * Calculate total operator fee paid from rewards.
 */
export function calculateOperatorFeePaid(totalRewards: number, operatorFeeBps: number): number {
  return totalRewards * (operatorFeeBps / 10000);
}

/**
 * Calculate PnL from price change.
 */
export function calculatePricePnL(bondAmount: number, entryPrice: number, currentPrice: number): number {
  return bondAmount * (currentPrice - entryPrice);
}

/**
 * Calculate total return (bond growth + price appreciation).
 */
export function calculateTotalReturn(
  initialBond: number,
  currentBond: number,
  entryPrice: number,
  currentPrice: number
): number {
  const bondGrowth = currentBond - initialBond;
  const pricePnL = initialBond * (currentPrice - entryPrice);
  return bondGrowth + pricePnL;
}

/**
 * Calculate bond rank among all active nodes (lower rank = higher risk of churn-out).
 */
export function calculateBondRank(
  nodeTotalBond: string,
  allActiveNodes: { node_address: string; total_bond: string }[]
): { rank: number; total: number; percentile: number } {
  const sorted = [...allActiveNodes].sort((a, b) => {
    const bondA = BigInt(a.total_bond || '0');
    const bondB = BigInt(b.total_bond || '0');
    return bondA > bondB ? -1 : bondA < bondB ? 1 : 0;
  });

  const rank = sorted.findIndex((n) => n.node_address === sorted.find((s) => s.total_bond === nodeTotalBond)?.node_address) + 1;
  const total = sorted.length;
  const percentile = total > 0 ? ((total - rank + 1) / total) * 100 : 0;

  return { rank: rank || total, total, percentile };
}

/**
 * Calculate blocks remaining until jail release.
 */
export function calculateJailBlocksRemaining(releaseHeight: number, currentHeight: number): number {
  return Math.max(0, releaseHeight - currentHeight);
}

/**
 * Estimate time until next churn based on current block height.
 */
export function estimateNextChurn(currentHeight: number): { blocksRemaining: number; estimatedSeconds: number } {
  const blocksRemaining = NETWORK.CHURN_INTERVAL_BLOCKS - (currentHeight % NETWORK.CHURN_INTERVAL_BLOCKS);
  return {
    blocksRemaining,
    estimatedSeconds: blocksRemaining * 6,
  };
}

/**
 * Calculate impermanent loss for an LP position.
 * 
 * @param runeDeposit - RUNE amount deposited (in 1e8 units)
 * @param assetDeposit - ASSET amount deposited (in 1e8 units)
 * @param runeCurrentPrice - Current RUNE price in USD
 * @param assetCurrentPrice - Current ASSET price in USD
 * @param runeEntryPrice - RUNE price at time of deposit in USD
 * @param assetEntryPrice - ASSET price at time of deposit in USD
 * @returns Object with ilPercent (percentage) and ilValue (USD value)
 */
export function calculateImpermanentLoss(
  runeDeposit: string,
  assetDeposit: string,
  runeCurrentPrice: number,
  assetCurrentPrice: number,
  runeEntryPrice: number,
  assetEntryPrice: number
): { ilPercent: number; ilValue: number } {
  const runeDepositedValue = runeToNumber(runeDeposit) * runeEntryPrice;
  const assetDepositedValue = runeToNumber(assetDeposit) * assetEntryPrice;
  const totalDepositedValue = runeDepositedValue + assetDepositedValue;

  const runeCurrentValue = runeToNumber(runeDeposit) * runeCurrentPrice;
  const assetCurrentValue = runeToNumber(assetDeposit) * assetCurrentPrice;
  const totalCurrentValue = runeCurrentValue + assetCurrentValue;

  // HODL value if held separately
  const hodlValue = runeDepositedValue * (runeCurrentPrice / runeEntryPrice) +
                    assetDepositedValue * (assetCurrentPrice / assetEntryPrice);

  const ilValue = totalCurrentValue - hodlValue;
  const ilPercent = hodlValue > 0 ? (ilValue / hodlValue) * 100 : 0;

  return { ilPercent, ilValue };
}
