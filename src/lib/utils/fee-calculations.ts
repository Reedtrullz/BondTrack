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

export function normalizeApy(raw: number | string | undefined): number {
  if (raw === undefined || raw === null) return 0;
  const num = typeof raw === 'string' ? Number(raw) : raw;
  if (!Number.isFinite(num)) return 0;
  if (num > 1) return num / 100;
  return num;
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
  
  const isApyEstimated = networkApy === undefined;
  const apy = normalizeApy(networkApy ?? 0.20);
  
  // Fee Estimation
  let operatorFeeMissing = false;
  let weightedFeeSum = 0;
  
  safePositions.forEach(p => {
    const bond = getBondAmount(p);
    let fee = p.operatorFee;
    if (fee === undefined || fee === null) {
      operatorFeeMissing = true;
      fee = 500; // Fallback to 5%
    }
    weightedFeeSum += bond * fee;
  });
  
  const avgOperatorFee = totalBond > 0 ? weightedFeeSum / totalBond : 0;
  const isFeeEstimated = operatorFeeMissing;
  const isEstimated = isApyEstimated || isFeeEstimated;

  const rate = period === 'daily' ? apy / 365 : (apy / 365) * 30;
  const grossReward = totalBond * rate;
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
  const baselineApyPercent = normalizeApy(networkBaselineApy) * 100;

  positions.forEach(pos => {
    const bond = getBondAmount(pos);
    const apy = Number.isFinite(pos.netAPY) && pos.netAPY > 0
      ? pos.netAPY
      : baselineApyPercent;
    totalBond += bond;
    weightedSum += bond * apy;
  });

  if (totalBond === 0) return 0;
  return weightedSum / totalBond;
}
