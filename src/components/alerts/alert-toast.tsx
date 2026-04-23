'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, Activity, AlertCircle, X, Bell, BellOff } from 'lucide-react';
import type { Alert, AlertType } from '@/lib/hooks/use-alerts';
import { Button } from '@/components/ui/button';

interface AlertToastProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  permission: NotificationPermission;
  onRequestPermission: () => Promise<boolean>;
}

const NOTIFICATION_PROMPT_DISMISSED_KEY = 'bondtrack-notification-prompt-dismissed';

function getAlertIcon(type: AlertType) {
  switch (type) {
    case 'SLASH_INCREASE':
      return <ShieldAlert className="h-5 w-5 text-amber-500" />;
    case 'JAIL':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'CHURN_RISK':
      return <Activity className="h-5 w-5 text-orange-500" />;
    case 'NODE_STATUS_CHANGE':
      return <AlertCircle className="h-5 w-5 text-blue-500" />;
  }
}

function getAlertColor(type: AlertType) {
  switch (type) {
    case 'SLASH_INCREASE':
      return 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20';
    case 'JAIL':
      return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
    case 'CHURN_RISK':
      return 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20';
    case 'NODE_STATUS_CHANGE':
      return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
  }
}

function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function AlertToast({ alerts, onDismiss, permission, onRequestPermission }: AlertToastProps) {
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [permissionFeedback, setPermissionFeedback] = useState<'idle' | 'blocked'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsPromptDismissed(localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_KEY) === 'true');
  }, []);

  useEffect(() => {
    if (permission === 'granted' && typeof window !== 'undefined') {
      localStorage.removeItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
      setIsPromptDismissed(false);
      setPermissionFeedback('idle');
    }
  }, [permission]);

  const dismissNotificationPrompt = () => {
    setIsPromptDismissed(true);
    setPermissionFeedback('idle');

    if (typeof window !== 'undefined') {
      localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, 'true');
    }
  };

  const handleRequestPermission = async () => {
    const granted = await onRequestPermission();

    if (granted && typeof window !== 'undefined') {
      localStorage.removeItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
      setIsPromptDismissed(false);
      setPermissionFeedback('idle');
      return;
    }

    setPermissionFeedback('blocked');
  };

  const showPermissionGuidance = permission === 'denied' || permissionFeedback === 'blocked';

  return (
    <>
      {permission !== 'granted' && !isPromptDismissed && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:justify-start sm:px-6">
          <div
            className="pointer-events-auto w-full max-w-md rounded-xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-900/95"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-zinc-100 p-2 dark:bg-zinc-800">
                {showPermissionGuidance ? (
                  <BellOff className="h-4 w-4 text-amber-500" />
                ) : (
                  <Bell className="h-4 w-4 text-emerald-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {showPermissionGuidance ? 'Notifications are still off' : 'Enable notifications'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {showPermissionGuidance
                        ? 'Allow notifications in your browser site settings, or dismiss this reminder and keep working in the dashboard.'
                        : 'Get alerts when your nodes are slashed, jailed, or churn risk changes.'}
                    </p>
                  </div>

                  <button
                    onClick={dismissNotificationPrompt}
                    className="rounded p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Dismiss notification prompt"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={dismissNotificationPrompt}
                  >
                    Not now
                  </Button>
                  <Button
                    type="button"
                    variant={showPermissionGuidance ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={handleRequestPermission}
                  >
                    {showPermissionGuidance ? 'Try again' : 'Enable'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
          {alerts.slice(0, 3).map(alert => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${getAlertColor(alert.type)}`}
            >
              {getAlertIcon(alert.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {alert.message}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatTimestamp(alert.timestamp)}
                </p>
              </div>
              <button
                onClick={() => onDismiss(alert.id)}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
