import type { MetricStripItem } from './insights';
import type { InsightSeverity } from './insights';
import type { LpPosition } from '@/lib/types/lp';
import type { MidgardFreshness } from '@/lib/utils/midgard-time';
import { formatUsd, formatUtcDateTime } from '@/lib/utils/formatters';

export interface LpPageModel {
  aggregateIlDetail: string;
  aggregatePnlDetail: string;
  confidenceMetrics: MetricStripItem[];
  currentOnlyCount: number;
  estimatedCount: number;
  hasHistoricalPerformance: boolean;
  hasNonHistoricalPerformance: boolean;
  performancePendingLabel: string;
  primaryConfidenceIssue?: MetricStripItem;
  totalIlUsd: number;
  totalLpValueUsd: number;
  totalPnlUsd: number;
  totalValueDetail: string;
  historicalEntryCount: number;
  untrustedRedeemCount: number;
}

interface BuildLpPageModelInput {
  isHistoricalEnrichmentLoading?: boolean;
  isLoading: boolean;
  positions?: LpPosition[] | null;
  runePriceFreshness?: MidgardFreshness;
}

const LP_CONFIDENCE_SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  healthy: 3,
};

function formatSignedUsd(value: number, maximumFractionDigits = 0): string {
  return `${value >= 0 ? '+' : ''}${formatUsd(value, maximumFractionDigits)}`;
}

function formatPositionCount(count: number, label: string): string | null {
  if (count <= 0) return null;
  return `${count} ${label} position${count === 1 ? '' : 's'}`;
}

function joinLabels(labels: Array<string | null>): string {
  const visibleLabels = labels.filter((label): label is string => Boolean(label));
  if (visibleLabels.length <= 1) return visibleLabels[0] ?? '';
  return `${visibleLabels.slice(0, -1).join(', ')} and ${visibleLabels[visibleLabels.length - 1]}`;
}

function hasKnownQuoteFreshness(
  freshness: MidgardFreshness | undefined
): freshness is MidgardFreshness & { updatedAt: Date } {
  return freshness?.updatedAt instanceof Date && Number.isFinite(freshness.updatedAt.getTime());
}

function getRunePriceConfidence({
  hasLpPositions,
  isLoading,
  runePriceFreshness,
}: {
  hasLpPositions: boolean;
  isLoading: boolean;
  runePriceFreshness?: MidgardFreshness;
}): Pick<MetricStripItem, 'detail' | 'severity' | 'value'> {
  if (isLoading) {
    return {
      value: 'Pending',
      detail: 'Waiting for Midgard quote',
      severity: 'info',
    };
  }

  if (!hasLpPositions) {
    return {
      value: 'Not used',
      detail: 'No LP values',
      severity: 'info',
    };
  }

  if (!runePriceFreshness) {
    return {
      value: 'Unknown',
      detail: 'No Midgard quote loaded',
      severity: 'warning',
    };
  }

  if (!hasKnownQuoteFreshness(runePriceFreshness)) {
    return {
      value: 'Unverified',
      detail: 'Quote loaded without freshness',
      severity: 'warning',
    };
  }

  const updatedAt = runePriceFreshness.updatedAt;
  return {
    value: runePriceFreshness.isStale ? 'Stale' : 'Recent',
    detail: `Updated ${formatUtcDateTime(updatedAt)}`,
    severity: runePriceFreshness.isStale ? 'warning' : 'info',
  };
}

function getRedeemQuoteConfidence({
  derivedCount,
  hasLpPositions,
  isLoading,
  unavailableCount,
}: {
  derivedCount: number;
  hasLpPositions: boolean;
  isLoading: boolean;
  unavailableCount: number;
}): Pick<MetricStripItem, 'detail' | 'severity' | 'value'> {
  const untrustedCount = derivedCount + unavailableCount;

  if (isLoading) {
    return {
      value: 'Pending',
      detail: 'Waiting for THORNode quotes',
      severity: 'info',
    };
  }

  if (!hasLpPositions) {
    return {
      value: 'Not used',
      detail: 'No LP positions',
      severity: 'info',
    };
  }

  if (untrustedCount > 0) {
    const derivedLabel = formatPositionCount(derivedCount, 'derived');
    const unavailableLabel = formatPositionCount(unavailableCount, 'missing');
    const detail = joinLabels([derivedLabel, unavailableLabel]);

    return {
      value: 'Degraded',
      detail: `${detail} redeem quote${untrustedCount === 1 ? '' : 's'}`,
      severity: 'warning',
    };
  }

  return {
    value: 'Confirmed',
    detail: 'THORNode redeem quotes',
    severity: 'info',
  };
}

