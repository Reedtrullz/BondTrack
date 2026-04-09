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

  // Guard against zero rewards to prevent absurd percentages
  if (totalGross === 0) {
    return {
      grossReward: 0,
      feeLeakage: 0,
      netTakeHome: 0,
      leakagePercent: 0,
      period,
    };
  }

  // Calculate percentage and cap at 100%
  const leakagePercent = Math.min(100, (totalFees / totalGross) * 100);

  return {
    grossReward: totalGross,
    feeLeakage: totalFees,
    netTakeHome: totalGross - totalFees,
    leakagePercent,
    period,
  };
}
