import { render, screen, within } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RiskPage from '../page';

const mocks = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams('address=thor1mocknode000000000000000000000000000000') },
  apiHealth: {
    current: {
      midgard: 'healthy',
      thornode: 'healthy',
      lastChecked: new Date('2026-06-12T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-12T00:00:00.000Z'),
        thornode: new Date('2026-06-12T00:00:00.000Z'),
      },
    },
  },
}));

const mockUseBondPositions = vi.fn();
const mockUseAllNodes = vi.fn();
const mockUseNetworkMetrics = vi.fn();
const mockUseCurrentBlockHeight = vi.fn();
const mockUseNetworkConstants = vi.fn();

const mockPosition = {
  nodeAddress: 'thor1mocknode000000000000000000000000000000',
  bondAmount: 100000000000,
  status: 'Active' as const,
  slashPoints: 0,
  isJailed: false,
  yieldGuardFlags: [] as string[],
  operatorFee: 500,
  currentAward: '5000000000',
};

const mockNetworkData = {
  bondMetrics: {
    totalActiveBond: '200000000000',
    totalStandbyBond: '50000000000',
  },
  totalPooledRune: '100000000000',
};

const mockCandidateNode = {
  node_address: 'thor1candidateavoid00000000000000000000000000',
  status: 'Active',
  pub_key_set: {
    secp256k1: 'secp',
    ed25519: 'ed',
  },
  validator_cons_pub_key: 'validator',
  peer_id: 'peer',
  active_block_height: 12345678,
  status_since: 12345000,
  node_operator_address: 'thor1operatorcandidate0000000000000000000000',
  total_bond: '1000000000000',
  bond_providers: {
    node_operator_fee: '2500',
    providers: [],
  },
  signer_membership: [],
  requested_to_leave: false,
  forced_to_leave: false,
  leave_height: 0,
  ip_address: '127.0.0.1',
  version: '3.19.0',
  slash_points: 150,
  jail: {},
  current_award: '10000000000',
  observe_chains: [],
  preflight_status: { status: 'ok', reason: '', code: 0 },
  maintenance: false,
  missing_blocks: 0,
};

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.current.get(key),
    toString: () => mocks.searchParams.current.toString(),
  }),
  usePathname: () => '/dashboard/risk',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/hooks/use-bond-positions', () => ({
  useBondPositions: (address: string | null) => mockUseBondPositions(address),
}));

vi.mock('@/lib/hooks/use-all-nodes', () => ({
  useAllNodes: () => mockUseAllNodes(),
}));

vi.mock('@/lib/hooks/use-network-metrics', () => ({
  useNetworkMetrics: () => mockUseNetworkMetrics(),
}));

vi.mock('@/lib/hooks/use-network-constants', () => ({
  useNetworkConstants: () => mockUseNetworkConstants(),
}));

vi.mock('@/lib/hooks/use-current-block-height', () => ({
  useCurrentBlockHeight: () => mockUseCurrentBlockHeight(),
}));

vi.mock('@/lib/hooks/use-api-health', () => ({
  useApiHealthContext: () => mocks.apiHealth.current,
}));

vi.mock('@/components/dashboard/slash-monitor', () => ({
  SlashMonitor: () => <section><h3>Slash Point Monitor</h3></section>,
}));

vi.mock('@/components/dashboard/churn-out-risk', () => ({
  ChurnOutRisk: () => <section><h3>Churn-Out Risk</h3></section>,
}));

vi.mock('@/components/dashboard/unbond-window-tracker', () => ({
  UnbondWindowTracker: () => <section><h3>Unbond Window</h3></section>,
}));

vi.mock('@/components/dashboard/network-security-metrics', () => ({
  NetworkSecurityMetrics: () => <section><h3>Network Security Metrics</h3></section>,
}));

