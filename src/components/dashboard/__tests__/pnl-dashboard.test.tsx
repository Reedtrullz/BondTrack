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
    localStorage.setItem('heimdall-initial-bond-addr-a', '100');
    localStorage.setItem('heimdall-initial-bond-addr-b', '250');

    const { rerender } = render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={1}
        address="addr-a"
      />
    );

    await waitFor(() => {
      screen.getByText('100.00');
      screen.getByText('$100.00 (manual)');
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
      screen.getByText('250.00');
      screen.getByText('$250.00 (manual)');
    });

    fireEvent.click(screen.getByTitle('Edit initial bond'));
    expect((screen.getByPlaceholderText('Enter RUNE amount') as HTMLInputElement).value).toBe('250');

    rerender(
      <PnLDashboard
        positions={positions}
        currentRunePrice={1}
        address="addr-c"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(3);
      expect(screen.queryByText(/manual/)).not.toBeInTheDocument();
    });
  });

  it('falls back to current positions and withholds return metrics when action history has no baseline', () => {
    render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={2}
        address="addr-a"
        bondHistory={{
          initialBond: 0,
          currentBond: 0,
          bondGrowth: 0,
          firstBondDate: null,
        }}
      />
    );

    expect(screen.getByText('Current Bond')).toBeInTheDocument();
    expect(screen.getByText('20.00')).toBeInTheDocument();
    expect(screen.getByText('$40.00')).toBeInTheDocument();
    expect(screen.getByText('Initial Bond')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('Set initial bond to track').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('treats failed action history as unavailable rather than a zero baseline', () => {
    render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={2}
        address="addr-a"
        actionsError={{ message: 'Midgard actions failed' }}
      />
    );

    const basis = screen.getByLabelText('PnL calculation basis');
    expect(basis).toHaveTextContent('Initial bond: history unavailable');
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('History unavailable; set manually').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();

    const warning = screen.getByLabelText('Action history unavailable; set an initial bond manually to calculate returns.');
    expect(warning).toHaveAttribute(
      'title',
      'History unavailable: Midgard actions failed. Set an initial bond manually to calculate returns.'
    );
    expect(warning.getAttribute('title')).not.toContain('0.00');
  });

  it('states the PnL calculation basis before return cards', () => {
    render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={2}
        entryRunePrice={1.25}
        address="addr-a"
        bondHistory={{
          initialBond: 10,
          currentBond: 30,
          bondGrowth: 20,
          firstBondDate: new Date('2024-01-01T00:00:00.000Z'),
        }}
      />
    );

    const basis = screen.getByLabelText('PnL calculation basis');
    expect(basis).toHaveTextContent('Initial bond: action history');
    expect(basis).toHaveTextContent('Entry price: historical RUNE price');
    expect(basis).toHaveTextContent('Current price: current quote');
    expect(basis).not.toHaveTextContent('Current price: live');

    const pnlCards = screen.getByLabelText('PnL return cards');
    expect(
      basis.compareDocumentPosition(pnlCards) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('labels manual baseline override fields with calculation impact', async () => {
    render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={2}
        entryRunePrice={1.25}
        address="addr-a"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit initial bond' }));
    const initialBondInput = screen.getByRole('spinbutton', { name: 'Manual initial bond amount' });
    expect(initialBondInput).toHaveAccessibleDescription('Overrides the action-history baseline for this browser only.');

    fireEvent.click(screen.getByRole('button', { name: 'Edit RUNE entry price' }));
    const entryPriceInput = screen.getByRole('spinbutton', { name: 'Manual RUNE entry price' });
    expect(entryPriceInput).toHaveAccessibleDescription('Overrides the entry price used for Price PnL in this browser only.');
  });

  it('uses positive action-history current bond when it is available', () => {
    render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={2}
        address="addr-a"
        bondHistory={{
          initialBond: 10,
          currentBond: 30,
          bondGrowth: 20,
          firstBondDate: new Date('2024-01-01T00:00:00.000Z'),
        }}
      />
    );

    expect(screen.getByText('Initial Bond')).toBeInTheDocument();
    expect(screen.getByText('10.00')).toBeInTheDocument();
    expect(screen.getByText('Current Bond')).toBeInTheDocument();
    expect(screen.getByText('30.00')).toBeInTheDocument();
    expect(screen.getByText('$40.00')).toBeInTheDocument();
    expect(screen.getByText('+200.0%')).toBeInTheDocument();
  });

  it('does not prefix negative bond growth with a plus sign', () => {
    render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={1}
        address="addr-a"
        bondHistory={{
          initialBond: 100,
          currentBond: 20,
          bondGrowth: -80,
          firstBondDate: new Date('2024-01-01T00:00:00.000Z'),
        }}
      />
    );

    expect(screen.getByText('-80.0%')).toBeInTheDocument();
    expect(screen.queryByText('+-80.0%')).not.toBeInTheDocument();
  });

  it('labels stale RUNE price data before showing PnL cards', () => {
    render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={1}
        currentRunePriceIsStale
        currentRunePriceUpdatedAt={new Date('2024-01-01T00:00:00.000Z')}
        address="addr-a"
      />
    );

    expect(screen.getByText(/Current RUNE price stale/)).toBeInTheDocument();
    expect(screen.getByText(/Price PnL and total return use the last Midgard price/)).toBeInTheDocument();
  });

  it('does not render NaN when earnings history has an invalid entry price', () => {
    render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={2}
        address="addr-a"
        earningsHistory={{
          intervals: [{ bondingEarnings: '0', runePriceUSD: 'not-a-price' }],
        }}
        bondHistory={{
          initialBond: 10,
          currentBond: 20,
          bondGrowth: 10,
          firstBondDate: new Date('2024-01-01T00:00:00.000Z'),
        }}
      />
    );

    const basis = screen.getByLabelText('PnL calculation basis');
    expect(basis).toHaveTextContent('Entry price: current price fallback');
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.getByText('Entry: $2.0000 → $2.0000')).toBeInTheDocument();
  });

  it('withholds return calculations when the current RUNE price is not usable', () => {
    render(
      <PnLDashboard
        positions={positions}
        currentRunePrice={Number.NaN}
        entryRunePrice={1.25}
        address="addr-a"
        bondHistory={{
          initialBond: 10,
          currentBond: 20,
          bondGrowth: 10,
          firstBondDate: new Date('2024-01-01T00:00:00.000Z'),
        }}
      />
    );

    const basis = screen.getByLabelText('PnL calculation basis');
    expect(basis).toHaveTextContent('Current price: missing quote');
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Current price unavailable').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps rendering manual-input controls when browser storage is unavailable', async () => {
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage denied');
      },
    });

    try {
      render(
        <PnLDashboard
          positions={positions}
          currentRunePrice={1}
          address="addr-a"
        />
      );

      expect(await screen.findByText('Profit & Loss')).toBeInTheDocument();
      fireEvent.click(screen.getByTitle('Edit initial bond'));
      expect(screen.getByPlaceholderText('Enter RUNE amount')).toBeInTheDocument();
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
    }
  });
});
