'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AlertPreferences } from '@/lib/alerts/types';
import type { NotificationMonitorSummary } from '@/lib/notifications/types';

type BackgroundNotificationState = 'loading' | 'unsupported' | 'unconfigured' | 'ready' | 'subscribed' | 'expired' | 'error';

interface NotificationStatusResponse {
  configured: boolean;
  monitor: NotificationMonitorSummary;
  publicKey: string | null;
  reason: string | null;
  subscriptionCount: number;
}

type NotificationStatusBody = unknown;
type NotificationErrorBody = { error?: unknown };
type NotificationSubscribeBody = {
  error?: unknown;
  lastCheckedAt?: unknown;
};

function emptyMonitorSummary(subscriptionCount: number): NotificationMonitorSummary {
  return {
    checkedSubscriptionCount: 0,
    expiredSubscriptionCount: 0,
    failedSubscriptionCount: 0,
    lastCheckedAt: null,
    staleAfterMs: 300_000,
    staleSubscriptionCount: 0,
    uncheckedSubscriptionCount: subscriptionCount,
  };
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isNonNegativeFiniteNumber(value);
}

function hasCompleteMonitorSummary(
  monitor: NotificationMonitorSummary | undefined
): monitor is NotificationMonitorSummary {
  return Boolean(
    monitor &&
      isNonNegativeFiniteNumber(monitor.checkedSubscriptionCount) &&
      isNonNegativeFiniteNumber(monitor.expiredSubscriptionCount) &&
      isNonNegativeFiniteNumber(monitor.failedSubscriptionCount) &&
      (monitor.lastCheckedAt === null || isNonNegativeFiniteNumber(monitor.lastCheckedAt)) &&
      isNonNegativeFiniteNumber(monitor.staleAfterMs) &&
      monitor.staleAfterMs > 0 &&
      isNonNegativeFiniteNumber(monitor.staleSubscriptionCount) &&
      isNonNegativeFiniteNumber(monitor.uncheckedSubscriptionCount)
  );
}

function notificationErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as NotificationErrorBody).error;
    if (typeof error === 'string' && error.trim().length > 0) {
      return error;
    }
  }

  return fallback;
}

function normalizeStatusResponse(body: NotificationStatusBody): NotificationStatusResponse {
  if (!body || typeof body !== 'object' || 'error' in body) {
    throw new Error(notificationErrorMessage(body, 'Unable to read notification status'));
  }

  const candidate = body as Partial<NotificationStatusResponse>;
  if (typeof candidate.configured !== 'boolean' || !isNonNegativeInteger(candidate.subscriptionCount)) {
    throw new Error('Unable to read notification status');
  }

  const publicKey = typeof candidate.publicKey === 'string' && candidate.publicKey.length > 0
    ? candidate.publicKey
    : null;
  const configured = candidate.configured && publicKey !== null;
  const reason = typeof candidate.reason === 'string' && candidate.reason.length > 0
    ? candidate.reason
    : configured
      ? null
      : 'Background push is not configured on this Heimdall runtime.';

  return {
    configured,
    monitor: normalizeMonitorSummary(candidate.monitor, candidate.subscriptionCount),
    publicKey,
    reason,
    subscriptionCount: candidate.subscriptionCount,
  };
}

function normalizeMonitorSummary(
  monitor: NotificationMonitorSummary | undefined,
  subscriptionCount: number
): NotificationMonitorSummary {
  const fallback = emptyMonitorSummary(subscriptionCount);
  if (!hasCompleteMonitorSummary(monitor)) return fallback;

  const isInconsistentSummary =
    monitor.checkedSubscriptionCount > subscriptionCount ||
    monitor.uncheckedSubscriptionCount > subscriptionCount ||
    monitor.failedSubscriptionCount > monitor.checkedSubscriptionCount ||
    monitor.staleSubscriptionCount > monitor.checkedSubscriptionCount ||
    monitor.checkedSubscriptionCount + monitor.uncheckedSubscriptionCount < subscriptionCount ||
    (monitor.checkedSubscriptionCount > 0 && monitor.lastCheckedAt === null) ||
    (monitor.checkedSubscriptionCount === 0 && monitor.lastCheckedAt !== null);

  if (isInconsistentSummary) return fallback;

  return {
    checkedSubscriptionCount: monitor.checkedSubscriptionCount,
    expiredSubscriptionCount: monitor.expiredSubscriptionCount,
    failedSubscriptionCount: monitor.failedSubscriptionCount,
    lastCheckedAt: monitor.lastCheckedAt,
    staleAfterMs: monitor.staleAfterMs,
    staleSubscriptionCount: monitor.staleSubscriptionCount,
    uncheckedSubscriptionCount: monitor.uncheckedSubscriptionCount,
  };
}

function supportsBackgroundPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

async function getExistingSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration?.pushManager.getSubscription() ?? null;
}

