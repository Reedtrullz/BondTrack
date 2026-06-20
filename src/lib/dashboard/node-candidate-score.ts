export type CandidateQuality = 'Strong' | 'Watch' | 'Avoid';
export type CapacityTrust = 'available' | 'needs_whitelist' | 'full' | 'unknown';

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
  capacityTrust: CapacityTrust;
  score: number;
  quality: CandidateQuality;
  trustLabel: string;
  reasons: string[];
}

export interface DirectBondAccessInput {
  maxBondProviders?: number | null;
  providers?: { bond_address?: string | null }[] | null;
  userAddress?: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function finiteNonNegative(value: number): number | null {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function getCapacityTrust(input: NodeCandidateInput): CapacityTrust {
  if (input.capacityTrust) return input.capacityTrust;
  if (input.isFullCapacity === true) return 'full';
  if (input.isFullCapacity === false) return 'available';
  return 'unknown';
}

export function getDirectBondAccessTrust({
  maxBondProviders,
  providers,
  userAddress,
}: DirectBondAccessInput): CapacityTrust {
  if (!userAddress) return 'unknown';
  if (!Array.isArray(providers)) return 'unknown';

  const normalizedUserAddress = userAddress.toLowerCase();
  const isWhitelistedProvider = providers.some((provider) => (
    provider.bond_address?.toLowerCase() === normalizedUserAddress
  ));

  if (isWhitelistedProvider) return 'available';

  if (
    typeof maxBondProviders === 'number' &&
    Number.isFinite(maxBondProviders) &&
    maxBondProviders > 0 &&
    providers.length >= maxBondProviders
  ) {
    return 'full';
  }

  return 'needs_whitelist';
}

export function scoreNodeCandidate(input: NodeCandidateInput): NodeCandidateScore {
  const reasons: string[] = [];
  const adjustedAPY = finiteNonNegative(input.adjustedAPY);
  const totalBond = finiteNonNegative(input.totalBond);
  const operatorFeePercent = finiteNonNegative(input.operatorFeePercent);
  const slashPoints = finiteNonNegative(input.slashPoints);
  const apyComponent = clamp(adjustedAPY ?? 0, 0, 120) * 0.35;
  const bondComponent = totalBond !== null && totalBond > 0
    ? clamp(Math.log10(totalBond + 1) * 4, 0, 24)
    : 0;
  const feePenalty = operatorFeePercent === null ? 18 : clamp(operatorFeePercent * 100, 0, 35) * 0.6;
  const slashPenalty = slashPoints === null ? 18 : clamp(slashPoints, 0, 250) * 0.22;
  const capacityTrust = getCapacityTrust(input);
  const statusPenalty = input.status === 'Active' ? 0 : input.status === 'Standby' ? 16 : 36;
  const capacityPenalty = capacityTrust === 'available'
    ? 0
    : capacityTrust === 'unknown'
      ? 8
      : 24;
  const unknownBondPenalty = totalBond !== null && totalBond > 0 ? 0 : 18;

  if (input.status !== 'Active') {
    reasons.push(`${input.status} status`);
  }
  if (slashPoints === null) {
    reasons.push('slash data unavailable');
  } else if (slashPoints >= 50) {
    reasons.push(`${slashPoints.toLocaleString()} slash points`);
  } else if (slashPoints > 0) {
    reasons.push('minor slash history');
  }
  if (operatorFeePercent === null) {
    reasons.push('operator fee unavailable');
  } else if (operatorFeePercent >= 0.2) {
    reasons.push('high operator fee');
  }
  if (capacityTrust === 'needs_whitelist') {
    reasons.push('provider not listed by THORNode');
  } else if (capacityTrust === 'full') {
    reasons.push('provider slots full');
  } else if (capacityTrust === 'unknown') {
    reasons.push('direct-bond access unknown');
  }
  if (totalBond === null || totalBond <= 0) {
    reasons.push('bond data unavailable');
  }

  const score = clamp(
    48 + apyComponent + bondComponent - feePenalty - slashPenalty - statusPenalty - capacityPenalty - unknownBondPenalty,
    0,
    100
  );

  const quality: CandidateQuality = score >= 75 ? 'Strong' : score >= 55 ? 'Watch' : 'Avoid';
  const trustLabel = capacityTrust === 'available'
    ? 'Provider listed by THORNode'
    : capacityTrust === 'needs_whitelist'
      ? 'Provider not listed by THORNode'
    : capacityTrust === 'full'
      ? 'Provider slots full'
      : 'Direct-bond access unknown';

  return {
    capacityTrust,
    score: Math.round(score),
    quality,
    trustLabel,
    reasons: reasons.length > 0 ? reasons : ['No obvious candidate blockers in current inputs'],
  };
}
