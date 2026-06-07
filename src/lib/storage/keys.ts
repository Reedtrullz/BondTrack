import { isValidTHORChainAddress } from '@/lib/utils/address-validation';

export const STORAGE_KEYS = {
  dashboardAddress: 'BONDTRACK_ADDRESS',
  watchlist: 'heimdall-watchlist',
  walletConnected: 'wallet-connected',
  alerts: 'heimdall-alerts',
  pendingTransactions: 'heimdall-pending-txs',
  notificationPromptDismissed: 'heimdall-notification-prompt-dismissed',
  upgradeAlertDismissedPrefix: 'dismissed_upgrade_v',
  changelogsExpanded: 'changelogs-expanded',
  changelogsExpandedEntries: 'changelogs-expanded-entries',
  thorNameReverseLookupPrefix: 'thorname-rlookup:',
  initialBondPrefix: 'heimdall-initial-bond-',
  entryPricePrefix: 'heimdall-entry-price-',
} as const;

export const LEGACY_STORAGE_KEYS = {
  dashboardAddressLocal: ['heimdall-last-address', 'thornode-watcher-last-address'] as const,
  dashboardAddressSession: ['dashboard-address'] as const,
} as const;

function isValidStoredThorAddress(value: string | null): value is string {
  return typeof value === 'string' && isValidTHORChainAddress(value);
}

function safeGet(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage: Storage | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage may be unavailable in private mode or server-like tests.
  }
}

function safeRemove(storage: Storage | undefined, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage may be unavailable in private mode or server-like tests.
  }
}

function getBrowserLocalStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

function getBrowserSessionStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.sessionStorage;
}

export function clearLegacyDashboardAddressKeys(
  localStorageRef: Storage | undefined = getBrowserLocalStorage(),
  sessionStorageRef: Storage | undefined = getBrowserSessionStorage()
): void {
  LEGACY_STORAGE_KEYS.dashboardAddressLocal.forEach((key) => safeRemove(localStorageRef, key));
  LEGACY_STORAGE_KEYS.dashboardAddressSession.forEach((key) => safeRemove(sessionStorageRef, key));
}

export function migrateDashboardAddressStorage(
  localStorageRef: Storage | undefined = getBrowserLocalStorage(),
  sessionStorageRef: Storage | undefined = getBrowserSessionStorage()
): string | null {
  const currentAddress = safeGet(localStorageRef, STORAGE_KEYS.dashboardAddress);
  if (isValidStoredThorAddress(currentAddress)) {
    clearLegacyDashboardAddressKeys(localStorageRef, sessionStorageRef);
    return currentAddress;
  }
  if (currentAddress) {
    safeRemove(localStorageRef, STORAGE_KEYS.dashboardAddress);
  }

  const legacyAddress = [
    ...LEGACY_STORAGE_KEYS.dashboardAddressLocal.map((key) => safeGet(localStorageRef, key)),
    ...LEGACY_STORAGE_KEYS.dashboardAddressSession.map((key) => safeGet(sessionStorageRef, key)),
  ].find(isValidStoredThorAddress) ?? null;

  if (legacyAddress) {
    safeSet(localStorageRef, STORAGE_KEYS.dashboardAddress, legacyAddress);
    clearLegacyDashboardAddressKeys(localStorageRef, sessionStorageRef);
  }

  return legacyAddress;
}

export function readDashboardAddress(): string | null {
  return migrateDashboardAddressStorage();
}

export function writeDashboardAddress(address: string): void {
  safeSet(getBrowserLocalStorage(), STORAGE_KEYS.dashboardAddress, address);
}

export function removeDashboardAddress(): void {
  safeRemove(getBrowserLocalStorage(), STORAGE_KEYS.dashboardAddress);
}

export function getInitialBondStorageKey(address: string | null): string | null {
  return address ? `${STORAGE_KEYS.initialBondPrefix}${address}` : null;
}

export function getEntryPriceStorageKey(address: string | null): string | null {
  return address ? `${STORAGE_KEYS.entryPricePrefix}${address}` : null;
}

export function getUpgradeAlertDismissedStorageKey(latestVersion: string): string {
  return `${STORAGE_KEYS.upgradeAlertDismissedPrefix}${latestVersion}`;
}

export function getThorNameReverseLookupStorageKey(address: string): string {
  return `${STORAGE_KEYS.thorNameReverseLookupPrefix}${address}`;
}
