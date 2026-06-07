import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { APYChart } from '../apy-chart';

vi.mock('@/lib/hooks/use-apy-chart-data', () => ({
  useApyChartData: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/components/shared/skeleton', () => ({
  SkeletonChart: () => <div>loading chart</div>,
}));

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <div />,
}));

describe('APYChart copy', () => {
  it('labels the series as an estimated current-baseline trend rather than true historical APY', () => {
    render(<APYChart />);

    expect(screen.getByText('Estimated APY Trend')).toBeInTheDocument();
    expect(screen.getByText(/Current-baseline estimate from Midgard earnings, not true historical APY/i)).toBeInTheDocument();
    expect(screen.getByText(/against the current network APY baseline/i)).toBeInTheDocument();
    expect(screen.queryByText('Earnings History')).not.toBeInTheDocument();
  });
});
