import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCoingeckoRunePrice } from './coingecko';

describe('getCoingeckoRunePrice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the price closest to the requested timestamp', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        prices: [
          [1_700_000_000_000, 0.48],
          [1_700_001_000_000, 0.52],
          [1_700_002_000_000, 0.55],
        ],
      }),
    }));

    await expect(getCoingeckoRunePrice(1_700_001_100)).resolves.toBe(0.52);
    expect(fetch).toHaveBeenCalledWith(
      '/api/coingecko/coins/thorchain/market_chart/range?vs_currency=usd&from=1699993900&to=1700008300',
      { headers: { Accept: 'application/json' } }
    );
  });

  it('returns null without console noise when the proxy returns an error status', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'CoinGecko unavailable' }),
    }));

    await expect(getCoingeckoRunePrice(1_700_000_000)).resolves.toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns null without console noise when the proxy request fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(getCoingeckoRunePrice(1_700_000_000)).resolves.toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns null when the proxy payload has no valid positive prices', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        prices: [
          [1_700_000_000_000, 0],
          [1_700_001_000_000, Number.NaN],
          ['bad timestamp', 0.55],
        ],
      }),
    }));

    await expect(getCoingeckoRunePrice(1_700_000_000)).resolves.toBeNull();
  });
});
