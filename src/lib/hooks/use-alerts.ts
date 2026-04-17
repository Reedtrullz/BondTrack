'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BondPosition } from '@/lib/types/node';

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

const STORAGE_KEY = 'thornode-watcher-alerts';
const RATE_LIMIT_MS = 5 * 60 * 1000;

// Lazy initializer for alerts from localStorage
function getInitialAlerts(): Alert[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.alerts || [];
    }
  } catch (error) {
    console.error('Storage error while loading alerts:', error);
  }
  return [];
}

// Lazy initializer for preferences from localStorage
function getInitialPreferences(): AlertPreferences {
  if (typeof window === 'undefined') {
    return {
      slashAlerts: true,
      jailAlerts: true,
      churnAlerts: true,
      statusAlerts: true,
    };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.preferences) {
        return parsed.preferences;
      }
    }
  } catch (error) {
    console.error('Storage error while loading alert preferences:', error);
  }
  return {
    slashAlerts: true,
    jailAlerts: true,
    churnAlerts: true,
    statusAlerts: true,
  };
}

// Lazy initializer for notification permission
function getInitialPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(getInitialAlerts);
  const [preferences, setPreferences] = useState<AlertPreferences>(getInitialPreferences);
  const [permission, setPermission] = useState<NotificationPermission>(getInitialPermission);
  const lastAlertTime = useRef<Record<AlertType, number>>({} as Record<AlertType, number>);

  useEffect(() => {
    if (alerts.length > 0 || preferences) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ alerts, preferences }));
      } catch (error) {
        console.error('Storage error while saving alerts:', error);
      }
    }
  }, [alerts, preferences]);

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

  const isRateLimited = useCallback((type: AlertType): boolean => {
    const lastTime = lastAlertTime.current[type] || 0;
    return Date.now() - lastTime < RATE_LIMIT_MS;
  }, []);

  const triggerAlert = useCallback((
    type: AlertType,
    nodeAddress: string,
    message: string
  ) => {
    if (isRateLimited(type)) return;

    const preferenceKey = type === 'SLASH_INCREASE' ? 'slashAlerts'
      : type === 'JAIL' ? 'jailAlerts'
      : type === 'CHURN_RISK' ? 'churnAlerts'
      : 'statusAlerts';

    if (!preferences[preferenceKey as keyof AlertPreferences]) return;

    lastAlertTime.current[type] = Date.now();

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
      new Notification('THORNode Watcher Alert', {
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
    if (!previousPosition && currentPosition.isJailed) {
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
    permission,
    preferences,
    requestPermission,
    triggerAlert,
    dismissAlert,
    clearAllAlerts,
    updatePreferences,
    checkSlash,
    checkJail,
    checkStatusChange,
  };
}
