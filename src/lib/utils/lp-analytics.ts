import type { PoolDetailRaw } from '../api/midgard';
import type { LpPosition } from '../types/lp';
import { calculateAssetPriceFromPoolDepth } from './calculations';
import { runeToNumber } from './formatters';

type LpAnalyticsPool = Partial<Pick<PoolDetailRaw, 'assetPriceUSD' | 'runeDepth' | 'assetDepth'>>;

const RUNE_AMOUNT_DIVISOR = 100_000_000;
const ZERO_BIGINT = BigInt(0);

export interface LpPositionValuationInput {
  runeDeposit: string;
  assetDeposit: string;
  runeWithdrawable: string;
  assetWithdrawable: string;
  runeCurrentPriceUsd: number;
  assetCurrentPriceUsd: number;
  runeEntryPriceUsd: number | null;
  assetEntryPriceUsd: number | null;
}

export interface LpPositionValuation {
  currentTotalValueUsd: number;
  depositedTotalValueUsd: number | null;
  netProfitLossUsd: number | null;
  netProfitLossPercent: number | null;
  hodlValueUsd: number | null;
  impermanentLossUsd: number | null;
  impermanentLossPercent: number | null;
  /** true when full historical entry prices were used; false when using balance-change fallback */
  hasHistoricalPricing: boolean;
}

export function getLpAssetSymbol(pool: string): string {
  const assetIdentifier = pool.trim().split(/[./]/).pop() ?? '';
  const displaySymbol = assetIdentifier.split('-')[0]?.trim();

  return displaySymbol || 'Unknown';
}

export function getCurrentAssetPriceUsd(pool: LpAnalyticsPool, runePriceUsd: number): number {
  const assetPriceUsd = Number(pool.assetPriceUSD ?? 0);

  if (Number.isFinite(assetPriceUsd) && assetPriceUsd > 0) {
    return assetPriceUsd;
  }

  if (!Number.isFinite(runePriceUsd) || runePriceUsd <= 0) {
    return 0;
  }

  const fallbackAssetPriceUsd = calculateAssetPriceFromPoolDepth(
    pool.runeDepth ?? '0',
    pool.assetDepth ?? '0',
    runePriceUsd
  );

  return Number.isFinite(fallbackAssetPriceUsd) && fallbackAssetPriceUsd > 0 ? fallbackAssetPriceUsd : 0;
}

function sanitizeNonNegativeUsdPrice(priceUsd: number): number {
  return Number.isFinite(priceUsd) && priceUsd >= 0 ? priceUsd : 0;
}

function sanitizeHistoricalUsdPrice(priceUsd: number | null): number | null {
  return priceUsd !== null && Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : null;
}

function parseRawAmount(amount: string): bigint {
  try {
    return BigInt(amount);
  } catch {
    return ZERO_BIGINT;
  }
}

function rawAmountDeltaToNumber(amountDelta: bigint): number {
  return Number(amountDelta) / RUNE_AMOUNT_DIVISOR;
}

export interface LpPortfolioSummary {
  positionCount: number;
  totalValueUsd: number;
  totalNetProfitLossUsd: number | null;
  totalNetProfitLossPercent: number | null;
  latestActivityTimestamp: number | null;
  historicalCount: number;
  currentOnlyCount: number;
}

