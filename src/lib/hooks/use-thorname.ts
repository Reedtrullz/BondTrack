import useSWR from 'swr';
import { getTHORNameLookup, type THORNameLookupRaw } from '@/lib/api/midgard';

export interface ResolvedTHORName {
  name: string;
  owner: string;
  preferredAsset: string;
  expireBlock: string;
  addresses: Record<string, string>;
}

export function useTHORName(name: string | null) {
  const { data, error, isLoading } = useSWR<THORNameLookupRaw>(
    name ? ['thorname', name] : null,
    () => getTHORNameLookup(name!),
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
      errorRetryInterval: 5000,
    }
  );

  const resolved: ResolvedTHORName | null = data?.entry
    ? {
        name: data.entry.name,
        owner: data.entry.owner,
        preferredAsset: data.entry.preferred_asset,
        expireBlock: data.entry.expire,
        addresses: data.entry.aliases.reduce(
          (acc, alias) => {
            acc[alias.chain] = alias.address;
            return acc;
          },
          {} as Record<string, string>
        ),
      }
    : null;

  return {
    resolved,
    isLoading,
    error,
  };
}
