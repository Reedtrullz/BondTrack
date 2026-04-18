import useSWR from 'swr';
import { getRunePriceHistory, type RunePriceHistoryRaw } from '@/lib/api/midgard';

export interface RunePriceInterval {
  runePriceUSD: number;
  timestamp: Date;
}

export function useRunePrice() {
  const { data, error, isLoading } = useSWR<RunePriceHistoryRaw>(
    'rune-price',
    () => getRunePriceHistory('day', 1),
    { 
      refreshInterval: 300_000,
      errorRetryInterval: 5000,
    }
  );

  const currentPrice = data?.intervals?.length
    ? Number(data.intervals[data.intervals.length - 1].runePriceUSD)
    : 0;

  return {
    price: currentPrice,
    isLoading,
    error,
  };
}

export function useRunePriceHistory(interval = 'day', count = 30) {
  const { data, error, isLoading } = useSWR<RunePriceHistoryRaw>(
    count > 1 ? ['rune-price-history', interval, count] : null,
    () => getRunePriceHistory(interval, count),
    { 
      refreshInterval: 300_000,
      errorRetryInterval: 5000,
    }
  );

  const intervals: RunePriceInterval[] = data?.intervals?.map((i) => ({
    runePriceUSD: Number(i.runePriceUSD),
    timestamp: new Date(Number(i.startTime) / 1e6),
  })) || [];

  const currentPrice = intervals.length > 0 ? intervals[intervals.length - 1].runePriceUSD : 0;

  return {
    price: currentPrice,
    intervals,
    isLoading,
    error,
  };
}

export function getClosestPriceAtDate(intervals: RunePriceInterval[], targetDate: Date): number {
  if (!intervals.length) return 0;
  
  const targetTime = targetDate.getTime();
  let closest = intervals[0];
  let minDiff = Math.abs(intervals[0].timestamp.getTime() - targetTime);

  for (const interval of intervals) {
    const diff = Math.abs(interval.timestamp.getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = interval;
    }
  }

  return closest.runePriceUSD;
}
