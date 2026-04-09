import { BondPosition } from '@/lib/types/node';
import { runeToNumber } from '@/lib/utils/formatters';

export interface FeeAuditResult {
  grossReward: number;
  feeLeakage: number;
  netTakeHome: number;
  leakagePercent: number;
  period: 'daily' | 'monthly';
}

interface EarningsData {
  bondingEarnings: string;
  runePriceUSD: string;
}

/**
 * Calculates the estimated fee leakage based on current bond positions.
 * Uses real earnings from Midgard API when available, with fallback estimates.
 */
export function calculatePersonalFeeLeakage(
  positions: BondPosition[], 
  period: 'daily' | 'monthly' = 'monthly',
  earningsHistory?: EarningsData[]
): FeeAuditResult {
  const daysInPeriod = period === 'daily' ? 1 : 30;
  const safePositions = positions ?? [];

  if (safePositions.length === 0) {
    return {
      grossReward: 0,
      feeLeakage: 0,
      netTakeHome: 0,
      leakagePercent: 0,
      period,
    };
  }

  let totalGross = 0;
  let totalFees = 0;

  const safeEarnings = earningsHistory ?? [];
  if (safeEarnings.length > 0) {
    const totalBond = safePositions.reduce((sum, p) => sum + runeToNumber(p.bondAmount), 0);
    const networkTotalBond = 26300000000;
    
    safeEarnings.forEach(interval => {
      const bondEarnings = runeToNumber(interval.bondingEarnings);
      const bondShare = totalBond / networkTotalBond;
      const userEarnings = bondEarnings * bondShare;
      totalGross += userEarnings;
      
      const feeRate = safePositions[0]?.operatorFee || 0.05;
      totalFees += userEarnings * feeRate;
    });
  } else {
    const ESTIMATED_DAILY_RATE = 0.000001;
    safePositions.forEach(pos => {
      const bond = runeToNumber(pos.bondAmount);
      const dailyGross = bond * ESTIMATED_DAILY_RATE * daysInPeriod;
      const feeRate = pos.operatorFee || 0.05;
      const feeAmount = dailyGross * feeRate;
      totalGross += dailyGross;
      totalFees += feeAmount;
    });
  }

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
 * If a position has no APY, it falls back to the provided network baseline.
 * Weighted APY = Sum(Bond * (Position APY || Baseline)) / Total Bond
 */
export function calculateWeightedApy(positions: BondPosition[], networkBaselineApy: number = 0): number {
  let totalBond = 0;
  let weightedSum = 0;

  positions.forEach(pos => {
    const bond = runeToNumber(pos.bondAmount);
    const apy = pos.netAPY || networkBaselineApy;
    totalBond += bond;
    weightedSum += bond * apy;
  });

  if (totalBond === 0) return 0;
  return weightedSum / totalBond;
}
