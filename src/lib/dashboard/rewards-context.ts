import type { BondHistory } from '@/lib/hooks/use-bond-history';
import type { BondPosition } from '@/lib/types/node';
import { calculateWeightedApy } from '@/lib/utils/fee-calculations';
import { formatPercent, formatUsd } from '@/lib/utils/formatters';
import type { MetricStripItem } from './insights';

export interface RewardsPageModel {
  confidenceMetrics: MetricStripItem[];
  hasNodeApy: boolean;
  networkApy: number | undefined;
  primaryConfidenceIssue?: MetricStripItem;
  runePriceMetric: {
    detail: string;
    value: string;
  };
  weightedApy: number;
}

interface BuildRewardsPageModelInput {
  actionsError?: unknown;
  bondHistory?: BondHistory | null;
  isLoadingActions: boolean;
  networkBondingAPY?: string | number;
  positions: BondPosition[];
  runePrice: number;
  runePriceIsStale: boolean;
}

export function normalizeApyPercent(raw: string | number | undefined): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value > 1 ? value : value * 100;
}

function getRunePriceMetric(price: number, isStale: boolean) {
  if (price > 0) {
    return {
      value: formatUsd(price, 4, 2),
      detail: isStale ? 'Stale quote' : 'Fresh quote',
    };
  }

  return {
    value: '--',
    detail: isStale ? 'No quote loaded' : 'Waiting for quote',
  };
}

function formatConfidenceApy(value: number | undefined): string {
  if (!value) return 'Unavailable';
  if (value > 0 && value < 0.01) return '<0.01%';
  return formatPercent(value);
}

function getApyBasisMetric({
  hasNodeApy,
  networkApy,
  weightedApy,
  positionCount,
}: {
  hasNodeApy: boolean;
  networkApy: number | undefined;
  weightedApy: number;
  positionCount: number;
}): MetricStripItem {
  if (hasNodeApy) {
    return {
      id: 'apy-basis',
      label: 'APY basis',
      value: 'Node-level',
      detail: `${formatPercent(weightedApy)} weighted from ${positionCount} node${positionCount === 1 ? '' : 's'}`,
      severity: 'healthy',
    };
  }

  if (networkApy) {
    return {
      id: 'apy-basis',
      label: 'APY basis',
      value: 'Network fallback',
      detail: `${formatConfidenceApy(networkApy)} THORNode fallback`,
      severity: 'info',
    };
  }

  return {
    id: 'apy-basis',
    label: 'APY basis',
    value: 'Unavailable',
    detail: 'Forecasts withheld',
    severity: 'warning',
  };
}

function hasBondActionHistory(bondHistory?: BondHistory | null): boolean {
  return Boolean(
    bondHistory?.firstBondDate ||
    (bondHistory?.initialBond ?? 0) > 0 ||
    (bondHistory?.firstBondAmount ?? 0) > 0
  );
}

function hasPartialBondActionHistory(bondHistory?: BondHistory | null): boolean {
  return bondHistory?.isPartial === true;
}

function getPrimaryConfidenceIssue(metrics: MetricStripItem[]): MetricStripItem | undefined {
  return metrics.find((metric) => metric.severity === 'critical' || metric.severity === 'warning');
}

export function buildRewardsPageModel({
  actionsError,
  bondHistory,
  isLoadingActions,
  networkBondingAPY,
  positions,
  runePrice,
  runePriceIsStale,
}: BuildRewardsPageModelInput): RewardsPageModel {
  const networkApy = normalizeApyPercent(networkBondingAPY);
  const weightedApy = calculateWeightedApy(positions, networkApy ?? 0);
  const hasNodeApy = positions.some((position) => Number.isFinite(position.netAPY) && position.netAPY > 0);
  const hasHistory = hasBondActionHistory(bondHistory);
  const hasPartialHistory = hasPartialBondActionHistory(bondHistory);
  const rewardHistoryMetric: MetricStripItem = isLoadingActions
    ? {
        id: 'reward-history',
        label: 'Reward history',
        value: 'Pending',
        detail: 'Loading bond actions',
        severity: 'info',
      }
    : actionsError
      ? {
          id: 'reward-history',
          label: 'Reward history',
          value: 'Degraded',
          detail: 'Using current bond baseline',
          severity: 'warning',
        }
      : hasHistory && hasPartialHistory
        ? {
            id: 'reward-history',
            label: 'Reward history',
            value: 'Partial',
            detail: `Recent ${bondHistory?.loadedActionCount ?? bondHistory?.actionLimit ?? 50} actions only`,
            severity: 'warning',
          }
      : hasHistory
        ? {
            id: 'reward-history',
            label: 'Reward history',
            value: 'Trusted',
            detail: 'Bond actions loaded',
            severity: 'healthy',
          }
        : {
            id: 'reward-history',
            label: 'Reward history',
            value: 'Current-only',
            detail: 'No bond action history',
            severity: 'warning',
          };
  const taxExportMetric: MetricStripItem = isLoadingActions
    ? {
        id: 'tax-export',
        label: 'Tax worksheet',
        value: 'Pending',
        detail: 'Waiting for action history',
        severity: 'info',
      }
    : actionsError
      ? {
          id: 'tax-export',
          label: 'Tax worksheet',
          value: 'Degraded',
          detail: 'Worksheet may include history warnings',
          severity: 'warning',
        }
      : hasHistory
        ? {
            id: 'tax-export',
            label: 'Tax worksheet',
            value: 'Ready',
            detail: 'FIFO worksheet rows from bond history',
            severity: 'healthy',
          }
        : {
            id: 'tax-export',
            label: 'Tax worksheet',
            value: 'Limited',
            detail: 'Current bond only',
            severity: 'warning',
          };

  const confidenceMetrics: MetricStripItem[] = [
    rewardHistoryMetric,
    getApyBasisMetric({
      hasNodeApy,
      networkApy,
      weightedApy,
      positionCount: positions.length,
    }),
    {
      id: 'rune-price',
      label: 'RUNE price',
      value: runePrice > 0 ? (runePriceIsStale ? 'Stale' : 'Fresh') : 'Missing',
      detail: runePrice > 0
        ? (runePriceIsStale ? 'Price returns use last quote' : 'Current quote loaded')
        : 'USD returns unavailable',
      severity: runePrice > 0 && !runePriceIsStale ? 'healthy' : 'warning',
    },
    {
      id: 'forecast',
      label: 'Forecast',
      value: weightedApy > 0 ? 'Estimated' : 'Blocked',
      detail: weightedApy > 0
        ? hasNodeApy
          ? 'Simple projection from node APY'
          : 'Simple projection from network fallback'
        : 'Needs APY baseline',
      severity: weightedApy > 0 ? 'info' : 'warning',
    },
    taxExportMetric,
  ];

  return {
    confidenceMetrics,
    hasNodeApy,
    networkApy,
    primaryConfidenceIssue: getPrimaryConfidenceIssue(confidenceMetrics),
    runePriceMetric: getRunePriceMetric(runePrice, runePriceIsStale),
    weightedApy,
  };
}
