import { BondPosition } from '@/lib/types/node';
import { runeToNumber } from './formatters';

export interface FeeAuditResult {
  grossReward: number;
  feeLeakage: number;
  netTakeHome: number;
  leakagePercent: number;
  period: 'daily' | 'monthly';
  isEstimated: boolean;
}

function getBondAmount(pos: BondPosition): number {
  if (typeof pos.bondAmount === 'string') {
    return runeToNumber(pos.bondAmount);
  }
  return pos.bondAmount;
}

export function calculatePersonalFeeLeakage(
  positions: BondPosition[], 
  period: 'daily' | 'monthly' = 'monthly',
  networkApy?: number
): FeeAuditResult {
  const safePositions = positions ?? [];

  if (safePositions.length === 0) {
    return {
      grossReward: 0,
      feeLeakage: 0,
      netTakeHome: 0,
      leakagePercent: 0,
      period,
      isEstimated: false,
    };
  }

  const totalBond = safePositions.reduce((sum, p) => sum + getBondAmount(p), 0);
  
  // APY Estimation
  const isApyEstimated = networkApy === undefined;
  const apy = networkApy ?? 0.20; 
  
  // Fee Estimation
  let operatorFeeMissing = false;
  const totalOperatorFeeBps = safePositions.reduce((sum, p) => {
    if (p.operatorFee === undefined || p.operatorFee === null) {
      operatorFeeMissing = true;
      return sum + 500; // Fallback to 5%
    }
    return sum + p.operatorFee;
  }, 0);
  
  const avgOperatorFee = totalOperatorFeeBps / safePositions.length;
  const isFeeEstimated = operatorFeeMissing;
  const isEstimated = isApyEstimated || isFeeEstimated;

  const monthlyRate = apy / 12;
  const grossReward = totalBond * monthlyRate;
  const feeLeakage = grossReward * (avgOperatorFee / 10000);
  const netTakeHome = grossReward - feeLeakage;
  
  let leakagePercent = 0;
  if (grossReward > 0) {
    leakagePercent = (feeLeakage / grossReward) * 100;
    if (leakagePercent > 100) leakagePercent = 100;
  }

  return {
    grossReward,
    feeLeakage,
    netTakeHome,
    leakagePercent,
    period,
    isEstimated,
  };
}

export function calculateWeightedApy(positions: BondPosition[], networkBaselineApy: number = 0): number {
  let totalBond = 0;
  let weightedSum = 0;

  positions.forEach(pos => {
    const bond = getBondAmount(pos);
    const apy = pos.netAPY || networkBaselineApy;
    totalBond += bond;
    weightedSum += bond * apy;
  });

  if (totalBond === 0) return 0;
  return weightedSum / totalBond;
}
