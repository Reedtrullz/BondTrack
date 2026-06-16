'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { AddressRequiredState } from '@/components/dashboard/address-required-state';
import { AlertReviewTrigger, AlertToast, NotificationPermissionNudge } from '@/components/alerts/alert-toast';
import { useAlertsContext } from '@/lib/hooks/use-alerts';
import { ApiHealthProvider } from '@/lib/hooks/use-api-health';
import { useWatchlist } from '@/lib/hooks/use-watchlist';
import { WalletProvider } from '@/lib/hooks/use-wallet';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useProtocolVersion } from '@/lib/hooks/use-protocol-version';
import { UpgradeAlertBanner } from '@/components/dashboard/upgrade-alert-banner';
import { clearLegacyDashboardAddressKeys, readDashboardAddress, writeDashboardAddress } from '@/lib/storage/keys';
import { isValidTHORChainAddress } from '@/lib/utils/address-validation';

function readSavedAddress() {
  if (typeof window === 'undefined') return null;
  return readDashboardAddress();
}

function DashboardContent({ children }: { children: ReactNode }) {
  return <DashboardContentInner>{children}</DashboardContentInner>;
}

function DashboardContentInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const urlAddress = searchParams.get('address');
  const invalidUrlAddress = Boolean(urlAddress && !isValidTHORChainAddress(urlAddress));
  const {
    alerts,
    dismissAlert,
    permission,
    requestPermission,
  } = useAlertsContext();
  const { addAddress } = useWatchlist();
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [isAlertReviewOpen, setIsAlertReviewOpen] = useState(false);
  const effectiveAddress = invalidUrlAddress ? null : (urlAddress ?? savedAddress);
  const isChangelogsRoute = pathname?.startsWith('/dashboard/changelogs');
  const isNotificationSettingsRoute = pathname?.startsWith('/dashboard/settings/notifications');
  const requiresAddress = !isChangelogsRoute;
  const shouldLoadShellData = !requiresAddress || Boolean(effectiveAddress);
  const { currentVersion, latestVersion, hasUpgrade } = useProtocolVersion({
    enabled: shouldLoadShellData,
  });
  const notificationSettingsHref = useMemo(() => {
    if (!effectiveAddress) {
      return '/dashboard/settings/notifications';
    }

    const params = new URLSearchParams();
    params.set('address', effectiveAddress);

    return `/dashboard/settings/notifications?${params.toString()}`;
  }, [effectiveAddress]);
  const handleAddressRequiredSubmit = useCallback((address: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const targetPathname = pathname ?? '/dashboard';

    params.set('address', address);
    writeDashboardAddress(address);
    addAddress(address);
    setSavedAddress(address);
    router.push(`${targetPathname}?${params.toString()}`);
  }, [addAddress, pathname, router, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const migratedAddress = readSavedAddress();
    if (migratedAddress) {
      setSavedAddress(migratedAddress);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const current = readDashboardAddress();
    if (current) {
      clearLegacyDashboardAddressKeys();
      if (current !== savedAddress) {
        setSavedAddress(current);
      }
      return;
    }

    if (savedAddress) {
      writeDashboardAddress(savedAddress);
      clearLegacyDashboardAddressKeys();
    }
  }, [savedAddress]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!urlAddress) {
      if (savedAddress) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('address', savedAddress);
        const timeoutId = window.setTimeout(() => {
          router.replace(`?${params.toString()}`);
        }, 0);

        return () => window.clearTimeout(timeoutId);
      }
    }
  }, [urlAddress, router, savedAddress, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined' || !urlAddress) return;
    if (!isValidTHORChainAddress(urlAddress)) {
      return;
    }
    writeDashboardAddress(urlAddress);
    addAddress(urlAddress);
    setSavedAddress(urlAddress);
  }, [addAddress, urlAddress]);

  useEffect(() => {
    if (alerts.length === 0) {
      setIsAlertReviewOpen(false);
    }
  }, [alerts.length]);

  if (requiresAddress && !effectiveAddress) {
    return (
      <AddressRequiredState
        invalidUrlAddress={invalidUrlAddress}
        onAddressSubmit={handleAddressRequiredSubmit}
      />
    );
  }

  return (
    <ErrorBoundary>
      <WalletProvider>
        <ApiHealthProvider>
          <DashboardShell
            requireAddress={requiresAddress ? !!effectiveAddress : false}
            alertReviewPanel={alerts.length > 0 && isAlertReviewOpen ? (
              <AlertToast
                alerts={alerts}
                dashboardAddress={effectiveAddress}
                isReviewOpen={isAlertReviewOpen}
                onDismiss={dismissAlert}
                onReviewOpenChange={setIsAlertReviewOpen}
                presentation="inspector"
                renderCollapsedTrigger={false}
              />
            ) : null}
            alertReviewTrigger={alerts.length > 0 ? (
              <AlertReviewTrigger
                alerts={alerts}
                isReviewOpen={isAlertReviewOpen}
                onOpen={() => setIsAlertReviewOpen(true)}
                variant="header"
              />
            ) : null}
            notificationNudge={!isNotificationSettingsRoute ? (
              <NotificationPermissionNudge
                permission={permission}
                onRequestPermission={requestPermission}
                settingsHref={notificationSettingsHref}
              />
            ) : null}
          >
            {hasUpgrade && currentVersion && latestVersion && (
              <UpgradeAlertBanner
                currentVersion={currentVersion}
                latestVersion={latestVersion}
                onDismiss={() => undefined}
              />
            )}
            {children}
          </DashboardShell>
        </ApiHealthProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen">
        <main className="flex-1 p-4 md:p-6">
          <LoadingSkeleton />
        </main>
      </div>
    }>
      <DashboardContent>{children}</DashboardContent>
    </Suspense>
  );
}
