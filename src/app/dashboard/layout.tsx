'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { AlertToast } from '@/components/alerts/alert-toast';
import { useAlerts } from '@/lib/hooks/use-alerts';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { alerts, dismissAlert, permission, requestPermission } = useAlerts();

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex min-h-screen">
          <main className="flex-1 p-4 md:p-6">
            <LoadingSkeleton />
          </main>
        </div>
      }>
        <DashboardShell>{children}</DashboardShell>
      </Suspense>
      <AlertToast 
        alerts={alerts} 
        onDismiss={dismissAlert}
        permission={permission}
        onRequestPermission={requestPermission}
      />
    </ErrorBoundary>
  );
}
