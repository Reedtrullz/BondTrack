import type { MetricStripItem } from './insights';
import type { LpPosition } from '@/lib/types/lp';
import type { MidgardFreshness } from '@/lib/utils/midgard-time';
import { formatUsd } from '@/lib/utils/formatters';

export interface LpPageModel {
  aggregateIlDetail: string;
  aggregatePnlDetail: string;
  confidenceMetrics: MetricStripItem[];
  currentOnlyCount: number;
  estimatedCount: number;
  hasTrustedHistoricalPerformance: boolean;
  hasUntrustedPerformance: boolean;
  performancePendingLabel: string;
  primaryConfidenceIssue?: MetricStripItem;
  totalIlUsd: number;
  totalLpValueUsd: number;
  totalPnlUsd: number;
  totalValueDetail: string;
  trustedHistoricalCount: number;
  untrustedRedeemCount: number;
}

interface BuildLpPageModelInput {
  isHistoricalEnrichmentLoading?: boolean;
  isLoading: boolean;
  positions?: LpPosition[] | null;
  runePriceFreshness?: MidgardFreshness;
}

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

  return {
    value: runePriceFreshness.isStale ? 'Stale' : 'Fresh',
    detail: runePriceFreshness.updatedAt ? `Updated ${runePriceFreshness.updatedAt.toLocaleString()}` : 'Midgard quote',
    severity: runePriceFreshness.isStale ? 'warning' : 'healthy',
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
    severity: 'healthy',
  };
}

function getPrimaryLpConfidenceIssue(metrics: MetricStripItem[]): MetricStripItem | undefined {
  const urgentIssue = metrics.find((metric) => metric.severity === 'critical' || metric.severity === 'warning');
  if (urgentIssue) return urgentIssue;

  return metrics.find((metric) => metric.id === 'estimated-lp-values' && metric.severity === 'info')
    ?? metrics.find((metric) => metric.id === 'trusted-lp-values' && metric.severity === 'info');
}

export function buildLpPageModel({
  isHistoricalEnrichmentLoading = false,
  isLoading,
  positions,
  runePriceFreshness,
}: BuildLpPageModelInput): LpPageModel {
  const safePositions = positions ?? [];
  const trustedHistoricalPositions = safePositions.filter((position) => position.pricingSource === 'historical');
  const estimatedPositions = safePositions.filter((position) => position.pricingSource === 'estimated');
  const currentOnlyPositions = safePositions.filter((position) => position.pricingSource === 'current-only');
  const derivedRedeemPositions = safePositions.filter((position) => position.redeemQuoteSource === 'derived');
  const unavailableRedeemPositions = safePositions.filter((position) => position.redeemQuoteSource === 'unavailable');
  const untrustedRedeemCount = derivedRedeemPositions.length + unavailableRedeemPositions.length;
  const totalStats = trustedHistoricalPositions.reduce(
    (acc, position) => {
      acc.totalPnl += position.netProfitLossUsd ?? 0;
      acc.totalIl += position.impermanentLossUsd ?? 0;
      return acc;
    },
    { totalPnl: 0, totalIl: 0 }
  );
  const totalLpValueUsd = safePositions.reduce((sum, position) => sum + (position.currentTotalValueUsd ?? 0), 0);
  const hasUntrustedPerformance = isHistoricalEnrichmentLoading || safePositions.some(
    (position) =>
      position.pricingSource === 'current-only' ||
      position.pricingSource === 'estimated' ||
      position.netProfitLossUsd === null ||
      position.impermanentLossUsd === null
  );
  const hasTrustedHistoricalPerformance = trustedHistoricalPositions.length > 0;
  const performancePendingLabel = isHistoricalEnrichmentLoading
    ? 'Enriching...'
    : hasTrustedHistoricalPerformance
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
    ? `Current value includes all pools; ${untrustedPositionLabel} ${confidenceReviewVerb} confidence review`
    : runePriceFreshness?.isStale
      ? 'Current value uses a stale RUNE price'
      : !runePriceFreshness && hasLpPositions
        ? 'Current value is waiting for RUNE price confidence'
        : 'Current withdrawable value across all pools';
  const aggregatePerformanceFallbackDetail = isHistoricalEnrichmentLoading
    ? 'Historical entry pricing is still loading'
    : 'Historical entry pricing required before aggregate performance is safe';
  const aggregatePnlDetail = hasTrustedHistoricalPerformance
    ? aggregatePerformanceExclusion
      ? `${formatSignedUsd(totalStats.totalPnl, 2)} from historical positions; ${aggregatePerformanceExclusion}`
      : `${formatSignedUsd(totalStats.totalPnl, 2)} from historical positions`
    : aggregatePerformanceFallbackDetail;
  const aggregateIlDetail = hasTrustedHistoricalPerformance
    ? aggregatePerformanceExclusion
      ? `${formatSignedUsd(totalStats.totalIl, 2)} from historical positions; ${aggregatePerformanceExclusion}`
      : 'LP value minus HODL value for historical positions'
    : aggregatePerformanceFallbackDetail;
  const showHistoricalEnrichmentNotice = isHistoricalEnrichmentLoading && currentOnlyPositions.length > 0;
  const showPricingWarning = !showHistoricalEnrichmentNotice && currentOnlyPositions.length > 0;
  const showEstimatedWarning = estimatedPositions.length > 0;
  const confidenceMetrics: MetricStripItem[] = [
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
      id: 'trusted-lp-values',
      label: 'Trusted values',
      value: String(trustedHistoricalPositions.length),
      detail: 'Historical entry pricing',
      severity: trustedHistoricalPositions.length > 0 ? 'healthy' : 'info',
    },
    {
      id: 'estimated-lp-values',
      label: 'Estimated values',
      value: String(estimatedPositions.length),
      detail: showEstimatedWarning ? 'Excluded from aggregate P/L' : 'None',
      severity: showEstimatedWarning ? 'info' : 'healthy',
    },
    {
      id: 'current-only-lp-values',
      label: 'Current-only',
      value: String(currentOnlyPositions.length),
      detail: showHistoricalEnrichmentNotice ? 'Enriching now' : showPricingWarning ? 'History unavailable' : 'None',
      severity: showPricingWarning || showHistoricalEnrichmentNotice ? 'warning' : 'healthy',
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
  ];

  return {
    aggregateIlDetail,
    aggregatePnlDetail,
    confidenceMetrics,
    currentOnlyCount: currentOnlyPositions.length,
    estimatedCount: estimatedPositions.length,
    hasTrustedHistoricalPerformance,
    hasUntrustedPerformance,
    performancePendingLabel,
    primaryConfidenceIssue: getPrimaryLpConfidenceIssue(confidenceMetrics),
    totalIlUsd: totalStats.totalIl,
    totalLpValueUsd,
    totalPnlUsd: totalStats.totalPnl,
    totalValueDetail,
    trustedHistoricalCount: trustedHistoricalPositions.length,
    untrustedRedeemCount,
  };
}
