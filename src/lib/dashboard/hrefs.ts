export interface DashboardHrefOptions {
  address?: string | null;
  hash?: string;
  params?: Record<string, string | number | null | undefined>;
}

export function buildDashboardHref(path: string, options: DashboardHrefOptions = {}): string {
  const searchParams = new URLSearchParams();

  if (options.address?.trim()) {
    searchParams.set('address', options.address.trim());
  }

  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value === null || value === undefined || String(value).trim() === '') continue;
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return `${path}${query ? `?${query}` : ''}${options.hash ? `#${options.hash}` : ''}`;
}

export function buildNodeRiskHref(address: string | null | undefined, nodeAddress: string, hash?: string): string {
  return buildDashboardHref('/dashboard/risk', {
    address,
    hash,
    params: { node: nodeAddress },
  });
}

export function buildBondMemoHref(
  address: string | null | undefined,
  nodeAddress: string,
  action: 'bond' | 'unbond' = 'bond'
): string {
  return buildDashboardHref('/dashboard/transactions', {
    address,
    params: { action, node: nodeAddress },
  });
}
