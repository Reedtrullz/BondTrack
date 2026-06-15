import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActions, type ActionsResponseRaw } from '@/lib/api/midgard';
import { useTransactionHistory } from '../use-transaction-history';

vi.mock('@/lib/api/midgard', () => ({
  getActions: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

const ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

describe('useTransactionHistory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('keeps transactions visible without console noise when Midgard sends a malformed date', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getActions).mockResolvedValueOnce({
      actions: [
        {
          type: 'bond',
          date: 'not-a-midgard-nanosecond-timestamp',
          height: '15341504',
          pools: [],
          memo: 'BOND:thor1nodeaddress',
          status: 'success',
          in: [
            {
              address: ADDRESS,
              coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
              txID: 'ABC123',
            },
          ],
          metadata: {
            bond: {
              memo: 'BOND:thor1nodeaddress',
              nodeAddress: 'thor1nodeaddress',
            },
          },
        },
      ],
      count: '1',
    } as unknown as ActionsResponseRaw);

    const { result } = renderHook(() => useTransactionHistory(ADDRESS), { wrapper });

    await waitFor(() => expect(result.current.transactions).toHaveLength(1));

    expect(result.current.transactions[0]).toMatchObject({
      type: 'BOND',
      amount: 100,
      nodeAddress: 'thor1nodeaddress',
      txHash: 'ABC123',
      timestampKnown: false,
    });
    expect(Number.isNaN(result.current.transactions[0].timestamp.getTime())).toBe(false);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('surfaces history unavailability without console errors or fallback warnings', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(getActions).mockRejectedValue(new Error('Midgard actions unavailable'));

    const { result } = renderHook(() => useTransactionHistory(ADDRESS), { wrapper });

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));

    expect(result.current.transactions).toEqual([]);
    expect(getActions).toHaveBeenCalledTimes(3);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('does not relabel LEAVE or generic unstake actions as UNBOND history', async () => {
    vi.mocked(getActions).mockResolvedValueOnce({
      actions: [
        {
          type: 'leave',
          date: '1700000000000000000',
          height: '15341504',
          pools: [],
          memo: 'LEAVE:thor1leavenode',
          status: 'success',
          in: [{ address: ADDRESS, coins: [], txID: 'LEAVE123' }],
        },
        {
          type: 'unstake',
          date: '1700000000000000001',
          height: '15341505',
          pools: [],
          memo: 'UNSTAKE:thor1unstakenode',
          status: 'success',
          in: [{ address: ADDRESS, coins: [], txID: 'UNSTAKE123' }],
          metadata: {
            refund: {
              txType: 'unstake',
              memo: 'UNSTAKE:thor1unstakenode',
            },
          },
        },
        {
          type: 'unbond',
          date: '1700000000000000002',
          height: '15341506',
          pools: [],
          memo: 'UNBOND:thor1unbondnode:100000000',
          status: 'success',
          in: [{ address: ADDRESS, coins: [{ asset: 'THOR.RUNE', amount: '0' }], txID: 'UNBOND123' }],
          metadata: {
            refund: {
              txType: 'unbond',
              memo: 'UNBOND:thor1unbondnode:100000000',
            },
          },
        },
      ],
      count: '3',
    } as unknown as ActionsResponseRaw);

    const { result } = renderHook(() => useTransactionHistory(ADDRESS), { wrapper });

    await waitFor(() => expect(result.current.transactions).toHaveLength(1));

    expect(result.current.transactions[0]).toMatchObject({
      type: 'UNBOND',
      nodeAddress: 'thor1unbondnode',
      txHash: 'UNBOND123',
    });
  });
});
