'use client';

import { createContext, createElement, useState, useEffect, useCallback, useRef, useContext } from 'react';
import type { ReactNode } from 'react';
import type { BondPosition } from '@/lib/types/node';
import { readLocalStorageValue, STORAGE_KEYS, writeLocalStorageValue } from '@/lib/storage/keys';

export type AlertType = 'SLASH_INCREASE' | 'JAIL' | 'CHURN_RISK' | 'NODE_STATUS_CHANGE';

export interface Alert {
  id: string;
  type: AlertType;
  nodeAddress: string;
  message: string;
  timestamp: number;
  dismissed: boolean;
}

export interface AlertPreferences {
  slashAlerts: boolean;
  jailAlerts: boolean;
  churnAlerts: boolean;
  statusAlerts: boolean;
}

const STORAGE_KEY = STORAGE_KEYS.alerts;
const RATE_LIMIT_MS = 5 * 60 * 1000;

const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  slashAlerts: true,
  jailAlerts: true,
  churnAlerts: true,
  statusAlerts: true,
};

function getStoredAlertState(): { alerts: Alert[]; preferences: AlertPreferences } {
  if (typeof window === 'undefined') {
    return { alerts: [], preferences: DEFAULT_ALERT_PREFERENCES };
  }

  try {
    const stored = readLocalStorageValue(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
        preferences: parsed.preferences
          ? { ...DEFAULT_ALERT_PREFERENCES, ...parsed.preferences }
          : DEFAULT_ALERT_PREFERENCES,
      };
    }
  } catch {
    // Corrupt or unavailable storage should not block in-memory alerts.
  }

  return { alerts: [], preferences: DEFAULT_ALERT_PREFERENCES };
}

function getCurrentPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [preferences, setPreferences] = useState<AlertPreferences>(DEFAULT_ALERT_PREFERENCES);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const lastAlertTime = useRef<Record<string, number>>({});

  useEffect(() => {
    const stored = getStoredAlertState();
    setAlerts(stored.alerts);
    setPreferences(stored.preferences);
    setPermission(getCurrentPermission());
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage || typeof window === 'undefined') {
      return;
    }

    try {
      writeLocalStorageValue(STORAGE_KEY, JSON.stringify({ alerts, preferences }));
    } catch {
      // Corrupt or unavailable storage should not block in-memory alerts.
    }
  }, [alerts, preferences, hasLoadedStorage]);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch {
      return false;
    }
  }, []);

  const isRateLimited = useCallback((key: string): boolean => {
    const lastTime = lastAlertTime.current[key] || 0;
    return Date.now() - lastTime < RATE_LIMIT_MS;
  }, []);

  const triggerAlert = useCallback((
    type: AlertType,
    nodeAddress: string,
    message: string
  ) => {
    const rateLimitKey = `${type}:${nodeAddress}`;
    if (isRateLimited(rateLimitKey)) return;

    const preferenceKey = type === 'SLASH_INCREASE' ? 'slashAlerts'
      : type === 'JAIL' ? 'jailAlerts'
      : type === 'CHURN_RISK' ? 'churnAlerts'
      : 'statusAlerts';

    if (!preferences[preferenceKey as keyof AlertPreferences]) return;

    lastAlertTime.current[rateLimitKey] = Date.now();

    const alert: Alert = {
      id: `${type}-${nodeAddress}-${Date.now()}`,
      type,
      nodeAddress,
      message,
      timestamp: Date.now(),
      dismissed: false,
    };

    setAlerts(current => [alert, ...current].slice(0, 50));

    if (permission === 'granted') {
      new Notification('Heimdall Alert', {
        body: message,
        icon: '/favicon.ico',
      });
    }
  }, [preferences, permission, isRateLimited]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(current =>
      current.map(a => a.id === id ? { ...a, dismissed: true } : a)
    );
  }, []);

  const restoreAlert = useCallback((id: string) => {
    setAlerts(current =>
      current.map(a => a.id === id ? { ...a, dismissed: false } : a)
    );
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const updatePreferences = useCallback((newPrefs: Partial<AlertPreferences>) => {
    setPreferences(current => ({ ...current, ...newPrefs }));
  }, []);

  const checkSlash = useCallback((
    currentSlashPoints: number,
    previousSlashPoints: number,
    nodeAddress: string
  ) => {
    if (currentSlashPoints > previousSlashPoints) {
      const delta = currentSlashPoints - previousSlashPoints;
      triggerAlert('SLASH_INCREASE', nodeAddress,
        `Node ${nodeAddress.slice(0, 12)}... slashed: +${delta} points`);
    }
  }, [triggerAlert]);

  const checkJail = useCallback((
    currentPosition: BondPosition,
    previousPosition: BondPosition | null,
    nodeAddress: string
  ) => {
    if (currentPosition.isJailed && previousPosition && !previousPosition.isJailed) {
      triggerAlert('JAIL', nodeAddress,
        `Node ${nodeAddress.slice(0, 12)}... has been jailed: ${currentPosition.jailReason || 'Unknown reason'}`);
    }
  }, [triggerAlert]);

  const checkStatusChange = useCallback((
    currentStatus: string,
    previousStatus: string | null,
    nodeAddress: string
  ) => {
    if (previousStatus && currentStatus !== previousStatus) {
      triggerAlert('NODE_STATUS_CHANGE', nodeAddress,
        `Node ${nodeAddress.slice(0, 12)}... status changed: ${previousStatus} → ${currentStatus}`);
    }
  }, [triggerAlert]);

  const visibleAlerts = alerts.filter(a => !a.dismissed);

  return {
    alerts: visibleAlerts,
    alertHistory: alerts,
    permission,
    preferences,
    requestPermission,
    triggerAlert,
    dismissAlert,
    restoreAlert,
    clearAllAlerts,
    updatePreferences,
    checkSlash,
    checkJail,
    checkStatusChange,
  };
}

export type AlertsContextValue = ReturnType<typeof useAlerts>;

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const alerts = useAlerts();
  return createElement(AlertsContext.Provider, { value: alerts }, children);
}

export function useAlertsContext(): AlertsContextValue {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlertsContext must be used within AlertProvider');
  }
  return context;
}
