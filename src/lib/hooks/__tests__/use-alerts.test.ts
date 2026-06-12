import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { BondPosition } from '@/lib/types/node';
import { AlertProvider, useAlerts, useAlertsContext } from '../use-alerts';

const STORAGE_KEY = 'heimdall-alerts';

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

function makePosition(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    nodeAddress: 'thor1nodealertsaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    nodeOperatorAddress: 'thor1operatoralertsaaaaaaaaaaaaaaaaaaaaaa',
    bondAmount: 10000,
    bondSharePercent: 50,
    status: 'Active',
    operatorFee: 2000,
    operatorFeeFormatted: '20%',
    netAPY: 5,
    totalBond: 20000,
    slashPoints: 4,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '2.3.0',
    requestedToLeave: false,
    ...overrides,
  };
}

describe('useAlerts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00Z'));
    Object.defineProperty(window, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rate-limits by alert type and node address', async () => {
    const { result } = renderHook(() => useAlerts());

    act(() => {
      result.current.triggerAlert('SLASH_INCREASE', 'thor1nodea', 'first slash');
      result.current.triggerAlert('SLASH_INCREASE', 'thor1nodea', 'duplicate slash');
      result.current.triggerAlert('SLASH_INCREASE', 'thor1nodeb', 'second node slash');
      result.current.triggerAlert('JAIL', 'thor1nodea', 'same node different alert type');
    });

    expect(result.current.alerts).toHaveLength(3);
    expect(result.current.alerts.map((alert) => alert.message)).toEqual([
      'same node different alert type',
      'second node slash',
      'first slash',
    ]);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('thor1nodeb');
  });

  it('only emits jail alerts for a transition after a previous snapshot exists', () => {
    const { result } = renderHook(() => useAlerts());
    const jailed = makePosition({
      isJailed: true,
      jailReleaseHeight: 123456,
      jailReason: 'missed observation',
    });

    act(() => {
      result.current.checkJail(jailed, null, jailed.nodeAddress);
    });

    expect(result.current.alerts).toHaveLength(0);

    act(() => {
      result.current.checkJail(jailed, makePosition({ isJailed: false }), jailed.nodeAddress);
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0]).toMatchObject({
      type: 'JAIL',
      nodeAddress: jailed.nodeAddress,
    });
  });

  it('shares live preference updates through the alert provider', () => {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(AlertProvider, null, children);
    const { result } = renderHook(() => useAlertsContext(), { wrapper });

    act(() => {
      result.current.updatePreferences({ slashAlerts: false });
    });

    expect(result.current.preferences.slashAlerts).toBe(false);

    act(() => {
      result.current.triggerAlert('SLASH_INCREASE', 'thor1nodea', 'slash disabled');
      result.current.triggerAlert('JAIL', 'thor1nodea', 'jail still enabled');
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0]).toMatchObject({
      type: 'JAIL',
      message: 'jail still enabled',
    });
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"slashAlerts":false');
  });
});
