import { useState } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch LP positions');
  return res.json();
};

export const useLpPositions = () => {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  const { data, error, isLoading } = useSWR(
    address ? `/v2/member/${address}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Poll every 30 seconds
      revalidateOnFocus: true,
    }
  );

  return {
    positions: isLoading ? [] : data?.positions || [],
    isLoading,
    error: error instanceof Error ? error.message : undefined,
    totalBondedRune: data?.totalBondedRune || '0',
    totalRewards: data?.totalRewards || '0',
  };
};