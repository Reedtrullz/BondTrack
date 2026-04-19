import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LpDashboardPage from './page';

const mockUseLpPositions = vi.fn();
const mocks = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams('address=thor1lpaddress') },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.current.get(key),
    toString: () => mocks.searchParams.current.toString(),
  }),
}));

vi.mock('../../../hooks/use-lp-positions', () => ({
  useLpPositions: (address: string | null) => mockUseLpPositions(address),
}));

vi.mock('../../../components/dashboard/lp-summary-card', () => ({
  LpSummaryCard: ({ position }: { position: { pool: string; poolStatus: string; runeDeposit: string; poolApy: number; ownershipPercent: number } }) => (
    <div>
      {position.pool} summary {position.poolStatus} {position.runeDeposit} {position.poolApy} {position.ownershipPercent}
    </div>
  ),
}));

vi.mock('../../../components/dashboard/lp-node-row', () => ({
  LpNodeRow: ({ position }: { position: { pool: string; poolStatus: string; runeDeposit: string; poolApy: number; ownershipPercent: number; volume24h: string; dateFirstAdded: string; dateLastAdded: string } }) => (
    <tr>
      <td>{position.pool}</td>
      <td>{position.poolStatus}</td>
      <td>{position.runeDeposit}</td>
      <td>{position.ownershipPercent}</td>
      <td>{position.poolApy}</td>
      <td>{position.volume24h}</td>
      <td>{position.dateFirstAdded}-{position.dateLastAdded}</td>
    </tr>
  ),
}));

describe('LpDashboardPage', () => {
  beforeEach(() => {
    mockUseLpPositions.mockReset();
    mocks.searchParams.current = new URLSearchParams('address=thor1lpaddress');
  });

  it('shows an explicit upstream error state for member endpoint failures', async () => {
    const retry = vi.fn();

    mockUseLpPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      state: 'error',
      error: 'Midgard could not load this address’s LP member record right now. This is an upstream failure, not confirmation that the address has no LP positions.',
      retry,
    });

    render(<LpDashboardPage />);

    expect(await screen.findByText('LP member data is temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByText(/upstream Midgard response problem/i)).toBeInTheDocument();
    expect(screen.getByText('thor1lpaddress')).toBeInTheDocument();
    expect(mockUseLpPositions).toHaveBeenCalledWith('thor1lpaddress');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows a clear empty state when no LP positions exist', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      state: 'empty',
      error: undefined,
      retry: vi.fn(),
    });

    render(<LpDashboardPage />);

    expect(await screen.findByText('No LP positions found')).toBeInTheDocument();
    expect(screen.getByText(/successful member lookup/i)).toBeInTheDocument();
  });

  it('renders populated LP headers without health or action columns', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [{
        address: 'bc1member',
        pool: 'BTC.BTC',
        runeDeposit: '5000000000',
        liquidityUnits: '100',
        runeAdded: '100000000',
        runePending: '0',
        runeWithdrawn: '0',
        volume24h: '900000000',
        runeDepth: '250000000000',
        dateFirstAdded: '1700000000',
        dateLastAdded: '1700500000',
        poolApy: 0,
        poolStatus: 'available',
        ownershipPercent: 25,
        hasPending: false,
      }],
      isLoading: false,
      state: 'ready',
      error: undefined,
      retry: vi.fn(),
    });

    render(<LpDashboardPage />);

    expect(await screen.findByText('RUNE Deposit Value')).toBeInTheDocument();
    expect(screen.getByText('Pool APY')).toBeInTheDocument();
    expect(screen.getByText('Pool Status')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('24H Volume')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('RUNE Deposit')).toBeInTheDocument();
    expect(screen.getByText('Last LP Activity')).toBeInTheDocument();
    expect(screen.queryByText('Health')).not.toBeInTheDocument();
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
    expect(screen.getByText(/BTC\.BTC summary/i)).toBeInTheDocument();
  });
});
