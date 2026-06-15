import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLegacyDashboardAddressKeys,
  getEntryPriceStorageKey,
  getInitialBondStorageKey,
  getThorNameReverseLookupStorageKey,
  getUpgradeAlertDismissedStorageKey,
  LEGACY_STORAGE_KEYS,
  migrateDashboardAddressStorage,
  readLocalStorageValue,
  readDashboardAddress,
  readThorNameReverseLookupCache,
  removeLocalStorageValue,
  removeDashboardAddress,
  STORAGE_KEYS,
  writeLocalStorageValue,
  writeDashboardAddress,
  writeThorNameReverseLookupCache,
} from './keys';

const validCanonicalAddress = `thor1${'q'.repeat(38)}`;
const validLegacyAddress = `thor1${'p'.repeat(38)}`;
const validOlderLocalAddress = `thor1${'r'.repeat(38)}`;
const validSessionAddress = `thor1${'s'.repeat(38)}`;

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
    local.setItem('heimdall-last-address', validLegacyAddress);

    expect(migrateDashboardAddressStorage(local, session)).toBe(validLegacyAddress);
    expect(local.getItem(STORAGE_KEYS.dashboardAddress)).toBe(validLegacyAddress);
    expect(local.getItem('heimdall-last-address')).toBeNull();
  });

  it('migrates the old dashboard session key and clears all legacy address keys', () => {
    session.setItem('dashboard-address', validSessionAddress);
    local.setItem('thornode-watcher-last-address', validOlderLocalAddress);

    expect(migrateDashboardAddressStorage(local, session)).toBe(validOlderLocalAddress);
    expect(local.getItem(STORAGE_KEYS.dashboardAddress)).toBe(validOlderLocalAddress);
    for (const key of LEGACY_STORAGE_KEYS.dashboardAddressLocal) {
      expect(local.getItem(key)).toBeNull();
    }
    for (const key of LEGACY_STORAGE_KEYS.dashboardAddressSession) {
      expect(session.getItem(key)).toBeNull();
    }
  });

  it('keeps an existing canonical address and only removes stale legacy copies', () => {
    local.setItem(STORAGE_KEYS.dashboardAddress, validCanonicalAddress);
    local.setItem('heimdall-last-address', validLegacyAddress);
    session.setItem('dashboard-address', validSessionAddress);

    expect(migrateDashboardAddressStorage(local, session)).toBe(validCanonicalAddress);
    expect(local.getItem(STORAGE_KEYS.dashboardAddress)).toBe(validCanonicalAddress);
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
    local.setItem('heimdall-last-address', validLegacyAddress);
    session.setItem('dashboard-address', validSessionAddress);

    clearLegacyDashboardAddressKeys(local, session);

    expect(local.getItem('heimdall-last-address')).toBeNull();
    expect(session.getItem('dashboard-address')).toBeNull();
  });

  it('does not throw when browser localStorage is unavailable', () => {
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage denied');
      },
    });

    try {
      expect(readDashboardAddress()).toBeNull();
      expect(readLocalStorageValue(STORAGE_KEYS.watchlist)).toBeNull();
      expect(() => writeLocalStorageValue(STORAGE_KEYS.watchlist, '[]')).not.toThrow();
      expect(() => removeLocalStorageValue(STORAGE_KEYS.watchlist)).not.toThrow();
      expect(() => writeDashboardAddress(validCanonicalAddress)).not.toThrow();
      expect(() => removeDashboardAddress()).not.toThrow();
      expect(() => clearLegacyDashboardAddressKeys()).not.toThrow();
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
    }
  });

  it('does not throw when browser sessionStorage is unavailable', () => {
    const originalSessionStorage = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('sessionStorage denied');
      },
    });

    try {
      expect(readThorNameReverseLookupCache(validCanonicalAddress)).toBeNull();
      expect(() => writeThorNameReverseLookupCache(validCanonicalAddress, '__none__')).not.toThrow();
      expect(() => clearLegacyDashboardAddressKeys()).not.toThrow();
    } finally {
      if (originalSessionStorage) {
        Object.defineProperty(window, 'sessionStorage', originalSessionStorage);
      }
    }
  });
});
