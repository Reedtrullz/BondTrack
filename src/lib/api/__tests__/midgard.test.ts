import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCoingeckoRunePrice } from '../coingecko';
import { getActions, getHistoricalRunePrice, getHistoricalRunePriceWithSource, getPoolHistoryAtTimestamp } from '../midgard';
import { fetchMidgard } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  fetchMidgard: vi.fn(),
}));
vi.mock('../coingecko', () => ({
  getCoingeckoRunePrice: vi.fn(),
}));

describe('getActions', () => {
  beforeEach(() => {
    vi.mocked(fetchMidgard).mockReset();
    vi.mocked(fetchMidgard).mockResolvedValue({ actions: [], count: '0' });
  });

  it('serializes bond history filters with txType and limit 50', async () => {
    await getActions('thor1testaddress', 50, 'bond,unbond,leave', 'txType');

    expect(fetchMidgard).toHaveBeenCalledWith(
      '/v2/actions?address=thor1testaddress&limit=50&txType=bond%2Cunbond%2Cleave'
    );
  });
});

describe('historical lookup helpers', () => {
  beforeEach(() => {
    vi.mocked(fetchMidgard).mockReset();
    vi.mocked(getCoingeckoRunePrice).mockReset();
    vi.mocked(getCoingeckoRunePrice).mockResolvedValue(null);
  });

  it('uses the interval containing the requested historical timestamp even when the next interval start is numerically closer', async () => {
    vi.mocked(fetchMidgard).mockResolvedValueOnce({
      intervals: [
        {
          startTime: '1700000000000000000',
          endTime: '1700086400000000000',
          runePriceUSD: '0.5',
        },
        {
          startTime: '1700086400000000000',
          endTime: '1700172800000000000',
          runePriceUSD: '0.6',
        },
      ],
      meta: {
        startTime: '1700000000000000000',
        endTime: '1700172800000000000',
        startRunePriceUSD: '0.5',
        endRunePriceUSD: '0.6',
      },
    } as never);

    const result = await getHistoricalRunePrice(1700086300);

    expect(result).toBe(0.5);
  });

  it('returns source metadata for Midgard historical RUNE prices', async () => {
    vi.mocked(fetchMidgard).mockResolvedValueOnce({
      intervals: [
        {
          startTime: '1700000000',
          endTime: '1700086400',
          runePriceUSD: '0.5',
        },
      ],
      meta: {
        startTime: '1700000000',
        endTime: '1700086400',
        startRunePriceUSD: '0.5',
        endRunePriceUSD: '0.5',
      },
    } as never);

    const result = await getHistoricalRunePriceWithSource(1700000100);

    expect(result).toEqual({ price: 0.5, source: 'midgard' });
    expect(getCoingeckoRunePrice).not.toHaveBeenCalled();
  });

  it('labels CoinGecko fallback prices so consumers do not treat them as Midgard historical coverage', async () => {
    vi.mocked(fetchMidgard).mockResolvedValueOnce({
      intervals: [
        {
          startTime: '1700000000',
          endTime: '1700086400',
          runePriceUSD: 'not-a-price',
        },
      ],
      meta: {
        startTime: '1700000000',
        endTime: '1700086400',
        startRunePriceUSD: '0',
        endRunePriceUSD: '0',
      },
    } as never);
    vi.mocked(getCoingeckoRunePrice).mockResolvedValueOnce(0.42);

    const result = await getHistoricalRunePriceWithSource(1700000100);

    expect(result).toEqual({ price: 0.42, source: 'coingecko' });
    expect(getCoingeckoRunePrice).toHaveBeenCalledWith(1700000100);
  });

  it('returns null when the available history does not cover the requested timestamp', async () => {
    vi.mocked(fetchMidgard).mockResolvedValueOnce({
      intervals: [
        {
          startTime: '1776902400',
          endTime: '1776988800',
          runePriceUSD: '0.48',
        },
      ],
      meta: {
        startTime: '1776902400',
        endTime: '1776988800',
        startRunePriceUSD: '0.48',
        endRunePriceUSD: '0.48',
      },
    } as never);

    const result = await getHistoricalRunePrice(1700000000);

    expect(result).toBeNull();
  });

  it('returns null without console noise when historical RUNE lookup has a network-style failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetchMidgard).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await getHistoricalRunePrice(1700000000);

    expect(result).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('normalizes pool history interval timestamps and returns the containing interval entry', async () => {
    vi.mocked(fetchMidgard).mockResolvedValueOnce({
      intervals: [
        {
          startTime: '1700000000000000000',
          endTime: '1700086400000000000',
          runeDepth: '250000000000',
          assetDepth: '500000000000',
          synthSupply: '0',
          synthDepth: '0',
          liquidityUnits: '1000',
          lpUnits: '1000',
          membersCount: '1',
          status: 'available',
        },
        {
          startTime: '1700086400000000000',
          endTime: '1700172800000000000',
          runeDepth: '300000000000',
          assetDepth: '600000000000',
          synthSupply: '0',
          synthDepth: '0',
          liquidityUnits: '1200',
          lpUnits: '1200',
          membersCount: '1',
          status: 'available',
        },
      ],
    } as never);

    const result = await getPoolHistoryAtTimestamp('GAIA.ATOM', 1700086300);

    expect(result).toEqual({
      timestamp: 1700000000,
      runeDepth: '250000000000',
      assetDepth: '500000000000',
      liquidityUnits: '1000',
    });
  });

  it('returns null without console noise when pool history lookup has a network-style failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetchMidgard).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await getPoolHistoryAtTimestamp('BTC.BTC', 1700000000);

    expect(result).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('treats shared interval boundaries as belonging to the next bucket', async () => {
    vi.mocked(fetchMidgard).mockResolvedValueOnce({
      intervals: [
        {
          startTime: '1700000000000000000',
          endTime: '1700086400000000000',
          runePriceUSD: '0.5',
        },
        {
          startTime: '1700086400000000000',
          endTime: '1700172800000000000',
          runePriceUSD: '0.6',
        },
      ],
      meta: {
        startTime: '1700000000000000000',
        endTime: '1700172800000000000',
        startRunePriceUSD: '0.5',
        endRunePriceUSD: '0.6',
      },
    } as never);

    const result = await getHistoricalRunePrice(1700086400);

    expect(result).toBe(0.6);
  });
});
