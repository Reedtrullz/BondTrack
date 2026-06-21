import { isValidTHORChainAddress, validateTHORChainAddress } from '@/lib/utils/address-validation';

export const STORAGE_KEYS = {
  dashboardAddress: 'BONDTRACK_ADDRESS',
  watchlist: 'heimdall-watchlist',
  walletConnected: 'wallet-connected',
  alerts: 'heimdall-alerts',
  alertPositionSnapshotPrefix: 'heimdall-alert-position-snapshot-',
  pendingTransactions: 'heimdall-pending-txs',
  notificationPromptDismissed: 'heimdall-notification-prompt-dismissed',
  upgradeAlertDismissedPrefix: 'dismissed_upgrade_v',
  changelogsExpanded: 'changelogs-expanded',
  changelogsExpandedEntries: 'changelogs-expanded-entries',
  thorNameReverseLookupPrefix: 'thorname-rlookup:',
  initialBondPrefix: 'heimdall-initial-bond-',
  entryPricePrefix: 'heimdall-entry-price-',
} as const;

export const DASHBOARD_ADDRESS_CHANGED_EVENT = 'heimdall:dashboard-address-changed';

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
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function getBrowserSessionStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function dispatchDashboardAddressChanged(address: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(DASHBOARD_ADDRESS_CHANGED_EVENT, { detail: { address } }));
  } catch {
    // Address persistence must keep working even if a locked-down browser blocks events.
  }
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

export function readLocalStorageValue(key: string): string | null {
  return safeGet(getBrowserLocalStorage(), key);
}

export function writeLocalStorageValue(key: string, value: string): void {
  safeSet(getBrowserLocalStorage(), key, value);
}

export function removeLocalStorageValue(key: string): void {
  safeRemove(getBrowserLocalStorage(), key);
}

export function writeDashboardAddress(address: string): void {
  const result = validateTHORChainAddress(address);
  if (!result.valid || !result.normalized) {
    removeDashboardAddress();
    return;
  }

  writeLocalStorageValue(STORAGE_KEYS.dashboardAddress, result.normalized);
  dispatchDashboardAddressChanged(result.normalized);
}

export function removeDashboardAddress(): void {
  removeLocalStorageValue(STORAGE_KEYS.dashboardAddress);
  dispatchDashboardAddressChanged(null);
}

export function getInitialBondStorageKey(address: string | null): string | null {
  return address ? `${STORAGE_KEYS.initialBondPrefix}${address}` : null;
}

export function getAlertPositionSnapshotStorageKey(address: string | null): string | null {
  return address ? `${STORAGE_KEYS.alertPositionSnapshotPrefix}${address}` : null;
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

export function readThorNameReverseLookupCache(address: string): string | null {
  return safeGet(getBrowserSessionStorage(), getThorNameReverseLookupStorageKey(address));
}

export function writeThorNameReverseLookupCache(address: string, value: string): void {
  safeSet(getBrowserSessionStorage(), getThorNameReverseLookupStorageKey(address), value);
}