describe('RiskPage', () => {
  beforeEach(() => {
    mockUseBondPositions.mockReset();
    mockUseAllNodes.mockReset();
    mockUseNetworkMetrics.mockReset();
    mockUseCurrentBlockHeight.mockReset();
    mockUseNetworkConstants.mockReset();
    mocks.searchParams.current = new URLSearchParams('address=thor1mocknode000000000000000000000000000000');
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
      positions: [mockPosition],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    mockUseAllNodes.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    mockUseNetworkMetrics.mockReturnValue({
      data: mockNetworkData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    mockUseNetworkConstants.mockReturnValue({
      constants: { MaxBondProviders: 100 },
      isLoading: false,
      error: undefined,
    });

    mockUseCurrentBlockHeight.mockReturnValue({
      data: { lastThorNode: { height: 12345678 } },
      currentBlockHeight: 12345678,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });
  });

  it('renders the network security card', () => {
    render(<RiskPage />);

    expect(screen.getByText(/network security/i)).toBeInTheDocument();
    expect(screen.getByText(/bond-to-pool gauge/i)).toBeInTheDocument();
  });

  it('labels clean provider exposure as informational no-urgent review instead of healthy', () => {
    render(<RiskPage />);

    const riskSummary = screen.getByLabelText('Risk summary');
    const providerStatus = within(riskSummary).getByLabelText('Provider exposure status');

    expect(providerStatus).toHaveTextContent('No urgent review');
    expect(providerStatus).toHaveClass('text-sky-600');
    expect(providerStatus).not.toHaveClass('text-emerald-600');
    expect(providerStatus).not.toHaveTextContent(/\bhealthy\b|\bsafe\b|immediate issue/i);
    expect(riskSummary).toHaveTextContent('Bond buffer in range');
    expect(riskSummary).not.toHaveTextContent('Well Secured');
  });

  it('frames an empty risk queue as current source visibility instead of an all-clear', () => {
    render(<RiskPage />);

    const riskQueue = screen.getByRole('region', { name: 'Provider exposure review' });

    expect(riskQueue).toHaveTextContent('0 visible');
    expect(riskQueue).not.toHaveTextContent('0 open');
    expect(riskQueue).toHaveTextContent('No current risk item visible');
    expect(riskQueue).toHaveTextContent(
      'Current source checks show no jail, slash exposure, churn-risk, or source-check issue. Keep source freshness in view before acting.'
    );
    expect(riskQueue).not.toHaveTextContent('Risk queue is clear');
    expect(riskQueue).not.toHaveTextContent('No jail, slash exposure, churn-risk, or source-check issue is visible now.');
  });

  it('labels the active-position KPI as active set state instead of earning state', () => {
    render(<RiskPage />);

    const activeSetLabel = screen.getByText('Active set');
    const activeSetTile = activeSetLabel.closest('.rounded-lg');

    expect(activeSetTile).toHaveTextContent('1');
    expect(activeSetTile).toHaveClass('bg-sky-50');
    expect(activeSetTile).not.toHaveClass('bg-emerald-50');
    expect(screen.queryByText('Earning')).not.toBeInTheDocument();
  });

  it('uses factual active-node copy for active jailed nodes in the summary banner', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [{
        ...mockPosition,
        isJailed: true,
      }],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const riskSummary = screen.getByLabelText('Risk summary');
    const activePill = within(riskSummary).getByText('1 active node').closest('span');

    expect(activePill).toHaveClass('bg-sky-100');
    expect(activePill).not.toHaveClass('bg-emerald-100');
    expect(riskSummary).toHaveTextContent('1 jailed');
  });

  it('does not make missing RUNE price the top risk on a no-bond risk page', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    expect(screen.getByLabelText('Provider risk diagnosis')).toHaveTextContent('No Bond');
    expect(screen.getByLabelText('Provider risk diagnosis')).toHaveTextContent('No bonded positions detected');
    expect(within(screen.getByLabelText('Provider risk diagnosis')).getByRole('link', { name: 'Open BOND review' })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1mocknode000000000000000000000000000000'
    );
    expect(screen.getByLabelText('Risk summary')).toHaveTextContent('Address checked');
    expect(screen.getByLabelText('Risk summary')).toHaveTextContent(
      'No bonded node risk is visible for this address because Heimdall did not find any active bond-provider positions.'
    );
    expect(screen.queryByText('Enter an address to view risk status.')).not.toBeInTheDocument();
    expect(screen.queryByText('RUNE price is unknown')).not.toBeInTheDocument();
  });

  it('withholds no-bond diagnosis while bond positions are still loading', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: true,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    expect(screen.getByRole('heading', { name: 'Risk' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading risk analysis' })).toHaveTextContent('Waiting for THORNode bond positions');
    expect(screen.queryByLabelText('Provider risk diagnosis')).not.toBeInTheDocument();
    expect(screen.queryByText('No bonded positions detected')).not.toBeInTheDocument();
  });

  it('opens detailed risk panels from the diagnosis primary action', async () => {
    const user = userEvent.setup();

    render(<RiskPage />);

    expect(screen.queryByRole('heading', { name: 'Slash Point Monitor' })).not.toBeInTheDocument();

    const diagnosis = screen.getByLabelText('Provider risk diagnosis');
    expect(screen.queryByRole('button', { name: 'Show Details' })).not.toBeInTheDocument();
    await user.click(within(diagnosis).getByRole('button', { name: 'Review risk details' }));

    expect(within(diagnosis).getByRole('button', { name: 'Hide risk details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Slash Point Monitor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Churn-Out Risk' })).toBeInTheDocument();
  });

  it('links the concrete top risk action to focused node context', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [{
        ...mockPosition,
        yieldGuardFlags: ['lowest_bond'],
      }],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const diagnosis = screen.getByLabelText('Provider risk diagnosis');
    expect(within(diagnosis).getByRole('link', { name: 'Review churn risk' })).toHaveAttribute(
      'href',
      `/dashboard/risk?address=thor1mocknode000000000000000000000000000000&node=${mockPosition.nodeAddress}`
    );
    expect(within(diagnosis).queryByRole('button', { name: 'Review churn risk' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Churn-Out Risk' })).not.toBeInTheDocument();
  });

  it('keeps the provider exposure reason visible in the compact risk diagnosis', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [{
        ...mockPosition,
        isJailed: true,
      }],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const diagnosis = screen.getByLabelText('Provider risk diagnosis');
    const exposureReason = within(diagnosis).getByText('Action required · The node is currently in jail and may not be earning.');

    expect(exposureReason).not.toHaveClass('hidden');
    expect(exposureReason).not.toHaveClass('sm:block');
  });

  it('shows focused alert node context and highlights the matching row', () => {
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${mockPosition.nodeAddress}`
    );
    mockUseBondPositions.mockReturnValue({
      positions: [{
        ...mockPosition,
        slashPoints: 75,
        yieldGuardFlags: ['highest_slash'],
      }],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const focusedContext = screen.getByLabelText('Focused node risk context');
    expect(focusedContext).toHaveTextContent('Alert context');
    expect(focusedContext).toHaveTextContent(mockPosition.nodeAddress);
    expect(within(focusedContext).getByTestId('focused-bonded-primary-action')).toHaveTextContent('Review slash exposure');
    expect(within(focusedContext).getByTestId('focused-bonded-primary-action')).toHaveTextContent(
      'Slash exposure is elevated. Review this node before the next churn or before adding more bond.'
    );
    expect(within(focusedContext).getByTestId('focused-bonded-inline-evidence')).toHaveTextContent(
      'THORNode: status Active · slash 75 · flags High Slash. Midgard: block height feeds jail and churn timing.'
    );
    expect(within(focusedContext).getByTestId('focused-bonded-primary-button')).toHaveTextContent('Review slash exposure');
    const metricDetails = within(focusedContext).getByTestId('focused-bonded-metric-details');
    expect(metricDetails).toHaveTextContent('Operational details');
    expect(metricDetails).toHaveTextContent('Active · Slash 75 · Flags High Slash');
    expect(metricDetails).not.toHaveAttribute('open');
    expect(within(focusedContext).getByTestId('focused-bonded-metrics').closest('[data-testid="focused-bonded-metric-details"]')).toBe(metricDetails);

    const focusedRow = screen.getByLabelText(`Focused risk node ${mockPosition.nodeAddress}`);
    expect(focusedRow).toHaveAttribute('data-focused-node', 'true');
    expect(focusedRow).toHaveTextContent('Focused');
  });

  it('keeps clean focused alert drilldowns in neutral review instead of green ready state', () => {
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${mockPosition.nodeAddress}`
    );
    mockUseBondPositions.mockReturnValue({
      positions: [{
        ...mockPosition,
        slashPoints: 0,
        isJailed: false,
        yieldGuardFlags: [],
      }],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const focusedContext = screen.getByLabelText('Focused node risk context');
    const primaryAction = within(focusedContext).getByTestId('focused-bonded-primary-action');
    const primaryButton = within(focusedContext).getByTestId('focused-bonded-primary-button');
    const inlineEvidence = within(focusedContext).getByTestId('focused-bonded-inline-evidence');
    const nodeContextLabel = within(focusedContext).getByText('Node context');

    expect(primaryAction).toHaveTextContent('Review node evidence');
    expect(primaryAction).toHaveTextContent('No current slash, jail, or blocking churn flag is visible');
    expect(primaryAction).not.toHaveTextContent('No immediate bonded-node action is required');
    expect(primaryAction).not.toHaveClass('border-emerald-200');
    expect(primaryAction).toHaveClass('border-sky-200');
    expect(primaryButton).not.toHaveClass('bg-emerald-600');
    expect(primaryButton).toHaveClass('bg-sky-600');
    expect(inlineEvidence).toHaveTextContent('no current blocking risk flags visible');
    expect(inlineEvidence).not.toHaveTextContent('no risk flags');
    expect(nodeContextLabel).toHaveClass('text-sky-700');
    expect(nodeContextLabel).not.toHaveClass('text-emerald-700');
  });

  it('opens detailed risk panels from the focused bonded node action', async () => {
    const user = userEvent.setup();
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${mockPosition.nodeAddress}`
    );
    mockUseBondPositions.mockReturnValue({
      positions: [{
        ...mockPosition,
        slashPoints: 75,
        yieldGuardFlags: ['highest_slash'],
      }],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const focusedContext = screen.getByLabelText('Focused node risk context');
    expect(screen.queryByRole('heading', { name: 'Slash Point Monitor' })).not.toBeInTheDocument();

    await user.click(within(focusedContext).getByRole('button', { name: 'Review slash exposure' }));

    expect(within(focusedContext).getByRole('button', { name: 'Hide risk details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Slash Point Monitor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Churn-Out Risk' })).toBeInTheDocument();
  });

  it('does not repeat the focused node action in the risk queue', () => {
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${mockPosition.nodeAddress}`
    );
    mockUseBondPositions.mockReturnValue({
      positions: [{
        ...mockPosition,
        slashPoints: 75,
      }],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    expect(screen.getByLabelText('Focused node risk context')).toHaveTextContent('Alert context');
    expect(screen.queryByLabelText('Provider exposure review')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Other provider reviews')).not.toBeInTheDocument();
  });

  it('keeps unrelated risk actions under an Other provider reviews queue while a node is focused', () => {
    const otherPosition = {
      ...mockPosition,
      nodeAddress: 'thor1othernode0000000000000000000000000000',
      bondAmount: 50000000000,
      status: 'Standby' as const,
      slashPoints: 0,
      yieldGuardFlags: [] as string[],
    };
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${mockPosition.nodeAddress}`
    );
    mockUseBondPositions.mockReturnValue({
      positions: [{
        ...mockPosition,
        slashPoints: 75,
      }, otherPosition],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const otherQueue = screen.getByLabelText('Other provider reviews');
    expect(otherQueue).toHaveTextContent('1 visible');
    expect(otherQueue).not.toHaveTextContent('1 open');
    expect(otherQueue).toHaveTextContent('is Standby');
    expect(otherQueue).not.toHaveTextContent('has elevated slash points');
  });

  it('keeps diagnosis and source checks ahead of focused alert context', () => {
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${mockPosition.nodeAddress}`
    );
    mockUseBondPositions.mockReturnValue({
      positions: [{
        ...mockPosition,
        slashPoints: 75,
        yieldGuardFlags: ['highest_slash'],
      }],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    const { container } = render(<RiskPage />);

    expect(screen.getByLabelText('Provider risk diagnosis')).toBeInTheDocument();
    expect(screen.getByLabelText('Source checks')).toHaveTextContent('THORNode');
    expect(screen.getByLabelText('Source checks')).toHaveTextContent('Midgard');
    expect(screen.getByLabelText('Focused node risk context')).toBeInTheDocument();

    const orderedSections = Array.from(container.querySelectorAll('section[aria-label]'))
      .map((section) => section.getAttribute('aria-label'))
      .filter((label) => label === 'Provider risk diagnosis' || label === 'Source checks' || label === 'Focused node risk context');

    expect(orderedSections).toEqual([
      'Provider risk diagnosis',
      'Source checks',
      'Focused node risk context',
    ]);
  });

  it('warns when the focused node is not in the loaded address positions', () => {
    mocks.searchParams.current = new URLSearchParams(
      'address=thor1mocknode000000000000000000000000000000&node=thor1stalealertnode0000000000000000000'
    );

    render(<RiskPage />);

    const focusedContext = screen.getByLabelText('Focused node risk context');
    expect(focusedContext).toHaveTextContent('Focused node not in this address');
    expect(focusedContext).toHaveTextContent('candidate or stale-alert context');
    expect(screen.queryByLabelText('Focused risk node thor1stalealertnode0000000000000000000')).not.toBeInTheDocument();
  });

  it('names THORNode as the source while loading focused candidate context', () => {
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${mockCandidateNode.node_address}`
    );
    mockUseAllNodes.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const focusedContext = screen.getByLabelText('Focused node risk context');
    expect(focusedContext).toHaveTextContent('Loading focused node context');
    expect(focusedContext).toHaveTextContent('current THORNode candidates');
    expect(focusedContext).not.toHaveTextContent('live network candidates');
  });

  it('shows provider-access action before candidate metrics for an unwhitelisted focused candidate', async () => {
    const user = userEvent.setup();
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${mockCandidateNode.node_address}`
    );
    mockUseAllNodes.mockReturnValue({
      data: [mockCandidateNode],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const focusedContext = screen.getByLabelText('Focused node risk context');
    expect(focusedContext).toHaveTextContent('Provider access review');
    expect(focusedContext).toHaveTextContent(mockCandidateNode.node_address);
    expect(focusedContext).toHaveTextContent('Avoid candidate');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent('Ask operator to add provider');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent(
      'Do not bond until THORNode lists this address as a bond provider.'
    );
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).not.toHaveTextContent(/whitelist/i);
    expect(within(focusedContext).getByTestId('focused-risk-inline-evidence')).toHaveTextContent(
      'THORNode: All candidate inputs present. Capacity: Provider not listed by THORNode.'
    );
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveTextContent('Compare alternatives');
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveAttribute(
      'href',
      `/dashboard/explorer?address=thor1mocknode000000000000000000000000000000&node=${mockCandidateNode.node_address}`
    );
    expect(within(focusedContext).getByTestId('focused-risk-score-evidence')).toHaveTextContent('Candidate evidence · THORNode');
    expect(within(focusedContext).getByTestId('focused-risk-score-evidence')).toHaveTextContent(
      'Watched address is not listed as a THORNode bond provider.'
    );

    const metricDetails = within(focusedContext).getByTestId('focused-risk-metric-details');
    expect(metricDetails).toHaveTextContent('Operational details');
    expect(metricDetails).toHaveTextContent('Provider not listed by THORNode · Slash 150 · Fee 25.0%');
    expect(metricDetails).not.toHaveAttribute('open');
    expect(within(focusedContext).getByTestId('focused-risk-candidate-metrics').closest('[data-testid="focused-risk-metric-details"]')).toBe(metricDetails);

    await user.click(within(metricDetails).getByText('Operational details'));

    expect(metricDetails).toHaveAttribute('open');
    expect(within(metricDetails).getByText('Slash points')).toBeInTheDocument();
    expect(within(metricDetails).getByText('Operator fee')).toBeInTheDocument();
    expect(focusedContext).toHaveTextContent('Provider not listed by THORNode');
    expect(focusedContext).not.toHaveTextContent(/operator whitelist|whitelisted/i);
    expect(focusedContext).toHaveTextContent('150 slash points');
    expect(focusedContext).not.toHaveTextContent('candidate or stale-alert context');
    expect(focusedContext).not.toHaveTextContent(/\d+\/100/);
    expect(screen.queryByLabelText(`Focused risk node ${mockCandidateNode.node_address}`)).not.toBeInTheDocument();
  });

  it('frames strong whitelisted focused candidates as review states before BOND prep', () => {
    const whitelistedCandidate = {
      ...mockCandidateNode,
      node_address: 'thor1strongcandidate0000000000000000000000',
      slash_points: 0,
      current_award: '20000000000',
      bond_providers: {
        node_operator_fee: '500',
        providers: [{ bond_address: 'thor1mocknode000000000000000000000000000000', bond: '1000000000' }],
      },
    };
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${whitelistedCandidate.node_address}`
    );
    mockUseAllNodes.mockReturnValue({
      data: [whitelistedCandidate],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const focusedContext = screen.getByLabelText('Focused node risk context');
    expect(focusedContext).toHaveTextContent('Strong candidate');
    expect(focusedContext).toHaveTextContent('Confirm provider access before reviewing any BOND memo.');
    expect(focusedContext).not.toHaveTextContent('Confirm provider access before preparing any BOND transaction.');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent('Review before BOND memo');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent('Candidate evidence and THORNode-listed provider access support reviewing a BOND memo');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).not.toHaveTextContent('Candidate evidence and provider access support reviewing a BOND memo');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).not.toHaveTextContent('Score and provider access support preparing a BOND memo');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).not.toHaveTextContent('memo prep');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent(
      'not a safety guarantee'
    );
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).not.toHaveTextContent(
      'Watched address is already listed as a provider and the candidate score is strong.'
    );
    expect(within(focusedContext).getByTestId('focused-risk-inline-evidence')).toHaveTextContent(
      'THORNode: All candidate inputs present. Capacity: Provider listed by THORNode.'
    );
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveTextContent('Review BOND memo');
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveAttribute(
      'href',
      `/dashboard/transactions?address=thor1mocknode000000000000000000000000000000&action=bond&node=${whitelistedCandidate.node_address}`
    );
    expect(within(focusedContext).queryByRole('link', { name: 'Prepare BOND memo' })).not.toBeInTheDocument();
    expect(within(focusedContext).getByRole('link', { name: 'Compare candidates' })).toHaveAttribute(
      'href',
      `/dashboard/explorer?address=thor1mocknode000000000000000000000000000000&node=${whitelistedCandidate.node_address}`
    );
    expect(within(focusedContext).getByTestId('focused-risk-metric-details')).toHaveTextContent(
      'Provider listed by THORNode · Slash 0 · Fee 5.0%'
    );
    expect(focusedContext).not.toHaveTextContent(/\d+\/100/);
  });

  it('does not link a strong whitelisted focused candidate to BOND prep while THORNode confidence is degraded', () => {
    const whitelistedCandidate = {
      ...mockCandidateNode,
      node_address: 'thor1strongcandidate0000000000000000000000',
      slash_points: 0,
      current_award: '20000000000',
      bond_providers: {
        node_operator_fee: '500',
        providers: [{ bond_address: 'thor1mocknode000000000000000000000000000000', bond: '1000000000' }],
      },
    };
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${whitelistedCandidate.node_address}`
    );
    mocks.apiHealth.current = {
      midgard: 'healthy',
      thornode: 'degraded',
      lastChecked: new Date('2026-06-12T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-12T00:00:00.000Z'),
        thornode: new Date('2026-06-11T23:55:00.000Z'),
      },
    };
    mockUseAllNodes.mockReturnValue({
      data: [whitelistedCandidate],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const focusedContext = screen.getByLabelText('Focused node risk context');
    const sourceConfidence = screen.getByLabelText('Source checks');

    expect(sourceConfidence).toHaveTextContent('THORNode');
    expect(sourceConfidence).toHaveTextContent('Degraded');
    expect(focusedContext).toHaveTextContent('Strong candidate');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent('Wait for source check');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent(
      'THORNode candidate source check is degraded'
    );
    expect(within(focusedContext).getByTestId('focused-risk-inline-evidence')).toHaveTextContent(
      'THORNode source: THORNode degraded. Capacity: Provider listed by THORNode.'
    );
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveTextContent('Review source checks');
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveAttribute(
      'href',
      '#risk-source-confidence'
    );
    expect(within(focusedContext).queryByRole('link', { name: 'Prepare BOND memo' })).not.toBeInTheDocument();
    expect(within(focusedContext).queryByRole('link', { name: 'Compare candidates' })).toBeInTheDocument();
  });

  it('renders malformed focused candidate metrics as unavailable instead of NaN', () => {
    const malformedCandidate = {
      ...mockCandidateNode,
      node_address: 'thor1malformedriskcandidate000000000000000',
      total_bond: 'not-a-bond',
      current_award: 'not-an-award',
      slash_points: Number.NaN,
      bond_providers: {
        node_operator_fee: 'not-a-fee',
        providers: [{ bond_address: 'thor1mocknode000000000000000000000000000000', bond: '1000000000' }],
      },
    };
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${malformedCandidate.node_address}`
    );
    mockUseAllNodes.mockReturnValue({
      data: [malformedCandidate],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    const { container } = render(<RiskPage />);

    const focusedContext = screen.getByLabelText('Focused node risk context');
    expect(focusedContext).toHaveTextContent('Avoid candidate');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent('Review risk evidence');
    expect(within(focusedContext).getByTestId('focused-risk-inline-evidence')).toHaveTextContent(
      'THORNode: Missing APY, bond, fee, slash. Capacity: Provider listed by THORNode.'
    );
    expect(focusedContext).toHaveTextContent('slash data unavailable');
    expect(focusedContext).toHaveTextContent('operator fee unavailable');
    expect(focusedContext).toHaveTextContent('bond data unavailable');
    expect(within(focusedContext).getByTestId('focused-risk-metric-details')).toHaveTextContent(
      'Provider listed by THORNode · Slash -- · Fee --'
    );
    expect(within(focusedContext).getAllByText('--').length).toBeGreaterThanOrEqual(4);
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });

  it('shows full provider slots in risk context when max providers is reached', () => {
    mocks.searchParams.current = new URLSearchParams(
      `address=thor1mocknode000000000000000000000000000000&node=${mockCandidateNode.node_address}`
    );
    mockUseNetworkConstants.mockReturnValue({
      constants: { MaxBondProviders: 1 },
      isLoading: false,
      error: undefined,
    });
    mockUseAllNodes.mockReturnValue({
      data: [{
        ...mockCandidateNode,
        bond_providers: {
          node_operator_fee: '2500',
          providers: [{ bond_address: 'thor1otherprovider00000000000000000000', bond: '1000000000' }],
        },
      }],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    const focusedContext = screen.getByLabelText('Focused node risk context');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent('Choose another candidate');
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveTextContent('Compare alternatives');
    expect(focusedContext).toHaveTextContent('Provider slots full');
    expect(within(focusedContext).getByTestId('focused-risk-metric-details')).toHaveTextContent(
      'Provider slots full · Slash 150 · Fee 25.0%'
    );
    expect(focusedContext).toHaveTextContent('provider slots full');
  });
});
