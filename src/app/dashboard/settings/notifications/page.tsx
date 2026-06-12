'use client';

import { useEffect, useState } from 'react';
import { Bell, Info, Mail, Monitor, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAlertsContext, type AlertPreferences } from '@/lib/hooks/use-alerts';

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

export default function NotificationPreferences() {
  const { preferences, permission, requestPermission, updatePreferences } = useAlertsContext();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderedPreferences = isMounted ? preferences : DEFAULT_ALERT_PREFERENCES;
  const renderedPermission = isMounted ? permission : 'default';

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
              Alert preferences are saved automatically in this browser via local storage. In-app alerts work without a
              permission prompt; system browser notifications require permission.
            </p>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              {permissionLabel(renderedPermission)}
            </div>
            <Button
              type="button"
              onClick={() => void requestPermission()}
              disabled={!isMounted || renderedPermission === 'granted'}
              className="w-full"
              variant={renderedPermission === 'granted' ? 'outline' : 'default'}
            >
              {renderedPermission === 'granted' ? 'Permission granted' : 'Enable browser notifications'}
            </Button>
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

      <p className="mt-6 text-right text-xs text-zinc-500 dark:text-zinc-400">
        Changes save locally as soon as you toggle them. There is no mock save or remote subscription step.
      </p>
    </div>
  );
}
