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

  it('uses persisted rate limits to avoid duplicate alerts after reloads', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      alerts: [],
      preferences: {
        slashAlerts: true,
        jailAlerts: true,
        churnAlerts: true,
        statusAlerts: true,
      },
      lastAlertTime: {
        'JAIL:thor1nodea': Date.now(),
      },
    }));

    const { result } = renderHook(() => useAlerts());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.triggerAlert('JAIL', 'thor1nodea', 'duplicate jail');
      result.current.triggerAlert('JAIL', 'thor1nodeb', 'different node jail');
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0]).toMatchObject({
      type: 'JAIL',
      nodeAddress: 'thor1nodeb',
      message: 'different node jail',
    });
  });

  it('keeps live alerts usable when browser storage is unavailable', () => {
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage denied');
      },
    });

    try {
      const { result } = renderHook(() => useAlerts());

      act(() => {
        result.current.triggerAlert('JAIL', 'thor1nodea', 'jail alert');
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0]).toMatchObject({ message: 'jail alert' });
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
    }
  });

  it('emits a system browser notification when permission is granted in a live session', async () => {
    const browserNotification = vi.fn();

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: class {
        static permission: NotificationPermission = 'granted';
        static requestPermission = vi.fn().mockResolvedValue('granted');

        constructor(title: string, options?: NotificationOptions) {
          browserNotification(title, options);
        }
      },
    });

    const { result } = renderHook(() => useAlerts());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.permission).toBe('granted');

    act(() => {
      result.current.triggerAlert('JAIL', 'thor1nodebrowser', 'Node thor1nodebrowser has been jailed');
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(browserNotification).toHaveBeenCalledWith('Heimdall Alert', {
      body: 'Node thor1nodebrowser has been jailed',
      icon: '/favicon.ico',
    });
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

  it('keeps dismissed alerts in local history and can restore them', () => {
    const { result } = renderHook(() => useAlerts());

    act(() => {
      result.current.triggerAlert('SLASH_INCREASE', 'thor1nodea', 'first slash');
      result.current.triggerAlert('JAIL', 'thor1nodeb', 'jail alert');
    });

    const dismissedId = result.current.alerts[0].id;

    act(() => {
      result.current.dismissAlert(dismissedId);
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alertHistory).toHaveLength(2);
    expect(result.current.alertHistory.find((alert) => alert.id === dismissedId)).toMatchObject({
      dismissed: true,
      message: 'jail alert',
    });

    act(() => {
      result.current.restoreAlert(dismissedId);
    });

    expect(result.current.alerts).toHaveLength(2);
    expect(result.current.alertHistory.find((alert) => alert.id === dismissedId)).toMatchObject({
      dismissed: false,
      message: 'jail alert',
    });
  });
});
