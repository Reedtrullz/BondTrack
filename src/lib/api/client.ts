import { ENDPOINTS } from '../config';

const RETRY_DELAYS = [1000, 2000, 4000];
const MAX_RETRIES = 3;

class RetryableError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'RetryableError';
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchApi<T>(baseUrl: string, path: string, init?: RequestInit, retryCount = 0): Promise<T> {
  const url = `${baseUrl}${path}`;
  
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Accept': 'application/json',
        ...init?.headers,
      },
      next: { revalidate: 60 },
    });
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
  const localProxy = '/api/thorchain';
  
  try {
    return await fetchApi<T>(localProxy, path, init);
  } catch (error) {
    throw new Error(`THORNode proxy failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function fetchMidgard<T>(path: string, init?: RequestInit): Promise<T> {
  const localProxy = '/api/midgard';
  
  try {
    return await fetchApi<T>(localProxy, path, init);
  } catch (error) {
    throw new Error(`Midgard proxy failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
