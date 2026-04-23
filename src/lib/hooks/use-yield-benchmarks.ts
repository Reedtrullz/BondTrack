'use client';

import useSWR from 'swr';
import { fetchYieldBenchmarks, type YieldBenchmarks } from '@/lib/utils/yield-benchmarks';

export function useYieldBenchmarks() {
  const { data, error, isLoading, mutate } = useSWR<YieldBenchmarks>(
    'yield-benchmarks',
    () => fetchYieldBenchmarks(),
    { 
      refreshInterval: 300_000, // 5 minutes
      revalidateOnFocus: false 
    }
  );

  return {
    benchmarks: data,
    isLoading,
    error,
    mutate,
  };
}
