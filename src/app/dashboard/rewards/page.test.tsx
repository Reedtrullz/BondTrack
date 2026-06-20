import { fireEvent, render, screen, within } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RewardsPage from './page';
import type { ApiHealthState } from '@/lib/hooks/use-api-health';

const mockUseBondPositions = vi.fn();
const mockUseRunePrice = vi.fn();
const mockUseHistoricalRunePrice = vi.fn();
const mockUseBondHistory = vi.fn();
const mockUseNetworkMetrics = vi.fn();

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  searchParams: { current: new URLSearchParams('address=thor1rewardaddress') },
  apiHealth: {
    current: {
      midgard: 'healthy' as const,
      thornode: 'healthy' as const,
      lastChecked: new Date('2026-06-12T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-12T00:00:00.000Z'),
        thornode: new Date('2026-06-12T00:00:00.000Z'),
      },
    } as ApiHealthState,
  },
}));

const activePosition = {
  nodeAddress: 'thor1nodereward0000000000000000000000000000',
  nodeOperatorAddress: 'thor1operatorreward000000000000000000000000',
  bondAmount: 100000,
  bondSharePercent: 100,
  status: 'Active' as const,
  operatorFee: 1000,
  operatorFeeFormatted: '10.0%',
  netAPY: 12,
  totalBond: 100000,
  slashPoints: 0,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '2.3.0',
  requestedToLeave: false,
};

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.current.get(key),
    toString: () => mocks.searchParams.current.toString(),
  }),
}));

vi.mock('@/lib/hooks/use-bond-positions', () => ({
  useBondPositions: (address: string | null) => mockUseBondPositions(address),
}));

vi.mock('@/lib/hooks/use-rune-price', () => ({
  useRunePrice: () => mockUseRunePrice(),
  useHistoricalRunePrice: (date: Date | null) => mockUseHistoricalRunePrice(date),
}));

vi.mock('@/lib/hooks/use-bond-history', () => ({
  useBondHistory: (address: string | null) => mockUseBondHistory(address),
}));

vi.mock('@/lib/hooks/use-network-metrics', () => ({
  useNetworkMetrics: () => mockUseNetworkMetrics(),
}));

vi.mock('@/lib/hooks/use-api-health', () => ({
  useApiHealthContext: () => mocks.apiHealth.current,
}));

vi.mock('@/components/dashboard/pnl-dashboard', () => ({
  PnLDashboard: () => <div>Mock net return</div>,
}));

vi.mock('@/components/dashboard/fee-impact-tracker', () => ({
  PersonalFeeAudit: () => <div>Mock fee leakage</div>,
}));

vi.mock('@/components/dashboard/auto-compound-chart', () => ({
  AutoCompoundChart: () => <div>Mock forecast</div>,
}));

vi.mock('@/components/dashboard/price-chart', () => ({
  PriceChart: () => <div>Mock RUNE price chart</div>,
}));

