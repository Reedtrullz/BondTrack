import useSWR from 'swr';
import { useState } from 'react';
import { getRunePriceHistory, getHistoricalRunePrice, type RunePriceHistoryRaw } from '@/lib/api/midgard';
import { MOCK_RUNE_PRICE, isDevelopmentMode } from '../mock-data';
import { getMidgardDataFreshness, normalizeMidgardTimestampToDate, type MidgardFreshness } from '@/lib/utils/midgard-time';

const RUNE_PRICE_STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export interface RunePriceInterval {
  runePriceUSD: number;
  timestamp: Date;
}

function getLatestPriceInterval(data: RunePriceHistoryRaw | undefined) {
  return data?.intervals?.length ? data.intervals[data.intervals.length - 1] : undefined;
}

function getIntervalFreshness(interval: { startTime?: string; endTime?: string } | undefined): MidgardFreshness {
  return getMidgardDataFreshness(interval?.endTime || interval?.startTime, RUNE_PRICE_STALE_AFTER_MS);
}

function parsePositivePrice(rawPrice: string | number | undefined): number | null {
  const price = Number(rawPrice);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function freshMockData(): MidgardFreshness {
  const now = Date.now();
  return {
    updatedAt: new Date(now),
    updatedAtTimestampSeconds: Math.floor(now / 1000),
    ageMs: 0,
    isStale: false,
    staleAfterMs: RUNE_PRICE_STALE_AFTER_MS,
  };
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

  const latestInterval = getLatestPriceInterval(data);
  const currentPrice = useMockData
    ? MOCK_RUNE_PRICE
    : latestInterval
    ? parsePositivePrice(latestInterval.runePriceUSD) ?? 0
    : 0;
  const freshness = useMockData ? freshMockData() : getIntervalFreshness(latestInterval);

  return {
    price: currentPrice,
    updatedAt: freshness.updatedAt,
    updatedAtTimestampSeconds: freshness.updatedAtTimestampSeconds,
    ageMs: freshness.ageMs,
    isStale: freshness.isStale,
    staleAfterMs: freshness.staleAfterMs,
    isLoading: useMockData ? false : isLoading,
    error: useMockData ? undefined : error,
  };
}

export function useRunePriceHistory(interval = 'day', count = 30) {
  const useMockData = isDevelopmentMode();
  const [mockBaseMs] = useState(() => Date.now());
  const { data, error, isLoading } = useSWR<RunePriceHistoryRaw>(
    useMockData ? null : count > 1 ? ['rune-price-history', interval, count] : null,
    () => getRunePriceHistory(interval, count),
    { 
      refreshInterval: 300_000,
      errorRetryInterval: 5000,
    }
  );

  const intervalMs = interval === 'hour' ? 3600 * 1000 : 24 * 3600 * 1000;
  const mockIntervals: RunePriceInterval[] = Array.from({ length: count }, (_, index) => {
    // Add a slight deterministic variation to the mock price
    const variation = Math.sin(index * 0.5) * 0.05; 
    return {
      runePriceUSD: MOCK_RUNE_PRICE * (1 + variation),
      timestamp: new Date(mockBaseMs - (count - 1 - index) * intervalMs),
    };
  });

  const intervals: RunePriceInterval[] = useMockData ? mockIntervals : data?.intervals?.map((i) => {
    const timestamp = normalizeMidgardTimestampToDate(i.startTime);
    const runePriceUSD = parsePositivePrice(i.runePriceUSD);
    return {
      runePriceUSD,
      timestamp: timestamp ?? new Date(0),
    };
  }).filter((i): i is RunePriceInterval => i.timestamp.getTime() > 0 && i.runePriceUSD !== null) || [];

  const currentPrice = intervals.length > 0 ? intervals[intervals.length - 1].runePriceUSD : 0;
  const oldestPrice = intervals.length > 0 ? intervals[0].runePriceUSD : 0;
  const latestInterval = useMockData ? undefined : getLatestPriceInterval(data);
  const freshness = useMockData ? freshMockData() : getIntervalFreshness(latestInterval);

  return {
    price: currentPrice,
    oldestPrice,
    intervals,
    updatedAt: useMockData ? intervals[intervals.length - 1]?.timestamp ?? freshness.updatedAt : freshness.updatedAt,
    updatedAtTimestampSeconds: useMockData
      ? intervals[intervals.length - 1]
        ? Math.floor(intervals[intervals.length - 1].timestamp.getTime() / 1000)
        : freshness.updatedAtTimestampSeconds
      : freshness.updatedAtTimestampSeconds,
    ageMs: freshness.ageMs,
    isStale: freshness.isStale,
    staleAfterMs: freshness.staleAfterMs,
    isLoading: useMockData ? false : isLoading,
    error: useMockData ? undefined : error,
  };
}

export function getClosestPriceAtDate(intervals: RunePriceInterval[], targetDate: Date): number {
  const targetTime = targetDate.getTime();
  let closestPrice = 0;
  let minDiff = Number.POSITIVE_INFINITY;

  for (const interval of intervals) {
    if (!Number.isFinite(interval.runePriceUSD) || interval.runePriceUSD <= 0) {
      continue;
    }

    const intervalTime = interval.timestamp.getTime();
    if (!Number.isFinite(intervalTime) || intervalTime <= 0) {
      continue;
    }

    const diff = Math.abs(intervalTime - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestPrice = interval.runePriceUSD;
    }
  }

  return closestPrice;
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
