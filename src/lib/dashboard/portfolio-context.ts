import type { RunePriceInterval } from '@/lib/hooks/use-rune-price';
import type { LpPosition } from '@/lib/types/lp';
import type { BondPosition } from '@/lib/types/node';
import { formatRuneFromNumber, formatUsd } from '@/lib/utils/formatters';
import type { MetricStripItem } from './insights';

export interface PortfolioAllocationDatum {
  name: 'Bond' | 'LP';
  value: number;
  fill: string;
}

export interface PortfolioPageModel {
  confidenceMetrics: MetricStripItem[];
  effectiveLpPositions: LpPosition[];
  pieData: PortfolioAllocationDatum[];
  runePriceChange24h: number | null;
  runePriceChange7d: number | null;
  totalBondedRune: number;
  totalBondedValueUsd: number;
  totalLpValueUsd: number;
  totalPortfolioValueUsd: number;
  weightedAPY: number;
}

export interface BuildPortfolioPageModelInput {
  bondPositions: BondPosition[];
  lpError?: unknown;
  lpPositions: LpPosition[];
  runePrice: number;
  runePriceHistory: RunePriceInterval[];
  runePriceIsStale: boolean;
}

const BOND_ALLOCATION_COLOR = '#10b981';
const LP_ALLOCATION_COLOR = '#f59e0b';

function calculateWeightedApy(positions: BondPosition[], totalBondedRune: number): number {
  if (positions.length === 0 || totalBondedRune <= 0) return 0;

  if (positions.some((position) => !Number.isFinite(position.netAPY))) {
    return Number.NaN;
  }

  return positions.reduce((sum, position) => (
    sum + position.netAPY * position.bondAmount
  ), 0) / totalBondedRune;
}

function calculateRunePriceChange(
  runePriceHistory: RunePriceInterval[],
  lookbackIntervals: number
): number | null {
  if (runePriceHistory.length < lookbackIntervals + 1) return null;

  const first = runePriceHistory[runePriceHistory.length - 1 - lookbackIntervals].runePriceUSD;
  const last = runePriceHistory[runePriceHistory.length - 1].runePriceUSD;

  if (!Number.isFinite(first) || first <= 0 || !Number.isFinite(last)) {
    return null;
  }

  return ((last - first) / first) * 100;
}

function calculateRunePriceChangeFromStart(runePriceHistory: RunePriceInterval[]): number | null {
  if (runePriceHistory.length < 169) return null;

  const first = runePriceHistory[0].runePriceUSD;
  const last = runePriceHistory[runePriceHistory.length - 1].runePriceUSD;

  if (!Number.isFinite(first) || first <= 0 || !Number.isFinite(last)) {
    return null;
  }

  return ((last - first) / first) * 100;
}

function getAllocationLabel(totalBondedValueUsd: number, totalLpValueUsd: number): MetricStripItem {
  if (totalBondedValueUsd > 0 && totalLpValueUsd > 0) {
    return {
      id: 'allocation',
      label: 'Allocation',
      value: 'Mixed',
      detail: 'Bond and LP exposure',
      severity: 'healthy',
    };
  }

  if (totalBondedValueUsd > 0) {
    return {
      id: 'allocation',
      label: 'Allocation',
      value: 'Bond only',
      detail: 'No LP value included',
      severity: 'info',
    };
  }

  if (totalLpValueUsd > 0) {
    return {
      id: 'allocation',
      label: 'Allocation',
      value: 'LP only',
      detail: 'No bond value included',
      severity: 'info',
    };
  }

  return {
    id: 'allocation',
    label: 'Allocation',
    value: 'No exposure',
    detail: 'No value loaded',
    severity: 'warning',
  };
}

