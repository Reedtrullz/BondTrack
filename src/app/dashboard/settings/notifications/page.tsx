'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Activity, AlertCircle, AlertTriangle, Bell, Info, Mail, Monitor, RotateCcw, Send, ShieldAlert, Trash2, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAlertsContext, type Alert, type AlertPreferences, type AlertType } from '@/lib/hooks/use-alerts';
import { cn } from '@/lib/utils';

type LocalAlertSetting = {
  id: keyof AlertPreferences;
  label: string;
  description: string;
};

const LOCAL_ALERT_SETTINGS: LocalAlertSetting[] = [
  {
    id: 'slashAlerts',
    label: 'Slash Increase',
    description: 'Create an in-app alert when monitored node slash points increase.',
  },
  {
    id: 'jailAlerts',
    label: 'Jail Alert',
    description: 'Create an in-app alert when a monitored node enters jail.',
  },
  {
    id: 'churnAlerts',
    label: 'Churn Risk',
    description: 'Create an in-app alert when a monitored node is flagged for churn risk.',
  },
  {
    id: 'statusAlerts',
    label: 'Node Status Change',
    description: 'Create an in-app alert when a monitored node status changes.',
  },
];

const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  slashAlerts: true,
  jailAlerts: true,
  churnAlerts: true,
  statusAlerts: true,
};

const ALERT_SEVERITY_RANK: Record<AlertType, number> = {
  JAIL: 0,
  SLASH_INCREASE: 1,
  CHURN_RISK: 2,
  NODE_STATUS_CHANGE: 3,
};

function permissionLabel(permission: NotificationPermission) {
  switch (permission) {
    case 'granted':
      return 'Browser notifications enabled';
    case 'denied':
      return 'Browser notifications blocked in this browser';
    default:
      return 'Browser notifications not enabled yet';
  }
}

function sortAlertHistory(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const severityDelta = ALERT_SEVERITY_RANK[a.type] - ALERT_SEVERITY_RANK[b.type];
    if (severityDelta !== 0) return severityDelta;

    if (a.dismissed !== b.dismissed) {
      return a.dismissed ? 1 : -1;
    }

    return b.timestamp - a.timestamp;
  });
}

function alertTypeLabel(type: AlertType): string {
  switch (type) {
    case 'SLASH_INCREASE':
      return 'Slash increase';
    case 'JAIL':
      return 'Jail';
    case 'CHURN_RISK':
      return 'Churn risk';
    case 'NODE_STATUS_CHANGE':
      return 'Status change';
  }
}

function alertTypeIcon(type: AlertType) {
  switch (type) {
    case 'SLASH_INCREASE':
      return <ShieldAlert className="h-4 w-4 text-amber-500" aria-hidden="true" />;
    case 'JAIL':
      return <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />;
    case 'CHURN_RISK':
      return <Activity className="h-4 w-4 text-orange-500" aria-hidden="true" />;
    case 'NODE_STATUS_CHANGE':
      return <AlertCircle className="h-4 w-4 text-blue-500" aria-hidden="true" />;
  }
}

