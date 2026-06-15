import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePendingTransactions } from '../use-pending-transactions';

const STORAGE_KEY = 'heimdall-pending-txs';

const createLocalStorageMock = () => {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
};

describe('usePendingTransactions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00.000Z'));
    Object.defineProperty(window, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps pending transaction state usable when browser storage is unavailable', () => {
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage denied');
      },
    });

    try {
      const { result } = renderHook(() => usePendingTransactions());

      act(() => {
        result.current.addPendingTx({
          txHash: 'ABC123',
          type: 'BOND',
          nodeAddress: 'thor1nodepending',
          amount: '1',
        });
      });

      expect(result.current.hasPendingTx()).toBe(true);
      expect(result.current.pendingTxs[0]).toMatchObject({
        txHash: 'ABC123',
        status: 'pending',
      });
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
    }
  });

  it('removes transactions from the pending list when they are confirmed or failed', () => {
    const { result } = renderHook(() => usePendingTransactions());

    act(() => {
      result.current.addPendingTx({
        txHash: 'CONFIRMED123',
        type: 'BOND',
        nodeAddress: 'thor1nodepending',
        amount: '1',
      });
      result.current.addPendingTx({
        txHash: 'FAILED123',
        type: 'UNBOND',
        nodeAddress: 'thor1nodepending',
        amount: '0',
      });
    });

    expect(result.current.pendingTxs).toHaveLength(2);
    expect(result.current.hasPendingTx()).toBe(true);

    act(() => {
      result.current.updateTxStatus('CONFIRMED123', 'confirmed');
    });

    expect(result.current.pendingTxs).toHaveLength(1);
    expect(result.current.pendingTxs[0]).toMatchObject({ txHash: 'FAILED123' });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([
      expect.objectContaining({ txHash: 'FAILED123', status: 'pending' }),
    ]);

    act(() => {
      result.current.updateTxStatus('FAILED123', 'failed');
    });

    expect(result.current.pendingTxs).toEqual([]);
    expect(result.current.hasPendingTx()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('drops expired stored transactions during initialization', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      {
        txHash: 'EXPIRED123',
        type: 'BOND',
        nodeAddress: 'thor1nodepending',
        amount: '1',
        timestamp: Date.now() - 11 * 60 * 1000,
        status: 'pending',
      },
      {
        txHash: 'ACTIVE123',
        type: 'BOND',
        nodeAddress: 'thor1nodepending',
        amount: '1',
        timestamp: Date.now() - 2 * 60 * 1000,
        status: 'pending',
      },
      {
        txHash: 'CONFIRMED123',
        type: 'BOND',
        nodeAddress: 'thor1nodepending',
        amount: '1',
        timestamp: Date.now(),
        status: 'confirmed',
      },
    ]));

    const { result } = renderHook(() => usePendingTransactions());

    expect(result.current.pendingTxs).toEqual([
      expect.objectContaining({ txHash: 'ACTIVE123', status: 'pending' }),
    ]);
    expect(result.current.hasPendingTx()).toBe(true);
  });
});
