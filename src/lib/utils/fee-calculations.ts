import { BondPosition } from '@/lib/types/node';
import { runeToNumber } from './formatters';

export interface FeeAuditResult {
  grossReward: number;
  feeLeakage: number;
  netTakeHome: number;
  leakagePercent: number;
  period: 'daily' | 'monthly';
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
    };
  }

  const totalBond = safePositions.reduce((sum, p) => sum + getBondAmount(p), 0);
  const apy = networkApy ?? 0.20; 
  
  const monthlyRate = apy / 12;
  const grossReward = totalBond * monthlyRate;
  const avgOperatorFee = safePositions.reduce((sum, p) => sum + (p.operatorFee || 500), 0) / safePositions.length;
  const feeLeakage = grossReward * (avgOperatorFee / 100);
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