export function calculateLpPositionValuation(input: LpPositionValuationInput): LpPositionValuation {
  const runeDepositRaw = parseRawAmount(input.runeDeposit);
  const assetDepositRaw = parseRawAmount(input.assetDeposit);
  const runeWithdrawableRaw = parseRawAmount(input.runeWithdrawable);
  const assetWithdrawableRaw = parseRawAmount(input.assetWithdrawable);
  const runeDeposit = runeToNumber(input.runeDeposit);
  const assetDeposit = runeToNumber(input.assetDeposit);
  const runeWithdrawable = runeToNumber(input.runeWithdrawable);
  const assetWithdrawable = runeToNumber(input.assetWithdrawable);
  const runeBalanceDeltaRaw = runeWithdrawableRaw - runeDepositRaw;
  const assetBalanceDeltaRaw = assetWithdrawableRaw - assetDepositRaw;
  const runeCurrentPriceUsd = sanitizeNonNegativeUsdPrice(input.runeCurrentPriceUsd);
  const assetCurrentPriceUsd = sanitizeNonNegativeUsdPrice(input.assetCurrentPriceUsd);
  const runeEntryPriceUsd = sanitizeHistoricalUsdPrice(input.runeEntryPriceUsd);
  const assetEntryPriceUsd = sanitizeHistoricalUsdPrice(input.assetEntryPriceUsd);

  const currentTotalValueUsd =
    runeWithdrawable * runeCurrentPriceUsd +
    assetWithdrawable * assetCurrentPriceUsd;

  if (runeEntryPriceUsd === null || assetEntryPriceUsd === null) {
    // Fallback: compute LP yield using balance-change method (redeemable - deposited) × current price.
    // This captures fee earnings and impermanent loss but NOT underlying price appreciation.
    const hodlValueUsd =
      runeDeposit * runeCurrentPriceUsd +
      assetDeposit * assetCurrentPriceUsd;

    // LP yield = current value - HODL value = net gain/loss from providing liquidity
    const lpYieldUsd = currentTotalValueUsd - hodlValueUsd;
    const lpYieldPercent = hodlValueUsd > 0
      ? (lpYieldUsd / hodlValueUsd) * 100
      : null;

    // IL is the same as LP yield when measured against HODL at current prices
    const baseImpermanentLossUsd = currentTotalValueUsd - hodlValueUsd;
    const balanceShortfallUsdCandidates: number[] = [];

    if (runeBalanceDeltaRaw < ZERO_BIGINT) {
      balanceShortfallUsdCandidates.push(rawAmountDeltaToNumber(runeBalanceDeltaRaw) * runeCurrentPriceUsd);
    }
    if (assetBalanceDeltaRaw < ZERO_BIGINT) {
      balanceShortfallUsdCandidates.push(rawAmountDeltaToNumber(assetBalanceDeltaRaw) * assetCurrentPriceUsd);
    }

    const hasBalanceDivergence = runeBalanceDeltaRaw !== ZERO_BIGINT || assetBalanceDeltaRaw !== ZERO_BIGINT;
    const balanceShortfallUsd = balanceShortfallUsdCandidates.length > 0
      ? Math.min(...balanceShortfallUsdCandidates)
      : 0;
    const impermanentLossUsd = baseImpermanentLossUsd !== 0
      ? baseImpermanentLossUsd
      : hasBalanceDivergence && balanceShortfallUsd < 0
        ? balanceShortfallUsd
        : 0;
    const impermanentLossPercent = hodlValueUsd > 0
      ? (impermanentLossUsd / hodlValueUsd) * 100
      : null;

    return {
      currentTotalValueUsd,
      depositedTotalValueUsd: hodlValueUsd,
      netProfitLossUsd: lpYieldUsd,
      netProfitLossPercent: lpYieldPercent,
      hodlValueUsd,
      impermanentLossUsd,
      impermanentLossPercent,
      hasHistoricalPricing: false,
    };
  }

  const depositedTotalValueUsd =
    runeDeposit * runeEntryPriceUsd +
    assetDeposit * assetEntryPriceUsd;

  const netProfitLossUsd = currentTotalValueUsd - depositedTotalValueUsd;
  const netProfitLossPercent = depositedTotalValueUsd > 0
    ? (netProfitLossUsd / depositedTotalValueUsd) * 100
    : null;

  const hodlValueUsd =
    runeDeposit * runeCurrentPriceUsd +
    assetDeposit * assetCurrentPriceUsd;

  const baseImpermanentLossUsd = currentTotalValueUsd - hodlValueUsd;
  const balanceShortfallUsdCandidates: number[] = [];

  if (runeBalanceDeltaRaw < ZERO_BIGINT) {
    balanceShortfallUsdCandidates.push(rawAmountDeltaToNumber(runeBalanceDeltaRaw) * runeCurrentPriceUsd);
  }

  if (assetBalanceDeltaRaw < ZERO_BIGINT) {
    balanceShortfallUsdCandidates.push(rawAmountDeltaToNumber(assetBalanceDeltaRaw) * assetCurrentPriceUsd);
  }

  const hasBalanceDivergence = runeBalanceDeltaRaw !== ZERO_BIGINT || assetBalanceDeltaRaw !== ZERO_BIGINT;
  const balanceShortfallUsd = balanceShortfallUsdCandidates.length > 0
    ? Math.min(...balanceShortfallUsdCandidates)
    : 0;
  const impermanentLossUsd = baseImpermanentLossUsd !== 0
    ? baseImpermanentLossUsd
    : hasBalanceDivergence && balanceShortfallUsd < 0
      // Preserve Task 2's explicit non-zero IL signal when balances diverge from HODL.
      ? balanceShortfallUsd
      : 0;

  const impermanentLossPercent = hodlValueUsd > 0
    ? (impermanentLossUsd / hodlValueUsd) * 100
    : null;

  return {
    currentTotalValueUsd,
    depositedTotalValueUsd,
    netProfitLossUsd,
    netProfitLossPercent,
    hodlValueUsd,
    impermanentLossUsd,
    impermanentLossPercent,
    hasHistoricalPricing: true,
  };
}

export function calculateLpPortfolioSummary(positions: LpPosition[]): LpPortfolioSummary {
  const totalValueUsd = positions.reduce((sum, position) => sum + position.currentTotalValueUsd, 0);
  const historicalPositions = positions.filter((position) => position.pricingSource === 'historical');
  // Include ALL positions with non-null P/L in aggregate (both historical and fallback)
  const positionsWithPnl = positions.filter((position) => position.netProfitLossUsd !== null);
  const pnlCurrentValueUsd = positionsWithPnl.reduce((sum, position) => sum + position.currentTotalValueUsd, 0);
  const totalCostBasis = positionsWithPnl.reduce((sum, position) => sum + (position.depositedTotalValueUsd ?? 0), 0);
  const totalNetProfitLossUsd = positionsWithPnl.length > 0 ? pnlCurrentValueUsd - totalCostBasis : null;
  const totalNetProfitLossPercent = totalCostBasis > 0 && totalNetProfitLossUsd !== null
    ? (totalNetProfitLossUsd / totalCostBasis) * 100
    : null;
  const latestActivityTimestamp = positions.reduce<number | null>((latest, position) => {
    const next = Number(position.dateLastAdded);
    if (!Number.isFinite(next) || next <= 0) {
      return latest;
    }

    return latest === null || next > latest ? next : latest;
  }, null);

  return {
    positionCount: positions.length,
    totalValueUsd,
    totalNetProfitLossUsd,
    totalNetProfitLossPercent,
    latestActivityTimestamp,
    historicalCount: historicalPositions.length,
    currentOnlyCount: positions.length - historicalPositions.length,
  };
}
