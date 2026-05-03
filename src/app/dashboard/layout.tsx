'use client';

import { Suspense, useEffect, useSyncExternalStore } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { AlertToast } from '@/components/alerts/alert-toast';
import { useAlerts } from '@/lib/hooks/use-alerts';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useProtocolVersion } from '@/lib/hooks/use-protocol-version';
import { UpgradeAlertBanner } from '@/components/dashboard/upgrade-alert-banner';
import Link from 'next/link';
import { Home } from 'lucide-react';

const BONDTRACK_ADDRESS = 'BONDTRACK_ADDRESS';
const OLD_SESSION_KEY = 'dashboard-address';
const OLD_LOCAL_KEY = 'thornode-watcher-last-address';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const urlAddress = searchParams.get('address');
  const { alerts, dismissAlert, permission, requestPermission } = useAlerts();
  const { currentVersion, latestVersion, hasUpgrade } = useProtocolVersion();
  const savedAddress = useSyncExternalStore(
    () => () => undefined,
    () => {
      if (typeof window === 'undefined') return null;
      return (
        localStorage.getItem(BONDTRACK_ADDRESS) ??
        sessionStorage.getItem(OLD_SESSION_KEY) ??
        localStorage.getItem(OLD_LOCAL_KEY) ??
        null
      );
    },
    () => null
  );
  const effectiveAddress = urlAddress ?? savedAddress;
  const isChangelogsRoute = pathname?.startsWith('/dashboard/changelogs');
  const requiresAddress = !isChangelogsRoute;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const current = localStorage.getItem(BONDTRACK_ADDRESS);
    if (current) {
      sessionStorage.removeItem(OLD_SESSION_KEY);
      localStorage.removeItem(OLD_LOCAL_KEY);
      return;
    }

    if (savedAddress) {
      localStorage.setItem(BONDTRACK_ADDRESS, savedAddress);
      sessionStorage.removeItem(OLD_SESSION_KEY);
      localStorage.removeItem(OLD_LOCAL_KEY);
    }
  }, [savedAddress]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!urlAddress) {
      if (savedAddress) {
        router.replace(`?address=${encodeURIComponent(savedAddress)}`);
        return;
      }
    }
  }, [urlAddress, router, savedAddress]);

  useEffect(() => {
    if (typeof window === 'undefined' || !urlAddress) return;
    localStorage.setItem(BONDTRACK_ADDRESS, urlAddress);
  }, [urlAddress]);

  if (requiresAddress && !effectiveAddress) {
    return (
      <div className="flex min-h-screen">
        <main className="flex-1 p-4 md:p-6 flex flex-col items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mb-2">
              <Home className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Enter an address to get started
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Provide a THORChain address to view your portfolio, node health, and rewards.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-10 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardShell requireAddress={requiresAddress ? !!effectiveAddress : false}>
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
