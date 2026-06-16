import { formatPercent, formatRuneDisplayNumber } from '@/lib/utils/formatters';

export function isUsableDashboardMetric(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function formatDashboardNumber(value: number): string {
  return isUsableDashboardMetric(value) ? value.toLocaleString() : '--';
}

export function formatDashboardPercent(value: number): string {
  return isUsableDashboardMetric(value) ? formatPercent(value) : '--';
}

export function formatDashboardRune(value: number): string {
  return isUsableDashboardMetric(value) && value > 0 ? `ᚱ${formatRuneDisplayNumber(value)}` : '--';
}
