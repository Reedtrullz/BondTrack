import { NETWORK } from '../config';
import { BondPosition } from '@/lib/types/node';

export type HealthGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface HealthScoreResult {
  grade: HealthGrade;
  score: number; // 0-100
  reason: string;
  isCritical: boolean;
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
    return { grade: 'A+', score: NETWORK.HEALTH_SCORE_RULES.startingPoints, reason: 'No positions bonded', isCritical: false };
  }

  let totalPoints = NETWORK.HEALTH_SCORE_RULES.startingPoints;
  const criticalIssues = [];

  // 1. Check for Jailed Nodes (Immediate Criticality)
  const jailedNodes = positions.filter(p => p.isJailed);
  if (jailedNodes.length > 0) {
    totalPoints -= NETWORK.HEALTH_SCORE_RULES.jailedPenalty;
    criticalIssues.push(`${jailedNodes.length} node(s) jailed`);
  }

  const highSlashNodes = positions.filter(p => p.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical);
  const warningSlashNodes = positions.filter(p => p.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning && p.slashPoints < NETWORK.SLASH_POINT_THRESHOLDS.critical);
  
  highSlashNodes.forEach(p => {
    const magnitudePenalty = Math.floor(p.slashPoints / NETWORK.HEALTH_SCORE_RULES.criticalSlashMagnitudeDivisor);
    totalPoints -= NETWORK.HEALTH_SCORE_RULES.criticalSlashPenalty + magnitudePenalty;
  });
  totalPoints -= warningSlashNodes.length * NETWORK.HEALTH_SCORE_RULES.warningSlashPenalty;
  
  if (highSlashNodes.length > 0) criticalIssues.push('Critical slash points detected');

  // 3. Churn Risk (Based on yieldGuard flags)
  const atRiskNodes = positions.filter(p => p.yieldGuardFlags?.includes('lowest_bond'));
  totalPoints -= atRiskNodes.length * NETWORK.HEALTH_SCORE_RULES.atRiskPenalty;

  // Clamp score 0-100
  const finalScore = Math.max(0, totalPoints);

  // Map score to grade
  let grade: HealthGrade = 'A+';
  if (finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.f) grade = 'F';
  else if (finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.d) grade = 'D';
  else if (finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.c) grade = 'C';
  else if (finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.b) grade = 'B';
  else if (finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.a) grade = 'A';

  return {
    grade,
    score: finalScore,
    reason: criticalIssues.length > 0 ? criticalIssues.join(', ') : 'All positions healthy',
    isCritical: finalScore < NETWORK.HEALTH_SCORE_RULES.gradeThresholds.d || jailedNodes.length > 0 || highSlashNodes.length > 0
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
