import { NETWORK } from '@/lib/config';

export type SlashSeverityLevel = 'none' | 'monitor' | 'warning' | 'critical';

export interface SlashSeverity {
  level: SlashSeverityLevel;
  label: string;
  className: string;
}

export function getSlashSeverity(slashPoints: number): SlashSeverity {
  if (!Number.isFinite(slashPoints) || slashPoints < 0) {
    return {
      level: 'none',
      label: 'Unavailable',
      className: 'text-zinc-600 dark:text-zinc-400',
    };
  }

  if (slashPoints === 0) {
    return {
      level: 'none',
      label: 'No current slash',
      className: 'text-zinc-600 dark:text-zinc-400',
    };
  }

  if (slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical) {
    return {
      level: 'critical',
      label: 'Critical',
      className: 'text-red-600 dark:text-red-400',
    };
  }

  if (slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning) {
    return {
      level: 'warning',
      label: 'Warning',
      className: 'text-orange-600 dark:text-orange-400',
    };
  }

  return {
    level: 'monitor',
    label: 'Monitor',
    className: 'text-sky-600 dark:text-sky-400',
  };
}

export function hasSlashReviewSignal(slashPoints: number): boolean {
  return getSlashSeverity(slashPoints).level !== 'none';
}
