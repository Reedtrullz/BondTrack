import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getHealth } from '@/lib/api/midgard';
import { getAllNodes } from '@/lib/api/thornode';
import { runNotificationMonitorPass } from './monitor';
import {
  listNotificationSubscriptions,
  removeNotificationSubscriptionById,
  updateNotificationSubscriptionState,
} from './store';
import { getNotificationCapability, isExpiredPushSubscriptionError, sendProviderAlertPush } from './push';
import type { NotificationSubscriptionRecord } from './types';
import type { NodeRaw } from '@/lib/api/thornode';

vi.mock('@/lib/api/midgard', () => ({
  getHealth: vi.fn(),
}));

vi.mock('@/lib/api/thornode', () => ({
  getAllNodes: vi.fn(),
}));

vi.mock('./store', () => ({
  listNotificationSubscriptions: vi.fn(),
  removeNotificationSubscriptionById: vi.fn(),
  updateNotificationSubscriptionState: vi.fn(),
}));

vi.mock('./push', () => ({
  getNotificationCapability: vi.fn(),
  isExpiredPushSubscriptionError: vi.fn(() => false),
  sendProviderAlertPush: vi.fn(),
}));

const address = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';
const nodeAddress = 'thor1nodealertsaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function subscription(overrides: Partial<NotificationSubscriptionRecord> = {}): NotificationSubscriptionRecord {
  return {
    id: 'subscription-id',
    address,
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
    ...overrides,
  };
}

function node(overrides: Partial<NodeRaw> = {}): NodeRaw {
  return {
    node_address: nodeAddress,
    status: 'Active',
    pub_key_set: { secp256k1: '', ed25519: '' },
    validator_cons_pub_key: '',
    peer_id: '',
    active_block_height: 1,
    status_since: 1,
    node_operator_address: 'thor1operatoralertsaaaaaaaaaaaaaaaaaaaaaa',
    total_bond: '2000000000000',
    bond_providers: {
      node_operator_fee: '1500',
      providers: [{ bond_address: address, bond: '1000000000000' }],
    },
    signer_membership: null,
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '',
    version: '3.19.0',
    slash_points: 4,
    jail: {},
    current_award: '0',
    observe_chains: null,
    preflight_status: { status: 'Ready', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
    ...overrides,
  };
}

describe('notification monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getNotificationCapability).mockReturnValue({
      configured: true,
      publicKey: 'public-key',
      reason: null,
    });
    vi.mocked(getHealth).mockResolvedValue({ lastThorNode: { height: 123456 } });
    vi.mocked(getAllNodes).mockResolvedValue([node()]);
  });

  it('creates a silent baseline on first check instead of backfilling alerts', async () => {
    vi.mocked(listNotificationSubscriptions).mockResolvedValue([subscription()]);

    await runNotificationMonitorPass();

    expect(sendProviderAlertPush).not.toHaveBeenCalled();
    expect(updateNotificationSubscriptionState).toHaveBeenCalledWith('subscription-id', expect.any(Function));

    const updater = vi.mocked(updateNotificationSubscriptionState).mock.calls[0][1];
    const record = subscription();
    updater(record);
    expect(record.lastSnapshot?.[0]).toMatchObject({ nodeAddress, slashPoints: 4 });
    expect(record.lastError).toBeNull();
  });

  it('sends a push only for a new provider exposure transition', async () => {
    vi.mocked(listNotificationSubscriptions).mockResolvedValue([
      subscription({
        lastSnapshot: [{
          nodeAddress,
          status: 'Active',
          slashPoints: 4,
          isJailed: false,
          yieldGuardFlags: [],
        }],
      }),
    ]);
    vi.mocked(getAllNodes).mockResolvedValue([node({ slash_points: 12 })]);

    await runNotificationMonitorPass();

    expect(sendProviderAlertPush).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'subscription-id' }),
      expect.objectContaining({
        type: 'SLASH_INCREASE',
        fingerprint: `SLASH_INCREASE:${nodeAddress}:12`,
      })
    );
  });

  it('removes expired push subscriptions', async () => {
    vi.mocked(listNotificationSubscriptions).mockResolvedValue([
      subscription({
        lastSnapshot: [{
          nodeAddress,
          status: 'Active',
          slashPoints: 4,
          isJailed: false,
          yieldGuardFlags: [],
        }],
      }),
    ]);
    vi.mocked(getAllNodes).mockResolvedValue([node({ slash_points: 12 })]);
    vi.mocked(sendProviderAlertPush).mockRejectedValue(new Error('gone'));
    vi.mocked(isExpiredPushSubscriptionError).mockReturnValue(true);

    await runNotificationMonitorPass();

    expect(removeNotificationSubscriptionById).toHaveBeenCalledWith('subscription-id');
  });
});
