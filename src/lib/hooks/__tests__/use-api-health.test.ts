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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHealth).mockResolvedValue({ lastThorNode: { height: 12345678 } });
    vi.mocked(getAllNodes).mockResolvedValue([]);
  });

  it('marks source probes so E2E mocks can distinguish health checks from data requests', async () => {
    renderHook(() => useApiHealth());

    await waitFor(() => expect(getHealth).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getAllNodes).toHaveBeenCalledTimes(1));

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
});
