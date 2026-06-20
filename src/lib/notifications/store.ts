import { createHash } from 'crypto';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import { mergeAlertPreferences, type AlertPreferenceInput } from '@/lib/alerts/types';
import {
  getNotificationDataDir,
  getNotificationMonitorStaleAfterMs,
  getNotificationStoreLimits,
  getNotificationStorePath,
} from './config';
import type {
  BrowserPushSubscription,
  NotificationMonitorSummary,
  NotificationStoreData,
  NotificationSubscriptionRecord,
} from './types';

const EMPTY_STORE: NotificationStoreData = {
  version: 1,
  subscriptions: [],
};

const MAX_PUSH_ENDPOINT_LENGTH = 2048;
const MAX_PUSH_KEY_LENGTH = 512;

let writeQueue = Promise.resolve();

export class NotificationSubscriptionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationSubscriptionLimitError';
  }
}

function cloneStore(data: NotificationStoreData): NotificationStoreData {
  return {
    version: 1,
    subscriptions: data.subscriptions.map((subscription) => ({
      ...subscription,
      keys: { ...subscription.keys },
      preferences: { ...subscription.preferences },
      lastNotifiedAt: { ...subscription.lastNotifiedAt },
      lastSnapshot: subscription.lastSnapshot
        ? subscription.lastSnapshot.map((position) => ({ ...position, yieldGuardFlags: position.yieldGuardFlags ? [...position.yieldGuardFlags] : undefined }))
        : null,
    })),
  };
}

function subscriptionId(address: string, endpoint: string): string {
  return createHash('sha256').update(`${address}:${endpoint}`).digest('hex');
}

function pruneExpiredSubscriptions(data: NotificationStoreData, now = Date.now()): void {
  data.subscriptions = data.subscriptions.filter((subscription) =>
    subscription.expirationTime === null || subscription.expirationTime > now
  );
}

function isActiveSubscription(subscription: NotificationSubscriptionRecord, now = Date.now()): boolean {
  return subscription.expirationTime === null || subscription.expirationTime > now;
}

function parseStore(raw: string): NotificationStoreData {
  const parsed = JSON.parse(raw) as Partial<NotificationStoreData>;
  if (parsed.version !== 1 || !Array.isArray(parsed.subscriptions)) {
    return EMPTY_STORE;
  }

  return {
    version: 1,
    subscriptions: parsed.subscriptions.flatMap((subscription) => {
      if (
        typeof subscription?.id !== 'string' ||
        typeof subscription.address !== 'string' ||
        typeof subscription.endpoint !== 'string' ||
        typeof subscription.keys?.p256dh !== 'string' ||
        typeof subscription.keys?.auth !== 'string' ||
        typeof subscription.createdAt !== 'number' ||
        typeof subscription.updatedAt !== 'number'
      ) {
        return [];
      }

      return [{
        ...subscription,
        expirationTime: typeof subscription.expirationTime === 'number' ? subscription.expirationTime : null,
        preferences: mergeAlertPreferences(subscription.preferences),
        lastSeenAt: typeof subscription.lastSeenAt === 'number' ? subscription.lastSeenAt : subscription.updatedAt,
        lastCheckedAt: typeof subscription.lastCheckedAt === 'number' ? subscription.lastCheckedAt : null,
        lastError: typeof subscription.lastError === 'string' ? subscription.lastError : null,
        lastSnapshot: Array.isArray(subscription.lastSnapshot) ? subscription.lastSnapshot : null,
        lastNotifiedAt: subscription.lastNotifiedAt && typeof subscription.lastNotifiedAt === 'object'
          ? subscription.lastNotifiedAt
          : {},
      } satisfies NotificationSubscriptionRecord];
    }),
  };
}

export function isBrowserPushSubscription(value: unknown): value is BrowserPushSubscription {
  if (!value || typeof value !== 'object') return false;
  const subscription = value as Partial<BrowserPushSubscription>;

  return (
    typeof subscription.endpoint === 'string' &&
    subscription.endpoint.startsWith('https://') &&
    subscription.endpoint.length <= MAX_PUSH_ENDPOINT_LENGTH &&
    typeof subscription.keys?.p256dh === 'string' &&
    subscription.keys.p256dh.length > 0 &&
    subscription.keys.p256dh.length <= MAX_PUSH_KEY_LENGTH &&
    typeof subscription.keys?.auth === 'string' &&
    subscription.keys.auth.length > 0 &&
    subscription.keys.auth.length <= MAX_PUSH_KEY_LENGTH &&
    (subscription.expirationTime === undefined ||
      subscription.expirationTime === null ||
      typeof subscription.expirationTime === 'number')
  );
}

export async function readNotificationStore(): Promise<NotificationStoreData> {
  try {
    const raw = await readFile(getNotificationStorePath(), 'utf8');
    return cloneStore(parseStore(raw));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return cloneStore(EMPTY_STORE);
    }
    throw error;
  }
}

