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

    await user.click(screen.getByRole('button', { name: 'Open Bond Composer' }));

    expect(mocks.router.push).toHaveBeenCalledWith(
      '/dashboard/transactions?address=thor1rewardaddress'
    );
  });

  it.each(['degraded', 'down', 'unknown'] as const)('routes the empty-state bond action to source confidence when THORNode is %s', async (thornode) => {
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

    expect(screen.queryByRole('button', { name: 'Open Bond Composer' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review source confidence' }));

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

  it('labels a loaded non-stale RUNE price as fresh', async () => {
    mockUseRunePrice.mockReturnValue({
      price: 0.6,
      isStale: false,
      updatedAt: new Date('2026-06-12T00:00:00.000Z'),
    });

    render(<RewardsPage />);

    const diagnosis = await screen.findByLabelText('Rewards diagnosis');
    expect(within(diagnosis).getByText('Fresh quote')).toBeInTheDocument();
    expect(within(diagnosis).queryByText('Live quote')).not.toBeInTheDocument();
  });

  it('summarizes reward data confidence before the decision tabs', async () => {
    render(<RewardsPage />);

    const confidence = await screen.findByLabelText('Rewards data confidence');
    expect(within(confidence).getByText('Reward history')).toBeVisible();
    expect(within(confidence).getByText('Current-only')).toBeVisible();
    expect(within(confidence).getByText('No bond action history')).toBeVisible();
    expect(within(confidence).getByText('APY basis')).toBeVisible();
    expect(within(confidence).getByText('Node-level')).toBeVisible();
    expect(within(confidence).getByText('12.00% weighted from 1 node')).toBeVisible();
    expect(within(confidence).getByText('RUNE price')).toBeVisible();
    expect(within(confidence).getByText('Missing')).toBeVisible();
    expect(within(confidence).getByText('USD returns unavailable')).toBeVisible();
    expect(within(confidence).getByText('Forecast')).toBeVisible();
    expect(within(confidence).getByText('Estimated')).toBeVisible();
    expect(within(confidence).getByText('Simple projection from node APY')).toBeVisible();

    const tabs = screen.getByRole('tablist');
    expect(confidence.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('leads the rewards diagnosis with the strongest data-confidence issue', async () => {
    render(<RewardsPage />);

    const diagnosis = await screen.findByLabelText('Rewards diagnosis');
    expect(within(diagnosis).getByRole('heading', { name: 'Reward history: Current-only' })).toBeVisible();
    expect(within(diagnosis).getByText(/Reward history is current-only/i)).toBeVisible();
    expect(within(diagnosis).getByText(/No bond action history/i)).toBeVisible();
    expect(within(diagnosis).getByRole('button', { name: 'Review data confidence' })).toBeVisible();
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

    const confidence = await screen.findByLabelText('Rewards data confidence');
    expect(within(confidence).getAllByText('Degraded')).toHaveLength(2);
    expect(within(confidence).getAllByText('Using current bond baseline').length).toBeGreaterThan(0);
    expect(within(confidence).getByText('Stale')).toBeVisible();
    expect(within(confidence).getByText('Price returns use last quote')).toBeVisible();
    expect(within(confidence).getByText('Tax worksheet')).toBeVisible();
    expect(within(confidence).getByText('Worksheet may include history warnings')).toBeVisible();
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

    const confidence = await screen.findByLabelText('Rewards data confidence');
    expect(mockUseHistoricalRunePrice).toHaveBeenCalledWith(null);
    expect(mockUseHistoricalRunePrice).not.toHaveBeenCalledWith(partialFirstDate);
    expect(within(confidence).getByText('Partial')).toBeVisible();
    expect(within(confidence).getByText('Loaded 50 of 76; auto returns need full history or manual baseline')).toBeVisible();
    expect(within(confidence).getByText('Tax worksheet')).toBeVisible();
    expect(within(confidence).getByText('Review')).toBeVisible();
    expect(within(confidence).getByText('Visible history is partial; export may include history warnings')).toBeVisible();
  });

  it('keeps node-level APY forecast available when network fallback APY is unavailable', async () => {
    mockUseNetworkMetrics.mockReturnValue({
      data: {},
      isLoading: false,
      error: undefined,
    });

    render(<RewardsPage />);

    const confidence = await screen.findByLabelText('Rewards data confidence');
    expect(within(confidence).getByText('APY basis')).toBeVisible();
    expect(within(confidence).getByText('Node-level')).toBeVisible();
    expect(within(confidence).getByText('12.00% weighted from 1 node')).toBeVisible();
    expect(within(confidence).getByText('Forecast')).toBeVisible();
    expect(within(confidence).getByText('Estimated')).toBeVisible();
    expect(within(confidence).getByText('Simple projection from node APY')).toBeVisible();
  });

  it('blocks forecast confidence only when both node and network APY are unavailable', async () => {
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

    const confidence = await screen.findByLabelText('Rewards data confidence');
    expect(within(confidence).getByText('APY basis')).toBeVisible();
    expect(within(confidence).getAllByText('Unavailable').length).toBeGreaterThan(0);
    expect(within(confidence).getByText('Forecasts withheld')).toBeVisible();
    expect(within(confidence).getByText('Forecast')).toBeVisible();
    expect(within(confidence).getByText('Blocked')).toBeVisible();
    expect(within(confidence).getByText('Needs APY baseline')).toBeVisible();
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

    const confidence = await screen.findByLabelText('Rewards data confidence');
    expect(within(confidence).getByText('APY basis')).toBeVisible();
    expect(within(confidence).getByText('Network fallback')).toBeVisible();
    expect(within(confidence).getByText('<0.01% THORNode fallback')).toBeVisible();
    expect(within(confidence).queryByText('0.00%')).not.toBeInTheDocument();
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
    expect(screen.getByText(/not a filing-ready tax report/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Worksheet CSV' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export Tax Report' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Export Worksheet CSV' }));

    expect(screen.getByRole('heading', { name: 'Export tax worksheet CSV' })).toBeInTheDocument();
    expect(screen.getByText(/Use it for reconciliation before tax filing/i)).toBeInTheDocument();
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
