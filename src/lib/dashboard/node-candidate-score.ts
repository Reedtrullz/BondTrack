export type CandidateQuality = 'Strong' | 'Watch' | 'Avoid';
export type CapacityTrust = 'available' | 'full' | 'unknown';

export interface NodeCandidateInput {
  adjustedAPY: number;
  totalBond: number;
  operatorFeePercent: number;
  slashPoints: number;
  status: string;
  isFullCapacity?: boolean;
  capacityTrust?: CapacityTrust;
}

export interface NodeCandidateScore {
  score: number;
  quality: CandidateQuality;
  trustLabel: string;
  reasons: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getCapacityTrust(input: NodeCandidateInput): CapacityTrust {
  if (input.capacityTrust) return input.capacityTrust;
  if (input.isFullCapacity === true) return 'full';
  if (input.isFullCapacity === false) return 'available';
  return 'unknown';
}

export function scoreNodeCandidate(input: NodeCandidateInput): NodeCandidateScore {
  const reasons: string[] = [];
  const apyComponent = clamp(input.adjustedAPY, 0, 120) * 0.35;
  const bondComponent = input.totalBond > 0
    ? clamp(Math.log10(input.totalBond + 1) * 4, 0, 24)
    : 0;
  const feePenalty = clamp(input.operatorFeePercent * 100, 0, 35) * 0.6;
  const slashPenalty = clamp(input.slashPoints, 0, 250) * 0.22;
  const capacityTrust = getCapacityTrust(input);
  const statusPenalty = input.status === 'Active' ? 0 : input.status === 'Standby' ? 16 : 36;
  const capacityPenalty = capacityTrust === 'full' ? 24 : capacityTrust === 'unknown' ? 8 : 0;
  const unknownBondPenalty = input.totalBond > 0 ? 0 : 18;

  if (input.status !== 'Active') {
    reasons.push(`${input.status} status`);
  }
  if (input.slashPoints >= 50) {
    reasons.push(`${input.slashPoints.toLocaleString()} slash points`);
  } else if (input.slashPoints > 0) {
    reasons.push('minor slash history');
  }
  if (input.operatorFeePercent >= 0.2) {
    reasons.push('high operator fee');
  }
  if (capacityTrust === 'full') {
    reasons.push('capacity appears full');
  } else if (capacityTrust === 'unknown') {
    reasons.push('capacity unknown');
  }
  if (input.totalBond <= 0) {
    reasons.push('bond data unavailable');
  }

  const score = clamp(
    48 + apyComponent + bondComponent - feePenalty - slashPenalty - statusPenalty - capacityPenalty - unknownBondPenalty,
    0,
    100
  );

  const quality: CandidateQuality = score >= 75 ? 'Strong' : score >= 55 ? 'Watch' : 'Avoid';
  const trustLabel = capacityTrust === 'available'
    ? 'Capacity known'
    : capacityTrust === 'full'
      ? 'Capacity full'
      : 'Capacity unknown';

  return {
    score: Math.round(score),
    quality,
    trustLabel,
    reasons: reasons.length > 0 ? reasons : ['healthy candidate signals'],
  };
}
