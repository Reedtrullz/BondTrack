import useSWR from 'swr';
import { getEarningsHistory, type EarningsHistoryRaw } from '@/lib/api/midgard';
import { MOCK_EARNINGS_HISTORY, MOCK_RUNE_PRICE, isDevelopmentMode } from '../mock-data';

function buildMockEarningsHistory(count: number): EarningsHistoryRaw {
  const slice = MOCK_EARNINGS_HISTORY.slice(-count);
  const intervals = slice.map((entry) => {
    const startTime = Math.floor(entry.time / 1000);
    const endTime = startTime + 24 * 60 * 60;
    const earnings = String(entry.earnings);

    return {
      startTime: String(startTime),
      endTime: String(endTime),
      liquidityFees: '0',
      blockRewards: earnings,
      earnings,
      bondingEarnings: earnings,
      liquidityEarnings: '0',
      avgNodeCount: '99',
      runePriceUSD: String(MOCK_RUNE_PRICE),
      pools: [],
    };
  });

  const first = intervals[0] ?? {
    startTime: String(Math.floor(Date.now() / 1000)),
    endTime: String(Math.floor(Date.now() / 1000)),
    liquidityFees: '0',
    blockRewards: '0',
    earnings: '0',
    bondingEarnings: '0',
    liquidityEarnings: '0',
    avgNodeCount: '0',
    runePriceUSD: String(MOCK_RUNE_PRICE),
    pools: [],
  };

  const last = intervals[intervals.length - 1] ?? first;

  return {
    meta: {
      startTime: first.startTime,
      endTime: last.endTime,
      liquidityFees: '0',
      blockRewards: last.blockRewards,
      earnings: last.earnings,
      bondingEarnings: last.bondingEarnings,
      liquidityEarnings: '0',
      avgNodeCount: '99',
      runePriceUSD: String(MOCK_RUNE_PRICE),
      pools: [],
    },
    intervals,
  };
}

export function useEarningsHistory(interval = 'day', count = 30) {
  const useMockData = isDevelopmentMode();
  const { data, error, isLoading } = useSWR<EarningsHistoryRaw>(
    useMockData ? null : ['earnings-history', interval, count],
    () => getEarningsHistory(interval, count),
    { 
      refreshInterval: 300_000,
      errorRetryInterval: 5000,
    }
  );

  return {
    earnings: useMockData ? buildMockEarningsHistory(count) : data,
    isLoading: useMockData ? false : isLoading,
    error: useMockData ? undefined : error,
  };
}
