import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AutoCompoundChart } from './auto-compound-chart';
import type { BondPosition } from '@/lib/types/node';

vi.mock('@/lib/hooks/use-rune-price', () => ({
  useRunePrice: () => ({ price: 5 }),
}));

vi.mock('@/lib/hooks/use-historical-apy', () => ({
  useHistoricalApy: () => ({ historicalApy: 20 }),
}));

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
}));

const positions: BondPosition[] = [
  {
    nodeAddress: 'node-1',
    nodeOperatorAddress: 'operator-1',
    bondAmount: 100,
    bondSharePercent: 0.1,
    status: 'Active',
    operatorFee: 1000,
    operatorFeeFormatted: '10.0%',
    netAPY: 0.12,
    totalBond: 1000,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: 'v1',
    requestedToLeave: false,
  },
];

describe('AutoCompoundChart trust copy', () => {
  it('frames USD forecasts as price scenarios instead of live moon targets', async () => {
    const user = userEvent.setup();

    render(<AutoCompoundChart positions={positions} weightedApy={12} />);

    expect(screen.getByRole('button', { name: 'Historical blend' })).toHaveAttribute(
      'title',
      'Uses a 180-day historical APY blend for steadier scenario estimates'
    );
    expect(screen.queryByRole('button', { name: 'Realistic Mode' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '$ USD' }));

    expect(screen.getByText('Price scenarios:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '$5.00 (current quote)' })).toBeInTheDocument();
    expect(screen.queryByText('Moon Scenarios:')).not.toBeInTheDocument();
    expect(screen.queryByText(/\(Live\)/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Historical blend' }));

    expect(screen.getByText(/Using current APY/i)).toBeInTheDocument();
    expect(screen.queryByText(/live APY/i)).not.toBeInTheDocument();
  });
});
