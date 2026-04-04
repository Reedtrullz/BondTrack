import useSWR from 'swr';
import { getRunePriceHistory, type RunePriceHistoryRaw } from '@/lib/api/midgard';

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
