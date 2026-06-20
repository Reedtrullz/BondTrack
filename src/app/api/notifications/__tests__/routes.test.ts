import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getStatus } from '../status/route';
import { POST as subscribe } from '../subscribe/route';
import { POST as unsubscribe } from '../unsubscribe/route';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { readNotificationStore, updateNotificationSubscriptionState } from '@/lib/notifications/store';
import type { BrowserPushSubscription } from '@/lib/notifications/types';

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

const address = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';
const subscription: BrowserPushSubscription = {
  endpoint: 'https://push.example.test/subscription/1',
  expirationTime: null,
  keys: {
    p256dh: 'p256dh-key',
    auth: 'auth-key',
  },
};

function subscriptionFor(
  endpointSuffix: string,
  overrides: Partial<BrowserPushSubscription> = {}
): BrowserPushSubscription {
  return {
    ...subscription,
    ...overrides,
    endpoint: `https://push.example.test/subscription/${endpointSuffix}`,
    keys: {
      ...subscription.keys,
      ...overrides.keys,
    },
  };
}

let dataDir: string;

function request(url: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function rawPost(url: string, body: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

describe('/api/notifications routes', () => {
  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), 'heimdall-notifications-'));
    process.env.HEIMDALL_DATA_DIR = dataDir;
    delete process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    delete process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    delete process.env.HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS;
    delete process.env.HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS_PER_ADDRESS;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    delete process.env.HEIMDALL_DATA_DIR;
    delete process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    delete process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    delete process.env.HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS;
    delete process.env.HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS_PER_ADDRESS;
    await rm(dataDir, { recursive: true, force: true });
  });

  it('reports an unconfigured runtime without exposing subscriptions', async () => {
    const response = await getStatus(request(`http://localhost/api/notifications/status?address=${address}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      configured: false,
      publicKey: null,
      subscriptionCount: 0,
    });
  });

  it('rejects subscription writes when Web Push keys are missing', async () => {
    const response = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription,
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Web Push VAPID keys are not configured on this Heimdall runtime.',
    });
  });

  it('rate limits subscription writes before parsing JSON', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });

    const response = await subscribe(rawPost('http://localhost/api/notifications/subscribe', '{not-json'));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'Rate limit exceeded' });
  });

  it('rejects malformed subscription writes with explicit request errors', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';

    const wrongType = await subscribe(rawPost(
      'http://localhost/api/notifications/subscribe',
      'address=thor1',
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    ));
    expect(wrongType.status).toBe(415);
    expect(await wrongType.json()).toEqual({ error: 'Content-Type must be application/json' });

    const tooLarge = await subscribe(rawPost(
      'http://localhost/api/notifications/subscribe',
      '{}',
      { 'Content-Length': String((16 * 1024) + 1) }
    ));
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toEqual({ error: 'Notification subscription request body is too large' });

    const malformed = await subscribe(rawPost('http://localhost/api/notifications/subscribe', '{not-json'));
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: 'Malformed JSON body' });
  });

  it('rejects oversized push subscription fields before persistence', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';

    const response = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription: {
        ...subscription,
        endpoint: `https://push.example.test/${'a'.repeat(2049)}`,
      },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A valid browser push subscription is required' });
    await expect(readNotificationStore()).resolves.toMatchObject({ subscriptions: [] });
  });

  it('subscribes, counts, and unsubscribes a validated mainnet address', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';

    const subscribeResponse = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address: address.toUpperCase(),
      subscription,
      preferences: { slashAlerts: true },
    }));
    const subscribeBody = await subscribeResponse.json();

    expect(subscribeResponse.status).toBe(200);
    expect(subscribeBody).toMatchObject({ address, subscribed: true });
    expect(subscribeBody.id).toMatch(/^[a-f0-9]{64}$/);

    const statusResponse = await getStatus(request(`http://localhost/api/notifications/status?address=${address}`));
    await expect(statusResponse.json()).resolves.toMatchObject({ configured: true, subscriptionCount: 1 });

    const unsubscribeResponse = await unsubscribe(request('http://localhost/api/notifications/unsubscribe', {
      address,
      endpoint: subscription.endpoint,
    }));
    await expect(unsubscribeResponse.json()).resolves.toMatchObject({ address, subscribed: false, removed: true });

    const emptyStatusResponse = await getStatus(request(`http://localhost/api/notifications/status?address=${address}`));
    await expect(emptyStatusResponse.json()).resolves.toMatchObject({ subscriptionCount: 0 });
  });

  it('summarizes monitor confidence without exposing subscription endpoints or raw errors', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';
    const lastCheckedAt = 1_735_689_600_000;

    const subscribeResponse = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription,
    }));
    const { id } = await subscribeResponse.json() as { id: string };

    await updateNotificationSubscriptionState(id, (record) => {
      record.lastCheckedAt = lastCheckedAt;
      record.lastError = 'https://push.example.test/subscription/1 returned 410 Gone';
    });

    const response = await getStatus(request(`http://localhost/api/notifications/status?address=${address}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      configured: true,
      subscriptionCount: 1,
      monitor: {
        checkedSubscriptionCount: 1,
        failedSubscriptionCount: 1,
        lastCheckedAt,
        uncheckedSubscriptionCount: 0,
      },
    });
    expect(JSON.stringify(body)).not.toContain(subscription.endpoint);
    expect(JSON.stringify(body)).not.toContain('410 Gone');
  });

  it('marks stale checked subscriptions as degraded monitor evidence', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';
    const lastCheckedAt = Date.now() - 60 * 60 * 1000;

    const subscribeResponse = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription,
    }));
    const { id } = await subscribeResponse.json() as { id: string };

    await updateNotificationSubscriptionState(id, (record) => {
      record.lastCheckedAt = lastCheckedAt;
      record.lastError = null;
    });

    const response = await getStatus(request(`http://localhost/api/notifications/status?address=${address}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      configured: true,
      subscriptionCount: 1,
      monitor: {
        checkedSubscriptionCount: 1,
        failedSubscriptionCount: 0,
        lastCheckedAt,
        staleSubscriptionCount: 1,
        uncheckedSubscriptionCount: 0,
      },
    });
    expect(body.monitor.staleAfterMs).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain(subscription.endpoint);
  });

  it('does not count expired stored subscriptions as active delivery', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';
    const expiredEndpoint = subscriptionFor('expired', { expirationTime: Date.now() - 1_000 });

    const subscribeResponse = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription: expiredEndpoint,
    }));
    expect(subscribeResponse.status).toBe(200);

    const response = await getStatus(request(`http://localhost/api/notifications/status?address=${address}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      configured: true,
      subscriptionCount: 0,
      monitor: {
        checkedSubscriptionCount: 0,
        expiredSubscriptionCount: 1,
        failedSubscriptionCount: 0,
        lastCheckedAt: null,
        staleSubscriptionCount: 0,
        uncheckedSubscriptionCount: 0,
      },
    });
    expect(JSON.stringify(body)).not.toContain(expiredEndpoint.endpoint);
  });

  it('sanitizes stored alert preferences from untrusted subscription payloads', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';

    const response = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription,
      preferences: {
        slashAlerts: 'false',
        jailAlerts: false,
        churnAlerts: true,
        statusAlerts: null,
      },
    }));

    expect(response.status).toBe(200);
    const store = await readNotificationStore();
    expect(store.subscriptions[0]?.preferences).toEqual({
      slashAlerts: true,
      jailAlerts: false,
      churnAlerts: true,
      statusAlerts: true,
    });
  });

  it('caps background push subscriptions per watched address', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';
    process.env.HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS_PER_ADDRESS = '1';

    const first = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription: subscriptionFor('first'),
    }));
    expect(first.status).toBe(200);

    const second = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription: subscriptionFor('second'),
    }));

    expect(second.status).toBe(429);
    expect(await second.json()).toEqual({
      error: 'Background push subscriptions for this address are limited to 1 browsers.',
    });
    await expect(readNotificationStore()).resolves.toMatchObject({ subscriptions: [expect.objectContaining({ endpoint: subscriptionFor('first').endpoint })] });
  });

  it('caps total background push subscriptions for the runtime', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';
    process.env.HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS = '1';
    process.env.HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS_PER_ADDRESS = '10';

    const first = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription: subscriptionFor('first'),
    }));
    expect(first.status).toBe(200);

    const second = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription: subscriptionFor('second'),
    }));

    expect(second.status).toBe(429);
    expect(await second.json()).toEqual({
      error: 'Background push subscriptions are temporarily full on this Heimdall runtime.',
    });
  });

  it('prunes expired subscriptions before applying store caps', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';
    process.env.HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS = '1';
    process.env.HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS_PER_ADDRESS = '10';

    const expired = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription: subscriptionFor('expired', { expirationTime: Date.now() - 1_000 }),
    }));
    expect(expired.status).toBe(200);

    const replacement = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address,
      subscription: subscriptionFor('replacement'),
    }));

    expect(replacement.status).toBe(200);
    const store = await readNotificationStore();
    expect(store.subscriptions).toHaveLength(1);
    expect(store.subscriptions[0]?.endpoint).toBe(subscriptionFor('replacement').endpoint);
  });

  it('rejects testnet addresses for background provider alerts', async () => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';

    const response = await subscribe(request('http://localhost/api/notifications/subscribe', {
      address: 'tthor1qyqszqgpqyqszqgpqyqszqgpqyqszqgpsrf4px',
      subscription,
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A valid THORChain mainnet address is required' });
  });

  it('rejects malformed unsubscribe writes with explicit request errors', async () => {
    const wrongType = await unsubscribe(rawPost(
      'http://localhost/api/notifications/unsubscribe',
      'address=thor1',
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    ));
    expect(wrongType.status).toBe(415);
    expect(await wrongType.json()).toEqual({ error: 'Content-Type must be application/json' });

    const tooLarge = await unsubscribe(rawPost(
      'http://localhost/api/notifications/unsubscribe',
      '{}',
      { 'Content-Length': String((16 * 1024) + 1) }
    ));
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toEqual({ error: 'Notification unsubscribe request body is too large' });

    const malformed = await unsubscribe(rawPost('http://localhost/api/notifications/unsubscribe', '{not-json'));
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: 'Malformed JSON body' });
  });
});