describe('RewardsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mockUseBondPositions.mockReset();
    mockUseRunePrice.mockReset();
    mockUseHistoricalRunePrice.mockReset();
    mockUseBondHistory.mockReset();
    mockUseNetworkMetrics.mockReset();
    mocks.router.push.mockReset();
    mocks.router.replace.mockReset();
    mocks.searchParams.current = new URLSearchParams('address=thor1rewardaddress');
    mocks.apiHealth.current = {
      midgard: 'healthy',
      thornode: 'healthy',
      lastChecked: new Date('2026-06-12T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-12T00:00:00.000Z'),
        thornode: new Date('2026-06-12T00:00:00.000Z'),
      },
    };

    mockUseBondPositions.mockReturnValue({
      positions: [activePosition],
      isLoading: false,
      error: undefined,
    });
    mockUseRunePrice.mockReturnValue({
      price: 0,
      isStale: false,
      updatedAt: null,
    });
    mockUseHistoricalRunePrice.mockReturnValue({
      price: null,
      isLoading: false,
      error: undefined,
    });
    mockUseBondHistory.mockReturnValue({
      history: null,
      isLoading: false,
      error: undefined,
    });
    mockUseNetworkMetrics.mockReturnValue({
      data: { bondingAPY: '0.20' },
      isLoading: false,
      error: undefined,
    });
  });

  it('uses source-scoped loading copy before showing reward decisions', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: true,
      error: undefined,
    });

    render(<RewardsPage />);

    expect(screen.getByRole('status', { name: 'Loading rewards data' })).toBeInTheDocument();
    expect(screen.getByText(/Waiting for bond positions, reward history, RUNE price, and network APY/)).toBeVisible();
  });

  it('keeps the empty-state bond action on the composer when THORNode confidence is healthy', async () => {
    const user = userEvent.setup();
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      error: undefined,
    });

    render(<RewardsPage />);

    expect(screen.queryByRole('heading', { name: 'No bonded positions found' })).not.toBeInTheDocument();
    expect(screen.queryByText(/queried successfully/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No active bond-provider position visible' })).toBeVisible();
    expect(screen.getByText(/current THORNode node data does not show this address as an active bond provider/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Open BOND review' }));

    expect(mocks.router.push).toHaveBeenCalledWith(
      '/dashboard/transactions?address=thor1rewardaddress'
    );
  });

  it.each(['degraded', 'down', 'unknown'] as const)('routes the empty-state bond action to source checks when THORNode is %s', async (thornode) => {
    const user = userEvent.setup();
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      error: undefined,
    });
    mocks.apiHealth.current = {
      midgard: 'healthy',
      thornode,
      lastChecked: new Date('2026-06-12T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-12T00:00:00.000Z'),
        thornode: null,
      },
    };

    render(<RewardsPage />);

    expect(screen.queryByRole('heading', { name: 'No bonded positions found' })).not.toBeInTheDocument();
    expect(screen.queryByText(/queried successfully/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bond position result needs source check' })).toBeVisible();
    expect(screen.getByText(/do not treat the missing bond position as final/i)).toBeVisible();
    expect(screen.getByText(/wait for the THORNode source check to pass/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Open BOND review' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review source checks' }));

    expect(mocks.router.push).toHaveBeenCalledWith(
      '/dashboard?address=thor1rewardaddress#source-confidence'
    );
  });

  it('does not call a missing RUNE price quote live in the reward diagnosis', async () => {
    render(<RewardsPage />);

    const diagnosis = await screen.findByLabelText('Rewards diagnosis');
    expect(within(diagnosis).getByText('RUNE price')).toBeInTheDocument();
    expect(within(diagnosis).getByText('--')).toBeInTheDocument();
    expect(within(diagnosis).getByText('Waiting for quote')).toBeInTheDocument();
    expect(within(diagnosis).queryByText('Live quote')).not.toBeInTheDocument();
    expect(within(diagnosis).queryByText('Fresh quote')).not.toBeInTheDocument();
  });

  it('labels a loaded non-stale RUNE price as recent instead of fresh', async () => {
    mockUseRunePrice.mockReturnValue({
      price: 0.6,
      isStale: false,
      updatedAt: new Date('2026-06-12T00:00:00.000Z'),
    });

    render(<RewardsPage />);

    const diagnosis = await screen.findByLabelText('Rewards diagnosis');
    expect(within(diagnosis).getByText('Recent quote')).toBeInTheDocument();
    expect(within(diagnosis).queryByText('Fresh quote')).not.toBeInTheDocument();
    expect(within(diagnosis).queryByText('Live quote')).not.toBeInTheDocument();
  });

  it('labels a loaded RUNE price without source freshness as unverified', async () => {
    mockUseRunePrice.mockReturnValue({
      price: 0.6,
      isStale: false,
      updatedAt: null,
    });
    mockUseBondHistory.mockReturnValue({
      history: {
        initialBond: 25_000,
        currentBond: 100_000,
        bondGrowth: 75_000,
        firstBondAmount: 25_000,
        firstBondDate: new Date('2025-01-01T00:00:00.000Z'),
        lastBondDate: new Date('2026-01-01T00:00:00.000Z'),
        actionLimit: 50,
        loadedActionCount: 3,
        totalActionCount: 3,
        isPartial: false,
      },
      isLoading: false,
      error: undefined,
    });

    render(<RewardsPage />);

    const diagnosis = await screen.findByLabelText('Rewards diagnosis');
    expect(within(diagnosis).getByRole('heading', { name: 'RUNE price: Unverified' })).toBeVisible();
    expect(within(diagnosis).getByText('Quote loaded without freshness')).toBeVisible();
    expect(within(diagnosis).queryByText('Fresh quote')).not.toBeInTheDocument();

    const checks = await screen.findByLabelText('Rewards data checks');
    expect(within(checks).getByText('RUNE price')).toBeVisible();
    expect(within(checks).getByText('Unverified')).toBeVisible();
    expect(within(checks).getByText('Quote loaded without freshness')).toBeVisible();
  });

  it('summarizes reward data checks before the decision tabs', async () => {
    render(<RewardsPage />);

    const checks = await screen.findByLabelText('Rewards data checks');
    expect(within(checks).getByText('Reward history')).toBeVisible();
    expect(within(checks).getByText('Current-only')).toBeVisible();
    expect(within(checks).getByText('No bond action history')).toBeVisible();
    expect(within(checks).getByText('APY basis')).toBeVisible();
    const nodeLevelBasis = within(checks).getByText('Node-level');
    expect(nodeLevelBasis).toBeVisible();
    expect(nodeLevelBasis).toHaveClass('text-sky-600');
    expect(nodeLevelBasis).not.toHaveClass('text-emerald-600');
    const apyBasisDetail = within(checks).getByText('12.00% node-weighted estimate from 1 node');
    expect(apyBasisDetail).toBeVisible();
    expect(apyBasisDetail).not.toHaveClass('line-clamp-1');
    expect(within(checks).getByText('RUNE price')).toBeVisible();
    expect(within(checks).getByText('Missing')).toBeVisible();
    expect(within(checks).getByText('USD returns unavailable')).toBeVisible();
    expect(within(checks).getByText('Forecast')).toBeVisible();
    expect(within(checks).getByText('Estimated')).toBeVisible();
    expect(within(checks).getByText('Simple projection from node APY')).toBeVisible();
    expect(within(checks).queryByText('Rewards data confidence')).not.toBeInTheDocument();

    const tabs = screen.getByRole('tablist');
    expect(checks.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('labels a complete tax worksheet as review material rather than ready-to-file', async () => {
    mockUseBondHistory.mockReturnValue({
      history: {
        initialBond: 25_000,
        currentBond: 100_000,
        bondGrowth: 75_000,
        firstBondAmount: 25_000,
        firstBondDate: new Date('2025-01-01T00:00:00.000Z'),
        lastBondDate: new Date('2026-01-01T00:00:00.000Z'),
        actionLimit: 50,
        loadedActionCount: 3,
        totalActionCount: 3,
        isPartial: false,
      },
      isLoading: false,
      error: undefined,
    });

    render(<RewardsPage />);

    const checks = await screen.findByLabelText('Rewards data checks');
    expect(within(checks).getByText('Reward history')).toBeVisible();
    expect(within(checks).getByText('Source-loaded')).toBeVisible();
    expect(within(checks).getByText('Bond action rows loaded; returns are app-calculated review metrics')).toBeVisible();
    expect(within(checks).queryByText('Source-backed')).not.toBeInTheDocument();
    expect(within(checks).queryByText('Trusted')).not.toBeInTheDocument();
    expect(within(checks).getByText('Tax worksheet')).toBeVisible();
    expect(within(checks).getByText('Review')).toBeVisible();
    expect(within(checks).getByText('Bond history rows available; not filing-ready')).toBeVisible();
    expect(within(checks).queryByText('Ready')).not.toBeInTheDocument();
  });

  it('describes reward lookup failures as unchecked source data, not untrusted calculations', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      error: new Error('THORNode nodes failed'),
    });

    render(<RewardsPage />);

    expect(screen.getByRole('heading', { name: 'Rewards data is temporarily unavailable' })).toBeVisible();
    expect(screen.getByText('The bond-position lookup failed before reward inputs could be checked.')).toBeVisible();
    expect(screen.queryByText(/reward calculations could be trusted/i)).not.toBeInTheDocument();
  });

  it('leads the rewards diagnosis with the strongest data-check issue', async () => {
    render(<RewardsPage />);

    const diagnosis = await screen.findByLabelText('Rewards diagnosis');
    expect(within(diagnosis).getByRole('heading', { name: 'Reward history: Current-only' })).toBeVisible();
    expect(within(diagnosis).getByText(/Reward history is current-only/i)).toBeVisible();
    expect(within(diagnosis).getByText(/No bond action history/i)).toBeVisible();
    expect(within(diagnosis).getByText(/use the data checks before relying on return, forecast, or tax outputs/i)).toBeVisible();
    expect(within(diagnosis).queryByText(/confidence panel/i)).not.toBeInTheDocument();
    expect(within(diagnosis).getByRole('button', { name: 'Review data checks' })).toBeVisible();
    expect(within(diagnosis).queryByRole('button', { name: 'Review Fees' })).not.toBeInTheDocument();
  });

  it('marks reward history as degraded and price as stale when sources are weak', async () => {
    mockUseRunePrice.mockReturnValue({
      price: 0.6,
      isStale: true,
      updatedAt: new Date('2026-06-12T00:00:00.000Z'),
    });
    mockUseBondHistory.mockReturnValue({
      history: null,
      isLoading: false,
      error: new Error('Midgard actions failed'),
    });

    render(<RewardsPage />);

    const checks = await screen.findByLabelText('Rewards data checks');
    expect(within(checks).getAllByText('Degraded')).toHaveLength(2);
    expect(within(checks).getAllByText('Using current bond baseline').length).toBeGreaterThan(0);
    expect(within(checks).getByText('Stale')).toBeVisible();
    expect(within(checks).getByText('Price returns use last quote')).toBeVisible();
    expect(within(checks).getByText('Tax worksheet')).toBeVisible();
    expect(within(checks).getByText('Worksheet may include history warnings')).toBeVisible();
  });

  it('does not derive historical entry price from partial reward history', async () => {
    const partialFirstDate = new Date('2025-01-01T00:00:00.000Z');
    mockUseBondHistory.mockReturnValue({
      history: {
        initialBond: 25_000,
        currentBond: 100_000,
        bondGrowth: 75_000,
        firstBondAmount: 25_000,
        firstBondDate: partialFirstDate,
        lastBondDate: new Date('2026-01-01T00:00:00.000Z'),
        actionLimit: 50,
        loadedActionCount: 50,
        totalActionCount: 76,
        isPartial: true,
      },
      isLoading: false,
      error: undefined,
    });

    render(<RewardsPage />);

    const checks = await screen.findByLabelText('Rewards data checks');
    expect(mockUseHistoricalRunePrice).toHaveBeenCalledWith(null);
    expect(mockUseHistoricalRunePrice).not.toHaveBeenCalledWith(partialFirstDate);
    expect(within(checks).getByText('Partial')).toBeVisible();
    expect(within(checks).getByText('Loaded 50 of 76; auto returns need full history or manual baseline')).toBeVisible();
    expect(within(checks).getByText('Tax worksheet')).toBeVisible();
    expect(within(checks).getByText('Review')).toBeVisible();
    expect(within(checks).getByText('Visible history is partial; export may include history warnings')).toBeVisible();
  });

  it('keeps node-level APY forecast available when network fallback APY is unavailable', async () => {
    mockUseNetworkMetrics.mockReturnValue({
      data: {},
      isLoading: false,
      error: undefined,
    });

    render(<RewardsPage />);

    const checks = await screen.findByLabelText('Rewards data checks');
    expect(within(checks).getByText('APY basis')).toBeVisible();
    expect(within(checks).getByText('Node-level')).toBeVisible();
    expect(within(checks).getByText('12.00% node-weighted estimate from 1 node')).toBeVisible();
    expect(within(checks).getByText('Forecast')).toBeVisible();
    expect(within(checks).getByText('Estimated')).toBeVisible();
    expect(within(checks).getByText('Simple projection from node APY')).toBeVisible();
  });

  it('blocks forecast checks only when both node and network APY are unavailable', async () => {
    mockUseBondPositions.mockReturnValue({
      positions: [{ ...activePosition, netAPY: 0 }],
      isLoading: false,
      error: undefined,
    });
    mockUseNetworkMetrics.mockReturnValue({
      data: {},
      isLoading: false,
      error: undefined,
    });

    render(<RewardsPage />);

    const checks = await screen.findByLabelText('Rewards data checks');
    expect(within(checks).getByText('APY basis')).toBeVisible();
    expect(within(checks).getAllByText('Unavailable').length).toBeGreaterThan(0);
    expect(within(checks).getByText('Forecasts withheld')).toBeVisible();
    expect(within(checks).getByText('Forecast')).toBeVisible();
    expect(within(checks).getByText('Blocked')).toBeVisible();
    expect(within(checks).getByText('Needs APY baseline')).toBeVisible();
  });

  it('shows tiny network APY only as fallback when node APY is unavailable', async () => {
    mockUseBondPositions.mockReturnValue({
      positions: [{ ...activePosition, netAPY: 0 }],
      isLoading: false,
      error: undefined,
    });
    mockUseNetworkMetrics.mockReturnValue({
      data: { bondingAPY: '0.000031' },
      isLoading: false,
      error: undefined,
    });

    render(<RewardsPage />);

    const checks = await screen.findByLabelText('Rewards data checks');
    expect(within(checks).getByText('APY basis')).toBeVisible();
    expect(within(checks).getByText('Network fallback')).toBeVisible();
    expect(within(checks).getByText('<0.01% THORNode fallback')).toBeVisible();
    expect(within(checks).queryByText('0.00%')).not.toBeInTheDocument();
  });

  it('opens the fee leakage tab from the reward diagnosis primary action', async () => {
    const user = userEvent.setup();
    mockUseRunePrice.mockReturnValue({
      price: 0.6,
      isStale: false,
      updatedAt: new Date('2026-06-12T00:00:00.000Z'),
    });
    mockUseBondHistory.mockReturnValue({
      history: {
        bondGrowth: 0,
        currentBond: 100000,
        firstBondAmount: 100000,
        firstBondDate: new Date('2026-01-01T00:00:00.000Z'),
        initialBond: 100000,
        lastBondDate: new Date('2026-01-01T00:00:00.000Z'),
      },
      isLoading: false,
      error: undefined,
    });

    render(<RewardsPage />);

    await user.click(await screen.findByRole('button', { name: 'Review Fees' }));

    expect(screen.getByRole('tab', { name: 'Fees' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Mock fee leakage')).toBeVisible();
  });

  it('frames the tax export as a worksheet rather than a filing-ready report', async () => {
    const user = userEvent.setup();

    render(<RewardsPage />);

    await user.click(await screen.findByRole('tab', { name: 'Tax' }));

    expect(screen.getByRole('heading', { name: 'Reward tax worksheet' })).toBeInTheDocument();
    expect(screen.getByText(/estimated LP source metadata/i)).toBeInTheDocument();
    expect(screen.getByText(/not a filing-ready tax report/i)).toBeInTheDocument();
    expect(screen.queryByText(/confidence metadata/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Worksheet CSV' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export Tax Report' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Export Worksheet CSV' }));

    const dialog = screen.getByRole('dialog', { name: 'Export tax worksheet CSV' });
    expect(within(dialog).getByRole('heading', { name: 'Export tax worksheet CSV' })).toBeInTheDocument();
    expect(within(dialog).getByText(/estimated LP source metadata/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Use it for reconciliation before tax filing/i)).toBeInTheDocument();
    expect(within(dialog).queryByText(/confidence metadata/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Export Tax Report' })).not.toBeInTheDocument();
  });

  it('shows tax worksheet export failures without logging handled errors to the console', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Tax worksheet source unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    ));
    vi.stubGlobal('fetch', fetchMock);

    render(<RewardsPage />);

    await user.click(await screen.findByRole('tab', { name: 'Tax' }));
    await user.click(screen.getByRole('button', { name: 'Export Worksheet CSV' }));
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-01-31' } });

    await user.click(screen.getByRole('button', { name: 'Download CSV' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/tax-report', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        address: 'thor1rewardaddress',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      }),
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tax worksheet source unavailable');
    expect(consoleError).not.toHaveBeenCalled();
  });
});