function formatAlertTimestamp(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function buildAlertRiskHref(address: string | null, nodeAddress: string): string {
  const params = new URLSearchParams();
  if (address) {
    params.set('address', address);
  }
  params.set('node', nodeAddress);

  return `/dashboard/risk?${params.toString()}`;
}

function AlertHistoryPanel({
  alerts,
  address,
  onRestoreAlert,
  onClearAlerts,
}: {
  alerts: Alert[];
  address: string | null;
  onRestoreAlert: (id: string) => void;
  onClearAlerts: () => void;
}) {
  const activeCount = alerts.filter((alert) => !alert.dismissed).length;
  const dismissedCount = alerts.length - activeCount;
  const visibleHistory = sortAlertHistory(alerts).slice(0, 10);

  return (
    <Card
      className="mt-6 border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80"
      data-testid="local-alert-history"
    >
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--color-primary)]" />
            Local Alert History
          </CardTitle>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Recent in-app alerts stored in this browser, including alerts you dismissed from the alert rail.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearAlerts}
          disabled={alerts.length === 0}
          className="w-full gap-2 sm:w-auto"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Clear history
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:max-w-md">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Active
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
              {activeCount}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Dismissed
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {dismissedCount}
            </p>
          </div>
        </div>

        {visibleHistory.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No local alert history yet. Heimdall will keep recent node alerts here after they appear.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {visibleHistory.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-col gap-3 bg-white/70 p-4 dark:bg-zinc-950/50 sm:flex-row sm:items-start sm:justify-between"
                data-alert-type={alert.type}
                data-testid="local-alert-history-row"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                      {alertTypeIcon(alert.type)}
                      {alertTypeLabel(alert.type)}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      alert.dismissed
                        ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {alert.dismissed ? 'Dismissed' : 'Active'}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatAlertTimestamp(alert.timestamp)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {alert.message}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400" title={alert.nodeAddress}>
                    {alert.nodeAddress}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <Link
                    href={buildAlertRiskHref(address, alert.nodeAddress)}
                    className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'w-full gap-2 sm:w-auto')}
                    aria-label={`Inspect risk context for ${alertTypeLabel(alert.type)} alert`}
                  >
                    <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                    Inspect risk
                  </Link>

                  {alert.dismissed ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRestoreAlert(alert.id)}
                      className="w-full gap-2 sm:w-auto"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Show again
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function NotificationPreferences() {
  const searchParams = useSearchParams();
  const {
    alertHistory,
    clearAllAlerts,
    preferences,
    permission,
    requestPermission,
    restoreAlert,
    updatePreferences,
  } = useAlertsContext();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderedPreferences = isMounted ? preferences : DEFAULT_ALERT_PREFERENCES;
  const renderedPermission = isMounted ? permission : 'default';
  const renderedAlertHistory = isMounted ? alertHistory : [];
  const address = searchParams.get('address');
  const isBrowserPermissionBlocked = renderedPermission === 'denied';

  const handleToggle = (id: keyof AlertPreferences, checked: boolean) => {
    if (!isMounted) return;
    updatePreferences({ [id]: checked });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Notification Preferences
        </h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Configure the alert channels Heimdall can actually use today.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">No remote delivery is connected yet.</p>
            <p>
              Heimdall currently supports local in-app alerts and optional browser notifications only. Email and Telegram
              inputs are intentionally not shown because Heimdall does not subscribe you, save contact details, or send
              messages through those channels yet.
            </p>
          </div>
        </div>
      </div>

      <div
        className="mb-8 rounded-xl border border-zinc-200 bg-white/80 p-4 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300"
        data-testid="background-notification-status"
      >
        <div className="flex gap-3">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">Background push is not connected.</p>
            <p>
              Heimdall does not yet keep a remote push subscription for this address. If all Heimdall tabs are closed,
              status changes are checked only when you reopen Heimdall; they are not delivered at the moment they happen.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-[var(--color-primary)]" />
              Browser / In-app
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Alert preferences are saved automatically in this browser. Heimdall checks your saved address while any
              Heimdall tab is open; system browser notifications require permission.
            </p>
            <div
              className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200"
              data-testid="browser-notification-scope"
              role="note"
            >
              <p className="font-semibold">Open-tab delivery only</p>
              <p className="mt-1">
                Desktop browser notifications can usually fire from an open Heimdall tab while you view another tab or
                app, though background throttling can delay checks. Closed-tab or instant after-update delivery needs
                server-side Web Push and is not active yet.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              {permissionLabel(renderedPermission)}
            </div>
            {isBrowserPermissionBlocked ? (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                data-testid="browser-notification-blocked-guidance"
                role="note"
              >
                <p className="font-semibold">Browser setting required</p>
                <p className="mt-1">
                  Allow notifications for this site in your browser settings. In-app alerts still work while a Heimdall
                  tab is open.
                </p>
              </div>
            ) : (
              <Button
                type="button"
                onClick={() => void requestPermission()}
                disabled={!isMounted || renderedPermission === 'granted'}
                className="w-full"
                variant={renderedPermission === 'granted' ? 'outline' : 'default'}
              >
                {renderedPermission === 'granted' ? 'Permission granted' : 'Enable browser notifications'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white/80 opacity-90 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-zinc-400" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="inline-flex rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Not active yet
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Email delivery is not wired to a backend or mailing provider. No email address is collected or saved here.
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white/80 opacity-90 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-zinc-400" />
              Telegram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="inline-flex rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Not active yet
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Telegram delivery is not wired to a bot or subscription service. No chat ID is collected or saved here.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--color-primary)]" />
            Local Alert Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {LOCAL_ALERT_SETTINGS.map((setting) => (
            <div key={setting.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{setting.label}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{setting.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${setting.id}-local`}
                    checked={renderedPreferences[setting.id]}
                    onCheckedChange={(checked) => handleToggle(setting.id, checked)}
                    disabled={!isMounted}
                  />
                  <Label htmlFor={`${setting.id}-local`} className="text-sm">
                    In-app / browser
                  </Label>
                </div>
                <div className="flex items-center gap-2 opacity-60">
                  <Switch id={`${setting.id}-email`} checked={false} disabled />
                  <Label htmlFor={`${setting.id}-email`} className="text-sm text-zinc-500">
                    Email not active
                  </Label>
                </div>
                <div className="flex items-center gap-2 opacity-60">
                  <Switch id={`${setting.id}-telegram`} checked={false} disabled />
                  <Label htmlFor={`${setting.id}-telegram`} className="text-sm text-zinc-500">
                    Telegram not active
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertHistoryPanel
        alerts={renderedAlertHistory}
        address={address}
        onRestoreAlert={restoreAlert}
        onClearAlerts={clearAllAlerts}
      />

      <p className="mt-6 text-right text-xs text-zinc-500 dark:text-zinc-400">
        Changes save locally as soon as you toggle them. There is no mock save or remote subscription step.
      </p>
    </div>
  );
}
