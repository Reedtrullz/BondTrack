import { render, screen, within } from '@/test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';
import type { BondPosition } from '@/lib/types/node';

const mockUseBondPositions = vi.fn();
const mockUseLpPositions = vi.fn();
const mockUseNetworkMetrics = vi.fn();
const mockUseRunePriceHistory = vi.fn();
const mockUseBondHistory = vi.fn();
const mockUseApiHealthContext = vi.fn();
const mockBondPosition: BondPosition = {
  nodeAddress: 'thor1commandnode0000000000000000000000000000',
  nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
  bondAmount: 10_000,
  bondSharePercent: 100,
  status: 'Active',
  operatorFee: 500,
  operatorFeeFormatted: '5.0%',
  netAPY: 12,
  totalBond: 10_000,
  slashPoints: 0,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '3.19.0',
  requestedToLeave: false,
};

const mocks = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams('address=thor1commandaddress') },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.current.get(key),
  }),
}));

vi.mock('@/lib/hooks/use-bond-positions', () => ({
  useBondPositions: (address: string | null) => mockUseBondPositions(address),
}));

vi.mock('@/lib/hooks/use-lp-positions', () => ({
  useLpPositions: (address: string | null) => mockUseLpPositions(address),
}));

vi.mock('@/lib/hooks/use-network-metrics', () => ({
  useNetworkMetrics: () => mockUseNetworkMetrics(),
}));

vi.mock('@/lib/hooks/use-rune-price', () => ({
  useRunePriceHistory: (...args: unknown[]) => mockUseRunePriceHistory(...args),
}));

vi.mock('@/lib/hooks/use-bond-history', () => ({
  useBondHistory: (address: string | null) => mockUseBondHistory(address),
}));

vi.mock('@/lib/hooks/use-api-health', () => ({
  useApiHealthContext: () => mockUseApiHealthContext(),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    mockUseBondPositions.mockReset();
    mockUseLpPositions.mockReset();
    mockUseNetworkMetrics.mockReset();
    mockUseRunePriceHistory.mockReset();
    mockUseBondHistory.mockReset();
    mockUseApiHealthContext.mockReset();
    mocks.searchParams.current = new URLSearchParams('address=thor1commandaddress');

    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: false,
    });
    mockUseLpPositions.mockReturnValue({
      positions: [],
      isLoading: false,
    });
    mockUseNetworkMetrics.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockUseRunePriceHistory.mockReturnValue({
      price: 1.5,
      isStale: false,
      updatedAt: new Date('2026-06-13T00:00:00.000Z'),
      isLoading: false,
    });
    mockUseBondHistory.mockReturnValue({
      bondActions: [],
    });
    mockUseApiHealthContext.mockReturnValue({
      midgard: 'healthy',
      thornode: 'healthy',
      lastChecked: new Date('2026-06-13T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-13T00:00:00.000Z'),
        thornode: new Date('2026-06-13T00:00:00.000Z'),
      },
    });
  });

  it('keeps operator triage visible while secondary support feeds are loading', () => {
    mockUseLpPositions.mockReturnValue({
      positions: [],
      isLoading: true,
    });
    mockUseNetworkMetrics.mockReturnValue({
      data: null,
      isLoading: true,
    });
    mockUseRunePriceHistory.mockReturnValue({
      price: 0,
      isStale: false,
      updatedAt: null,
      isLoading: true,
    });

    render(<DashboardPage />);

    expect(screen.queryByRole('status', { name: 'Loading command center' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Command center diagnosis')).toBeVisible();
    expect(screen.getByLabelText('Source confidence')).toHaveTextContent('RUNE price');

    const nextTransaction = screen.getByRole('region', { name: 'Next transaction' });
    expect(within(nextTransaction).getByRole('link', { name: 'Open BOND' })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1commandaddress&action=bond'
    );
    expect(within(nextTransaction).queryByRole('link', { name: 'Open UNBOND' })).not.toBeInTheDocument();
  });

  it('offers UNBOND from the command center only with a bonded position and fresh THORNode confidence', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [mockBondPosition],
      isLoading: false,
    });

    render(<DashboardPage />);

    const nextTransaction = screen.getByRole('region', { name: 'Next transaction' });
    expect(within(nextTransaction).getByRole('link', { name: 'Open BOND' })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1commandaddress&action=bond'
    );
    expect(within(nextTransaction).getByRole('link', { name: 'Open UNBOND' })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1commandaddress&action=unbond'
    );
  });

  it.each(['degraded', 'down', 'unknown'] as const)('routes generic BOND entry to source confidence when THORNode is %s', (thornode) => {
    mockUseApiHealthContext.mockReturnValue({
      midgard: 'healthy',
      thornode,
      lastChecked: new Date('2026-06-13T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-13T00:00:00.000Z'),
        thornode: null,
      },
    });

    render(<DashboardPage />);

    const diagnosis = screen.getByLabelText('Command center diagnosis');
    expect(within(diagnosis).getByText('No Bond', { exact: true })).toBeVisible();
    expect(within(diagnosis).getByText(/wait for fresh THORNode source confidence/)).toBeVisible();
    expect(within(diagnosis).getByRole('link', { name: 'Review source confidence' })).toHaveAttribute(
      'href',
      '/dashboard?address=thor1commandaddress#source-confidence'
    );

    const nextTransaction = screen.getByRole('region', { name: 'Next transaction' });
    expect(within(nextTransaction).getByRole('link', { name: 'Review source confidence' })).toHaveAttribute(
      'href',
      '/dashboard?address=thor1commandaddress#source-confidence'
    );
    expect(within(nextTransaction).queryByRole('link', { name: 'Open BOND' })).not.toBeInTheDocument();
    expect(within(nextTransaction).queryByRole('link', { name: 'Open UNBOND' })).not.toBeInTheDocument();
  });

  it('hides command-center UNBOND when a bonded position exists but THORNode confidence is degraded', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [mockBondPosition],
      isLoading: false,
    });
    mockUseApiHealthContext.mockReturnValue({
      midgard: 'healthy',
      thornode: 'degraded',
      lastChecked: new Date('2026-06-13T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-13T00:00:00.000Z'),
        thornode: new Date('2026-06-12T23:00:00.000Z'),
      },
    });

    render(<DashboardPage />);

    const nextTransaction = screen.getByRole('region', { name: 'Next transaction' });
    expect(within(nextTransaction).getByRole('link', { name: 'Review source confidence' })).toHaveAttribute(
      'href',
      '/dashboard?address=thor1commandaddress#source-confidence'
    );
    expect(within(nextTransaction).queryByRole('link', { name: 'Open UNBOND' })).not.toBeInTheDocument();
  });

  it('keeps the full-page skeleton while primary bond state is still loading under healthy THORNode', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: true,
    });

    render(<DashboardPage />);

    expect(screen.getByRole('status', { name: 'Loading command center' })).toBeVisible();
    expect(screen.queryByLabelText('Command center diagnosis')).not.toBeInTheDocument();
  });
});
