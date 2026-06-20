import {
  getActions,
  getMemberDetails,
  getEarningsHistory,
  getPoolHistory,
  getRunePriceHistory,
  getPools,
  type ActionRaw,
} from '@/lib/api/midgard';
import { normalizeMidgardTimestampToSeconds } from '@/lib/utils/midgard-time';
import { NETWORK } from '@/lib/config';

export type TaxConfidence = 'high' | 'estimated' | 'low';
export type TaxReportWarningCode = 'incomplete_action_history';

export interface TaxReportWarning {
  code: TaxReportWarningCode;
  message: string;
}

export interface TaxReportResult {
  rows: TaxReportRow[];
  warnings: TaxReportWarning[];
}

const TAX_ACTION_PAGE_SIZE = NETWORK.MAX_ACTIONS_LIMIT;
const TAX_ACTION_MAX_PAGES = Math.ceil(10_000 / TAX_ACTION_PAGE_SIZE);
export const MAX_TAX_DATE_RANGE_DAYS = 366;

const LP_CURRENT_POSITION_ESTIMATE_NOTE =
  'current-position estimate; historical LP add/withdraw reconstruction is not implemented';

export interface TaxReportRow {
  date: string;
  type: 'bond' | 'lp';
  asset: string;
  amountRune: number;
  amountUSD: number;
  costBasis: number;
  gainLoss: number;
  confidence?: TaxConfidence;
  confidenceLabel?: string;
}

interface PreparedTaxAction {
  action: ActionRaw;
  timestamp: number;
  taxActionType: 'bond' | 'unbond' | 'leave';
}

interface BondLot {
  date: string;
  amount: number;
  price: number;
  remaining: number;
  confidence: TaxConfidence;
}

export interface TaxDateRange {
  startTimestamp: number;
  endTimestamp: number;
}

function normalizeTimestamp(dateStr: string | number): number {
  return normalizeMidgardTimestampToSeconds(dateStr);
}

function formatTaxDate(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toISOString().split('T')[0];
}

function parseRuneAmount(raw: string | undefined): number {
  if (!raw) return 0;
  try {
    return Number(BigInt(raw)) / 1e8;
  } catch {
    return 0;
  }
}

function getTaxActionType(action: ActionRaw): PreparedTaxAction['taxActionType'] | undefined {
  const normalizedRefundType = action.metadata?.refund?.txType?.toLowerCase();
  if (normalizedRefundType === 'bond' || normalizedRefundType === 'unbond' || normalizedRefundType === 'leave') {
    return normalizedRefundType;
  }

  const normalizedActionType = action.type?.toLowerCase();
  if (normalizedActionType === 'bond' || normalizedActionType === 'unbond' || normalizedActionType === 'leave') {
    return normalizedActionType;
  }

  const memo = action.memo?.toUpperCase() ?? '';
  if (memo.startsWith('BOND:')) return 'bond';
  if (memo.startsWith('UNBOND:')) return 'unbond';
  if (memo.startsWith('LEAVE:')) return 'leave';

  return undefined;
}

function parseUnbondMemoRuneAmount(memo: string | undefined): number {
  if (!memo) return 0;
  const parts = memo.split(':');
  if (parts.length < 3 || parts[0].toUpperCase() !== 'UNBOND') return 0;
  return parseRuneAmount(parts[2]);
}

export function parseTaxDateRange(startDate: string, endDate: string): TaxDateRange {
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateOnlyPattern.test(startDate) || !dateOnlyPattern.test(endDate)) {
    throw new Error('Dates must use YYYY-MM-DD format');
  }

  const startMs = Date.parse(`${startDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${endDate}T23:59:59.999Z`);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new Error('Invalid date range');
  }

  if (startMs > endMs) {
    throw new Error('Start date must be before or equal to end date');
  }

  const rangeDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
  if (rangeDays > MAX_TAX_DATE_RANGE_DAYS) {
    throw new Error(`Tax worksheet range cannot exceed ${MAX_TAX_DATE_RANGE_DAYS} days`);
  }

  return {
    startTimestamp: Math.floor(startMs / 1000),
    endTimestamp: Math.floor(endMs / 1000),
  };
}

