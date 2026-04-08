import { BondPosition } from '@/lib/types/node';

export type HealthGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

interface HealthScoreResult {
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
    return { grade: 'A+', score: 100, reason: 'No positions bonded', isCritical: false };
  }

  let totalPoints = 100;
  let criticalIssues = [];

  // 1. Check for Jailed Nodes (Immediate Criticality)
  const jailedNodes = positions.filter(p => p.isJailed);
  if (jailedNodes.length > 0) {
    totalPoints -= 40;
    criticalIssues.push(`${jailedNodes.length} node(s) jailed`);
  }

  // 2. Slash Point Analysis
  // Scale: 0-50 (safe), 50-200 (warning), 200+ (critical)
  const highSlashNodes = positions.filter(p => p.slashPoints >= 200);
  const warningSlashNodes = positions.filter(p => p.slashPoints >= 50 && p.slashPoints < 200);
  
  totalPoints -= highSlashNodes.length * 15;
  totalPoints -= warningSlashNodes.length * 5;
  
  if (highSlashNodes.length > 0) criticalIssues.push('Critical slash points detected');

  // 3. Churn Risk (Based on yieldGuard flags)
  const atRiskNodes = positions.filter(p => p.yieldGuardFlags?.includes('lowest_bond'));
  totalPoints -= atRiskNodes.length * 5;

  // Clamp score 0-100
  const finalScore = Math.max(0, totalPoints);

  // Map score to grade
  let grade: HealthGrade = 'A+';
  if (finalScore < 40) grade = 'F';
  else if (finalScore < 60) grade = 'D';
  else if (finalScore < 75) grade = 'C';
  else if (finalScore < 90) grade = 'B';
  else if (finalScore < 100) grade = 'A';

  return {
    grade,
    score: finalScore,
    reason: criticalIssues.length > 0 ? criticalIssues.join(', ') : 'All positions healthy',
    isCritical: finalScore < 60 || jailedNodes.length > 0
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
