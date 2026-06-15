import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHealth } from '@/lib/api/midgard';
import { getAllNodes } from '@/lib/api/thornode';
import { useApiHealth } from '../use-api-health';

vi.mock('@/lib/api/midgard', () => ({
  getHealth: vi.fn(),
}));

vi.mock('@/lib/api/thornode', () => ({
  getAllNodes: vi.fn(),
}));

describe('useApiHealth', () => {
  const usableThornodeNodes = [{
    node_address: 'thor1healthprobe0000000000000000000000000',
    status: 'Active',
  }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHealth).mockResolvedValue({ lastThorNode: { height: 12345678 } });
    vi.mocked(getAllNodes).mockResolvedValue(usableThornodeNodes as never);
  });

  it('marks source probes so E2E mocks can distinguish health checks from data requests', async () => {
    const { result } = renderHook(() => useApiHealth());

    await waitFor(() => expect(getHealth).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getAllNodes).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.thornode).toBe('healthy'));

    expect(getHealth).toHaveBeenCalledWith({
      cache: 'no-store',
      headers: { 'X-Heimdall-Health-Probe': 'midgard' },
      retry: false,
    });
    expect(getAllNodes).toHaveBeenCalledWith({
      cache: 'no-store',
      headers: { 'X-Heimdall-Health-Probe': 'thornode' },
      retry: false,
    });
  });

  it('treats an empty THORNode nodes response as degraded instead of fresh', async () => {
    vi.mocked(getAllNodes).mockResolvedValue([]);

    const { result } = renderHook(() => useApiHealth());

    await waitFor(() => expect(getAllNodes).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.thornode).toBe('degraded'));

    expect(result.current.lastSuccessful.thornode).toBeNull();
  });

  it('treats malformed THORNode node records as degraded instead of fresh', async () => {
    vi.mocked(getAllNodes).mockResolvedValue([{ node_address: '', status: '' }] as never);

    const { result } = renderHook(() => useApiHealth());

    await waitFor(() => expect(getAllNodes).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.thornode).toBe('degraded'));

    expect(result.current.lastSuccessful.thornode).toBeNull();
  });
});
