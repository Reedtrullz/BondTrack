import { fireEvent, render, screen, within } from '@testing-library/react';
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

const freshRunePrice = {
  updatedAt: new Date('2026-06-12T10:00:00.000Z'),
  updatedAtTimestampSeconds: 1781258400,
  ageMs: 1_000,
  isStale: false,
  staleAfterMs: 129_600_000,
};

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.current.get(key),
    toString: () => mocks.searchParams.current.toString(),
  }),
}));

vi.mock('@/lib/hooks/use-lp-positions', () => ({
  useLpPositions: (address: string | null) => mockUseLpPositions(address),
}));

vi.mock('@/components/dashboard/lp-summary-card', () => ({
  LpSummaryCard: ({ position, isHistoricalEnrichmentLoading }: { position: { pool: string; poolStatus: string; runeDeposit: string; poolApy: number; ownershipPercent: number; dateFirstAdded: string; dateLastAdded: string }; isHistoricalEnrichmentLoading?: boolean }) => (
    <div>
      {position.pool} summary {position.poolStatus} {position.runeDeposit} {position.poolApy} {position.ownershipPercent}
      <span>Positions</span>
      <span>Last Activity</span>
      <span>{isHistoricalEnrichmentLoading ? 'Card historical enrichment loading' : 'Card historical enrichment settled'}</span>
    </div>
  ),
}));

