'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bell, Mail, Send, Loader2, Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type NotificationType = 'bond_maturity' | 'churn_risk' | 'apy_change' | 'il_alert' | 'price_alert';

interface NotificationSetting {
  id: NotificationType;
  label: string;
  description: string;
  emailEnabled: boolean;
  telegramEnabled: boolean;
}

export default function NotificationPreferences() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'bond_maturity',
      label: 'Bond Maturity',
      description: 'Notify when your bond is ready to unbond (unbond window opens)',
      emailEnabled: true,
      telegramEnabled: false,
    },
    {
      id: 'churn_risk',
      label: 'Churn Risk Alert',
      description: 'Notify when your node is at risk of being churned (low bond score)',
      emailEnabled: true,
      telegramEnabled: false,
    },
    {
      id: 'apy_change',
      label: 'APY Change',
      description: 'Notify when your node APY changes by more than 5%',
      emailEnabled: false,
      telegramEnabled: true,
    },
    {
      id: 'il_alert',
      label: 'Impermanent Loss Alert',
      description: 'Notify when IL on LP positions exceeds 5%',
      emailEnabled: false,
      telegramEnabled: true,
    },
    {
      id: 'price_alert',
      label: 'RUNE Price Alert',
      description: 'Notify when RUNE price moves ±10% in 24h',
      emailEnabled: true,
      telegramEnabled: true,
    },
  ]);

  const [email, setEmail] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateSetting = (id: NotificationType, field: 'emailEnabled' | 'telegramEnabled', value: boolean) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Mock save to API
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (process.env.NODE_ENV !== 'production') console.log('Saved notification settings:', { settings, email, telegramChatId });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Notification Preferences
        </h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Configure alerts for bond events, price changes, and LP risks
        </p>
      </div>

      {/* Contact Info */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[var(--color-primary)]" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Receive alerts via email (required for email notifications)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-[var(--color-primary)]" />
              Telegram Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram Chat ID</Label>
              <Input
                id="telegram"
                type="text"
                placeholder="@yourusername or chat ID"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Get your Chat ID from @userinfobot on Telegram
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Toggles */}
      <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--color-primary)]" />
            Notification Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings.map((setting) => (
            <div key={setting.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{setting.label}</h3>
                <p className="text-sm text-zinc-500">{setting.description}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${setting.id}-email`}
                    checked={setting.emailEnabled}
                    onCheckedChange={(checked) => updateSetting(setting.id, 'emailEnabled', checked)}
                    disabled={!email}
                  />
                  <Label htmlFor={`${setting.id}-email`} className="text-sm">
                    Email
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${setting.id}-telegram`}
                    checked={setting.telegramEnabled}
                    onCheckedChange={(checked) => updateSetting(setting.id, 'telegramEnabled', checked)}
                    disabled={!telegramChatId}
                  />
                  <Label htmlFor={`${setting.id}-telegram`} className="text-sm">
                    Telegram
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || (!email && !telegramChatId)}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="h-4 w-4" />
              Saved!
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>

      {!address && (
        <div className="mt-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
          Connect a wallet to save preferences per-address. Currently saving globally.
        </div>
      )}
    </div>
  );
}
