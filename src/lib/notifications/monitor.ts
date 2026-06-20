import { buildPositionAlertEvents, toBondPositionAlertSnapshot } from '@/lib/alerts/position-alerts';
import { getHealth } from '@/lib/api/midgard';
import { getAllNodes } from '@/lib/api/thornode';
import { assertUsableThornodeNodes } from '@/lib/api/source-validation';
import { extractBondPositions } from '@/lib/types/node';
import { getNotificationPollIntervalMs } from './config';
import { getNotificationCapability, isExpiredPushSubscriptionError, sendProviderAlertPush } from './push';
import {
  listNotificationSubscriptions,
  removeNotificationSubscriptionById,
  updateNotificationSubscriptionState,
} from './store';
import type { NotificationSubscriptionRecord } from './types';

declare global {
  var __heimdallNotificationMonitorStarted: boolean | undefined;
}

const MONITOR_FETCH_INIT = {
  cache: 'no-store' as const,
  headers: { 'X-Heimdall-Notification-Monitor': 'provider-alerts' },
  retry: false,
};

async function evaluateSubscription(subscription: NotificationSubscriptionRecord): Promise<void> {
  const [health, nodes] = await Promise.all([
    getHealth(MONITOR_FETCH_INIT),
    getAllNodes(MONITOR_FETCH_INIT),
  ]);

  assertUsableThornodeNodes(nodes);

  const currentHeight = health.lastThorNode?.height;
  if (!Number.isFinite(currentHeight)) {
    throw new Error('Midgard health did not include a usable THORNode height');
  }

  const positions = extractBondPositions(nodes, subscription.address, currentHeight);
  const currentSnapshot = positions.map(toBondPositionAlertSnapshot);
  const previousSnapshot = subscription.lastSnapshot;
  const now = Date.now();
  const lastNotifiedAt = { ...subscription.lastNotifiedAt };

  if (previousSnapshot) {
    const events = buildPositionAlertEvents(currentSnapshot, previousSnapshot, subscription.preferences);
    for (const event of events) {
      if (lastNotifiedAt[event.fingerprint]) continue;
      await sendProviderAlertPush(subscription, event);
      lastNotifiedAt[event.fingerprint] = now;
    }
  }

  await updateNotificationSubscriptionState(subscription.id, (record) => {
    record.lastCheckedAt = now;
    record.lastError = null;
    record.lastSnapshot = currentSnapshot;
    record.lastNotifiedAt = lastNotifiedAt;
  });
}

export async function runNotificationMonitorPass(): Promise<void> {
  const capability = getNotificationCapability();
  if (!capability.configured) return;

  const subscriptions = await listNotificationSubscriptions();
  for (const subscription of subscriptions) {
    try {
      await evaluateSubscription(subscription);
    } catch (error) {
      if (isExpiredPushSubscriptionError(error)) {
        await removeNotificationSubscriptionById(subscription.id);
        continue;
      }

      await updateNotificationSubscriptionState(subscription.id, (record) => {
        record.lastCheckedAt = Date.now();
        record.lastError = error instanceof Error ? error.message : String(error);
      });
    }
  }
}

export function startNotificationMonitor(): void {
  if (globalThis.__heimdallNotificationMonitorStarted) return;
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;

  globalThis.__heimdallNotificationMonitorStarted = true;
  const intervalMs = getNotificationPollIntervalMs();
  let isRunning = false;

  const run = () => {
    if (isRunning) return;
    isRunning = true;
    void runNotificationMonitorPass().finally(() => {
      isRunning = false;
    });
  };

  setTimeout(run, 5_000).unref?.();
  setInterval(run, intervalMs).unref?.();
}

export const __testables = {
  evaluateSubscription,
  runNotificationMonitorPass,
};
