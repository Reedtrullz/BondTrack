import webpush from 'web-push';
import type { PositionAlertEvent } from '@/lib/alerts/position-alerts';
import { getWebPushConfig } from './config';
import type { NotificationSubscriptionRecord } from './types';

let configuredKey: string | null = null;

export function getNotificationCapability() {
  const config = getWebPushConfig();
  return {
    configured: config.configured,
    publicKey: config.publicKey,
    reason: config.reason,
  };
}

function ensureWebPushConfigured(): boolean {
  const config = getWebPushConfig();
  if (!config.configured || !config.publicKey || !config.privateKey) {
    return false;
  }

  const key = `${config.contact}:${config.publicKey}:${config.privateKey}`;
  if (configuredKey !== key) {
    webpush.setVapidDetails(config.contact, config.publicKey, config.privateKey);
    configuredKey = key;
  }
  return true;
}

export function isExpiredPushSubscriptionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const statusCode = 'statusCode' in error ? Number(error.statusCode) : NaN;
  return statusCode === 404 || statusCode === 410;
}

export async function sendProviderAlertPush(
  subscription: NotificationSubscriptionRecord,
  event: PositionAlertEvent
): Promise<void> {
  if (!ensureWebPushConfigured()) {
    throw new Error('Web Push is not configured');
  }

  const payload = JSON.stringify({
    title: 'Heimdall provider alert',
    body: `${event.message} Source check: THORNode and Midgard monitor ran. Review Heimdall before acting.`,
    tag: event.fingerprint,
    icon: '/heimdall-icon.svg',
    badge: '/heimdall-icon.svg',
    url: `/dashboard/risk?address=${encodeURIComponent(subscription.address)}&node=${encodeURIComponent(event.nodeAddress)}`,
    timestamp: Date.now(),
  });

  await webpush.sendNotification({
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  }, payload);
}
