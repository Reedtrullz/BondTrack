import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNetworkConstants } from '../use-network-constants';
import * as thornode from '@/lib/api/thornode';
import React from 'react';
import { SWRConfig } from 'swr';

vi.mock('@/lib/api/thornode');

describe('useNetworkConstants', () => {
  beforeEach(() => {
    vi.mocked(thornode.getNetworkConstants).mockReset();
    vi.mocked(thornode.getNetworkConstants).mockResolvedValue({
      int_64_values: { ChurnInterval: 43200 },
    } as any);
  });

  it('fetches constants on mount', async () => {
    const cache = new Map();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(SWRConfig, { provider: () => cache }, children);

    const { result } = renderHook(() => useNetworkConstants(), { wrapper });

    await waitFor(() => expect(result.current.constants).toBeTruthy());
    expect(thornode.getNetworkConstants).toHaveBeenCalledTimes(1);
  });
});
