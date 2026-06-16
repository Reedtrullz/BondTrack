'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ShieldAlert, Activity, AlertCircle, X, Bell, BellOff } from 'lucide-react';
import type { Alert, AlertType } from '@/lib/hooks/use-alerts';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { buildNodeRiskHref } from '@/lib/dashboard/hrefs';

interface AlertToastProps {
  alerts: Alert[];
  dashboardAddress?: string | null;
  isReviewOpen?: boolean;
  onDismiss: (id: string) => void;
  onReviewOpenChange?: (open: boolean) => void;
  presentation?: 'floating' | 'inspector';
  renderCollapsedTrigger?: boolean;
}

interface NotificationPermissionNudgeProps {
  permission: NotificationPermission;
  onRequestPermission: () => Promise<boolean>;
  settingsHref?: string;
}

interface AlertReviewTriggerProps {
  alerts: Alert[];
  isReviewOpen?: boolean;
  onOpen: () => void;
  variant?: 'floating' | 'header';
}

const NOTIFICATION_PROMPT_DISMISSED_KEY = STORAGE_KEYS.notificationPromptDismissed;

function readNotificationPromptDismissed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistNotificationPromptDismissed(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, 'true');
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

function clearNotificationPromptDismissed(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
  } catch {
    // A failed preference cleanup should never hide operator data.
  }
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
      return 'border-amber-200 bg-amber-50/95 backdrop-blur-md dark:border-amber-800 dark:bg-amber-950/95';
    case 'JAIL':
      return 'border-red-200 bg-red-50/95 backdrop-blur-md dark:border-red-800 dark:bg-red-950/95';
    case 'CHURN_RISK':
      return 'border-orange-200 bg-orange-50/95 backdrop-blur-md dark:border-orange-800 dark:bg-orange-950/95';
    case 'NODE_STATUS_CHANGE':
      return 'border-blue-200 bg-blue-50/95 backdrop-blur-md dark:border-blue-800 dark:bg-blue-950/95';
  }
}

function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function AlertReviewTrigger({
  alerts,
  isReviewOpen = false,
  onOpen,
  variant = 'floating',
}: AlertReviewTriggerProps) {
  if (alerts.length === 0) {
    return null;
  }

  const alertCountLabel = `${alerts.length} node alert${alerts.length === 1 ? '' : 's'}`;

  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50/95 text-amber-700 shadow-lg backdrop-blur-md transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-200 dark:hover:bg-amber-900 dark:focus-visible:ring-offset-zinc-950',
        variant === 'header'
          ? 'h-10 w-10 px-0 shadow-sm sm:h-9 sm:w-auto sm:px-3'
          : 'h-11 w-11 px-0 sm:w-auto sm:px-3'
      )}
      aria-controls="node-alert-toast-list"
      aria-expanded={isReviewOpen}
      aria-label={isReviewOpen ? `Alert review open for ${alertCountLabel}` : `Open alert review for ${alertCountLabel}`}
      data-placement={variant === 'header' ? 'header-action' : 'floating'}
      data-testid="node-alert-review-trigger"
      onClick={onOpen}
    >
      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{alertCountLabel}</span>
      <span className="hidden max-w-36 truncate text-xs font-semibold sm:block">
        {alertCountLabel}
      </span>
      <span className={cn(
        'flex min-w-5 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm',
        'absolute -right-1 -top-1 h-5 sm:static sm:h-6 sm:min-w-6'
      )}>
        {alerts.length > 9 ? '9+' : alerts.length}
      </span>
    </button>
  );
}

