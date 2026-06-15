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

  it('does not make missing RUNE price the top risk on a no-bond risk page', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<RiskPage />);

    expect(screen.getByLabelText('Node security diagnosis')).toHaveTextContent('No Bond');
    expect(screen.getByLabelText('Node security diagnosis')).toHaveTextContent('No bonded positions detected');
    expect(within(screen.getByLabelText('Node security diagnosis')).getByRole('link', { name: 'Open Bond Composer' })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1mocknode000000000000000000000000000000'
    );
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
    expect(screen.queryByLabelText('Node security diagnosis')).not.toBeInTheDocument();
    expect(screen.queryByText('No bonded positions detected')).not.toBeInTheDocument();
  });

  it('opens detailed risk panels from the diagnosis primary action', async () => {
    const user = userEvent.setup();

    render(<RiskPage />);

    expect(screen.queryByRole('heading', { name: 'Slash Point Monitor' })).not.toBeInTheDocument();

    const diagnosis = screen.getByLabelText('Node security diagnosis');
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

    const diagnosis = screen.getByLabelText('Node security diagnosis');
    expect(within(diagnosis).getByRole('link', { name: 'Review churn risk' })).toHaveAttribute(
      'href',
      `/dashboard/risk?address=thor1mocknode000000000000000000000000000000&node=${mockPosition.nodeAddress}`
    );
    expect(within(diagnosis).queryByRole('button', { name: 'Review churn risk' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Churn-Out Risk' })).not.toBeInTheDocument();
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
    expect(within(focusedContext).getByTestId('focused-bonded-primary-action')).toHaveTextContent('Review slash monitor');
    expect(within(focusedContext).getByTestId('focused-bonded-primary-action')).toHaveTextContent(
      'Slash points are elevated. Watch this node before the next churn and before adding more bond.'
    );
    expect(within(focusedContext).getByTestId('focused-bonded-inline-evidence')).toHaveTextContent(
      'THORNode: status Active · slash 75 · flags High Slash. Midgard: block height feeds jail and churn timing.'
    );
    expect(within(focusedContext).getByTestId('focused-bonded-primary-button')).toHaveTextContent('Review slash monitor');
    const metricDetails = within(focusedContext).getByTestId('focused-bonded-metric-details');
    expect(metricDetails).toHaveTextContent('Operational details');
    expect(metricDetails).toHaveTextContent('Active · Slash 75 · Flags High Slash');
    expect(metricDetails).not.toHaveAttribute('open');
    expect(within(focusedContext).getByTestId('focused-bonded-metrics').closest('[data-testid="focused-bonded-metric-details"]')).toBe(metricDetails);

    const focusedRow = screen.getByLabelText(`Focused risk node ${mockPosition.nodeAddress}`);
    expect(focusedRow).toHaveAttribute('data-focused-node', 'true');
    expect(focusedRow).toHaveTextContent('Focused');
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

    await user.click(within(focusedContext).getByRole('button', { name: 'Review slash monitor' }));

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
    expect(screen.queryByLabelText('Riskiest actions')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Other risks')).not.toBeInTheDocument();
  });

  it('keeps unrelated risk actions under an Other risks queue while a node is focused', () => {
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

    const otherQueue = screen.getByLabelText('Other risks');
    expect(otherQueue).toHaveTextContent('1 open');
    expect(otherQueue).toHaveTextContent('is Standby');
    expect(otherQueue).not.toHaveTextContent('has elevated slash points');
  });

  it('keeps diagnosis and source confidence ahead of focused alert context', () => {
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

    expect(screen.getByLabelText('Node security diagnosis')).toBeInTheDocument();
    expect(screen.getByLabelText('Source confidence')).toHaveTextContent('THORNode');
    expect(screen.getByLabelText('Source confidence')).toHaveTextContent('Midgard');
    expect(screen.getByLabelText('Focused node risk context')).toBeInTheDocument();

    const orderedSections = Array.from(container.querySelectorAll('section[aria-label]'))
      .map((section) => section.getAttribute('aria-label'))
      .filter((label) => label === 'Node security diagnosis' || label === 'Source confidence' || label === 'Focused node risk context');

    expect(orderedSections).toEqual([
      'Node security diagnosis',
      'Source confidence',
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
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent('Ask operator to whitelist');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent(
      'Do not bond until this address is whitelisted.'
    );
    expect(within(focusedContext).getByTestId('focused-risk-inline-evidence')).toHaveTextContent(
      'THORNode: All score inputs present. Capacity: Whitelist needed.'
    );
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveTextContent('Compare alternatives');
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveAttribute(
      'href',
      `/dashboard/explorer?address=thor1mocknode000000000000000000000000000000&node=${mockCandidateNode.node_address}`
    );
    expect(within(focusedContext).getByTestId('focused-risk-score-evidence')).toHaveTextContent('Score evidence · THORNode');
    expect(within(focusedContext).getByTestId('focused-risk-score-evidence')).toHaveTextContent(
      'Watched address is not listed; operator whitelist is required.'
    );

    const metricDetails = within(focusedContext).getByTestId('focused-risk-metric-details');
    expect(metricDetails).toHaveTextContent('Operational details');
    expect(metricDetails).toHaveTextContent('Whitelist needed · Slash 150 · Fee 25.0%');
    expect(metricDetails).not.toHaveAttribute('open');
    expect(within(focusedContext).getByTestId('focused-risk-candidate-metrics').closest('[data-testid="focused-risk-metric-details"]')).toBe(metricDetails);

    await user.click(within(metricDetails).getByText('Operational details'));

    expect(metricDetails).toHaveAttribute('open');
    expect(within(metricDetails).getByText('Slash points')).toBeInTheDocument();
    expect(within(metricDetails).getByText('Operator fee')).toBeInTheDocument();
    expect(focusedContext).toHaveTextContent('Needs operator whitelist');
    expect(focusedContext).toHaveTextContent('150 slash points');
    expect(focusedContext).not.toHaveTextContent('candidate or stale-alert context');
    expect(screen.queryByLabelText(`Focused risk node ${mockCandidateNode.node_address}`)).not.toBeInTheDocument();
  });

  it('only links focused candidates to BOND prep when provider access is whitelisted and the score is strong', () => {
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
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent('Prepare BOND memo');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent(
      'Watched address is already listed as a provider and the candidate score is strong.'
    );
    expect(within(focusedContext).getByTestId('focused-risk-inline-evidence')).toHaveTextContent(
      'THORNode: All score inputs present. Capacity: Provider whitelisted.'
    );
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveAttribute(
      'href',
      `/dashboard/transactions?address=thor1mocknode000000000000000000000000000000&action=bond&node=${whitelistedCandidate.node_address}`
    );
    expect(within(focusedContext).getByRole('link', { name: 'Compare candidates' })).toHaveAttribute(
      'href',
      `/dashboard/explorer?address=thor1mocknode000000000000000000000000000000&node=${whitelistedCandidate.node_address}`
    );
    expect(within(focusedContext).getByTestId('focused-risk-metric-details')).toHaveTextContent(
      'Provider whitelisted · Slash 0 · Fee 5.0%'
    );
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
    const sourceConfidence = screen.getByLabelText('Source confidence');

    expect(sourceConfidence).toHaveTextContent('THORNode');
    expect(sourceConfidence).toHaveTextContent('Degraded');
    expect(focusedContext).toHaveTextContent('Strong candidate');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent('Wait for source confidence');
    expect(within(focusedContext).getByTestId('focused-risk-primary-action')).toHaveTextContent(
      'THORNode source confidence is degraded'
    );
    expect(within(focusedContext).getByTestId('focused-risk-inline-evidence')).toHaveTextContent(
      'THORNode source: THORNode degraded. Capacity: Provider whitelisted.'
    );
    expect(within(focusedContext).getByTestId('focused-risk-primary-link')).toHaveTextContent('Review source confidence');
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
      'THORNode: Missing APY, bond, fee, slash. Capacity: Provider whitelisted.'
    );
    expect(focusedContext).toHaveTextContent('slash data unavailable');
    expect(focusedContext).toHaveTextContent('operator fee unavailable');
    expect(focusedContext).toHaveTextContent('bond data unavailable');
    expect(within(focusedContext).getByTestId('focused-risk-metric-details')).toHaveTextContent(
      'Provider whitelisted · Slash -- · Fee --'
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