async function writeNotificationStore(data: NotificationStoreData): Promise<void> {
  const dir = getNotificationDataDir();
  await mkdir(dir, { recursive: true });
  const target = getNotificationStorePath();
  const temporary = path.join(dir, `${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, target);
}

async function updateNotificationStore<T>(
  updater: (data: NotificationStoreData) => T | Promise<T>
): Promise<T> {
  const run = async () => {
    const data = await readNotificationStore();
    const result = await updater(data);
    await writeNotificationStore(data);
    return result;
  };

  const next = writeQueue.then(run, run);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

export async function listNotificationSubscriptions(): Promise<NotificationSubscriptionRecord[]> {
  const data = await readNotificationStore();
  const now = Date.now();
  return data.subscriptions.filter((subscription) => isActiveSubscription(subscription, now));
}

export async function countNotificationSubscriptions(address?: string): Promise<number> {
  const data = await readNotificationStore();
  const now = Date.now();
  return data.subscriptions.filter((subscription) =>
    isActiveSubscription(subscription, now) && (!address || subscription.address === address)
  ).length;
}

export async function summarizeNotificationMonitor(address?: string): Promise<NotificationMonitorSummary & { subscriptionCount: number }> {
  const data = await readNotificationStore();
  const matchingSubscriptions = address
    ? data.subscriptions.filter((subscription) => subscription.address === address)
    : data.subscriptions;
  const now = Date.now();
  const expiredSubscriptionCount = matchingSubscriptions.filter((subscription) =>
    !isActiveSubscription(subscription, now)
  ).length;
  const subscriptions = matchingSubscriptions.filter((subscription) => isActiveSubscription(subscription, now));
  const staleAfterMs = getNotificationMonitorStaleAfterMs();
  const staleBefore = now - staleAfterMs;
  const lastCheckedAt = subscriptions.reduce<number | null>((latest, subscription) => {
    if (subscription.lastCheckedAt === null) return latest;
    return latest === null ? subscription.lastCheckedAt : Math.max(latest, subscription.lastCheckedAt);
  }, null);

  return {
    checkedSubscriptionCount: subscriptions.filter((subscription) => subscription.lastCheckedAt !== null).length,
    expiredSubscriptionCount,
    failedSubscriptionCount: subscriptions.filter((subscription) => subscription.lastError !== null).length,
    lastCheckedAt,
    staleAfterMs,
    staleSubscriptionCount: subscriptions.filter((subscription) =>
      subscription.lastCheckedAt !== null && subscription.lastCheckedAt < staleBefore
    ).length,
    subscriptionCount: subscriptions.length,
    uncheckedSubscriptionCount: subscriptions.filter((subscription) => subscription.lastCheckedAt === null).length,
  };
}

export async function upsertNotificationSubscription(input: {
  address: string;
  subscription: BrowserPushSubscription;
  preferences?: AlertPreferenceInput | null;
}): Promise<NotificationSubscriptionRecord> {
  return updateNotificationStore((data) => {
    const now = Date.now();
    const id = subscriptionId(input.address, input.subscription.endpoint);
    const existing = data.subscriptions.find((subscription) => subscription.id === id);

    if (existing) {
      existing.expirationTime = input.subscription.expirationTime ?? null;
      existing.keys = { ...input.subscription.keys };
      existing.preferences = mergeAlertPreferences(input.preferences ?? existing.preferences);
      existing.updatedAt = now;
      existing.lastSeenAt = now;
      existing.lastError = null;
      return { ...existing, keys: { ...existing.keys }, preferences: { ...existing.preferences }, lastNotifiedAt: { ...existing.lastNotifiedAt } };
    }

    pruneExpiredSubscriptions(data, now);
    const limits = getNotificationStoreLimits();
    const addressCount = data.subscriptions.filter((subscription) => subscription.address === input.address).length;

    if (addressCount >= limits.maxPerAddress) {
      throw new NotificationSubscriptionLimitError(
        `Background push subscriptions for this address are limited to ${limits.maxPerAddress} browsers.`
      );
    }

    if (data.subscriptions.length >= limits.maxTotal) {
      throw new NotificationSubscriptionLimitError(
        `Background push subscriptions are temporarily full on this Heimdall runtime.`
      );
    }

    const created: NotificationSubscriptionRecord = {
      id,
      address: input.address,
      endpoint: input.subscription.endpoint,
      expirationTime: input.subscription.expirationTime ?? null,
      keys: { ...input.subscription.keys },
      preferences: mergeAlertPreferences(input.preferences),
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      lastCheckedAt: null,
      lastError: null,
      lastSnapshot: null,
      lastNotifiedAt: {},
    };
    data.subscriptions.push(created);
    return { ...created, keys: { ...created.keys }, preferences: { ...created.preferences }, lastNotifiedAt: {} };
  });
}

export async function removeNotificationSubscription(input: {
  address: string;
  endpoint: string;
}): Promise<boolean> {
  return updateNotificationStore((data) => {
    const id = subscriptionId(input.address, input.endpoint);
    const initialCount = data.subscriptions.length;
    data.subscriptions = data.subscriptions.filter((subscription) => subscription.id !== id);
    return data.subscriptions.length !== initialCount;
  });
}

export async function removeNotificationSubscriptionById(id: string): Promise<boolean> {
  return updateNotificationStore((data) => {
    const initialCount = data.subscriptions.length;
    data.subscriptions = data.subscriptions.filter((subscription) => subscription.id !== id);
    return data.subscriptions.length !== initialCount;
  });
}

export async function updateNotificationSubscriptionState(
  id: string,
  updater: (subscription: NotificationSubscriptionRecord) => void
): Promise<void> {
  await updateNotificationStore((data) => {
    const subscription = data.subscriptions.find((candidate) => candidate.id === id);
    if (subscription) {
      updater(subscription);
      subscription.updatedAt = Date.now();
    }
  });
}
