import { ENDPOINTS } from '@/lib/config';

const RETRY_DELAYS = [1000, 2000, 4000];
const MAX_RETRIES = 3;

type NextFetchInit = RequestInit & { next?: { revalidate?: number } };

class RetryableError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'RetryableError';
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

function resolveThornodeBase(path: string): string {
  const configuredBase = normalizeBaseUrl(process.env.THORNODE_API_URL || ENDPOINTS.thornode);

  if ((path.startsWith('/thorchain/') || path.startsWith('/cosmos/')) && /\/thorchain$/i.test(configuredBase)) {
    return configuredBase.replace(/\/thorchain$/i, '');
  }

  return configuredBase;
}

function resolveMidgardBase(): string {
  return normalizeBaseUrl(process.env.MIDGARD_API_URL || ENDPOINTS.midgard);
}

async function fetchApi<T>(baseUrl: string, path: string, init?: RequestInit, retryCount = 0): Promise<T> {
  const url = `${baseUrl}${path}`;

  let res: Response;
  try {
    const fetchInit: NextFetchInit = {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
      next: { revalidate: 60 },
    };

    res = await fetch(url, fetchInit);
  } catch (networkError) {
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAYS[retryCount]);
      return fetchApi<T>(baseUrl, path, init, retryCount + 1);
    }
    throw new RetryableError(`Network error: ${networkError}`);
  }

  if (!res.ok) {
    if (res.status >= 500 && retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAYS[retryCount]);
      return fetchApi<T>(baseUrl, path, init, retryCount + 1);
    }
    throw new Error(`API error: ${res.status} ${res.statusText} at ${url}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchThornode<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = isBrowserRuntime() ? '/api/thorchain' : resolveThornodeBase(path);

  try {
    return await fetchApi<T>(baseUrl, path, init);
  } catch (error) {
    throw new Error(`THORNode ${isBrowserRuntime() ? 'proxy' : 'upstream'} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function fetchMidgard<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = isBrowserRuntime() ? '/api/midgard' : resolveMidgardBase();

  try {
    return await fetchApi<T>(baseUrl, path, init);
  } catch (error) {
    throw new Error(`Midgard ${isBrowserRuntime() ? 'proxy' : 'upstream'} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
