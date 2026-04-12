'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { AlertToast } from '@/components/alerts/alert-toast';
import { useAlerts } from '@/lib/hooks/use-alerts';
import { useSearchParams } from 'next/navigation';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { alerts, dismissAlert, permission, requestPermission } = useAlerts();

  return (
    <ErrorBoundary>
      <DashboardShell requireAddress={!!address}>{children}</DashboardShell>
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
