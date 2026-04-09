import { BondPosition } from '@/lib/types/node';
import { runeToNumber } from '@/lib/utils/formatters';

export interface FeeAuditResult {
  grossReward: number;
  feeLeakage: number;
  netTakeHome: number;
  leakagePercent: number;
  period: 'daily' | 'monthly';
}

/**
 * Calculates the estimated fee leakage based on current bond positions.
 * Handles zero-reward cases to prevent division-by-zero glitches.
 */
export function calculatePersonalFeeLeakage(positions: BondPosition[], period: 'daily' | 'monthly' = 'monthly'): FeeAuditResult {
  const ESTIMATED_DAILY_RATE = 0.000001; 
  const daysInPeriod = period === 'daily' ? 1 : 30;

  let totalGross = 0;
  let totalFees = 0;

  positions.forEach(pos => {
    const bond = runeToNumber(pos.bondAmount);
    const dailyGross = bond * ESTIMATED_DAILY_RATE * daysInPeriod;
    const feeRate = pos.operatorFee || 0.01;
    const feeAmount = dailyGross * feeRate;
    totalGross += dailyGross;
    totalFees += feeAmount;
  });

  if (totalGross === 0) {
    return {
      grossReward: 0,
      feeLeakage: 0,
      netTakeHome: 0,
      leakagePercent: 0,
      period,
    };
  }

  return {
    grossReward: totalGross,
    feeLeakage: totalFees,
    netTakeHome: totalGross - totalFees,
    leakagePercent: Math.min(100, (totalFees / totalGross) * 100),
    period,
  };
}

/**
 * Calculates the weighted average APY of the portfolio.
 * Weighted APY = Sum(Bond * APY) / Total Bond
 */
export function calculateWeightedApy(positions: BondPosition[]): number {
  let totalBond = 0;
  let weightedSum = 0;

  positions.forEach(pos => {
    const bond = runeToNumber(pos.bondAmount);
    const apy = pos.netAPY || 0;
    totalBond += bond;
    weightedSum += bond * apy;
  });

  if (totalBond === 0) return 0;
  return weightedSum / totalBond;
}
