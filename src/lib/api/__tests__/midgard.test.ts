import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActions } from '../midgard';
import { fetchMidgard } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  fetchMidgard: vi.fn(),
}));

describe('getActions', () => {
  beforeEach(() => {
    vi.mocked(fetchMidgard).mockReset();
    vi.mocked(fetchMidgard).mockResolvedValue({ actions: [], count: '0' });
  });

  it('serializes bond history filters with txType and limit 50', async () => {
    await getActions('thor1testaddress', 50, 'bond,unbond,leave');

    expect(fetchMidgard).toHaveBeenCalledWith(
      '/v2/actions?address=thor1testaddress&limit=50&txType=bond%2Cunbond%2Cleave'
    );
  });
});