vi.mock('@/components/dashboard/lp-node-row', () => ({
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
    const emptyHeading = screen.getByRole('heading', { name: 'No LP positions found' });
    const confidence = screen.getByLabelText('LP data confidence');
    expect(emptyHeading.compareDocumentPosition(confidence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(confidence).getByText('RUNE price')).toBeInTheDocument();
    expect(within(confidence).getByText('Not used')).toBeInTheDocument();
    expect(within(confidence).getByText('No LP values')).toBeInTheDocument();
    expect(within(confidence).queryByText('Fresh')).not.toBeInTheDocument();
  });

  it('does not declare an address empty while LP member data is still loading', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [],
      isLoading: true,
      state: 'empty',
      error: undefined,
      retry: vi.fn(),
    });

    render(<LpDashboardPage />);

    expect(await screen.findByText('Checking LP positions')).toBeInTheDocument();
    expect(screen.getByText(/Waiting for Midgard member data/)).toBeInTheDocument();
    expect(screen.queryByText('No LP positions found')).not.toBeInTheDocument();

    const loadingHeading = screen.getByRole('heading', { name: 'Checking LP positions' });
    const confidence = screen.getByLabelText('LP data confidence');
    expect(loadingHeading.compareDocumentPosition(confidence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(confidence).getByText('RUNE price')).toBeInTheDocument();
    expect(within(confidence).getByText('Pending')).toBeInTheDocument();
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
    expect(screen.getByText(/paste an address to inspect source-backed liquidity positions/i)).toBeInTheDocument();
    expect(screen.queryByText(/inspect live liquidity positions/i)).not.toBeInTheDocument();
    expect(screen.queryByText('No LP positions found')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('LP data confidence')).not.toBeInTheDocument();
  });

  it('renders the usd portfolio hero instead of the mixed-unit summary cards', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [basePosition],
      isLoading: false,
      state: 'ready',
      error: undefined,
      retry: vi.fn(),
      runePriceFreshness: freshRunePrice,
    });

    render(<LpDashboardPage />);

    const diagnosis = await screen.findByLabelText('LP performance diagnosis');
    expect(within(diagnosis).getByRole('heading', { name: 'LP performance is historically priced' })).toBeInTheDocument();
    expect(within(diagnosis).getByRole('button', { name: 'Review positions' })).toBeInTheDocument();
    expect(within(diagnosis).getByText('Total LP value')).toBeInTheDocument();
    expect(within(diagnosis).getByText('Trusted P/L')).toBeInTheDocument();
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText('Last Activity')).toBeInTheDocument();
    expect(screen.queryByText('ASSET 2 Deposit')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Withdrawable')).not.toBeInTheDocument();
    expect(screen.getByText(/BTC\.BTC summary/i)).toBeInTheDocument();
  });

  it('labels aggregate IL as LP versus HODL instead of implying every signed value is a loss', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [basePosition],
      isLoading: false,
      state: 'ready',
      error: undefined,
      retry: vi.fn(),
      runePriceFreshness: freshRunePrice,
    });

    render(<LpDashboardPage />);

    expect((await screen.findAllByText('LP vs HODL')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('LP value minus HODL value for historical positions')).toBeInTheDocument();
    expect(screen.queryByText('Total Impermanent Loss')).not.toBeInTheDocument();
  });

  it('shows stale RUNE price confidence when LP current values use stale Midgard price data', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [basePosition],
      isLoading: false,
      state: 'ready',
      error: undefined,
      retry: vi.fn(),
      runePriceFreshness: {
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAtTimestampSeconds: 1704067200,
        ageMs: 200_000_000,
        isStale: true,
        staleAfterMs: 129_600_000,
      },
    });

    render(<LpDashboardPage />);

    const confidence = await screen.findByLabelText('LP data confidence');
    expect(within(confidence).getByText('RUNE price')).toBeInTheDocument();
    expect(within(confidence).getByText('Stale')).toBeInTheDocument();
  });

  it('does not claim LP USD values use a fresh RUNE price before a quote has loaded', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [basePosition],
      isLoading: false,
      state: 'ready',
      error: undefined,
      retry: vi.fn(),
      runePriceFreshness: undefined,
    });

    render(<LpDashboardPage />);

    const confidence = await screen.findByLabelText('LP data confidence');
    expect(within(confidence).getByText('RUNE price')).toBeInTheDocument();
    expect(within(confidence).getByText('Unknown')).toBeInTheDocument();
    expect(within(confidence).getByText('No Midgard quote loaded')).toBeInTheDocument();
    expect(within(confidence).queryByText('Fresh')).not.toBeInTheDocument();
  });

  it('shows current-only confidence when any position lacks historical pricing', async () => {
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

    const diagnosis = await screen.findByLabelText('LP performance diagnosis');
    expect(within(diagnosis).getByRole('heading', { name: 'Current-only: 1' })).toBeInTheDocument();
    expect(within(diagnosis).getByText(/1 current-only LP position history unavailable/i)).toBeInTheDocument();
    expect(within(diagnosis).getByRole('button', { name: 'Review LP confidence' })).toBeInTheDocument();
    expect(within(diagnosis).queryByRole('button', { name: 'Review positions' })).not.toBeInTheDocument();
    const confidence = await screen.findByLabelText('LP data confidence');
    expect(within(confidence).getByText('Current-only')).toBeInTheDocument();
    expect(within(confidence).getByText('History unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('Incomplete').length).toBeGreaterThanOrEqual(2);
  });

  it('explains which LP positions are excluded from aggregate performance', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [
        basePosition,
        {
          ...basePosition,
          pool: 'ETH.ETH',
          assetSymbol: 'ETH',
          pricingSource: 'estimated',
          currentTotalValueUsd: 50,
          netProfitLossUsd: 7,
          impermanentLossUsd: -2,
        },
        {
          ...basePosition,
          pool: 'GAIA.ATOM',
          assetSymbol: 'ATOM',
          pricingSource: 'current-only',
          currentTotalValueUsd: 72,
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
        },
      ],
      isLoading: false,
      state: 'ready',
      error: undefined,
      retry: vi.fn(),
      runePriceFreshness: freshRunePrice,
    });

    render(<LpDashboardPage />);

    const diagnosis = await screen.findByLabelText('LP performance diagnosis');
    expect(within(diagnosis).getByText('Total LP value')).toBeInTheDocument();
    expect(within(diagnosis).getByText('Current value includes all pools; 1 estimated position and 1 current-only position need confidence review')).toBeInTheDocument();
    expect(within(diagnosis).getByText('+$4.68 from historical positions; 1 estimated position and 1 current-only position excluded')).toBeInTheDocument();
    expect(within(diagnosis).getByText('+$0.18 from historical positions; 1 estimated position and 1 current-only position excluded')).toBeInTheDocument();
  });

  it('labels in-flight historical enrichment without presenting performance as finally unavailable', async () => {
    mockUseLpPositions.mockReturnValue({
      positions: [{
        ...basePosition,
        pricingSource: 'current-only',
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
      isHistoricalEnrichmentLoading: true,
      state: 'ready',
      error: undefined,
      retry: vi.fn(),
      runePriceFreshness: freshRunePrice,
    });

    render(<LpDashboardPage />);

    const confidence = await screen.findByLabelText('LP data confidence');
    expect(within(confidence).getByText('Current-only')).toBeInTheDocument();
    expect(within(confidence).getByText('Enriching now')).toBeInTheDocument();
    expect(screen.getAllByText('Enriching...')).toHaveLength(2);
    expect(within(confidence).queryByText('History unavailable')).not.toBeInTheDocument();
    expect(screen.getByText('Card historical enrichment loading')).toBeInTheDocument();
  });
});
