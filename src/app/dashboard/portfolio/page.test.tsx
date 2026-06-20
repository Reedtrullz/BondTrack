import { render, screen } from '@/test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortfolioPage from './page';
import type { BondPosition } from '@/lib/types/node';

const mockUseBondPositions = vi.fn();
const mockUseLpPositions = vi.fn();
const mockUseRunePriceHistory = vi.fn();
const mockUseNetworkMetrics = vi.fn();
const mockUseYieldBenchmarks = vi.fn();
const mockUseAllNodes = vi.fn();
const mockUsePools = vi.fn();
const mockUseFeeRevenue = vi.fn();
const mockUseApiHealthContext = vi.fn();
const mockBondPosition: BondPosition = {
  nodeAddress: 'thor1portfolio000000000000000000000000000000',
  nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
  bondAmount: 10_000,
  bondSharePercent: 100,
  status: 'Standby',
  operatorFee: 500,
  operatorFeeFormatted: '5.0%',
  netAPY: 10,
  totalBond: 10_000,
  slashPoints: 0,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '3.19.0',
  requestedToLeave: false,
};

const mocks = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams('address=thor1portfolioaddress') },
  insightActions: {
    current: [] as Array<{
      id: string;
      severity: 'info' | 'warning' | 'critical';
      source: string;
      title: string;
      detail: string;
      impact: string;
      href: string;
      lastSeen: Date;
      primaryAction?: string;
    }>,
  },
  useRealInsights: { current: false },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.current.get(key),
    toString: () => mocks.searchParams.current.toString(),
  }),
}));

vi.mock('@/lib/hooks/use-bond-positions', () => ({
  useBondPositions: (address: string | null) => mockUseBondPositions(address),
}));

vi.mock('@/lib/hooks/use-lp-positions', () => ({
  useLpPositions: (address: string | null) => mockUseLpPositions(address),
}));

vi.mock('@/lib/hooks/use-rune-price', () => ({
  useRunePriceHistory: (...args: unknown[]) => mockUseRunePriceHistory(...args),
}));

vi.mock('@/lib/hooks/use-network-metrics', () => ({
  useNetworkMetrics: () => mockUseNetworkMetrics(),
}));

vi.mock('@/lib/hooks/use-yield-benchmarks', () => ({
  useYieldBenchmarks: () => mockUseYieldBenchmarks(),
}));

vi.mock('@/lib/hooks/use-all-nodes', () => ({
  useAllNodes: () => mockUseAllNodes(),
}));

vi.mock('@/lib/hooks/use-pools', () => ({
  usePools: () => mockUsePools(),
}));

vi.mock('@/lib/hooks/use-fee-revenue', () => ({
  useFeeRevenue: () => mockUseFeeRevenue(),
}));

vi.mock('@/lib/hooks/use-api-health', () => ({
  useApiHealthContext: () => mockUseApiHealthContext(),
}));

vi.mock('@/lib/dashboard/insights', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/dashboard/insights')>();

  return {
    ...actual,
    buildDashboardInsightState: (input: Parameters<typeof actual.buildDashboardInsightState>[0]) =>
      mocks.useRealInsights.current
        ? actual.buildDashboardInsightState(input)
        : {
            severity: 'info',
            statusLabel: 'No Bond',
            diagnosis: 'No active bond-provider position was found for this address.',
            topRisk: 'No bonded positions detected',
            headerMetrics: [],
            primaryAction: {
              label: 'Open BOND review',
              href: '/dashboard/transactions?address=thor1portfolioaddress&action=bond',
            },
            actions: mocks.insightActions.current,
          },
  };
});

