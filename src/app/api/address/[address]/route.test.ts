import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { getActions, getBondDetails } from '@/lib/api/midgard';

vi.mock('@/lib/api/midgard', () => ({
  getActions: vi.fn(),
  getBondDetails: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

const mockGetActions = vi.mocked(getActions);
const mockGetBondDetails = vi.mocked(getBondDetails);

const address = 'thor1qyqszqgpqyqszqgpqyqszqgpqyqszqgp55c9cr';

function midgardDate(date: string): string {
  const seconds = Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 1000);
  return (BigInt(seconds) * 1_000_000_000n).toString();
}

describe('/api/address/[address]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBondDetails.mockResolvedValue({
      address,
      totalBonded: '250000000',
      nodes: [],
    });
  });

  it('rejects non-positive, fractional, weird, or too-large limits before fetching Midgard data', async () => {
    for (const limit of ['0', '-1', '1.5', '10abc', '1001']) {
      vi.clearAllMocks();
      const response = await GET(
        new NextRequest(`http://localhost/api/address/${address}?limit=${encodeURIComponent(limit)}`),
        { params: Promise.resolve({ address }) }
      );

      expect(response.status).toBe(400);
      expect(response.headers.get('Cache-Control')).toBe('no-store, private');
      expect(mockGetActions).not.toHaveBeenCalled();
      expect(mockGetBondDetails).not.toHaveBeenCalled();
    }
  });

  it('labels bond action amounts as base units and human RUNE instead of returning raw unlabeled amount', async () => {
    mockGetActions.mockResolvedValue({
      count: '1',
      actions: [
        {
          type: 'bond',
          date: midgardDate('2024-01-10'),
          height: '1',
          pools: [],
          memo: 'BOND:thor1node',
          tx: {
            type: '',
            address,
            coins: [{ asset: 'THOR.RUNE', amount: '250000000' }],
            txID: 'bond-tx',
            chain: 'THOR',
            fromAddress: address,
          },
          status: 'success',
        },
      ],
    });

    const response = await GET(
      new NextRequest(`http://localhost/api/address/${address}`),
      { params: Promise.resolve({ address }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.actions[0]).toMatchObject({
      amountBaseUnits: '250000000',
      amountRune: 2.5,
    });
    expect(body.actions[0]).not.toHaveProperty('amount');
  });
});
