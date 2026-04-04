import useSWR from 'swr';
import { getEarningsHistory, type EarningsHistoryRaw } from '@/lib/api/midgard';

export function useEarningsHistory(interval = 'day', count = 30) {
  const { data, error, isLoading } = useSWR<EarningsHistoryRaw>(
    ['earnings-history', interval, count],
    () => getEarningsHistory(interval, count),
    { 
      refreshInterval: 300_000,
      errorRetryInterval: 5000,
    }
  );

  return {
    earnings: data,
    isLoading,
    error,
  };
}