describe('PortfolioPage', () => {
  beforeEach(() => {
    mockUseBondPositions.mockReset();
    mockUseLpPositions.mockReset();
    mockUseRunePriceHistory.mockReset();
    mockUseNetworkMetrics.mockReset();
    mockUseYieldBenchmarks.mockReset();
    mockUseAllNodes.mockReset();
    mockUsePools.mockReset();
    mockUseFeeRevenue.mockReset();
    mockUseApiHealthContext.mockReset();
    mocks.searchParams.current = new URLSearchParams('address=thor1portfolioaddress');
    mocks.insightActions.current = [];
    mocks.useRealInsights.current = false;

    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: false,
    });
    mockUseLpPositions.mockReturnValue({
      positions: [],
      error: undefined,
    });
    mockUseRunePriceHistory.mockReturnValue({
      price: 1,
      intervals: [],
      isLoading: false,
      isStale: false,
      updatedAt: new Date('2026-06-13T00:00:00.000Z'),
    });
    mockUseNetworkMetrics.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockUseYieldBenchmarks.mockReturnValue({
      benchmarks: undefined,
      isLoading: false,
    });
    mockUseAllNodes.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUsePools.mockReturnValue({
      pools: [],
      isLoading: false,
    });
    mockUseFeeRevenue.mockReturnValue({
      feeRevenue: undefined,
      isLoading: false,
      error: undefined,
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

  it('labels the portfolio review feed with operator-first copy', () => {
    render(<PortfolioPage />);

    expect(screen.getByText('Provider review signals')).toBeInTheDocument();
    expect(screen.queryByText("Heimdall's Sight")).not.toBeInTheDocument();
  });

  it('renders transaction actions as review-first links without nested buttons', () => {
    render(<PortfolioPage />);

    const bondLink = screen.getByRole('link', { name: 'Review BOND Memo' });
    expect(bondLink).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1portfolioaddress&action=bond'
    );
    expect(bondLink.querySelector('button')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Prepare BOND Memo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Bond More' })).not.toBeInTheDocument();

    expect(screen.queryByRole('link', { name: 'Review UNBOND Memo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prepare UNBOND Memo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Unbond' })).not.toBeInTheDocument();
  });

  it('offers UNBOND prep only when source checks pass for a standby bonded position', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [mockBondPosition],
      isLoading: false,
    });

    render(<PortfolioPage />);

    const unbondLink = screen.getByRole('link', { name: 'Review UNBOND Memo' });
    expect(unbondLink).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1portfolioaddress&action=unbond'
    );
    expect(unbondLink.querySelector('button')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Prepare UNBOND Memo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Unbond' })).not.toBeInTheDocument();
  });

  it('withholds UNBOND prep when bonded positions are active', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [{ ...mockBondPosition, status: 'Active' }],
      isLoading: false,
    });

    render(<PortfolioPage />);

    expect(screen.getByRole('link', { name: 'Review BOND Memo' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prepare BOND Memo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review UNBOND Memo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prepare UNBOND Memo' })).not.toBeInTheDocument();
  });

  it('routes header BOND prep to source checks when THORNode provenance is degraded', () => {
    mocks.insightActions.current = [{
      id: 'source:thornode:degraded',
      severity: 'warning',
      source: 'THORNode',
      title: 'THORNode is degraded',
      detail: 'Recent THORNode probe failed. Node and bond data may be stale.',
      impact: 'Do not prepare node-sensitive BOND changes until THORNode recovers.',
      href: '/dashboard?address=thor1portfolioaddress#source-confidence',
      lastSeen: new Date('2026-06-13T00:00:00.000Z'),
      primaryAction: 'Review source checks',
    }];
    mockUseApiHealthContext.mockReturnValue({
      midgard: 'healthy',
      thornode: 'degraded',
      lastChecked: new Date('2026-06-13T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-13T00:00:00.000Z'),
        thornode: null,
      },
    });

    render(<PortfolioPage />);

    expect(screen.queryByRole('link', { name: 'Review BOND Memo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prepare BOND Memo' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Review source checks' })[0]).toHaveAttribute(
      'href',
      '/dashboard?address=thor1portfolioaddress#source-confidence'
    );
    expect(screen.queryByRole('link', { name: 'Review UNBOND Memo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prepare UNBOND Memo' })).not.toBeInTheDocument();
  });

  it.each(['degraded', 'down', 'unknown'] as const)('routes header BOND prep through real insight state when THORNode is %s', (thornode) => {
    mocks.useRealInsights.current = true;
    mockUseApiHealthContext.mockReturnValue({
      midgard: 'healthy',
      thornode,
      lastChecked: new Date('2026-06-13T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-13T00:00:00.000Z'),
        thornode: null,
      },
    });

    render(<PortfolioPage />);

    expect(screen.queryByRole('link', { name: 'Review BOND Memo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prepare BOND Memo' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Review source checks' })[0]).toHaveAttribute(
      'href',
      '/dashboard?address=thor1portfolioaddress#source-confidence'
    );
    const diagnosis = screen.getByLabelText('Portfolio diagnosis');
    expect(diagnosis).toHaveTextContent('wait for the THORNode source check to pass before opening BOND review');
    expect(diagnosis).not.toHaveTextContent(/fresh THORNode source confidence/i);
    expect(screen.queryByRole('link', { name: 'Review UNBOND Memo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prepare UNBOND Memo' })).not.toBeInTheDocument();
  });

  it('does not strand the portfolio behind loading when THORNode node lookups fail', () => {
    mocks.insightActions.current = [{
      id: 'source:thornode:degraded',
      severity: 'warning',
      source: 'THORNode',
      title: 'THORNode is degraded',
      detail: 'Recent THORNode probe failed. Node and bond data may be stale.',
      impact: 'Do not prepare node-sensitive BOND changes until THORNode recovers.',
      href: '/dashboard?address=thor1portfolioaddress#source-confidence',
      lastSeen: new Date('2026-06-13T00:00:00.000Z'),
      primaryAction: 'Review source checks',
    }];
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: true,
      error: new Error('API error: 502'),
    });
    mockUseAllNodes.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: new Error('API error: 502'),
    });
    mockUseApiHealthContext.mockReturnValue({
      midgard: 'healthy',
      thornode: 'degraded',
      lastChecked: new Date('2026-06-13T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-13T00:00:00.000Z'),
        thornode: null,
      },
    });

    render(<PortfolioPage />);

    expect(screen.queryByRole('status', { name: 'Loading portfolio data' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Review source checks' })[0]).toHaveAttribute(
      'href',
      '/dashboard?address=thor1portfolioaddress#source-confidence'
    );
  });

  it('keeps portfolio triage visible while secondary support feeds are loading', () => {
    mockUseRunePriceHistory.mockReturnValue({
      price: 0,
      intervals: [],
      isLoading: true,
      isStale: false,
      updatedAt: null,
    });
    mockUseNetworkMetrics.mockReturnValue({
      data: null,
      isLoading: true,
    });
    mockUseYieldBenchmarks.mockReturnValue({
      benchmarks: undefined,
      isLoading: true,
    });
    mockUseAllNodes.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mockUsePools.mockReturnValue({
      pools: [],
      isLoading: true,
    });

    render(<PortfolioPage />);

    expect(screen.queryByRole('status', { name: 'Loading portfolio data' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Review BOND Memo' })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1portfolioaddress&action=bond'
    );
    expect(screen.queryByRole('link', { name: 'Prepare BOND Memo' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Portfolio diagnosis')).toBeVisible();
    const checks = screen.getByLabelText('Portfolio data checks');
    expect(checks).toHaveTextContent('RUNE price');
    expect(checks).toHaveTextContent('Missing');
    expect(screen.queryByLabelText('Portfolio exposure confidence')).not.toBeInTheDocument();
  });

  it('labels source-loaded LP valuation as review material instead of ready or source-backed', () => {
    mockUseLpPositions.mockReturnValue({
      positions: [{
        currentTotalValueUsd: 10_000,
        pricingSource: 'historical',
        claimableTrusted: true,
      }],
      runePriceFreshness: {
        updatedAt: new Date('2026-06-13T00:00:00.000Z'),
        updatedAtTimestampSeconds: 1_781_308_800,
        ageMs: 0,
        isStale: false,
        staleAfterMs: 36 * 60 * 60 * 1000,
      },
      error: undefined,
    });

    render(<PortfolioPage />);

    const checks = screen.getByLabelText('Portfolio data checks');
    expect(checks).toHaveTextContent('LP valuation');
    expect(checks).toHaveTextContent('Source-loaded');
    expect(checks).toHaveTextContent('1 THORNode LP value row loaded for review');
    expect(checks).not.toHaveTextContent('Ready');
    expect(checks).not.toHaveTextContent('Source-backed');
    expect(screen.queryByLabelText('Portfolio exposure confidence')).not.toBeInTheDocument();
  });

  it('keeps the full-page skeleton while primary bond state is loading under healthy THORNode', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: true,
    });

    render(<PortfolioPage />);

    expect(screen.getByRole('status', { name: 'Loading portfolio data' })).toBeVisible();
    expect(screen.queryByRole('heading', { level: 1, name: 'Portfolio' })).not.toBeInTheDocument();
  });

  it('labels healthy portfolio sources without a generic live claim', () => {
    render(<PortfolioPage />);

    const sourceHealth = screen.getByLabelText('Portfolio source health');

    expect(sourceHealth).toHaveTextContent('Sources responding');
    expect(sourceHealth).toHaveTextContent('Recent Midgard + THORNode checks responded');
    expect(sourceHealth).not.toHaveTextContent('Recent Midgard + THORNode checks succeeded');
    expect(sourceHealth).not.toHaveTextContent('Sources healthy');
    expect(sourceHealth).not.toHaveTextContent('Midgard + THORNode confirmed');
    expect(sourceHealth).toHaveClass('border-cyan-200/70');
    expect(sourceHealth).toHaveClass('text-cyan-700');
    expect(sourceHealth).not.toHaveClass('border-emerald-200/70');
    expect(sourceHealth).not.toHaveClass('text-emerald-700');
    expect(sourceHealth.querySelector('[aria-hidden="true"]')).toHaveClass('bg-cyan-500');
    expect(sourceHealth.querySelector('[aria-hidden="true"]')).not.toHaveClass('bg-emerald-500');
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('surfaces degraded portfolio source health instead of claiming live data', () => {
    mockUseApiHealthContext.mockReturnValue({
      midgard: 'degraded',
      thornode: 'healthy',
      lastChecked: new Date('2026-06-13T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-12T23:55:00.000Z'),
        thornode: new Date('2026-06-13T00:00:00.000Z'),
      },
    });

    render(<PortfolioPage />);

    const sourceHealth = screen.getByLabelText('Portfolio source health');

    expect(sourceHealth).toHaveTextContent('Sources degraded');
    expect(sourceHealth).toHaveTextContent('One source is retrying');
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('gives the intelligence feed disclosure a useful accessible name', () => {
    render(<PortfolioPage />);

    expect(screen.getByRole('button', { name: 'Show Heimdall insight feed' })).toBeInTheDocument();
  });

  it('surfaces degraded LP valuation instead of silently counting LP exposure as zero', () => {
    mockUseLpPositions.mockReturnValue({
      positions: [{
        currentTotalValueUsd: 10_000,
      }],
      error: new Error('Midgard LP lookup failed'),
    });

    render(<PortfolioPage />);

    const checks = screen.getByLabelText('Portfolio data checks');
    expect(checks).toHaveTextContent('LP valuation');
    expect(checks).toHaveTextContent('Degraded');
    expect(checks).toHaveTextContent('LP value excluded from totals');
    expect(screen.queryByLabelText('Portfolio exposure confidence')).not.toBeInTheDocument();
  });
});
