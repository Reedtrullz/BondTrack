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
  LpSummaryCard: () => <div>LP Summary Card</div>,
}));

vi.mock('../../../components/dashboard/lp-node-row', () => ({
  LpNodeRow: () => <tr><td>LP Node Row</td></tr>,
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
});
