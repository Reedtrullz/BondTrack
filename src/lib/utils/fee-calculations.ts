import { BondPosition } from '@/lib/types/node';
import { runeToNumber } from '@/lib/utils/formatters';

export interface FeeAuditResult {
  grossReward: number;
  feeLeakage: number;
  netTakeHome: number;
  leakagePercent: number;
  period: 'daily' | 'monthly';
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

  const totalBond = safePositions.reduce((sum, p) => sum + p.bondAmount, 0);
  console.log('[FEE DEBUG] totalBond:', totalBond, 'positions:', safePositions.map(p => ({ bond: p.bondAmount, opFee: p.operatorFee })));
  const apy = networkApy ?? 0.20; 
  
  const monthlyRate = apy / 12;
  const grossReward = totalBond * monthlyRate;
  const avgOperatorFee = safePositions.reduce((sum, p) => sum + (p.operatorFee || 500), 0) / safePositions.length;
  const feeLeakage = grossReward * (avgOperatorFee / 10000);
  const netTakeHome = grossReward - feeLeakage;

  return {
    grossReward,
    feeLeakage,
    netTakeHome,
    leakagePercent: (feeLeakage / grossReward) * 100,
    period,
  };
}

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
