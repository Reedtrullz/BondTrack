import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  });

  it('returns 0 for empty intervals', async () => {
    vi.mocked(midgard.getRunePriceHistory).mockResolvedValueOnce({
      intervals: [],
    } as any);

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
});
