import { BondPosition } from '@/lib/types/node';
import { runeToNumber } from '@/lib/utils/formatters';

export interface FeeAuditResult {
  grossReward: number;
  feeLeakage: number;
  netTakeHome: number;
  period: 'daily' | 'monthly';
}

/**
 * Calculates the estimated fee leakage based on current bond positions.
 * This is a projection based on typical THORChain reward distributions.
 */
export function calculatePersonalFeeLeakage(positions: BondPosition[], period: 'daily' | 'monthly' = 'monthly'): FeeAuditResult {
  // Typical estimated daily reward rate for a healthy node (~0.0001% per day)
  // In a real scenario, this would be fetched from the user's actual earnings history
  const ESTIMATED_DAILY_RATE = 0.000001; 
  const daysInPeriod = period === 'daily' ? 1 : 30;

  let totalGross = 0;
  let totalFees = 0;

  positions.forEach(pos => {
    const bond = runeToNumber(pos.bondAmount);
    const dailyGross = bond * ESTIMATED_DAILY_RATE * daysInPeriod;
    
    // operatorFee is usually a decimal (e.g., 0.01 for 1%)
    const feeRate = pos.operatorFee || 0.01; // Default to 1% if not provided
    const feeAmount = dailyGross * feeRate;

    totalGross += dailyGross;
    totalFees += feeAmount;
  });

  return {
    grossReward: totalGross,
    feeLeakage: totalFees,
    netTakeHome: totalGross - totalFees,
    period,
  };
}
