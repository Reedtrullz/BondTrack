import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { useRunePrice } from '../use-rune-price';
import * as midgard from '@/lib/api/midgard';

vi.mock('@/lib/api/midgard');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

describe('useRunePrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for empty intervals', async () => {
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
      intervals: [],
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
});