function extractRuneAmount(action: ActionRaw, isInbound: boolean): number {
  if (isInbound) {
    if (action.in && action.in.length > 0) {
      for (const input of action.in) {
        const runeCoin = input.coins?.find((c) => c.asset === 'THOR.RUNE');
        if (runeCoin) return parseRuneAmount(runeCoin.amount);
      }
    }
  } else if (action.out && action.out.length > 0) {
    for (const output of action.out) {
      const runeCoin = output.coins?.find((c) => c.asset === 'THOR.RUNE');
      if (runeCoin) return parseRuneAmount(runeCoin.amount);
    }
  }

  if (action.tx?.coins) {
    const runeCoin = action.tx.coins.find((c) => c.asset === 'THOR.RUNE');
    if (runeCoin) return parseRuneAmount(runeCoin.amount);
  }

  return 0;
}

async function loadBondTaxActions(address: string, endTimestamp: number): Promise<{ actions: PreparedTaxAction[]; warnings: TaxReportWarning[] }> {
  const allActions: ActionRaw[] = [];
  const warnings: TaxReportWarning[] = [];
  let expectedCount: number | null = null;

  for (let page = 0; page < TAX_ACTION_MAX_PAGES; page += 1) {
    const offset = page * TAX_ACTION_PAGE_SIZE;
    const actionsResponse = await getActions(address, TAX_ACTION_PAGE_SIZE, 'bond,unbond,leave', 'txType', offset);
    const pageActions = actionsResponse.actions ?? [];
    allActions.push(...pageActions);

    const parsedCount = Number(actionsResponse.count);
    if (Number.isFinite(parsedCount) && parsedCount >= 0) {
      expectedCount = parsedCount;
    }

    if (pageActions.length < TAX_ACTION_PAGE_SIZE) {
      break;
    }

    if (expectedCount !== null && allActions.length >= expectedCount) {
      break;
    }
  }

  if ((expectedCount !== null && allActions.length < expectedCount) || (expectedCount === null && allActions.length >= TAX_ACTION_PAGE_SIZE * TAX_ACTION_MAX_PAGES)) {
    warnings.push({
      code: 'incomplete_action_history',
      message: `Tax report loaded ${allActions.length} bond-related actions; older history may be incomplete.`,
    });
  }

  const actions = allActions
    .map((action) => {
      const timestamp = normalizeTimestamp(action.date);
      const taxActionType = getTaxActionType(action);
      return { action, timestamp, taxActionType };
    })
    .filter((item): item is PreparedTaxAction =>
      item.timestamp > 0 && item.timestamp <= endTimestamp && item.taxActionType !== undefined
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  return { actions, warnings };
}

function getClosestPrice(timestamp: number, priceMap: Map<number, number>): { price: number; confidence: TaxConfidence } {
  let closestPrice = 0;
  let minDiff = Infinity;

  for (const [ts, price] of priceMap) {
    const diff = Math.abs(ts - timestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closestPrice = price;
    }
  }

  if (minDiff <= 86_400) return { price: closestPrice, confidence: 'high' };
  if (minDiff <= 259_200) return { price: closestPrice, confidence: 'estimated' };
  return { price: 0, confidence: 'low' };
}

function combineConfidence(values: TaxConfidence[]): TaxConfidence {
  if (values.includes('low')) return 'low';
  if (values.includes('estimated')) return 'estimated';
  return 'high';
}

async function generateBondRows(
  actions: PreparedTaxAction[],
  startTimestamp: number,
  endTimestamp: number,
  priceMap: Map<number, number>
): Promise<TaxReportRow[]> {
  const rows: TaxReportRow[] = [];
  const lots: BondLot[] = [];

  for (const { action, timestamp, taxActionType } of actions) {
    const date = formatTaxDate(timestamp);
    const isBond = taxActionType === 'bond';
    const isUnbond = taxActionType === 'unbond' || taxActionType === 'leave';

    let amount = extractRuneAmount(action, isBond);
    if (amount <= 0 && isUnbond) {
      amount = parseUnbondMemoRuneAmount(action.memo)
        || parseUnbondMemoRuneAmount(action.metadata?.refund?.memo);
    }
    if (amount <= 0) continue;

    const { price: runePrice, confidence: priceConfidence } = getClosestPrice(timestamp, priceMap);
    const inRequestedRange = timestamp >= startTimestamp && timestamp <= endTimestamp;

    if (isBond) {
      const costBasis = amount * runePrice;
      lots.push({
        date,
        amount,
        price: runePrice,
        remaining: amount,
        confidence: priceConfidence,
      });

      if (inRequestedRange) {
        rows.push({
          date,
          type: 'bond',
          asset: 'RUNE',
          amountRune: amount,
          amountUSD: costBasis,
          costBasis,
          gainLoss: 0,
          confidence: priceConfidence,
        });
      }
    } else {
      let remainingToSell = amount;
      let totalCostBasis = 0;
      const confidenceParts: TaxConfidence[] = [priceConfidence];

      while (remainingToSell > 0.000_000_01 && lots.length > 0) {
        const lot = lots[0];
        const sellFromLot = Math.min(remainingToSell, lot.remaining);
        totalCostBasis += sellFromLot * lot.price;
        confidenceParts.push(lot.confidence);
        lot.remaining -= sellFromLot;
        remainingToSell -= sellFromLot;
        if (lot.remaining <= 0.000_000_01) {
          lots.shift();
        }
      }

      if (remainingToSell > 0.000_000_01) {
        confidenceParts.push('low');
      }

      if (inRequestedRange) {
        const proceeds = amount * runePrice;
        const gainLoss = proceeds - totalCostBasis;

        rows.push({
          date,
          type: 'bond',
          asset: 'RUNE',
          amountRune: amount,
          amountUSD: proceeds,
          costBasis: totalCostBasis,
          gainLoss,
          confidence: combineConfidence(confidenceParts),
        });
      }
    }
  }

  return rows;
}

async function generateLpRows(
  address: string,
  startTimestamp: number,
  endTimestamp: number,
  priceMap: Map<number, number>
): Promise<TaxReportRow[]> {
  const [memberDetails, earningsHistory, poolsData] = await Promise.all([
    getMemberDetails(address),
    getEarningsHistory('day', Math.min(365, Math.ceil((endTimestamp - startTimestamp) / 86_400) + 7)),
    getPools(),
  ]);

  const memberPools = memberDetails.pools || [];
  if (memberPools.length === 0) return [];

  const rows: TaxReportRow[] = [];
  const intervals = (earningsHistory.intervals || []).filter((interval) => {
    const intervalStart = normalizeTimestamp(interval.startTime);
    return intervalStart >= startTimestamp && intervalStart <= endTimestamp;
  });

  for (const memberPool of memberPools) {
    const poolDetail = poolsData.find((p) => p.asset === memberPool.pool);
    const totalLiquidityUnits = poolDetail?.liquidityUnits;

    if (!totalLiquidityUnits || totalLiquidityUnits === '0') continue;

    const userLiquidityUnits = Number(BigInt(memberPool.liquidityUnits));
    const poolTotalLiquidityUnits = Number(BigInt(totalLiquidityUnits));

    if (poolTotalLiquidityUnits <= 0 || userLiquidityUnits <= 0) continue;

    const userShare = userLiquidityUnits / poolTotalLiquidityUnits;
    let poolHistoryIntervals: { startTime: string; liquidityUnits: string }[] = [];
    let lpConfidence: TaxConfidence = 'estimated';
    try {
      const poolHistory = await getPoolHistory(
        memberPool.pool,
        'day',
        undefined,
        startTimestamp,
        endTimestamp
      );
      poolHistoryIntervals = poolHistory.intervals || [];
    } catch (err) {
      lpConfidence = 'low';
      console.error('Failed to fetch pool history for tax report:', err);
    }

    for (const interval of intervals) {
      const intervalStart = normalizeTimestamp(interval.startTime);
      const poolData = interval.pools?.find((p) => p.pool === memberPool.pool);
      if (!poolData) continue;

      const totalPoolEarnings = parseRuneAmount(poolData.earnings);
      if (totalPoolEarnings <= 0) continue;

      let share = userShare;
      const poolInterval = poolHistoryIntervals.find(
        (pi) => Math.abs(normalizeTimestamp(pi.startTime) - intervalStart) < 43_200
      );
      if (poolInterval?.liquidityUnits && poolInterval.liquidityUnits !== '0') {
        const historicalTotalUnits = Number(BigInt(poolInterval.liquidityUnits));
        if (historicalTotalUnits > 0) {
          share = userLiquidityUnits / historicalTotalUnits;
        }
      } else if (poolHistoryIntervals.length > 0) {
        lpConfidence = 'low';
      }

      const userEarnings = totalPoolEarnings * share;
      if (userEarnings <= 0) continue;

      const { price: runePrice, confidence: priceConfidence } = getClosestPrice(intervalStart, priceMap);

      rows.push({
        date: formatTaxDate(intervalStart),
        type: 'lp',
        asset: 'RUNE',
        amountRune: userEarnings,
        amountUSD: userEarnings * runePrice,
        costBasis: 0,
        gainLoss: userEarnings * runePrice,
        confidence: combineConfidence([lpConfidence, priceConfidence]),
        confidenceLabel: LP_CURRENT_POSITION_ESTIMATE_NOTE,
      });
    }
  }

  return rows;
}

async function buildTaxReportResult(
  address: string,
  startDate: string,
  endDate: string
): Promise<TaxReportResult> {
  const { startTimestamp, endTimestamp } = parseTaxDateRange(startDate, endDate);

  const { actions: bondActions, warnings } = await loadBondTaxActions(address, endTimestamp);
  const earliestBondActionTimestamp = bondActions.length > 0
    ? Math.min(...bondActions.map(({ timestamp }) => timestamp))
    : startTimestamp;
  const priceStartTimestamp = Math.min(startTimestamp, earliestBondActionTimestamp);

  const priceHistory = await getRunePriceHistory(
    'day',
    undefined,
    priceStartTimestamp,
    endTimestamp
  );
  const priceMap = new Map<number, number>();

  for (const interval of priceHistory.intervals) {
    const ts = normalizeTimestamp(interval.startTime);
    const price = Number.parseFloat(interval.runePriceUSD);
    if (Number.isFinite(price) && price > 0) {
      priceMap.set(ts, price);
    }
  }

  const [bondRows, lpRows] = await Promise.all([
    generateBondRows(bondActions, startTimestamp, endTimestamp, priceMap),
    generateLpRows(address, startTimestamp, endTimestamp, priceMap),
  ]);

  const rows = [...bondRows, ...lpRows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return { rows, warnings };
}

export async function generateTaxReport(
  address: string,
  startDate: string,
  endDate: string
): Promise<TaxReportRow[]> {
  const { rows } = await buildTaxReportResult(address, startDate, endDate);
  return rows;
}

export async function generateTaxReportWithWarnings(
  address: string,
  startDate: string,
  endDate: string
): Promise<TaxReportResult> {
  return buildTaxReportResult(address, startDate, endDate);
}

export function exportToCSV(rows: TaxReportRow[]): string {
  const headers = ['Date', 'Type', 'Asset', 'Amount_RUNE', 'Amount_USD', 'Cost_Basis', 'Gain_Loss', 'Confidence'];

  function escapeCsvField(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  if (!rows || rows.length === 0) {
    return headers.join(',');
  }

  const csvRows = rows.map((row) => {
    const confidence = row.confidence ?? 'high';
    const confidenceText = row.confidenceLabel
      ? `${confidence} (${row.confidenceLabel})`
      : confidence;

    return [
      escapeCsvField(row.date),
      escapeCsvField(row.type),
      escapeCsvField(row.asset),
      row.amountRune.toFixed(8),
      row.amountUSD.toFixed(2),
      row.costBasis.toFixed(2),
      row.gainLoss.toFixed(2),
      escapeCsvField(confidenceText),
    ];
  });

  return [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
}