export function NotificationPermissionNudge({
  permission,
  onRequestPermission,
  settingsHref = '/dashboard/settings/notifications',
}: NotificationPermissionNudgeProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [permissionFeedback, setPermissionFeedback] = useState<'idle' | 'blocked'>('idle');

  useEffect(() => {
    setIsPromptDismissed(readNotificationPromptDismissed());
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (permission === 'granted') {
      clearNotificationPromptDismissed();
      setIsPromptDismissed(false);
      setPermissionFeedback('idle');
    }
  }, [permission]);

  const dismissNotificationPrompt = () => {
    setIsPromptDismissed(true);
    setPermissionFeedback('idle');

    persistNotificationPromptDismissed();
  };

  const handleRequestPermission = async () => {
    const granted = await onRequestPermission();

    if (granted) {
      clearNotificationPromptDismissed();
      setIsPromptDismissed(false);
      setPermissionFeedback('idle');
      return;
    }

    setPermissionFeedback('blocked');
  };

  const showPermissionGuidance = permission === 'denied' || permissionFeedback === 'blocked';

  if (!hasMounted) {
    return null;
  }

  if (permission === 'granted' || isPromptDismissed) {
    return null;
  }

  return (
    <div
      className="hidden 2xl:inline-flex"
      data-testid="notification-permission-nudge"
      data-placement="header-action"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex h-8 items-center gap-2 rounded-full border border-zinc-200/80 bg-white/85 px-2 shadow-sm backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-900/80"
      >
        {showPermissionGuidance ? (
          <BellOff className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
        ) : (
          <Bell className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
        )}
        <span className="whitespace-nowrap text-xs font-medium text-zinc-700 dark:text-zinc-200">
          {showPermissionGuidance ? 'Alerts blocked' : 'Alerts off'}
        </span>

        <div className="flex shrink-0 items-center gap-2">
          {showPermissionGuidance ? (
            <Link
              href={settingsHref}
              aria-label="Open notification settings"
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'h-7 rounded-full px-2.5')}
            >
              Settings
            </Link>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleRequestPermission}
              className="h-7 rounded-full px-2.5"
            >
              Enable
            </Button>
          )}
          <button
            type="button"
            onClick={dismissNotificationPrompt}
            className="rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Dismiss notification prompt"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AlertToast({
  alerts,
  dashboardAddress,
  isReviewOpen: controlledReviewOpen,
  onDismiss,
  onReviewOpenChange,
  presentation = 'floating',
  renderCollapsedTrigger = true,
}: AlertToastProps) {
  const [internalReviewOpen, setInternalReviewOpen] = useState(false);
  const isReviewOpen = controlledReviewOpen ?? internalReviewOpen;
  const setIsReviewOpen = useCallback((open: boolean | ((current: boolean) => boolean)) => {
    const nextOpen = typeof open === 'function' ? open(isReviewOpen) : open;

    if (controlledReviewOpen === undefined) {
      setInternalReviewOpen(nextOpen);
    }

    onReviewOpenChange?.(nextOpen);
  }, [controlledReviewOpen, isReviewOpen, onReviewOpenChange]);
  const visibleAlerts = isReviewOpen ? alerts : alerts.slice(0, 3);
  const alertCountLabel = `${alerts.length} node alert${alerts.length === 1 ? '' : 's'}`;
  const alertRegionPlacement = isReviewOpen && presentation === 'inspector'
    ? 'static w-full max-h-none overflow-visible lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto'
    : isReviewOpen
      ? 'fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] max-h-[min(75vh,28rem)] overflow-y-auto sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm lg:left-4 lg:right-auto'
      : 'fixed right-[calc(env(safe-area-inset-right)+0.75rem)] left-auto top-[calc(env(safe-area-inset-top)+5rem)] bottom-auto h-11 w-11 overflow-visible sm:top-auto sm:bottom-4 sm:w-auto lg:left-4 lg:right-auto';
  const alertPlacement = isReviewOpen
    ? (presentation === 'inspector' ? 'inspection-panel' : 'review-overlay')
    : 'floating';

  useEffect(() => {
    if (alerts.length === 0) {
      setIsReviewOpen(false);
    }
  }, [alerts.length, setIsReviewOpen]);

  if (alerts.length === 0 || (!isReviewOpen && !renderCollapsedTrigger)) {
    return null;
  }

  return (
    <>
      {alerts.length > 0 && (
        <div
          className={`z-50 flex flex-col gap-2 ${alertRegionPlacement}`}
          data-placement={alertPlacement}
          data-testid="node-alert-toast-region"
          data-state={isReviewOpen ? 'expanded' : 'collapsed'}
          role="region"
          aria-label="Node alerts"
          aria-live="polite"
          aria-relevant="additions removals"
          id="node-alert-toast-list"
        >
          {!isReviewOpen && (
            <AlertReviewTrigger
              alerts={alerts}
              isReviewOpen={false}
              onOpen={() => setIsReviewOpen(true)}
            />
          )}
          {visibleAlerts.map((alert, index) => (
            <div
              key={alert.id}
              data-testid="node-alert-toast-item"
              className={`pointer-events-auto items-center gap-2 border shadow-lg sm:items-start sm:gap-3 ${
                isReviewOpen ? 'rounded-lg p-3 sm:p-4' : 'rounded-full px-2.5 py-2 sm:rounded-lg sm:p-4'
              } ${
                isReviewOpen ? 'flex' : 'hidden'
              } ${getAlertColor(alert.type)}`}
            >
              <div className="shrink-0">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  {index === 0 && !isReviewOpen ? (
                    <span className="shrink-0 text-xs font-bold text-zinc-900 dark:text-zinc-100 sm:hidden">
                      {alertCountLabel}
                    </span>
                  ) : null}
                  <p className={`min-w-0 flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:line-clamp-none ${
                    isReviewOpen ? 'whitespace-normal' : 'hidden line-clamp-1 sm:block'
                  }`}>
                    {alert.message}
                  </p>
                  {index === 0 && isReviewOpen ? (
                    <button
                      type="button"
                      className="inline-flex h-7 min-w-9 shrink-0 items-center justify-center rounded-full bg-black/10 px-2 text-xs font-bold text-zinc-700 transition hover:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15 dark:focus-visible:ring-offset-zinc-950"
                      aria-controls="node-alert-toast-list"
                      aria-expanded={isReviewOpen}
                      aria-label={`Collapse ${alertCountLabel}`}
                      onClick={() => setIsReviewOpen((current) => !current)}
                    >
                      Hide
                    </button>
                  ) : null}
                </div>
                <p className={`mt-1 text-xs text-zinc-500 ${isReviewOpen ? 'block' : 'hidden'} sm:block`}>
                  {formatTimestamp(alert.timestamp)}
                </p>
                <Link
                  href={buildNodeRiskHref(dashboardAddress, alert.nodeAddress)}
                  className={`mt-2 w-fit items-center gap-1.5 rounded-md border border-black/10 bg-white/70 px-2.5 py-1 text-xs font-semibold text-zinc-800 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus-visible:ring-offset-zinc-950 ${
                    isReviewOpen ? 'inline-flex' : 'hidden'
                  }`}
                  aria-label={`Inspect risk context for ${alert.message}`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  Inspect risk
                </Link>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(alert.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:hover:bg-zinc-700 dark:focus-visible:ring-offset-zinc-950 sm:h-6 sm:w-6"
                aria-label={`Dismiss alert: ${alert.message}`}
              >
                <X className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
