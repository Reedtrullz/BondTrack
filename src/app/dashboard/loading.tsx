import { DashboardLoadingSkeleton } from '@/components/shared/dashboard-loading-skeleton';

export default function DashboardLayoutLoading() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="flex h-screen overflow-hidden bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900"
    >
      <DashboardLoadingSkeleton />
    </div>
  );
}
