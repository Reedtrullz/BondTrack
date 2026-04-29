'use client';

import { Suspense, useEffect, useSyncExternalStore } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { AlertToast } from '@/components/alerts/alert-toast';
import { useAlerts } from '@/lib/hooks/use-alerts';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProtocolVersion } from '@/lib/hooks/use-protocol-version';
import { UpgradeAlertBanner } from '@/components/dashboard/upgrade-alert-banner';

const ADDRESS_STORAGE_KEY = 'dashboard-address';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlAddress = searchParams.get('address');
  const { alerts, dismissAlert, permission, requestPermission } = useAlerts();
  const { currentVersion, latestVersion, hasUpgrade } = useProtocolVersion();
  const savedAddress = useSyncExternalStore(
    () => () => undefined,
    () => (typeof window === 'undefined' ? null : sessionStorage.getItem(ADDRESS_STORAGE_KEY)),
    () => null
  );
  const effectiveAddress = urlAddress ?? savedAddress;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!urlAddress) {
      if (savedAddress) {
        router.replace(`?address=${savedAddress}`);
        return;
      }
    }
  }, [urlAddress, router, savedAddress]);

  useEffect(() => {
    if (typeof window === 'undefined' || !urlAddress) return;
    sessionStorage.setItem(ADDRESS_STORAGE_KEY, urlAddress);
  }, [urlAddress]);

  if (!effectiveAddress && !urlAddress) {
    return (
      <div className="flex min-h-screen">
        <main className="flex-1 p-4 md:p-6">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardShell requireAddress={!!effectiveAddress}>
        {hasUpgrade && currentVersion && (
          <UpgradeAlertBanner
            currentVersion={currentVersion}
            latestVersion={latestVersion}
            onDismiss={() => undefined}
          />
        )}
        {children}
      </DashboardShell>
      <AlertToast 
        alerts={alerts} 
        onDismiss={dismissAlert}
        permission={permission}
        onRequestPermission={requestPermission}
      />
    </ErrorBoundary>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
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
