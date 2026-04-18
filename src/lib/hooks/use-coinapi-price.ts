import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCoinApiRunePrice(date: Date | null) {
  const dateStr = date?.toISOString().slice(0, 10) || '';
  
  const { data, error, isLoading } = useSWR(
    date ? `/api/coinapi/rune-price?date=${dateStr}` : null,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    }
  );

  return {
    price: data?.price || null,
    isLoading,
    error,
  };
}