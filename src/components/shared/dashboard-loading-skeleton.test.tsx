import { render, screen } from '@/test/utils';
import { describe, expect, it } from 'vitest';
import { DashboardLoadingSkeleton } from './dashboard-loading-skeleton';

describe('DashboardLoadingSkeleton', () => {
  it('uses source-scoped loading language by default', () => {
    render(<DashboardLoadingSkeleton />);

    expect(screen.getByRole('status', { name: 'Loading dashboard source data' })).toBeInTheDocument();
    expect(screen.getByText('Waiting for THORNode, Midgard, and price source responses before showing operator decisions.')).toBeInTheDocument();
    expect(screen.queryByText('Loading live dashboard data')).not.toBeInTheDocument();
  });
});
