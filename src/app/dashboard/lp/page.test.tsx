import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LpDashboardPage from './page';

const mockUseLpPositions = vi.fn();
const mocks = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams('address=thor1lpaddress') },
}));

const basePosition = {
  address: 'bc1member',
  pool: 'BTC.BTC',
  assetSymbol: 'BTC',
  runeDeposit: '5000000000',
  asset2Deposit: '250000000',
  liquidityUnits: '100',
  runeAdded: '100000000',
  runePending: '0',
  runeWithdrawn: '0',
  asset2Added: '10000000',
  asset2Pending: '0',
  asset2Withdrawn: '0',
  volume24h: '900000000',
  runeDepth: '250000000000',
  asset2Depth: '125000000000',
  dateFirstAdded: '1700000000',
  dateLastAdded: '1700500000',
  poolApy: 12.5,
  poolStatus: 'available',
  ownershipPercent: 25,
  hasPending: false,
  runeDepositedValue: '5000000000',
  asset2DepositedValue: '250000000',
  runeWithdrawable: '5500000000',
  asset2Withdrawable: '275000000',
  currentRunePriceUsd: 0.48,
  currentAssetPriceUsd: 1.92,
  entryRunePriceUsd: 0.45,
  entryAssetPriceUsd: 1.8,
  currentTotalValueUsd: 31.68,
  depositedTotalValueUsd: 27,
  netProfitLoss: '+$4.68',
  netProfitLossUsd: 4.68,
  netProfitLossPercent: 17.33,
  hodlValueUsd: 31.5,
  impermanentLossUsd: 0.18,
  impermanentLossPercent: 0.57,
  impermanentLossValue: 0.18,
  pricingSource: 'historical' as const,
  runeEntryPrice: 0.45,
  asset2EntryPrice: 1.8,
};

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

  it('shows a missing-address prompt when no address query param is present', async () => {
    mocks.searchParams.current = new URLSearchParams('');
    mockUseLpPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      state: 'empty',
      error: undefined,
      retry: vi.fn(),
    });

    render(<LpDashboardPage />);

    expect(await screen.findByText('Enter a THORChain address')).toBeInTheDocument();
    expect(screen.getByText(/paste an address to inspect live liquidity positions/i)).toBeInTheDocument();
    expect(screen.queryByText('No LP positions found')).not.toBeInTheDocument();
  });

  it('renders the usd portfolio hero instead of the mixed-unit summary cards', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [basePosition],
      isLoading: false,
      state: 'ready',
      error: undefined,
      retry: vi.fn(),
    });

    render(<LpDashboardPage />);

    expect(await screen.findByText('Total LP Value')).toBeInTheDocument();
    expect(screen.getByText('Net P/L')).toBeInTheDocument();
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText('Last Activity')).toBeInTheDocument();
    expect(screen.queryByText('ASSET 2 Deposit')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Withdrawable')).not.toBeInTheDocument();
    expect(screen.getByText(/BTC\.BTC summary/i)).toBeInTheDocument();
  });

  it('shows a warning banner when any position lacks historical pricing', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [{
        ...basePosition,
        assetSymbol: 'ATOM',
        pool: 'GAIA.ATOM',
        pricingSource: 'current-only',
        currentTotalValueUsd: 72014,
        netProfitLoss: 'Current value only',
        netProfitLossUsd: null,
        netProfitLossPercent: null,
        impermanentLossUsd: null,
        impermanentLossPercent: null,
        impermanentLossValue: null,
        entryRunePriceUsd: null,
        entryAssetPriceUsd: null,
        runeEntryPrice: null,
        asset2EntryPrice: null,
      }],
      isLoading: false,
      state: 'ready',
      error: undefined,
      retry: vi.fn(),
    });

    render(<LpDashboardPage />);

    expect(await screen.findByText(/Historical entry pricing is unavailable for 1 position\./)).toBeInTheDocument();
  });
});
