import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PnLDashboard } from '../pnl-dashboard';
import { BondPosition } from '@/lib/types/node';

const positions: BondPosition[] = [
  {
    nodeAddress: 'node-1',
    nodeOperatorAddress: 'operator-1',
    bondAmount: 20,
    bondSharePercent: 0.1,
    status: 'Active',
    operatorFee: 1000,
    operatorFeeFormatted: '10.0%',
    netAPY: 0.12,
    totalBond: 200,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: 'v1',
    requestedToLeave: false,
  },
];

describe('PnLDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('clears stale manual baseline and hydrates from the new storage key', async () => {
    localStorage.setItem('bondtrack-initial-bond-addr-a', '100');
    localStorage.setItem('bondtrack-initial-bond-addr-c', '250');

    const { rerender } = render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={1}
        address="addr-a"
      />
    );

    await waitFor(() => {
      screen.getByText('100.00');
      screen.getByText(/manual/);
    });

    fireEvent.click(screen.getByTitle('Edit initial bond'));
    expect((screen.getByPlaceholderText('Enter RUNE amount') as HTMLInputElement).value).toBe('100');

    rerender(
      <PnLDashboard
        positions={positions}
        currentRunePrice={1}
        address="addr-b"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('20.00')).toHaveLength(2);
    });
    expect(screen.queryByPlaceholderText('Enter RUNE amount')).toBeNull();
    expect(screen.queryByText(/manual/)).toBeNull();

    rerender(
      <PnLDashboard
        positions={positions}
        currentRunePrice={1}
        address="addr-c"
      />
    );

    await waitFor(() => {
      screen.getByText('250.00');
      screen.getByText(/manual/);
    });
  });
});
