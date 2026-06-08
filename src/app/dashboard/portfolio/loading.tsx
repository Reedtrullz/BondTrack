import { DashboardLoadingSkeleton } from '@/components/shared/dashboard-loading-skeleton';

export default function PortfolioLoading() {
  return (
    <div
      role="status"
      aria-label="Loading portfolio"
      className="space-y-6 motion-safe:animate-pulse"
    >
      <DashboardLoadingSkeleton />
    </div>
  );
}
