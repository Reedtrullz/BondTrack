import { Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CapacityTrust } from '@/lib/dashboard/node-candidate-score';

export interface CandidateScoreEvidenceInput {
  adjustedAPY: number;
  candidateScore: {
    capacityTrust: CapacityTrust;
  };
  operatorFeePercent: number;
  slash_points: number;
  totalBond: number;
}

interface CandidateScoreEvidenceProps {
  candidate: CandidateScoreEvidenceInput;
  className?: string;
  testId?: string;
}

function isUsableCandidateNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isUsableBondAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function getCapacityEvidenceLabel(capacityTrust: CapacityTrust): string {
  switch (capacityTrust) {
    case 'available':
      return 'Watched address is listed as a bond provider.';
    case 'needs_whitelist':
      return 'Watched address is not listed; operator whitelist is required.';
    case 'full':
      return 'Provider slots appear full from THORNode constants.';
    case 'unknown':
      return 'Provider list or address context is incomplete.';
  }
}

export function getCandidateScoreEvidence(candidate: CandidateScoreEvidenceInput) {
  const unavailableInputs = [
    isUsableCandidateNumber(candidate.adjustedAPY) ? null : 'APY',
    isUsableBondAmount(candidate.totalBond) ? null : 'bond',
    isUsableCandidateNumber(candidate.operatorFeePercent) ? null : 'fee',
    isUsableCandidateNumber(candidate.slash_points) ? null : 'slash',
    candidate.candidateScore.capacityTrust !== 'unknown' ? null : 'capacity',
  ].filter((input): input is string => Boolean(input));

  return {
    usableCount: 5 - unavailableInputs.length,
    unavailableInputs,
  };
}

export function getCandidateScoreEvidenceSummary(candidate: CandidateScoreEvidenceInput): string {
  const evidence = getCandidateScoreEvidence(candidate);

  return evidence.unavailableInputs.length === 0
    ? 'All score inputs present'
    : `Missing ${evidence.unavailableInputs.join(', ')}`;
}

export function CandidateScoreEvidence({
  candidate,
  className,
  testId = 'candidate-score-evidence',
}: CandidateScoreEvidenceProps) {
  const scoreEvidence = getCandidateScoreEvidence(candidate);
  const evidenceSummary = getCandidateScoreEvidenceSummary(candidate);
  const capacityEvidence = getCapacityEvidenceLabel(candidate.candidateScore.capacityTrust);

  return (
    <div
      className={cn('text-sm', className)}
      data-testid={testId}
      aria-label={`Score evidence from THORNode: ${scoreEvidence.usableCount} of 5 score inputs usable. ${evidenceSummary}. ${capacityEvidence}`}
    >
      <div className="flex items-start gap-2">
        <Database className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
            Score evidence · THORNode
          </p>
          <p className="mt-1 text-zinc-700 dark:text-zinc-300">
            {scoreEvidence.usableCount}/5 inputs usable: APY award, total bond, operator fee, slash points, provider capacity.
          </p>
          <p className={cn(
            'mt-1 text-xs font-medium',
            scoreEvidence.unavailableInputs.length > 0
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-emerald-700 dark:text-emerald-300'
          )}>
            {evidenceSummary}. Capacity: {capacityEvidence}
          </p>
        </div>
      </div>
    </div>
  );
}
