import { NO_VISIBLE_EXPOSURE_ISSUE_REASON, type HealthScoreResult } from '@/lib/utils/health-score';

export interface ProviderExposureReviewState {
  label: string;
  className: string;
}

export function getProviderExposureReviewState(health: HealthScoreResult): ProviderExposureReviewState {
  if (health.reason === 'No positions bonded') {
    return {
      label: 'No bonded exposure',
      className: 'text-zinc-700 dark:text-zinc-200',
    };
  }

  if (health.isCritical || health.grade === 'D' || health.grade === 'F') {
    return {
      label: 'Critical review',
      className: 'text-red-600 dark:text-red-400',
    };
  }

  if (
    health.grade === 'B' ||
    health.grade === 'C' ||
    health.reason !== NO_VISIBLE_EXPOSURE_ISSUE_REASON
  ) {
    return {
      label: 'Needs review',
      className: 'text-amber-600 dark:text-amber-300',
    };
  }

  return {
    label: 'No urgent review',
    className: 'text-sky-600 dark:text-sky-400',
  };
}
