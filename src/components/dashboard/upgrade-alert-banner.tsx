'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUpgradeAlertDismissedStorageKey } from '@/lib/storage/keys';

interface UpgradeAlertBannerProps {
  currentVersion: string;
  latestVersion: string;
  onDismiss: () => void;
}

function getDismissKey(latestVersion: string) {
  return getUpgradeAlertDismissedStorageKey(latestVersion);
}

export function UpgradeAlertBanner({ currentVersion, latestVersion, onDismiss }: UpgradeAlertBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissed = localStorage.getItem(getDismissKey(latestVersion)) === 'true';
    setIsVisible(!dismissed);
  }, [latestVersion]);

  if (!isVisible) {
    return null;
  }

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getDismissKey(latestVersion), 'true');
    }

    setIsVisible(false);
    onDismiss();
  };

  return (
    <div
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-100 p-2 dark:bg-amber-900/50">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                New protocol version available: {latestVersion}
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Current: {currentVersion}
              </p>
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="rounded-md p-1 text-amber-700 transition hover:bg-amber-100 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-amber-900/40 dark:hover:text-amber-100"
              aria-label="Dismiss protocol upgrade alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/changelogs"
              className="text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
            >
              View changelog
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={dismiss}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
