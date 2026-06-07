import { useEarningsHistory } from './use-earnings';
import { useNetworkMetrics } from './use-network-metrics';
import { runeToNumber } from '@/lib/utils/formatters';
import { normalizeMidgardTimestampToDate } from '@/lib/utils/midgard-time';

export interface APYDataPoint {
  date: string;
  apy: number;
}

function normalizeApyPercent(raw: string | number | undefined): number {
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (!Number.isFinite(value) || !value || value <= 0) return 0;
  return value > 1 ? value : value * 100;
}

export function calculateAPYHistory(
  earningsRaw: { intervals?: Array<{ startTime: string; bondingEarnings: string }> },
  networkRaw: { bondMetrics?: { totalActiveBond?: string }; bondingAPY?: string | number }
): APYDataPoint[] {
  const intervals = earningsRaw.intervals || [];
  const totalBondsRune = runeToNumber(networkRaw.bondMetrics?.totalActiveBond || '0');

  if (intervals.length === 0 || totalBondsRune === 0) {
    return [];
  }

  const baselineApy = normalizeApyPercent(networkRaw.bondingAPY);
  const totalPeriodEarnings = intervals.reduce((sum, curr) => sum + Number(curr.bondingEarnings), 0);
  const avgDailyEarnings = (totalPeriodEarnings / intervals.length) / 1e8;

  return intervals
    .map((interval) => {
      const dailyEarnings = Number(interval.bondingEarnings) / 1e8;
      const ratio = avgDailyEarnings !== 0 ? dailyEarnings / avgDailyEarnings : 1;
      const pointApy = baselineApy * ratio;
      const date = normalizeMidgardTimestampToDate(interval.startTime);
      if (!date) {
        return null;
      }
      return {
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        apy: Math.max(0, pointApy),
      };
    })
    .filter((point): point is APYDataPoint => point !== null)
    .reverse();
}

export function useApyChartData(count = 365) {
  const {
    earnings,
    isLoading: isLoadingEarnings,
    error: earningsError,
  } = useEarningsHistory('day', count);

  const {
    data: network,
    isLoading: isLoadingNetwork,
    error: networkError,
  } = useNetworkMetrics();

  const data = (() => {
    if (!earnings || !network) return [];
    return calculateAPYHistory(earnings, network);
  })();

  return {
    data,
    isLoading: isLoadingEarnings || isLoadingNetwork,
    error: earningsError || networkError,
  };
}
