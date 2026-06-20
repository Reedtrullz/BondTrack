import path from 'path';

export const NOTIFICATION_STORE_FILENAME = 'notification-subscriptions.json';
export const DEFAULT_MAX_NOTIFICATION_SUBSCRIPTIONS = 1000;
export const DEFAULT_MAX_NOTIFICATION_SUBSCRIPTIONS_PER_ADDRESS = 10;

export function getNotificationDataDir(): string {
  return process.env.HEIMDALL_DATA_DIR || path.join(process.cwd(), '.heimdall-data');
}

export function getNotificationStorePath(): string {
  return path.join(getNotificationDataDir(), NOTIFICATION_STORE_FILENAME);
}

export function getNotificationPollIntervalMs(): number {
  const parsed = Number(process.env.NOTIFICATION_POLL_INTERVAL_MS);
  if (!Number.isSafeInteger(parsed) || parsed < 30_000) {
    return 60_000;
  }
  return parsed;
}

export function getNotificationMonitorStaleAfterMs(): number {
  return Math.max(getNotificationPollIntervalMs() * 3, 5 * 60_000);
}

function readBoundedIntegerEnv(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number(process.env[name]);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getNotificationStoreLimits() {
  return {
    maxTotal: readBoundedIntegerEnv(
      'HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS',
      DEFAULT_MAX_NOTIFICATION_SUBSCRIPTIONS,
      1,
      10_000
    ),
    maxPerAddress: readBoundedIntegerEnv(
      'HEIMDALL_NOTIFICATION_MAX_SUBSCRIPTIONS_PER_ADDRESS',
      DEFAULT_MAX_NOTIFICATION_SUBSCRIPTIONS_PER_ADDRESS,
      1,
      100
    ),
  };
}

export function getWebPushConfig() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() || process.env.VAPID_PUBLIC_KEY?.trim() || '';
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() || process.env.VAPID_PRIVATE_KEY?.trim() || '';
  const contact = process.env.WEB_PUSH_CONTACT?.trim() || process.env.VAPID_SUBJECT?.trim() || 'mailto:alerts@bond.thorchain.no';
  const configured = Boolean(publicKey && privateKey);

  return {
    configured,
    publicKey: configured ? publicKey : null,
    privateKey: configured ? privateKey : null,
    contact,
    reason: configured ? null : 'Web Push VAPID keys are not configured on this Heimdall runtime.',
  };
}

export function getNotificationRunnerToken(): string | null {
  return process.env.HEIMDALL_NOTIFICATION_RUNNER_TOKEN?.trim() || null;
}
