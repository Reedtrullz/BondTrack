import useSWR from 'swr';
import { getRunePriceHistory, getHistoricalRunePrice, type RunePriceHistoryRaw } from '@/lib/api/midgard';
import { MOCK_RUNE_PRICE, isDevelopmentMode } from '../mock-data';

export interface RunePriceInterval {
  runePriceUSD: number;
  timestamp: Date;
}

export function useRunePrice() {
  const useMockData = isDevelopmentMode();
  const { data, error, isLoading } = useSWR<RunePriceHistoryRaw>(
    useMockData ? null : 'rune-price',
    () => getRunePriceHistory('day', 1),
    { 
      refreshInterval: 300_000,
      errorRetryInterval: 5000,
    }
  );

  const currentPrice = useMockData
    ? MOCK_RUNE_PRICE
    : data?.intervals?.length
    ? Number(data.intervals[data.intervals.length - 1].runePriceUSD)
    : 0;

  return {
    price: currentPrice,
    isLoading: useMockData ? false : isLoading,
    error: useMockData ? undefined : error,
  };
}

export function useRunePriceHistory(interval = 'day', count = 30) {
  const useMockData = isDevelopmentMode();
  const { data, error, isLoading } = useSWR<RunePriceHistoryRaw>(
    useMockData ? null : count > 1 ? ['rune-price-history', interval, count] : null,
    () => getRunePriceHistory(interval, count),
    { 
      refreshInterval: 300_000,
      errorRetryInterval: 5000,
    }
  );

  const mockIntervals: RunePriceInterval[] = Array.from({ length: count }, (_, index) => ({
    runePriceUSD: MOCK_RUNE_PRICE,
    timestamp: new Date(Date.now() - (count - 1 - index) * 24 * 60 * 60 * 1000),
  }));

  const intervals: RunePriceInterval[] = useMockData ? mockIntervals : data?.intervals?.map((i) => ({
    runePriceUSD: Number(i.runePriceUSD),
    timestamp: new Date(Number(i.startTime) * 1000),
  })) || [];

  const currentPrice = intervals.length > 0 ? intervals[intervals.length - 1].runePriceUSD : 0;
  const oldestPrice = intervals.length > 0 ? intervals[0].runePriceUSD : 0;

  return {
    price: currentPrice,
    oldestPrice,
    intervals,
    isLoading: useMockData ? false : isLoading,
    error: useMockData ? undefined : error,
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
export function useHistoricalRunePrice(date: Date | null) {
  const useMockData = isDevelopmentMode();
  const timestamp = date ? Math.floor(date.getTime() / 1000) : null;
  
  const { data, error, isLoading } = useSWR(
    useMockData ? null : timestamp ? ['historical-rune-price', timestamp] : null,
    () => getHistoricalRunePrice(timestamp!),
    { 
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // 1 hour
    }
  );

  return {
    price: useMockData ? MOCK_RUNE_PRICE : data ?? null,
    isLoading: useMockData ? false : isLoading,
    error: useMockData ? undefined : error,
  };
}
