import type { AlertPreferences } from '@/lib/alerts/types';
import type { BondPositionAlertSnapshot } from '@/lib/alerts/position-alerts';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface BrowserPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
}

export interface NotificationSubscriptionRecord {
  id: string;
  address: string;
  endpoint: string;
  expirationTime: number | null;
  keys: PushSubscriptionKeys;
  preferences: AlertPreferences;
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number;
  lastCheckedAt: number | null;
  lastError: string | null;
  lastSnapshot: BondPositionAlertSnapshot[] | null;
  lastNotifiedAt: Record<string, number>;
}

export interface NotificationStoreData {
  version: 1;
  subscriptions: NotificationSubscriptionRecord[];
}

export interface NotificationMonitorSummary {
  checkedSubscriptionCount: number;
  expiredSubscriptionCount: number;
  failedSubscriptionCount: number;
  lastCheckedAt: number | null;
  staleAfterMs: number;
  staleSubscriptionCount: number;
  uncheckedSubscriptionCount: number;
}

export interface NotificationStatus {
  configured: boolean;
  monitor: NotificationMonitorSummary;
  publicKey: string | null;
  reason: string | null;
  subscriptionCount: number;
}
