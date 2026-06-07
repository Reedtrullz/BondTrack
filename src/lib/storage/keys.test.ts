import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLegacyDashboardAddressKeys,
  getEntryPriceStorageKey,
  getInitialBondStorageKey,
  getThorNameReverseLookupStorageKey,
  getUpgradeAlertDismissedStorageKey,
  LEGACY_STORAGE_KEYS,
  migrateDashboardAddressStorage,
  STORAGE_KEYS,
} from './keys';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('storage key registry and migrations', () => {
  let local: Storage;
  let session: Storage;

  beforeEach(() => {
    local = createMemoryStorage();
    session = createMemoryStorage();
  });

  it('migrates the old landing-page last-address key into the canonical dashboard address key', () => {
    local.setItem('heimdall-last-address', 'thor1legacyaddress');

    expect(migrateDashboardAddressStorage(local, session)).toBe('thor1legacyaddress');
    expect(local.getItem(STORAGE_KEYS.dashboardAddress)).toBe('thor1legacyaddress');
    expect(local.getItem('heimdall-last-address')).toBeNull();
  });

  it('migrates the old dashboard session key and clears all legacy address keys', () => {
    session.setItem('dashboard-address', 'thor1sessionaddress');
    local.setItem('thornode-watcher-last-address', 'thor1olderlocal');

    expect(migrateDashboardAddressStorage(local, session)).toBe('thor1olderlocal');
    expect(local.getItem(STORAGE_KEYS.dashboardAddress)).toBe('thor1olderlocal');
    for (const key of LEGACY_STORAGE_KEYS.dashboardAddressLocal) {
      expect(local.getItem(key)).toBeNull();
    }
    for (const key of LEGACY_STORAGE_KEYS.dashboardAddressSession) {
      expect(session.getItem(key)).toBeNull();
    }
  });

  it('keeps an existing canonical address and only removes stale legacy copies', () => {
    local.setItem(STORAGE_KEYS.dashboardAddress, 'thor1canonical');
    local.setItem('heimdall-last-address', 'thor1legacyaddress');
    session.setItem('dashboard-address', 'thor1sessionaddress');

    expect(migrateDashboardAddressStorage(local, session)).toBe('thor1canonical');
    expect(local.getItem(STORAGE_KEYS.dashboardAddress)).toBe('thor1canonical');
    expect(local.getItem('heimdall-last-address')).toBeNull();
    expect(session.getItem('dashboard-address')).toBeNull();
  });

  it('does not migrate invalid legacy address values', () => {
    local.setItem('heimdall-last-address', 'not-a-thor-address');

    expect(migrateDashboardAddressStorage(local, session)).toBeNull();
    expect(local.getItem(STORAGE_KEYS.dashboardAddress)).toBeNull();
  });

  it('centralizes prefixed storage keys used by dashboard display state', () => {
    expect(getInitialBondStorageKey('thor1abc')).toBe('heimdall-initial-bond-thor1abc');
    expect(getEntryPriceStorageKey('thor1abc')).toBe('heimdall-entry-price-thor1abc');
    expect(getThorNameReverseLookupStorageKey('thor1abc')).toBe('thorname-rlookup:thor1abc');
    expect(getUpgradeAlertDismissedStorageKey('1.2.3')).toBe('dismissed_upgrade_v1.2.3');
    expect(getInitialBondStorageKey(null)).toBeNull();
    expect(getEntryPriceStorageKey(null)).toBeNull();
  });

  it('exposes a direct legacy cleanup helper for pages that already found a canonical value', () => {
    local.setItem('heimdall-last-address', 'thor1legacyaddress');
    session.setItem('dashboard-address', 'thor1sessionaddress');

    clearLegacyDashboardAddressKeys(local, session);

    expect(local.getItem('heimdall-last-address')).toBeNull();
    expect(session.getItem('dashboard-address')).toBeNull();
  });
});
