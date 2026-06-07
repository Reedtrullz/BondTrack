import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMidgard, fetchThornode } from '../client';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('API client proxy fetchers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('fetches THORNode through the local proxy with JSON headers and Next revalidation', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse({ nodes: [] }));

    const result = await fetchThornode<{ nodes: unknown[] }>('/thorchain/nodes', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(result).toEqual({ nodes: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/thorchain/thorchain/nodes',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer test-token',
        },
        next: { revalidate: 60 },
      })
    );
  });

  it('wraps non-retryable Midgard HTTP errors with proxy context', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse({ error: 'not found' }, { status: 404, statusText: 'Not Found' }));

    await expect(fetchMidgard('/v2/members/thor1bad')).rejects.toThrow(
      'Midgard proxy failed: API error: 404 Not Found at /api/midgard/v2/members/thor1bad'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries transient server errors before returning JSON', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'temporarily down' }, { status: 503, statusText: 'Service Unavailable' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const resultPromise = fetchMidgard<{ ok: boolean }>('/v2/health');
    const expectation = expect(resultPromise).resolves.toEqual({ ok: true });
    await vi.runOnlyPendingTimersAsync();

    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries network failures and wraps the final failure with proxy context', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValue(new TypeError('socket closed'));

    const resultPromise = fetchThornode('/thorchain/network');
    const expectation = expect(resultPromise).rejects.toThrow('THORNode proxy failed: Network error: TypeError: socket closed');
    await vi.runAllTimersAsync();

    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('uses absolute upstream URLs when called from a server runtime', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse({ health: 'ok' }));
    vi.stubGlobal('window', undefined);
    vi.stubEnv('MIDGARD_API_URL', 'https://midgard.example');

    await expect(fetchMidgard('/v2/health')).resolves.toEqual({ health: 'ok' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://midgard.example/v2/health',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      })
    );
  });

  it('normalizes THORNode server bases that already include the thorchain segment', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse({ nodes: [] }));
    vi.stubGlobal('window', undefined);
    vi.stubEnv('THORNODE_API_URL', 'https://thornode.example/thorchain');

    await fetchThornode('/thorchain/nodes');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://thornode.example/thorchain/nodes',
      expect.any(Object)
    );
  });
});
