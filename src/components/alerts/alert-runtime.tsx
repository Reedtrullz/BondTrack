'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAlertsContext } from '@/lib/hooks/use-alerts';
import { useBondPositionAlerts } from '@/lib/hooks/use-bond-position-alerts';
import {
  DASHBOARD_ADDRESS_CHANGED_EVENT,
  LEGACY_STORAGE_KEYS,
  readDashboardAddress,
  STORAGE_KEYS,
} from '@/lib/storage/keys';

function readWatchedAddress(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return readDashboardAddress();
}

function isDashboardAddressStorageKey(key: string | null): boolean {
  if (!key) return false;

  return (
    key === STORAGE_KEYS.dashboardAddress ||
    LEGACY_STORAGE_KEYS.dashboardAddressLocal.includes(key as typeof LEGACY_STORAGE_KEYS.dashboardAddressLocal[number]) ||
    LEGACY_STORAGE_KEYS.dashboardAddressSession.includes(key as typeof LEGACY_STORAGE_KEYS.dashboardAddressSession[number])
  );
}

export function AlertRuntime() {
  const [watchedAddress, setWatchedAddress] = useState<string | null>(null);
  const {
    triggerAlert,
    checkSlash,
    checkJail,
    checkStatusChange,
  } = useAlertsContext();

  useEffect(() => {
    setWatchedAddress(readWatchedAddress());

    const syncWatchedAddress = () => {
      setWatchedAddress(readWatchedAddress());
    };

    const handleStorage = (event: StorageEvent) => {
      if (isDashboardAddressStorageKey(event.key)) {
        syncWatchedAddress();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(DASHBOARD_ADDRESS_CHANGED_EVENT, syncWatchedAddress);
    window.addEventListener('focus', syncWatchedAddress);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(DASHBOARD_ADDRESS_CHANGED_EVENT, syncWatchedAddress);
      window.removeEventListener('focus', syncWatchedAddress);
    };
  }, []);

  const alertChecks = useMemo(() => ({
    triggerAlert,
    checkSlash,
    checkJail,
    checkStatusChange,
  }), [triggerAlert, checkSlash, checkJail, checkStatusChange]);

  useBondPositionAlerts(watchedAddress, alertChecks);

  return null;
}
