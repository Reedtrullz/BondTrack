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
  runePriceUpdatedAt?: Date | null;
}

export function normalizeApyPercent(raw: string | number | undefined): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value > 1 ? value : value * 100;
}

function hasKnownQuoteFreshness(updatedAt: Date | null | undefined): boolean {
  return updatedAt instanceof Date && Number.isFinite(updatedAt.getTime());
}

function getRunePriceMetric(price: number, isStale: boolean, updatedAt?: Date | null) {
  if (price > 0) {
    if (!hasKnownQuoteFreshness(updatedAt)) {
      return {
        value: formatUsd(price, 4, 2),
        detail: 'Quote loaded without freshness',
      };
    }

    return {
      value: formatUsd(price, 4, 2),
      detail: isStale ? 'Stale quote' : 'Recent quote',
    };
  }

  return {
    value: '--',
    detail: isStale ? 'No quote loaded' : 'Waiting for quote',
  };
}

function getRunePriceConfidenceMetric(
  price: number,
  isStale: boolean,
  updatedAt?: Date | null
): MetricStripItem {
  if (price <= 0) {
    return {
      id: 'rune-price',
      label: 'RUNE price',
      value: 'Missing',
      detail: 'USD returns unavailable',
      severity: 'warning',
    };
  }

  if (!hasKnownQuoteFreshness(updatedAt)) {
    return {
      id: 'rune-price',
      label: 'RUNE price',
      value: 'Unverified',
      detail: 'Quote loaded without freshness',
      severity: 'warning',
    };
  }

  return {
    id: 'rune-price',
    label: 'RUNE price',
    value: isStale ? 'Stale' : 'Recent',
    detail: isStale ? 'Price returns use last quote' : 'Recent quote loaded',
    severity: isStale ? 'warning' : 'info',
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
      detail: `${formatPercent(weightedApy)} node-weighted estimate from ${positionCount} node${positionCount === 1 ? '' : 's'}`,
      severity: 'info',
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

function hasLocalActionCapReached(bondHistory?: BondHistory | null): boolean {
  return bondHistory?.isLocalActionCapReached === true;
}

function getActionCapDetail(bondHistory?: BondHistory | null): string {
  return `Local ${bondHistory?.actionLimit ?? bondHistory?.loadedActionCount ?? 1000}-action cap reached; set a manual baseline before relying on returns`;
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
  runePriceUpdatedAt,
}: BuildRewardsPageModelInput): RewardsPageModel {
  const networkApy = normalizeApyPercent(networkBondingAPY);
  const weightedApy = calculateWeightedApy(positions, networkApy ?? 0);
  const hasNodeApy = positions.some((position) => Number.isFinite(position.netAPY) && position.netAPY > 0);
  const hasHistory = hasBondActionHistory(bondHistory);
  const hasPartialHistory = hasPartialBondActionHistory(bondHistory);
  const isHistoryCapped = hasLocalActionCapReached(bondHistory);
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
      : isHistoryCapped
        ? {
            id: 'reward-history',
            label: 'Reward history',
            value: 'Capped',
            detail: getActionCapDetail(bondHistory),
            severity: 'warning',
          }
      : hasHistory && hasPartialHistory
        ? {
            id: 'reward-history',
            label: 'Reward history',
            value: 'Partial',
            detail: `Loaded ${bondHistory?.loadedActionCount ?? bondHistory?.actionLimit ?? 50}${typeof bondHistory?.totalActionCount === 'number' ? ` of ${bondHistory.totalActionCount}` : ''}; auto returns need full history or manual baseline`,
            severity: 'warning',
          }
      : hasHistory
        ? {
            id: 'reward-history',
            label: 'Reward history',
            value: 'Source-loaded',
            detail: 'Bond action rows loaded; returns are app-calculated review metrics',
            severity: 'info',
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
      : isHistoryCapped
        ? {
            id: 'tax-export',
            label: 'Tax worksheet',
            value: 'Review',
            detail: 'Local action cap reached; worksheet may omit older bond history',
            severity: 'warning',
          }
      : hasHistory && hasPartialHistory
        ? {
            id: 'tax-export',
            label: 'Tax worksheet',
            value: 'Review',
            detail: 'Visible history is partial; export may include history warnings',
            severity: 'warning',
          }
      : hasHistory
        ? {
            id: 'tax-export',
            label: 'Tax worksheet',
            value: 'Review',
            detail: 'Bond history rows available; not filing-ready',
            severity: 'info',
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
    getRunePriceConfidenceMetric(runePrice, runePriceIsStale, runePriceUpdatedAt),
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
    runePriceMetric: getRunePriceMetric(runePrice, runePriceIsStale, runePriceUpdatedAt),
    weightedApy,
  };
}
