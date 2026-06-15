import { NETWORK } from '../config';
import { BondPosition } from '@/lib/types/node';

export type HealthGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface HealthScoreBreakdown {
  startingPoints: number;
  slashPenalty: number;
  atRiskPenalty: number;
  jailedPenalty: number;
  statusPenalty: number;
  finalScore: number;
}

export interface HealthScoreResult {
  grade: HealthGrade;
  score: number; // 0-100
  reason: string;
  isCritical: boolean;
  breakdown: HealthScoreBreakdown;
}

/**
 * Calculates a portfolio-wide health grade based on risk vectors.
 * Weighting:
 * - Slash Points: Heavy (most immediate risk of jail)
 * - Churn Percentile: Medium (risk of losing earnings)
 * - Status: Critical (Jailed nodes are automatic grade drops)
 */
export function calculatePortfolioHealth(positions: BondPosition[]): HealthScoreResult {
  if (positions.length === 0) {
    const breakdown: HealthScoreBreakdown = {
      startingPoints: NETWORK.HEALTH_SCORE_RULES.startingPoints,
      slashPenalty: 0,
      atRiskPenalty: 0,
      jailedPenalty: 0,
      statusPenalty: 0,
      finalScore: NETWORK.HEALTH_SCORE_RULES.startingPoints,
    };
    return { grade: 'A+', score: NETWORK.HEALTH_SCORE_RULES.startingPoints, reason: 'No positions bonded', isCritical: false, breakdown };
  }

  let totalPoints = NETWORK.HEALTH_SCORE_RULES.startingPoints;
  const criticalIssues = [];
  let slashPenalty = 0;
  let atRiskPenalty = 0;
  let jailedPenalty = 0;
  let statusPenalty = 0;

  // 1. Check for Jailed Nodes (Immediate Criticality)
  const jailedNodes = positions.filter(p => p.isJailed);
  if (jailedNodes.length > 0) {
    jailedPenalty = NETWORK.HEALTH_SCORE_RULES.jailedPenalty;
    totalPoints -= jailedPenalty;
    criticalIssues.push(`${jailedNodes.length} node(s) jailed`);
  }

  const highSlashNodes = positions.filter(p => p.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical);
  const warningSlashNodes = positions.filter(p => p.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning && p.slashPoints < NETWORK.SLASH_POINT_THRESHOLDS.critical);
  
  highSlashNodes.forEach(p => {
    const magnitudePenalty = Math.floor(p.slashPoints / NETWORK.HEALTH_SCORE_RULES.criticalSlashMagnitudeDivisor);
    const penalty = NETWORK.HEALTH_SCORE_RULES.criticalSlashPenalty + magnitudePenalty;
    slashPenalty += penalty;
    totalPoints -= penalty;
  });
  slashPenalty += warningSlashNodes.length * NETWORK.HEALTH_SCORE_RULES.warningSlashPenalty;
  totalPoints -= warningSlashNodes.length * NETWORK.HEALTH_SCORE_RULES.warningSlashPenalty;
  
  if (highSlashNodes.length > 0) criticalIssues.push('Critical slash points detected');

  // 3. Churn Risk (Based on yieldGuard flags)
  const atRiskNodes = positions.filter(p => p.yieldGuardFlags?.includes('lowest_bond'));
  atRiskPenalty = atRiskNodes.length * NETWORK.HEALTH_SCORE_RULES.atRiskPenalty;
  totalPoints -= atRiskPenalty;

  const nonActiveNodes = positions.filter(p => !p.isJailed && p.status !== 'Active');
  statusPenalty = nonActiveNodes.length * NETWORK.HEALTH_SCORE_RULES.nonActivePenalty;
  totalPoints -= statusPenalty;
  if (nonActiveNodes.length > 0) {
    criticalIssues.push(`${nonActiveNodes.length} node(s) not active`);
  }

  // Clamp score 0-100
  const finalScore = Math.max(0, totalPoints);

  // Map score to grade
  let grade: HealthGrade = 'A+';
  if (finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.f) grade = 'F';
  else if (finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.d) grade = 'D';
  else if (finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.c) grade = 'C';
  else if (finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.b) grade = 'B';
  else if (finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.a) grade = 'A';

  const breakdown: HealthScoreBreakdown = {
    startingPoints: NETWORK.HEALTH_SCORE_RULES.startingPoints,
    slashPenalty,
    atRiskPenalty,
    jailedPenalty,
    statusPenalty,
    finalScore,
  };

  return {
    grade,
    score: finalScore,
    reason: criticalIssues.length > 0 ? criticalIssues.join(', ') : 'All positions healthy',
    isCritical: finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.d || jailedNodes.length > 0 || highSlashNodes.length > 0,
    breakdown,
  };
}

export function getGradeColor(grade: HealthGrade): string {
  const colors: Record<HealthGrade, string> = {
    'A+': 'text-emerald-600 dark:text-emerald-400',
    'A': 'text-emerald-500 dark:text-emerald-300',
    'B': 'text-blue-500 dark:text-blue-400',
    'C': 'text-yellow-600 dark:text-yellow-400',
    'D': 'text-orange-600 dark:text-orange-400',
    'F': 'text-red-600 dark:text-red-400',
  };
  return colors[grade];
}
