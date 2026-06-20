import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackgroundNotifications } from '../use-background-notifications';
import type { AlertPreferences } from '@/lib/alerts/types';

const preferences: AlertPreferences = {
  slashAlerts: true,
  jailAlerts: true,
  churnAlerts: true,
  statusAlerts: true,
};

const pushSubscription = {
  endpoint: 'https://push.example.test/subscription/1',
  toJSON: () => ({
    endpoint: 'https://push.example.test/subscription/1',
    expirationTime: null,
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  }),
};

function installPushSupport(existingSubscription: unknown) {
  Object.defineProperty(window, 'PushManager', {
    configurable: true,
    value: function PushManager() {},
  });
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: { requestPermission: vi.fn().mockResolvedValue('granted') },
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(existingSubscription),
        },
      }),
      register: vi.fn(),
    },
  });
}

describe('useBackgroundNotifications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stays ready when the browser has an origin subscription but the watched address is not stored server-side', async () => {
    installPushSupport(pushSubscription);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        configured: true,
        publicKey: 'public-key',
        reason: null,
        subscriptionCount: 0,
      }),
    } as unknown as Response);

    const { result } = renderHook(() => useBackgroundNotifications('thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz', preferences));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.isSubscribed).toBe(false);
  });

  it('reports subscribed only when the server has a subscription for the watched address', async () => {
    installPushSupport(pushSubscription);
    const lastCheckedAt = 1_735_689_600_000;
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        configured: true,
        publicKey: 'public-key',
        reason: null,
        subscriptionCount: 1,
        monitor: {
          checkedSubscriptionCount: 1,
          expiredSubscriptionCount: 0,
          failedSubscriptionCount: 0,
          lastCheckedAt,
          staleAfterMs: 300_000,
          staleSubscriptionCount: 0,
          uncheckedSubscriptionCount: 0,
        },
      }),
    } as unknown as Response);

    const { result } = renderHook(() => useBackgroundNotifications('thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz', preferences));

    await waitFor(() => expect(result.current.status).toBe('subscribed'));
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.monitor).toMatchObject({
      failedSubscriptionCount: 0,
      lastCheckedAt,
    });
  });

  it('reports an expired server subscription even if the browser still has an origin subscription', async () => {
    installPushSupport(pushSubscription);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        configured: true,
        publicKey: 'public-key',
        reason: null,
        subscriptionCount: 0,
        monitor: {
          checkedSubscriptionCount: 0,
          expiredSubscriptionCount: 1,
          failedSubscriptionCount: 0,
          lastCheckedAt: null,
          staleAfterMs: 300_000,
          staleSubscriptionCount: 0,
          uncheckedSubscriptionCount: 0,
        },
      }),
    } as unknown as Response);

    const { result } = renderHook(() => useBackgroundNotifications('thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz', preferences));

    await waitFor(() => expect(result.current.status).toBe('expired'));
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.monitor).toMatchObject({ expiredSubscriptionCount: 1 });
  });
});
