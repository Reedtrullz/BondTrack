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
      error: undefined,
      history: null,
      isLoading: false,
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

  it('keeps provider triage visible while secondary support feeds are loading', () => {
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
    expect(screen.getByLabelText('Source checks')).toHaveTextContent('RUNE price');

    const nextTransaction = screen.getByRole('region', { name: 'Transaction review' });
    expect(nextTransaction).toHaveTextContent('Memo review starts here; wallet approval stays external.');
    expect(nextTransaction).not.toHaveTextContent('source-checked bond work');
    const bondMemoLink = within(nextTransaction).getByRole('link', { name: 'Review BOND memo' });
    expect(bondMemoLink).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1commandaddress&action=bond'
    );
    expect(bondMemoLink.className).not.toContain('emerald');
    expect(within(nextTransaction).queryByRole('link', { name: 'Open BOND' })).not.toBeInTheDocument();
    expect(within(nextTransaction).queryByRole('link', { name: 'Review UNBOND memo' })).not.toBeInTheDocument();
  });

  it('labels demo source data without claiming the provider review queue is clear', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [mockBondPosition],
      isLoading: false,
    });
    mockUseApiHealthContext.mockReturnValue({
      midgard: 'mock',
      thornode: 'mock',
      lastChecked: new Date('2026-06-13T00:00:00.000Z'),
      lastSuccessful: {
        midgard: null,
        thornode: null,
      },
    });
    mockUseRunePriceHistory.mockReturnValue({
      price: 1.5,
      isStale: false,
      updatedAt: new Date(),
      isLoading: false,
    });

    render(<DashboardPage />);

    const diagnosis = screen.getByLabelText('Command center diagnosis');
    expect(within(diagnosis).getAllByText('Demo', { exact: true }).length).toBeGreaterThan(0);
    expect(within(diagnosis).getByRole('heading', { name: 'Demo data only' })).toBeVisible();
    expect(diagnosis).toHaveTextContent(
      'Local mock data is illustrative. Use live THORNode and Midgard source checks before concluding this provider has no live issues.'
    );
    expect(diagnosis).not.toHaveTextContent('Healthy');
    expect(diagnosis).not.toHaveTextContent('Current source responses show no provider action needed.');

    const reviewQueue = screen.getByRole('region', { name: 'Provider review queue' });
    expect(reviewQueue).toHaveTextContent('Demo data only');
    expect(reviewQueue).toHaveTextContent(
      'Local fixtures can show the interface, but they cannot prove this provider has no live issues.'
    );
    expect(reviewQueue).not.toHaveTextContent('No provider review needed');
  });

  it('labels a no-position provider queue as not loaded instead of clear', () => {
    mockUseRunePriceHistory.mockReturnValue({
      price: 1.5,
      isStale: false,
      updatedAt: new Date(),
      isLoading: false,
    });

    render(<DashboardPage />);

    const diagnosis = screen.getByLabelText('Command center diagnosis');
    expect(within(diagnosis).getByText('No Bond', { exact: true })).toBeVisible();
    expect(diagnosis).toHaveTextContent('No active bond-provider position was found for this address.');

    const reviewQueue = screen.getByRole('region', { name: 'Provider review queue' });
    expect(reviewQueue).toHaveTextContent('No provider position loaded');
    expect(reviewQueue).toHaveTextContent(
      'Heimdall did not load a bonded node or LP position for this address. Confirm the address before treating the queue as clear.'
    );
    expect(reviewQueue).not.toHaveTextContent('No urgent provider review visible');
    expect(reviewQueue).not.toHaveTextContent(
      'Current source responses do not show a node, source, or LP issue that needs provider review.'
    );
  });

  it('uses conservative empty-state copy when current source responses show no action items', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [mockBondPosition],
      isLoading: false,
    });
    mockUseRunePriceHistory.mockReturnValue({
      price: 1.5,
      isStale: false,
      updatedAt: new Date(),
      isLoading: false,
    });

    render(<DashboardPage />);

    const diagnosis = screen.getByLabelText('Command center diagnosis');
    expect(within(diagnosis).getByText('No urgent review', { exact: true })).toBeVisible();
    expect(diagnosis).toHaveClass('border-sky-200/70');
    expect(diagnosis).not.toHaveClass('border-emerald-200/70');
    expect(within(diagnosis).getByRole('link', { name: 'Inspect details' })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1commandaddress'
    );
    expect(within(diagnosis).queryByRole('link', { name: 'Review exposure' })).not.toBeInTheDocument();
    expect(diagnosis).toHaveTextContent('Current source responses do not show an urgent provider action.');
    expect(diagnosis).toHaveTextContent('No urgent review visible');
    expect(diagnosis).not.toHaveTextContent('Healthy');
    expect(diagnosis).not.toHaveTextContent('Current source responses show no provider action needed.');
    expect(diagnosis).not.toHaveTextContent('No provider review needed');

    const reviewQueue = screen.getByRole('region', { name: 'Provider review queue' });
    const detail = within(reviewQueue).getByText(
      'Current source responses do not show a node, source, or LP issue that needs provider review.'
    );
    const emptyState = detail.parentElement;
    expect(within(reviewQueue).getByText('No urgent provider review visible')).toBeVisible();
    expect(reviewQueue).not.toHaveTextContent('No provider review needed');
    expect(emptyState).toHaveClass('text-sky-800');
    expect(emptyState).not.toHaveClass('text-emerald-800');
  });

  it('withholds command-center UNBOND when bonded positions are active', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [mockBondPosition],
      isLoading: false,
    });

    render(<DashboardPage />);

    const nextTransaction = screen.getByRole('region', { name: 'Transaction review' });
    expect(within(nextTransaction).getByRole('link', { name: 'Review BOND memo' })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1commandaddress&action=bond'
    );
    expect(within(nextTransaction).queryByRole('link', { name: 'Review UNBOND memo' })).not.toBeInTheDocument();
  });

  it('offers UNBOND from the command center only with a standby bonded position and fresh THORNode confidence', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [{ ...mockBondPosition, status: 'Standby' }],
      isLoading: false,
    });

    render(<DashboardPage />);

    const nextTransaction = screen.getByRole('region', { name: 'Transaction review' });
    expect(within(nextTransaction).getByRole('link', { name: 'Review BOND memo' })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1commandaddress&action=bond'
    );
    expect(within(nextTransaction).getByRole('link', { name: 'Review UNBOND memo' })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1commandaddress&action=unbond'
    );
  });

  it.each(['degraded', 'down', 'unknown'] as const)('routes generic BOND entry to source checks when THORNode is %s', (thornode) => {
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
    expect(within(diagnosis).getByText(/wait until THORNode is responding before reviewing any BOND memo/)).toBeVisible();
    expect(diagnosis).not.toHaveTextContent(/fresh THORNode source confidence|source check to pass/i);
    expect(within(diagnosis).getByRole('link', { name: 'Review source checks' })).toHaveAttribute(
      'href',
      '/dashboard?address=thor1commandaddress#source-confidence'
    );

    const nextTransaction = screen.getByRole('region', { name: 'Transaction review' });
    expect(within(nextTransaction).getByRole('link', { name: 'Review source checks' })).toHaveAttribute(
      'href',
      '/dashboard?address=thor1commandaddress#source-confidence'
    );
    expect(within(nextTransaction).queryByRole('link', { name: 'Open BOND' })).not.toBeInTheDocument();
    expect(within(nextTransaction).queryByRole('link', { name: 'Review BOND memo' })).not.toBeInTheDocument();
    expect(within(nextTransaction).queryByRole('link', { name: 'Review UNBOND memo' })).not.toBeInTheDocument();

    const providerExposure = screen.getByRole('region', { name: 'Provider exposure summary' });
    expect(providerExposure).toHaveTextContent('Bonded-node exposure was not loaded from THORNode.');
    expect(providerExposure).toHaveTextContent('Review source checks before treating this address as unbonded.');
    expect(providerExposure).not.toHaveTextContent('No bonded nodes found for this address.');
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

    const nextTransaction = screen.getByRole('region', { name: 'Transaction review' });
    expect(within(nextTransaction).getByRole('link', { name: 'Review source checks' })).toHaveAttribute(
      'href',
      '/dashboard?address=thor1commandaddress#source-confidence'
    );
    expect(within(nextTransaction).queryByRole('link', { name: 'Review UNBOND memo' })).not.toBeInTheDocument();
  });

  it('marks recent transactions as loading instead of claiming an empty loaded history', () => {
    mockUseBondHistory.mockReturnValue({
      bondActions: [],
      error: undefined,
      history: null,
      isLoading: true,
    });

    render(<DashboardPage />);

    const supportingMetrics = screen.getByLabelText('Supporting metrics');
    expect(supportingMetrics).toHaveTextContent('Recent tx');
    expect(supportingMetrics).toHaveTextContent('Loading bond events');
    expect(supportingMetrics).not.toHaveTextContent('Bond events loaded');
    expect(supportingMetrics).not.toHaveTextContent('No bond events found in loaded history');
  });

  it('marks recent transactions as unavailable when bond history fails', () => {
    mockUseBondHistory.mockReturnValue({
      bondActions: [],
      error: new Error('Midgard actions failed'),
      history: null,
      isLoading: false,
    });

    render(<DashboardPage />);

    const supportingMetrics = screen.getByLabelText('Supporting metrics');
    expect(supportingMetrics).toHaveTextContent('Recent tx');
    expect(supportingMetrics).toHaveTextContent('Bond events unavailable');
    expect(supportingMetrics).not.toHaveTextContent('Bond events loaded');
    expect(supportingMetrics).not.toHaveTextContent('No bond events found in loaded history');
  });

  it('labels recent transactions as a partial window when Midgard has more bond history than loaded actions', () => {
    mockUseBondHistory.mockReturnValue({
      bondActions: [{ type: 'bond' }],
      error: undefined,
      history: { actions: [], count: 76, isPartial: true },
      isLoading: false,
    });

    render(<DashboardPage />);

    const supportingMetrics = screen.getByLabelText('Supporting metrics');
    expect(supportingMetrics).toHaveTextContent('Recent tx');
    expect(supportingMetrics).toHaveTextContent('1');
    expect(supportingMetrics).toHaveTextContent('Partial bond-event window');
    expect(supportingMetrics).not.toHaveTextContent('Bond events loaded');
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
