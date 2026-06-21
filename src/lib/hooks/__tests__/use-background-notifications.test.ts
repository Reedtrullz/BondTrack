import { act, renderHook, waitFor } from '@testing-library/react';
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
  unsubscribe: vi.fn().mockResolvedValue(true),
  toJSON: () => ({
    endpoint: 'https://push.example.test/subscription/1',
    expirationTime: null,
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  }),
};

function installPushSupport(existingSubscription: unknown) {
  const registration = {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(existingSubscription),
      subscribe: vi.fn().mockResolvedValue(pushSubscription),
    },
  };

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
      register: vi.fn().mockResolvedValue(registration),
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

  it('fails monitor confidence closed when the server returns an incomplete monitor summary', async () => {
    installPushSupport(pushSubscription);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        configured: true,
        publicKey: 'public-key',
        reason: null,
        subscriptionCount: 1,
        monitor: {
          checkedSubscriptionCount: 1,
          lastCheckedAt: 1_735_689_600_000,
        },
      }),
    } as unknown as Response);

    const { result } = renderHook(() => useBackgroundNotifications('thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz', preferences));

    await waitFor(() => expect(result.current.status).toBe('subscribed'));
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.monitor).toMatchObject({
      checkedSubscriptionCount: 0,
      failedSubscriptionCount: 0,
      lastCheckedAt: null,
      staleSubscriptionCount: 0,
      uncheckedSubscriptionCount: 1,
    });
  });

  it('fails status closed when the server returns a malformed subscription count', async () => {
    installPushSupport(pushSubscription);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        configured: true,
        publicKey: 'public-key',
        reason: null,
        subscriptionCount: '1',
      }),
    } as unknown as Response);

    const { result } = renderHook(() => useBackgroundNotifications('thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz', preferences));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Unable to read notification status');
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.monitor).toBeNull();
    expect(result.current.subscriptionCount).toBe(0);
  });

  it('fails status closed when the server returns a non-object status body', async () => {
    installPushSupport(pushSubscription);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue('not-a-status-object'),
    } as unknown as Response);

    const { result } = renderHook(() => useBackgroundNotifications('thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz', preferences));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Unable to read notification status');
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.monitor).toBeNull();
    expect(result.current.subscriptionCount).toBe(0);
  });

  it('does not advertise background push availability when configured status lacks a public key', async () => {
    installPushSupport(null);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        configured: true,
        publicKey: null,
        reason: 'Web Push public key is missing.',
        subscriptionCount: 0,
      }),
    } as unknown as Response);

    const { result } = renderHook(() => useBackgroundNotifications('thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz', preferences));

    await waitFor(() => expect(result.current.status).toBe('unconfigured'));
    expect(result.current.isConfigured).toBe(false);
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.capability).toMatchObject({
      configured: false,
      publicKey: null,
      reason: 'Web Push public key is missing.',
      subscriptionCount: 0,
    });
  });

  it('keeps a newly enabled background subscription pending monitor verification', async () => {
    installPushSupport(null);
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          configured: true,
          publicKey: 'AQIDBA',
          reason: null,
          subscriptionCount: 0,
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          address: 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz',
          id: 'subscription-id',
          lastCheckedAt: null,
          subscribed: true,
        }),
      } as unknown as Response);

    const { result } = renderHook(() => useBackgroundNotifications('thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz', preferences));

    await waitFor(() => expect(result.current.status).toBe('ready'));

    let subscribed = false;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(true);
    expect(result.current.status).toBe('subscribed');
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.subscriptionCount).toBe(1);
    expect(result.current.monitor).toMatchObject({
      checkedSubscriptionCount: 0,
      failedSubscriptionCount: 0,
      lastCheckedAt: null,
      staleSubscriptionCount: 0,
      uncheckedSubscriptionCount: 1,
    });
  });

  it('clears stale local subscription evidence after disabling background push', async () => {
    installPushSupport(pushSubscription);
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          configured: true,
          publicKey: 'AQIDBA',
          reason: null,
          subscriptionCount: 1,
          monitor: {
            checkedSubscriptionCount: 1,
            expiredSubscriptionCount: 0,
            failedSubscriptionCount: 0,
            lastCheckedAt: 1_735_689_600_000,
            staleAfterMs: 300_000,
            staleSubscriptionCount: 0,
            uncheckedSubscriptionCount: 0,
          },
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ unsubscribed: true }),
      } as unknown as Response);

    const { result } = renderHook(() => useBackgroundNotifications('thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz', preferences));

    await waitFor(() => expect(result.current.status).toBe('subscribed'));

    let unsubscribed = false;
    await act(async () => {
      unsubscribed = await result.current.unsubscribe();
    });

    expect(unsubscribed).toBe(true);
    expect(pushSubscription.unsubscribe).toHaveBeenCalled();
    expect(result.current.status).toBe('ready');
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.subscriptionCount).toBe(0);
    expect(result.current.monitor).toMatchObject({
      checkedSubscriptionCount: 0,
      failedSubscriptionCount: 0,
      lastCheckedAt: null,
      staleSubscriptionCount: 0,
      uncheckedSubscriptionCount: 0,
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
