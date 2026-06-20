import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PositionAlertEvent } from '@/lib/alerts/position-alerts';
import type { NotificationSubscriptionRecord } from './types';
import { sendProviderAlertPush } from './push';

const webPushMock = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
}));

vi.mock('web-push', () => ({
  default: webPushMock,
}));

const subscription: NotificationSubscriptionRecord = {
  id: 'subscription-id',
  address: 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz',
  endpoint: 'https://push.example.test/subscription/1',
  expirationTime: null,
  keys: {
    p256dh: 'p256dh-key',
    auth: 'auth-key',
  },
  preferences: {
    slashAlerts: true,
    jailAlerts: true,
    churnAlerts: true,
    statusAlerts: true,
  },
  createdAt: 1,
  updatedAt: 1,
  lastSeenAt: 1,
  lastCheckedAt: null,
  lastError: null,
  lastSnapshot: null,
  lastNotifiedAt: {},
};

const event: PositionAlertEvent = {
  type: 'JAIL',
  nodeAddress: 'thor1nodealertsaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  message: 'Node thor1nodeale...aaaa entered jail: missed observation. Review slash, jail, and unbond context before acting.',
  fingerprint: 'JAIL:thor1nodealertsaaaaaaaaaaaaaaaaaaaaaaaaaaa:missed observation',
};

describe('sendProviderAlertPush', () => {
  beforeEach(() => {
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'public-key';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = 'private-key';
    process.env.WEB_PUSH_CONTACT = 'mailto:test@example.com';
    webPushMock.sendNotification.mockResolvedValue(undefined);
    webPushMock.sendNotification.mockClear();
    webPushMock.setVapidDetails.mockClear();
  });

  afterEach(() => {
    delete process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    delete process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    delete process.env.WEB_PUSH_CONTACT;
  });

  it('describes monitor source checks without claiming fresh or verified data', async () => {
    await sendProviderAlertPush(subscription, event);

    expect(webPushMock.sendNotification).toHaveBeenCalledTimes(1);
    const [, payload] = webPushMock.sendNotification.mock.calls[0];
    const body = JSON.parse(payload as string).body as string;

    expect(body).toContain(event.message);
    expect(body).toContain('Source check: THORNode and Midgard monitor pass completed. Review Heimdall before acting.');
    expect(body).not.toMatch(/fresh|verified|safe/i);
  });
});