function getHistoricalEntryConfidence({
  historicalEntryCount,
  hasLpPositions,
  isLoading,
}: {
  historicalEntryCount: number;
  hasLpPositions: boolean;
  isLoading: boolean;
}): Pick<MetricStripItem, 'detail' | 'severity' | 'value'> {
  if (isLoading) {
    return {
      value: 'Pending',
      detail: 'Waiting for historical pricing',
      severity: 'info',
    };
  }

  if (!hasLpPositions) {
    return {
      value: 'Not used',
      detail: 'No LP positions',
      severity: 'info',
    };
  }

  if (historicalEntryCount <= 0) {
    return {
      value: 'Incomplete',
      detail: 'No historical entry pricing',
      severity: 'info',
    };
  }

  return {
    value: String(historicalEntryCount),
    detail: 'Historical entry pricing loaded',
    severity: 'info',
  };
}

function getPrimaryLpConfidenceIssue(metrics: MetricStripItem[]): MetricStripItem | undefined {
  const urgentIssue = metrics.find((metric) => metric.severity === 'critical' || metric.severity === 'warning');
  if (urgentIssue) return urgentIssue;

  return metrics.find((metric) => (
    metric.id === 'estimated-lp-values' &&
    metric.severity === 'info' &&
    Number(metric.value) > 0
  ))
    ?? metrics.find((metric) => (
      metric.id === 'historical-lp-values' &&
      metric.severity === 'info' &&
      metric.value === 'Incomplete'
    ));
}

function rankLpConfidenceMetrics(metrics: MetricStripItem[]): MetricStripItem[] {
  return [...metrics].sort((a, b) => {
    const aSeverity = a.severity ?? 'healthy';
    const bSeverity = b.severity ?? 'healthy';
    return LP_CONFIDENCE_SEVERITY_ORDER[aSeverity] - LP_CONFIDENCE_SEVERITY_ORDER[bSeverity];
  });
}