export function useBackgroundNotifications(
  address: string | null,
  preferences: AlertPreferences
) {
  const [status, setStatus] = useState<BackgroundNotificationState>('loading');
  const [capability, setCapability] = useState<NotificationStatusResponse | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (address) params.set('address', address);
    return `/api/notifications/status${params.size > 0 ? `?${params.toString()}` : ''}`;
  }, [address]);

  const refresh = useCallback(async () => {
    setError(null);

    if (!supportsBackgroundPush()) {
      setStatus('unsupported');
      setCapability(null);
      setSubscription(null);
      return;
    }

    try {
      const response = await fetch(statusUrl, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const body = await response.json() as NotificationStatusBody;
      if (!response.ok) {
        throw new Error(notificationErrorMessage(body, 'Unable to read notification status'));
      }
      const normalizedStatusBody = normalizeStatusResponse(body);

      setCapability(normalizedStatusBody);
      const existing = await getExistingSubscription();
      setSubscription(existing);

      if (!normalizedStatusBody.configured) {
        setStatus('unconfigured');
      } else if (normalizedStatusBody.subscriptionCount === 0 && normalizedStatusBody.monitor.expiredSubscriptionCount > 0) {
        setStatus('expired');
      } else {
        setStatus(existing && normalizedStatusBody.subscriptionCount > 0 ? 'subscribed' : 'ready');
      }
    } catch (refreshError) {
      setStatus('error');
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to read notification status');
    }
  }, [statusUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setError(null);

    if (!address) {
      setError('Open a THORChain address before enabling background push.');
      return false;
    }

    if (!supportsBackgroundPush()) {
      setStatus('unsupported');
      return false;
    }

    const currentCapability = capability ?? await (async () => {
      const response = await fetch(statusUrl, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const body = await response.json() as NotificationStatusBody;
      if (!response.ok) {
        throw new Error(notificationErrorMessage(body, 'Unable to read notification status'));
      }
      const normalizedStatusBody = normalizeStatusResponse(body);
      setCapability(normalizedStatusBody);
      return normalizedStatusBody;
    })();

    if (!currentCapability.configured || !currentCapability.publicKey) {
      setStatus('unconfigured');
      setError(currentCapability.reason ?? 'Background push is not configured on this Heimdall runtime.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Browser notification permission is required for background delivery.');
        return false;
      }

      const registration = await navigator.serviceWorker.register('/notification-sw.js', { scope: '/' });
      const existing = await registration.pushManager.getSubscription();
      const nextSubscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(currentCapability.publicKey),
      });

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          subscription: nextSubscription.toJSON(),
          preferences,
        }),
      });

      const body = await response.json() as NotificationSubscribeBody;
      if (!response.ok) {
        throw new Error(notificationErrorMessage(body, 'Unable to save background notification subscription'));
      }

      const nextSubscriptionCount = Math.max(1, currentCapability.subscriptionCount);
      const lastCheckedAt = isNonNegativeFiniteNumber(body.lastCheckedAt) ? body.lastCheckedAt : null;
      const monitor: NotificationMonitorSummary = {
        checkedSubscriptionCount: lastCheckedAt === null ? 0 : nextSubscriptionCount,
        expiredSubscriptionCount: 0,
        failedSubscriptionCount: 0,
        lastCheckedAt,
        staleAfterMs: currentCapability.monitor.staleAfterMs,
        staleSubscriptionCount: 0,
        uncheckedSubscriptionCount: lastCheckedAt === null ? nextSubscriptionCount : 0,
      };

      setCapability({
        ...currentCapability,
        monitor,
        subscriptionCount: nextSubscriptionCount,
      });
      setSubscription(nextSubscription);
      setStatus('subscribed');
      return true;
    } catch (subscribeError) {
      setStatus('error');
      setError(subscribeError instanceof Error ? subscribeError.message : 'Unable to enable background notifications');
      return false;
    }
  }, [address, capability, preferences, statusUrl]);

  const unsubscribe = useCallback(async () => {
    setError(null);

    if (!address) {
      setError('Open a THORChain address before changing background push.');
      return false;
    }

    try {
      const existing = subscription ?? await getExistingSubscription();
      if (existing) {
        await existing.unsubscribe();
        const response = await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address,
            endpoint: existing.endpoint,
          }),
        });
        const body = await response.json() as NotificationErrorBody;
        if (!response.ok) {
          throw new Error(notificationErrorMessage(body, 'Unable to remove background notification subscription'));
        }
      }

      if (capability) {
        const nextSubscriptionCount = Math.max(0, capability.subscriptionCount - 1);
        setCapability({
          ...capability,
          monitor: emptyMonitorSummary(nextSubscriptionCount),
          subscriptionCount: nextSubscriptionCount,
        });
      }
      setSubscription(null);
      setStatus(capability?.configured ? 'ready' : 'unconfigured');
      return true;
    } catch (unsubscribeError) {
      setStatus('error');
      setError(unsubscribeError instanceof Error ? unsubscribeError.message : 'Unable to disable background notifications');
      return false;
    }
  }, [address, capability, subscription]);

  return {
    capability,
    error,
    isConfigured: capability?.configured ?? false,
    isSubscribed: status === 'subscribed',
    monitor: capability?.monitor ?? null,
    refresh,
    status,
    subscribe,
    subscriptionCount: capability?.subscriptionCount ?? 0,
    unsubscribe,
  };
}
