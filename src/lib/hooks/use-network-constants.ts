import useSWR from 'swr';
import { getNetworkConstants, type NetworkConstantsRaw } from '@/lib/api/thornode';

export function useNetworkConstants() {
  const { data, error, isLoading } = useSWR<NetworkConstantsRaw>(
    'network-constants',
    () => getNetworkConstants(),
    {
      revalidateOnFocus: false,
      refreshInterval: 300_000,
      errorRetryInterval: 5000,
    }
  );

  return {
    constants: data?.int_64_values ?? null,
    isLoading,
    error,
  };
}
