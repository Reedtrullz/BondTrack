import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { getActions, getBondDetails } from '@/lib/api/midgard';
import { NETWORK } from '@/lib/config';

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

const address = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';
const invalidChecksumAddress = 'thor1qyqszqgpqyqszqgpqyqszqgpqyqszqgp55c9cx';
const testnetAddress = 'tthor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ng5t8';

function midgardDate(date: string): string {
  const seconds = Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 1000);
  return (BigInt(seconds) * 1_000_000_000n).toString();
}

function action(index: number) {
  return {
    type: 'bond',
    date: midgardDate('2024-01-10'),
    height: String(index + 1),
    pools: [],
    memo: `BOND:thor1node${index}`,
    tx: {
      type: '',
      address,
      coins: [{ asset: 'THOR.RUNE', amount: '100000000' }],
      txID: `bond-tx-${index}`,
      chain: 'THOR',
      fromAddress: address,
    },
    status: 'success',
  };
}

describe('/api/address/[address]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBondDetails.mockResolvedValue({
      address,
      totalBonded: '250000000',
      nodes: [],
    });
    mockGetActions.mockResolvedValue({ count: '0', actions: [] });
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

  it.each([
    ['checksum-invalid', invalidChecksumAddress],
    ['testnet', testnetAddress],
  ])('rejects %s addresses before fetching Midgard data', async (_label, candidate) => {
    const response = await GET(
      new NextRequest(`http://localhost/api/address/${candidate}`),
      { params: Promise.resolve({ address: candidate }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A valid THORChain mainnet address is required' });
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    expect(mockGetActions).not.toHaveBeenCalled();
    expect(mockGetBondDetails).not.toHaveBeenCalled();
  });

  it('normalizes checksum-valid addresses before passing them to Midgard', async () => {
    const response = await GET(
      new NextRequest(`http://localhost/api/address/${address.toUpperCase()}`),
      { params: Promise.resolve({ address: address.toUpperCase() }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.address).toBe(address);
    expect(mockGetBondDetails).toHaveBeenCalledWith(address);
    expect(mockGetActions).toHaveBeenCalledWith(address, NETWORK.MAX_ACTIONS_LIMIT, undefined, 'type', 0);
  });

  it('fetches address actions in Midgard-safe chunks of at most NETWORK.MAX_ACTIONS_LIMIT', async () => {
    mockGetActions
      .mockResolvedValueOnce({ count: '120', actions: Array.from({ length: 50 }, (_, index) => action(index)) })
      .mockResolvedValueOnce({ count: '120', actions: Array.from({ length: 50 }, (_, index) => action(index + 50)) })
      .mockResolvedValueOnce({ count: '120', actions: Array.from({ length: 20 }, (_, index) => action(index + 100)) });

    const response = await GET(
      new NextRequest(`http://localhost/api/address/${address}?limit=120`),
      { params: Promise.resolve({ address }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.actionCount).toBe(120);
    expect(mockGetActions).toHaveBeenCalledTimes(3);
    expect(mockGetActions.mock.calls.map((call) => call[1])).toEqual([50, 50, 20]);
    expect(mockGetActions.mock.calls.every((call) => Number(call[1]) <= NETWORK.MAX_ACTIONS_LIMIT)).toBe(true);
    expect(mockGetActions.mock.calls.map((call) => call[4])).toEqual([0, 50, 100]);
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
