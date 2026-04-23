'use client';

import { Suspense, useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { AlertToast } from '@/components/alerts/alert-toast';
import { useAlerts } from '@/lib/hooks/use-alerts';
import { useSearchParams, useRouter } from 'next/navigation';

const ADDRESS_STORAGE_KEY = 'dashboard-address';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlAddress = searchParams.get('address');
  const [initialized, setInitialized] = useState(false);
  const { alerts, dismissAlert, permission, requestPermission } = useAlerts();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!urlAddress) {
      const saved = sessionStorage.getItem(ADDRESS_STORAGE_KEY);
      if (saved) {
        router.replace(`?address=${saved}`);
        return;
      }
    }
    setInitialized(true);
  }, [urlAddress, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !urlAddress) return;
    sessionStorage.setItem(ADDRESS_STORAGE_KEY, urlAddress);
  }, [urlAddress]);

  if (!initialized) {
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
      <DashboardShell requireAddress={!!urlAddress}>{children}</DashboardShell>
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
