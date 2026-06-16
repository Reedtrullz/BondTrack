import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActions,
  getBondDetails,
  type ActionRaw,
  type ActionsResponseRaw,
  type BondDetailsRaw,
} from '@/lib/api/midgard';
import { useBondHistory } from '../use-bond-history';

vi.mock('@/lib/api/midgard', () => ({
  getActions: vi.fn(),
  getBondDetails: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map(), dedupingInterval: 0 } }, children);

const ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';

function action(index: number, amountRune = 1): ActionRaw {
  return {
    type: 'bond',
    date: `${1_700_000_000_000_000_000n + BigInt(index)}`,
    height: String(15_000_000 + index),
    pools: [],
    memo: 'BOND:thor1nodeaddress',
    status: 'success',
    tx: {
      type: 'bond',
      address: ADDRESS,
      coins: [{ asset: 'THOR.RUNE', amount: String(amountRune * 100_000_000) }],
      txID: `TX${index}`,
      chain: 'THOR',
      fromAddress: ADDRESS,
    },
    in: [
      {
        address: ADDRESS,
        coins: [{ asset: 'THOR.RUNE', amount: String(amountRune * 100_000_000) }],
        txID: `TX${index}`,
      },
    ],
    metadata: {
      bond: {
        memo: 'BOND:thor1nodeaddress',
        nodeAddress: 'thor1nodeaddress',
      },
    },
  };
}

function actionsResponse(actions: ActionRaw[], count: number): ActionsResponseRaw {
  return {
    actions,
    count: String(count),
  };
}

describe('useBondHistory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getBondDetails).mockResolvedValue({
      totalBonded: '3000000000',
    } as BondDetailsRaw);
  });

  it('paginates Midgard bond actions before deriving a complete baseline', async () => {
    vi.mocked(getActions)
      .mockResolvedValueOnce(actionsResponse(Array.from({ length: 50 }, (_, index) => action(index)), 51))
      .mockResolvedValueOnce(actionsResponse([action(50)], 51));

    const { result } = renderHook(() => useBondHistory(ADDRESS), { wrapper });

    await waitFor(() => expect(result.current.history?.loadedActionCount).toBe(51));

    expect(getActions).toHaveBeenNthCalledWith(1, ADDRESS, 50, 'bond,unbond,leave', 'txType', 0);
    expect(getActions).toHaveBeenNthCalledWith(2, ADDRESS, 50, 'bond,unbond,leave', 'txType', 50);
    expect(result.current.history).toMatchObject({
      actionLimit: 1000,
      currentBond: 30,
      initialBond: 51,
      isPartial: false,
      loadedActionCount: 51,
      totalActionCount: 51,
    });
  });

  it('marks history partial when the local action cap is reached before Midgard count is exhausted', async () => {
    vi.mocked(getActions).mockImplementation(async (_address, _limit, _actionTypes, _typeParam, offset = 0) => {
      return actionsResponse(
        Array.from({ length: 50 }, (_, index) => action(offset + index)),
        1001
      );
    });

    const { result } = renderHook(() => useBondHistory(ADDRESS), { wrapper });

    await waitFor(() => expect(result.current.history?.loadedActionCount).toBe(1000));

    expect(getActions).toHaveBeenCalledTimes(20);
    expect(getActions).toHaveBeenLastCalledWith(ADDRESS, 50, 'bond,unbond,leave', 'txType', 950);
    expect(result.current.history).toMatchObject({
      actionLimit: 1000,
      isPartial: true,
      loadedActionCount: 1000,
      totalActionCount: 1001,
    });
  });
});