function getLpValuationMetric(lpDataUnavailable: boolean, lpPositions: LpPosition[]): MetricStripItem {
  if (lpDataUnavailable) {
    return {
      id: 'lp-valuation',
      label: 'LP valuation',
      value: 'Degraded',
      detail: 'LP value excluded from totals',
      severity: 'warning',
    };
  }

  if (lpPositions.length === 0) {
    return {
      id: 'lp-valuation',
      label: 'LP valuation',
      value: 'None found',
      detail: 'No LP positions included',
      severity: 'info',
    };
  }

  const untrustedRedeemCount = lpPositions.filter((position) => !position.claimableTrusted).length;
  if (untrustedRedeemCount > 0) {
    return {
      id: 'lp-valuation',
      label: 'LP valuation',
      value: 'Partial',
      detail: `${untrustedRedeemCount} LP value${untrustedRedeemCount === 1 ? '' : 's'} not THORNode-confirmed`,
      severity: 'warning',
    };
  }

  const currentOnlyCount = lpPositions.filter((position) => position.pricingSource === 'current-only').length;
  if (currentOnlyCount > 0) {
    return {
      id: 'lp-valuation',
      label: 'LP valuation',
      value: 'Partial',
      detail: `${currentOnlyCount} LP performance baseline${currentOnlyCount === 1 ? '' : 's'} missing`,
      severity: 'warning',
    };
  }

  const estimatedCount = lpPositions.filter((position) => position.pricingSource === 'estimated').length;
  if (estimatedCount > 0) {
    return {
      id: 'lp-valuation',
      label: 'LP valuation',
      value: 'Estimated',
      detail: `${estimatedCount} LP position${estimatedCount === 1 ? '' : 's'} excluded from aggregate P/L`,
      severity: 'info',
    };
  }

  return {
    id: 'lp-valuation',
    label: 'LP valuation',
    value: 'Ready',
    detail: `${lpPositions.length} LP position${lpPositions.length === 1 ? '' : 's'} included`,
    severity: 'healthy',
  };
}

function buildConfidenceMetrics({
  bondPositions,
  lpDataUnavailable,
  lpPositions,
  runePrice,
  runePriceIsStale,
  totalBondedRune,
  totalBondedValueUsd,
  totalLpValueUsd,
}: {
  bondPositions: BondPosition[];
  lpDataUnavailable: boolean;
  lpPositions: LpPosition[];
  runePrice: number;
  runePriceIsStale: boolean;
  totalBondedRune: number;
  totalBondedValueUsd: number;
  totalLpValueUsd: number;
}): MetricStripItem[] {
  return [
    {
      id: 'bond-exposure',
      label: 'Bond exposure',
      value: bondPositions.length === 0 ? 'No bond' : `${bondPositions.length} node${bondPositions.length === 1 ? '' : 's'}`,
      detail: totalBondedRune > 0 ? `${formatRuneFromNumber(totalBondedRune)} tracked` : 'No bonded RUNE',
      severity: bondPositions.length > 0 ? 'healthy' : 'info',
    },
    getLpValuationMetric(lpDataUnavailable, lpPositions),
    {
      id: 'rune-price',
      label: 'RUNE price',
      value: runePrice > 0 ? (runePriceIsStale ? 'Stale' : 'Fresh') : 'Missing',
      detail: runePrice > 0
        ? (runePriceIsStale ? 'USD values use last quote' : `${formatUsd(runePrice, 4, 2)} quote loaded`)
        : 'USD values unavailable',
      severity: runePrice > 0 && !runePriceIsStale ? 'healthy' : 'warning',
    },
    getAllocationLabel(totalBondedValueUsd, totalLpValueUsd),
  ];
}

export function buildPortfolioPageModel({
  bondPositions,
  lpError,
  lpPositions,
  runePrice,
  runePriceHistory,
  runePriceIsStale,
}: BuildPortfolioPageModelInput): PortfolioPageModel {
  const lpDataUnavailable = Boolean(lpError);
  const effectiveLpPositions = lpDataUnavailable ? [] : lpPositions;
  const totalBondedRune = bondPositions.reduce((sum, position) => sum + position.bondAmount, 0);
  const totalBondedValueUsd = totalBondedRune * runePrice;
  const totalLpValueUsd = effectiveLpPositions.reduce((sum, position) => (
    sum + position.currentTotalValueUsd
  ), 0);
  const totalPortfolioValueUsd = totalBondedValueUsd + totalLpValueUsd;
  const weightedAPY = calculateWeightedApy(bondPositions, totalBondedRune);

  return {
    confidenceMetrics: buildConfidenceMetrics({
      bondPositions,
      lpDataUnavailable,
      lpPositions: effectiveLpPositions,
      runePrice,
      runePriceIsStale,
      totalBondedRune,
      totalBondedValueUsd,
      totalLpValueUsd,
    }),
    effectiveLpPositions,
    pieData: [
      { name: 'Bond', value: totalBondedValueUsd, fill: BOND_ALLOCATION_COLOR },
      { name: 'LP', value: totalLpValueUsd, fill: LP_ALLOCATION_COLOR },
    ],
    runePriceChange24h: calculateRunePriceChange(runePriceHistory, 24),
    runePriceChange7d: calculateRunePriceChangeFromStart(runePriceHistory),
    totalBondedRune,
    totalBondedValueUsd,
    totalLpValueUsd,
    totalPortfolioValueUsd,
    weightedAPY,
  };
}
