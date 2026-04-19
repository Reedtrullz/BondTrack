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

export function calculateLpPnl(
  runeDeposited: string,
  asset2Deposited: string,
  runeWithdrawable: string,
  asset2Withdrawable: string,
  runeEntryPrice: number,
  asset2EntryPrice: number,
  runeCurrentPrice: number,
  asset2CurrentPrice: number
): { pnl: number; pnlPercent: number; runePnl: number; asset2Pnl: number } {
  const runeDepositedNum = runeToNumber(runeDeposited);
  const asset2DepositedNum = runeToNumber(asset2Deposited);
  const runeWithdrawableNum = runeToNumber(runeWithdrawable);
  const asset2WithdrawableNum = runeToNumber(asset2Withdrawable);
  
  const runeDepositedValue = runeDepositedNum * runeEntryPrice;
  const asset2DepositedValue = asset2DepositedNum * asset2EntryPrice;
  const totalDepositedValue = runeDepositedValue + asset2DepositedValue;
  
  const runeCurrentValue = runeWithdrawableNum * runeCurrentPrice;
  const asset2CurrentValue = asset2WithdrawableNum * asset2CurrentPrice;
  const totalCurrentValue = runeCurrentValue + asset2CurrentValue;
  
  const totalPnl = totalCurrentValue - totalDepositedValue;
  const pnlPercent = totalDepositedValue > 0 ? (totalPnl / totalDepositedValue) * 100 : 0;
  
  return {
    pnl: totalPnl,
    pnlPercent,
    runePnl: runeCurrentValue - runeDepositedValue,
    asset2Pnl: asset2CurrentValue - asset2DepositedValue,
  };
}

export function calculateLpWithdrawableAmounts(
  runeDeposit: string,
  asset2Deposit: string,
  runeDepth: string,
  asset2Depth: string,
  runeAdded: string,
  runeWithdrawn: string,
  asset2Added: string,
  asset2Withdrawn: string,
  ownershipPercent: number
): { runeWithdrawable: string; asset2Withdrawable: string; runeDeposited: string; asset2Deposited: string } {
  const runeDepthRaw = BigInt(runeDepth || '0');
  const asset2DepthRaw = BigInt(asset2Depth || '0');
  
  const percentBigInt = BigInt(Math.floor(ownershipPercent * 100));
  
  const runeWithdrawable = (runeDepthRaw * percentBigInt / 10000n).toString();
  const asset2Withdrawable = (asset2DepthRaw * percentBigInt / 10000n).toString();
  
  return {
    runeWithdrawable,
    asset2Withdrawable,
    runeDeposited: runeDeposit,
    asset2Deposited: asset2Deposit,
  };
}

export function formatPnlDisplay(pnl: number): { text: string; color: string } {
  if (pnl > 0) {
    return { text: `+$${pnl.toFixed(2)}`, color: 'text-green-600 dark:text-green-400' };
  } else if (pnl < 0) {
    return { text: `-$${Math.abs(pnl).toFixed(2)}`, color: 'text-red-600 dark:text-red-400' };
  } else {
    return { text: '$0.00', color: 'text-zinc-600 dark:text-zinc-400' };
  }
}