export function buildLpPageModel({
  isHistoricalEnrichmentLoading = false,
  isLoading,
  positions,
  runePriceFreshness,
}: BuildLpPageModelInput): LpPageModel {
  const safePositions = positions ?? [];
  const historicalPositions = safePositions.filter((position) => position.pricingSource === 'historical');
  const estimatedPositions = safePositions.filter((position) => position.pricingSource === 'estimated');
  const currentOnlyPositions = safePositions.filter((position) => position.pricingSource === 'current-only');
  const derivedRedeemPositions = safePositions.filter((position) => position.redeemQuoteSource === 'derived');
  const unavailableRedeemPositions = safePositions.filter((position) => position.redeemQuoteSource === 'unavailable');
  const untrustedRedeemCount = derivedRedeemPositions.length + unavailableRedeemPositions.length;
  const totalStats = historicalPositions.reduce(
    (acc, position) => {
      acc.totalPnl += position.netProfitLossUsd ?? 0;
      acc.totalIl += position.impermanentLossUsd ?? 0;
      return acc;
    },
    { totalPnl: 0, totalIl: 0 }
  );
  const totalLpValueUsd = safePositions.reduce((sum, position) => sum + (position.currentTotalValueUsd ?? 0), 0);
  const hasNonHistoricalPerformance = isHistoricalEnrichmentLoading || safePositions.some(
    (position) =>
      position.pricingSource === 'current-only' ||
      position.pricingSource === 'estimated' ||
      position.netProfitLossUsd === null ||
      position.impermanentLossUsd === null
  );
  const hasHistoricalPerformance = historicalPositions.length > 0;
  const performancePendingLabel = isHistoricalEnrichmentLoading
    ? 'Enriching...'
    : hasHistoricalPerformance
      ? 'Historical only'
      : 'Incomplete';
  const untrustedPositionLabel = joinLabels([
    formatPositionCount(estimatedPositions.length, 'estimated'),
    formatPositionCount(currentOnlyPositions.length, 'current-only'),
  ]);
  const untrustedPositionCount = estimatedPositions.length + currentOnlyPositions.length;
  const confidenceReviewVerb = untrustedPositionCount === 1 ? 'needs' : 'need';
  const aggregatePerformanceExclusion = untrustedPositionLabel ? `${untrustedPositionLabel} excluded` : null;
  const hasLpPositions = safePositions.length > 0;
  const redeemConfidenceLabel = untrustedRedeemCount > 0
    ? `${untrustedRedeemCount} LP redeem quote${untrustedRedeemCount === 1 ? ' is' : 's are'} not THORNode-confirmed`
    : null;
  const totalValueDetail = redeemConfidenceLabel
    ? `Current value includes all pools; ${redeemConfidenceLabel}`
    : untrustedPositionLabel
    ? `Current value includes all pools; ${untrustedPositionLabel} ${confidenceReviewVerb} source check review`
    : runePriceFreshness && !hasKnownQuoteFreshness(runePriceFreshness)
      ? 'Current value uses an unverified RUNE price'
      : runePriceFreshness?.isStale
      ? 'Current value uses a stale RUNE price'
      : !runePriceFreshness && hasLpPositions
        ? 'Current value is waiting for RUNE price check'
        : 'Current withdrawable value across all pools';
  const aggregatePerformanceFallbackDetail = isHistoricalEnrichmentLoading
    ? 'Historical entry pricing is still loading'
    : 'Historical entry pricing required for aggregate performance review';
  const aggregatePnlDetail = hasHistoricalPerformance
    ? aggregatePerformanceExclusion
      ? `${formatSignedUsd(totalStats.totalPnl, 2)} from historical positions; ${aggregatePerformanceExclusion}`
      : `${formatSignedUsd(totalStats.totalPnl, 2)} from historical positions`
    : aggregatePerformanceFallbackDetail;
  const aggregateIlDetail = hasHistoricalPerformance
    ? aggregatePerformanceExclusion
      ? `${formatSignedUsd(totalStats.totalIl, 2)} from historical positions; ${aggregatePerformanceExclusion}`
      : 'LP value minus HODL value for historical positions'
    : aggregatePerformanceFallbackDetail;
  const showHistoricalEnrichmentNotice = isHistoricalEnrichmentLoading && currentOnlyPositions.length > 0;
  const showPricingWarning = !showHistoricalEnrichmentNotice && currentOnlyPositions.length > 0;
  const showEstimatedWarning = estimatedPositions.length > 0;
  const confidenceMetrics = rankLpConfidenceMetrics([
    {
      id: 'lp-redeem-quotes',
      label: 'Redeem quotes',
      ...getRedeemQuoteConfidence({
        derivedCount: derivedRedeemPositions.length,
        hasLpPositions,
        isLoading,
        unavailableCount: unavailableRedeemPositions.length,
      }),
    },
    {
      id: 'historical-lp-values',
      label: 'Historical values',
      ...getHistoricalEntryConfidence({
        historicalEntryCount: historicalPositions.length,
        hasLpPositions,
        isLoading,
      }),
    },
    {
      id: 'estimated-lp-values',
      label: 'Estimated values',
      value: String(estimatedPositions.length),
      detail: showEstimatedWarning ? 'Excluded from aggregate P/L' : 'None',
      severity: 'info',
    },
    {
      id: 'current-only-lp-values',
      label: 'Current-only',
      value: String(currentOnlyPositions.length),
      detail: showHistoricalEnrichmentNotice ? 'Enriching now' : showPricingWarning ? 'History unavailable' : 'None',
      severity: showPricingWarning || showHistoricalEnrichmentNotice ? 'warning' : 'info',
    },
    {
      id: 'lp-price-feed',
      label: 'RUNE price',
      ...getRunePriceConfidence({
        hasLpPositions,
        isLoading,
        runePriceFreshness,
      }),
    },
  ]);

  return {
    aggregateIlDetail,
    aggregatePnlDetail,
    confidenceMetrics,
    currentOnlyCount: currentOnlyPositions.length,
    estimatedCount: estimatedPositions.length,
    hasHistoricalPerformance,
    hasNonHistoricalPerformance,
    performancePendingLabel,
    primaryConfidenceIssue: getPrimaryLpConfidenceIssue(confidenceMetrics),
    totalIlUsd: totalStats.totalIl,
    totalLpValueUsd,
    totalPnlUsd: totalStats.totalPnl,
    totalValueDetail,
    historicalEntryCount: historicalPositions.length,
    untrustedRedeemCount,
  };
}
