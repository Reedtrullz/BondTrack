import useSWR from 'swr';

async function fetcher(url: string) {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `CoinAPI request failed: ${response.status}`);
  }
  return payload;
}

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
    price: data?.price ?? null,
    isLoading,
    error,
  };
}
