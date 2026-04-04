import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNetworkConstants } from '../use-network-constants';
import * as thornode from '@/lib/api/thornode';
import React from 'react';
import { SWRConfig } from 'swr';

vi.mock('@/lib/api/thornode');

describe('useNetworkConstants refreshInterval', () => {
  beforeEach(() => {
    vi.mocked(thornode.getNetworkConstants).mockReset();
    vi.mocked(thornode.getNetworkConstants).mockResolvedValue({
      int_64_values: { ChurnInterval: 43200 },
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has refreshInterval of 300000ms', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const cache = new Map();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(SWRConfig, { provider: () => cache }, children);

    const { result } = renderHook(() => useNetworkConstants(), { wrapper });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.constants).toBeTruthy();
    expect(thornode.getNetworkConstants).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(300000);
    });

    expect(thornode.getNetworkConstants).toHaveBeenCalledTimes(2);
  });
});
