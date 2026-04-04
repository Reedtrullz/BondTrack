'use client';

import { AlertTriangle, ShieldAlert, Activity, AlertCircle, X, Bell, BellOff } from 'lucide-react';
import type { Alert, AlertType } from '@/lib/hooks/use-alerts';

interface AlertToastProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  permission: NotificationPermission;
  onRequestPermission: () => Promise<boolean>;
}

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
  return (
    <>
      {permission !== 'granted' && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="flex items-center gap-3 p-4 rounded-lg border shadow-lg bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
            <BellOff className="h-5 w-5 text-zinc-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Enable Notifications
              </p>
              <p className="text-xs text-zinc-500">
                Get alerts when your nodes are slashed or jailed
              </p>
            </div>
            <button
              onClick={() => onRequestPermission()}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
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
