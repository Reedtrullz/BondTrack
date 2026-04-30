import {
  getActions,
  getMemberDetails,
  getEarningsHistory,
  getPoolHistory,
  getRunePriceHistory,
  getPools,
  type ActionRaw,
} from '@/lib/api/midgard';

export type TaxConfidence = 'high' | 'estimated' | 'low';

export interface TaxReportRow {
  date: string;
  type: 'bond' | 'lp';
  asset: string;
  amountRune: number;
  amountUSD: number;
  costBasis: number;
  gainLoss: number;
  confidence?: TaxConfidence;
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
  const value = Number(dateStr);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 1e12 ? Math.floor(value / 1e9) : value;
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
  address: string,
  startTimestamp: number,
  endTimestamp: number,
  priceMap: Map<number, number>
): Promise<TaxReportRow[]> {
  const actionsResponse = await getActions(address, 100, 'bond,unbond,leave');

  const actions = actionsResponse.actions
    .map((action) => ({ action, timestamp: normalizeTimestamp(action.date) }))
    .filter(({ timestamp }) => timestamp > 0 && timestamp <= endTimestamp)
    .sort((a, b) => a.timestamp - b.timestamp);

  const rows: TaxReportRow[] = [];
  const lots: BondLot[] = [];

  for (const { action, timestamp } of actions) {
    const date = formatTaxDate(timestamp);
    const memo = action.memo?.toUpperCase() ?? '';
    const isBond = action.type === 'bond' || memo.startsWith('BOND:');
    const isUnbond = action.type === 'unbond' || action.type === 'leave' || memo.startsWith('UNBOND:');

    if (!isBond && !isUnbond) continue;

    const amount = extractRuneAmount(action, isBond);
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
      });
    }
  }

  return rows;
}

export async function generateTaxReport(
  address: string,
  startDate: string,
  endDate: string
): Promise<TaxReportRow[]> {
  const { startTimestamp, endTimestamp } = parseTaxDateRange(startDate, endDate);

  const priceHistory = await getRunePriceHistory(
    'day',
    undefined,
    startTimestamp,
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
    generateBondRows(address, startTimestamp, endTimestamp, priceMap),
    generateLpRows(address, startTimestamp, endTimestamp, priceMap),
  ]);

  return [...bondRows, ...lpRows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
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

  const csvRows = rows.map((row) => [
    escapeCsvField(row.date),
    escapeCsvField(row.type),
    escapeCsvField(row.asset),
    row.amountRune.toFixed(8),
    row.amountUSD.toFixed(2),
    row.costBasis.toFixed(2),
    row.gainLoss.toFixed(2),
    escapeCsvField(row.confidence ?? 'high'),
  ]);

  return [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
}
