import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { getClosestPriceAtDate, useRunePrice, useRunePriceHistory } from '../use-rune-price';
import * as midgard from '@/lib/api/midgard';
import * as mockDataModule from '../../mock-data';

vi.mock('@/lib/api/midgard');
vi.mock('../../mock-data', async () => {
  const actual = await vi.importActual<typeof import('../../mock-data')>('../../mock-data');
  return {
    ...actual,
    isDevelopmentMode: vi.fn(() => false),
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

describe('useRunePrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockDataModule.isDevelopmentMode).mockReturnValue(false);
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 price when Midgard returns no intervals', async () => {
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
      intervals: [],
      meta: {
        startTime: '0',
        endTime: '0',
        startRunePriceUSD: '0',
        endRunePriceUSD: '0',
      },
    } as unknown as midgard.RunePriceHistoryRaw);

    const { result } = renderHook(() => useRunePrice(), { wrapper });
    await waitFor(() => expect(result.current.price).toBe(0));
  });

  it('returns most recent price for multiple intervals', async () => {
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
      meta: {
        startTime: '0',
        endTime: '1',
        startRunePriceUSD: '1.0',
        endRunePriceUSD: '3.0',
      },
      intervals: [
        { startTime: '0', endTime: '1', runePriceUSD: '1.0' },
        { startTime: '1', endTime: '2', runePriceUSD: '2.0' },
        { startTime: '2', endTime: '3', runePriceUSD: '3.0' },
      ],
    });

    const { result } = renderHook(() => useRunePrice(), { wrapper });
    await waitFor(() => expect(result.current.price).toBe(3.0));
  });

  it('returns the price for a single interval', async () => {
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
      meta: {
        startTime: '0',
        endTime: '1',
        startRunePriceUSD: '5.0',
        endRunePriceUSD: '5.0',
      },
      intervals: [
        { startTime: '0', endTime: '1', runePriceUSD: '5.0' },
      ],
    });

    const { result } = renderHook(() => useRunePrice(), { wrapper });
    await waitFor(() => expect(result.current.price).toBe(5.0));
  });

  it('normalizes nanosecond timestamps and exposes fresh price metadata', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2023-11-14T23:00:00.000Z').getTime());
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
      intervals: [
        { startTime: '1700000000000000000', endTime: '1700003600000000000', runePriceUSD: '4.25' },
      ],
    } as unknown as midgard.RunePriceHistoryRaw);

    const { result } = renderHook(() => useRunePrice(), { wrapper });

    await waitFor(() => expect(result.current.price).toBe(4.25));
    expect(result.current.updatedAt?.toISOString()).toBe('2023-11-14T23:13:20.000Z');
    expect(result.current.updatedAtTimestampSeconds).toBe(1700003600);
    expect(result.current.isStale).toBe(false);
    nowSpy.mockRestore();
  });

  it('marks current RUNE price data stale when the latest interval is older than the freshness window', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2023-11-17T00:00:00.000Z').getTime());
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
      intervals: [
        { startTime: '1700000000', endTime: '1700003600', runePriceUSD: '4.25' },
      ],
    } as unknown as midgard.RunePriceHistoryRaw);

    const { result } = renderHook(() => useRunePrice(), { wrapper });

    await waitFor(() => expect(result.current.price).toBe(4.25));
    expect(result.current.isStale).toBe(true);
    expect(result.current.ageMs).toBeGreaterThan(result.current.staleAfterMs);
    nowSpy.mockRestore();
  });

  it.each(['not-a-price', '0', '-1'])(
    'does not expose %s as usable current RUNE quote data',
    async (badPrice) => {
      vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
        intervals: [
          { startTime: '1700000000', endTime: '1700003600', runePriceUSD: '4.25' },
          { startTime: '1700003600', endTime: '1700007200', runePriceUSD: badPrice },
        ],
      } as unknown as midgard.RunePriceHistoryRaw);

      const { result } = renderHook(() => useRunePrice(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.price).toBe(0);
      expect(Number.isNaN(result.current.price)).toBe(false);
    }
  );

  it('filters malformed RUNE price history intervals before deriving current and oldest prices', async () => {
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
      intervals: [
        { startTime: '1700000000', endTime: '1700003600', runePriceUSD: 'not-a-price' },
        { startTime: '1700003600', endTime: '1700007200', runePriceUSD: '-1' },
        { startTime: '1700007200', endTime: '1700010800', runePriceUSD: '4.25' },
        { startTime: 'bad-time', endTime: '1700014400', runePriceUSD: '4.5' },
        { startTime: '1700014400', endTime: '1700018000', runePriceUSD: '4.75' },
      ],
    } as unknown as midgard.RunePriceHistoryRaw);

    const { result } = renderHook(() => useRunePriceHistory('hour', 5), { wrapper });

    await waitFor(() => expect(result.current.intervals).toHaveLength(2));

    expect(result.current.oldestPrice).toBe(4.25);
    expect(result.current.price).toBe(4.75);
    expect(result.current.intervals.map((item) => item.runePriceUSD)).toEqual([4.25, 4.75]);
    expect(result.current.intervals.every((item) => Number.isFinite(item.runePriceUSD) && item.runePriceUSD > 0)).toBe(true);
  });

  it('ignores invalid price intervals when finding the closest historical quote', () => {
    const target = new Date('2023-11-14T22:30:00.000Z');

    expect(getClosestPriceAtDate([
      { timestamp: new Date('2023-11-14T22:29:00.000Z'), runePriceUSD: Number.NaN },
      { timestamp: new Date('2023-11-14T22:31:00.000Z'), runePriceUSD: 0 },
      { timestamp: new Date('2023-11-14T22:35:00.000Z'), runePriceUSD: 4.25 },
    ], target)).toBe(4.25);

    expect(getClosestPriceAtDate([
      { timestamp: new Date('2023-11-14T22:29:00.000Z'), runePriceUSD: Number.NaN },
      { timestamp: new Date('2023-11-14T22:31:00.000Z'), runePriceUSD: -1 },
    ], target)).toBe(0);
  });

  it('returns mock price when NEXT_PUBLIC_USE_MOCK_DATA=true', () => {
    vi.mocked(mockDataModule.isDevelopmentMode).mockReturnValue(true);
    // Ensure the API is NOT called in mock mode
    vi.mocked(midgard.getRunePriceHistory).mockRejectedValueOnce(new Error('should not be called'));

    const { result } = renderHook(() => useRunePrice(), { wrapper });

    // Mock mode returns data synchronously — no loading state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.price).toBe(0.4972);
  });

  it('builds mock price history around the current time instead of a fixed stale date', () => {
    vi.mocked(mockDataModule.isDevelopmentMode).mockReturnValue(true);
    const now = new Date('2026-06-12T12:00:00.000Z');
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const { result } = renderHook(() => useRunePriceHistory('hour', 3), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.updatedAt?.toISOString()).toBe(now.toISOString());
    expect(result.current.updatedAtTimestampSeconds).toBe(Math.floor(now.getTime() / 1000));
    expect(result.current.isStale).toBe(false);
    expect(result.current.intervals.map((item) => item.timestamp.toISOString())).toEqual([
      '2026-06-12T10:00:00.000Z',
      '2026-06-12T11:00:00.000Z',
      '2026-06-12T12:00:00.000Z',
    ]);
    expect(midgard.getRunePriceHistory).not.toHaveBeenCalled();

    nowSpy.mockRestore();
  });
});
