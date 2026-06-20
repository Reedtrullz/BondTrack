import { fireEvent, render, screen, within } from '@/test/utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ExplorerPage from './page';
import type { NodeRaw } from '@/lib/api/thornode';

const mockUseAllNodes = vi.fn();
const mockUseBondPositions = vi.fn();
const mockUseNetworkConstants = vi.fn();
const mockUseApiHealthContext = vi.hoisted(() => vi.fn());

const mocks = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams('address=thor1exploreraddress') },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.current.get(key),
    toString: () => mocks.searchParams.current.toString(),
  }),
}));

vi.mock('@/lib/hooks/use-all-nodes', () => ({
  useAllNodes: () => mockUseAllNodes(),
}));

vi.mock('@/lib/hooks/use-bond-positions', () => ({
  useBondPositions: (address: string | null) => mockUseBondPositions(address),
}));

vi.mock('@/lib/hooks/use-network-constants', () => ({
  useNetworkConstants: () => mockUseNetworkConstants(),
}));

vi.mock('@/lib/hooks/use-api-health', () => ({
  useApiHealthContext: () => mockUseApiHealthContext(),
}));

function buildNode(overrides: Partial<NodeRaw> = {}): NodeRaw {
  return {
    node_address: 'thor1candidatebelowoptimal0000000000000000000',
    status: 'Active',
    pub_key_set: { secp256k1: 'secp', ed25519: 'ed' },
    validator_cons_pub_key: 'validator',
    peer_id: 'peer',
    active_block_height: 123,
    status_since: 123,
    node_operator_address: 'thor1operator0000000000000000000000000000000',
    total_bond: '1000000000000',
    bond_providers: {
      node_operator_fee: '0',
      providers: [],
    },
    signer_membership: [],
    requested_to_leave: false,
    forced_to_leave: false,
    leave_height: 0,
    ip_address: '127.0.0.1',
    version: '3.19.0',
    slash_points: 0,
    jail: {},
    current_award: '5000000000',
    observe_chains: [],
    preflight_status: { status: 'ok', reason: '', code: 0 },
    maintenance: false,
    missing_blocks: 0,
    ...overrides,
  };
}

describe('ExplorerPage', () => {
  beforeEach(() => {
    mockUseAllNodes.mockReset();
    mockUseBondPositions.mockReset();
    mockUseNetworkConstants.mockReset();
    mockUseApiHealthContext.mockReset();
    mocks.searchParams.current = new URLSearchParams('address=thor1exploreraddress');

    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      error: undefined,
    });
    mockUseNetworkConstants.mockReturnValue({
      constants: { MaxBondProviders: 100 },
      isLoading: false,
      error: undefined,
    });
    mockUseApiHealthContext.mockReturnValue({
      midgard: 'healthy',
      thornode: 'healthy',
      lastChecked: new Date('2026-06-12T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-12T00:00:00.000Z'),
        thornode: new Date('2026-06-12T00:00:00.000Z'),
      },
    });
  });

  it('labels the live-data loading state before ranking candidates', () => {
    mockUseAllNodes.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    render(<ExplorerPage />);

    expect(screen.getByRole('status', { name: 'Loading node discovery data' })).toBeInTheDocument();
    expect(screen.getByText(/Waiting for the active THORNode set before ranking candidates/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to Portfolio' })).toHaveAttribute(
      'href',
      '/dashboard/portfolio?address=thor1exploreraddress'
    );
  });

  it('renders loading back navigation without nested interactive controls', () => {
    mockUseAllNodes.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    render(<ExplorerPage />);

    const backLink = screen.getByRole('link', { name: 'Back to Portfolio' });
    expect(backLink).toHaveAttribute('href', '/dashboard/portfolio?address=thor1exploreraddress');
    expect(backLink.querySelector('button')).toBeNull();
  });

  it('uses the watched address provider whitelist to confirm direct-bond access', () => {
    mockUseAllNodes.mockReturnValue({
      data: [
        buildNode({
          bond_providers: {
            node_operator_fee: '0',
            providers: [{ bond_address: 'thor1exploreraddress', bond: '500000000000' }],
          },
        }),
        buildNode({
          node_address: 'thor1needsoperatorwhitelist000000000000000',
          bond_providers: {
            node_operator_fee: '0',
            providers: [],
          },
        }),
      ],
      isLoading: false,
      error: undefined,
    });

    render(<ExplorerPage />);

    expect(screen.getByText('Showing 2 candidates')).toBeVisible();
    const decision = screen.getByLabelText('Discovery decision diagnosis');
    expect(decision).toHaveTextContent('Strong candidate still needs wallet review');
    expect(decision).toHaveTextContent('Candidate Review');
    expect(decision).toHaveTextContent('not a safety guarantee');
    expect(decision).not.toHaveTextContent('Strong direct-bond candidate available');
    expect(decision).not.toHaveTextContent('Ready');
    expect(decision).toHaveTextContent('Direct bond');
    expect(decision).toHaveTextContent('1');
    const directBondEvidence = within(decision).getByText('Watched provider listed by THORNode');
    expect(directBondEvidence).not.toHaveClass('hidden');
    expect(directBondEvidence).not.toHaveClass('sm:block');
    expect(screen.getByRole('link', { name: 'Review BOND memo' })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1exploreraddress&action=bond&node=thor1candidatebelowoptimal0000000000000000000'
    );
    expect(screen.queryByRole('link', { name: 'Prepare BOND memo' })).not.toBeInTheDocument();
    expect(screen.getByText('1 direct-bond candidate with watched-provider evidence')).toBeVisible();
    const qualitySummary = screen.getByLabelText('Candidate quality summary');
    expect(qualitySummary).toHaveClass('border-sky-200');
    expect(qualitySummary).not.toHaveClass('border-emerald-200');
    expect(screen.queryByText('1 direct-bond candidate with confirmed capacity')).not.toBeInTheDocument();
    expect(screen.getByText('Only Strong candidates where THORNode lists the watched address as a bond provider can be reviewed in the transaction composer. Other nodes route through Risk review first.')).toBeVisible();
    expect(screen.queryByText('Only Strong candidates where the watched address is already a bond provider can be reviewed in the transaction composer. Other nodes route through Risk review first.')).not.toBeInTheDocument();
    expect(screen.queryByText('Only Strong candidates where the watched address is already a bond provider can be prepared directly. Other nodes route through Risk review first.')).not.toBeInTheDocument();
    expect(screen.getByText('Provider-slot evidence uses THORNode MaxBondProviders (100).')).toBeVisible();
    expect(screen.getByText('Provider listed by THORNode')).toBeVisible();
    expect(screen.getByText('Provider not listed by THORNode')).toBeVisible();
    expect(screen.queryByText('Needs operator whitelist')).not.toBeInTheDocument();
  });

  it('frames a focused strong direct-bond candidate as review evidence instead of safety approval', () => {
    mocks.searchParams.current = new URLSearchParams(
      'address=thor1exploreraddress&node=thor1candidatebelowoptimal0000000000000000000'
    );
    mockUseAllNodes.mockReturnValue({
      data: [
        buildNode({
          bond_providers: {
            node_operator_fee: '0',
            providers: [{ bond_address: 'thor1exploreraddress', bond: '500000000000' }],
          },
          current_award: '50000000000',
          slash_points: 0,
        }),
      ],
      isLoading: false,
      error: undefined,
    });

    render(<ExplorerPage />);

    const focusedContext = screen.getByLabelText('Focused candidate context');
    expect(focusedContext).toHaveTextContent('Strong candidate');
    expect(focusedContext).toHaveTextContent('Compare the evidence below before reviewing any BOND memo.');
    expect(focusedContext).toHaveClass('border-sky-200');
    expect(focusedContext).not.toHaveClass('border-emerald-200');
    expect(within(focusedContext).getByTestId('focused-candidate-primary-action')).toHaveTextContent('Review BOND memo');
    expect(within(focusedContext).getByTestId('focused-candidate-primary-action')).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1exploreraddress&action=bond&node=thor1candidatebelowoptimal0000000000000000000'
    );

    const recommendation = screen.getByTestId('candidate-recommendation');
    expect(recommendation).toHaveTextContent('Review before BOND memo');
    expect(recommendation).toHaveTextContent('not a safety guarantee');
    expect(recommendation).toHaveClass('border-sky-400');
    expect(recommendation).not.toHaveClass('border-emerald-400');
  });

  it('shows source checks before the decision action and blocks BOND prep when THORNode is degraded', () => {
    mockUseApiHealthContext.mockReturnValue({
      midgard: 'healthy',
      thornode: 'degraded',
      lastChecked: new Date('2026-06-12T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-12T00:00:00.000Z'),
        thornode: null,
      },
    });
    mockUseAllNodes.mockReturnValue({
      data: [
        buildNode({
          bond_providers: {
            node_operator_fee: '0',
            providers: [{ bond_address: 'thor1exploreraddress', bond: '500000000000' }],
          },
        }),
      ],
      isLoading: false,
      error: undefined,
    });

    const { container } = render(<ExplorerPage />);

    const sourceConfidence = screen.getByLabelText('Discovery source checks');
    const qualitySummary = screen.getByLabelText('Candidate quality summary');
    const decision = screen.getByLabelText('Discovery decision diagnosis');
    const candidateCard = screen.getByTestId('candidate-card');

    expect(sourceConfidence).toHaveTextContent('THORNode');
    expect(sourceConfidence).toHaveTextContent('Degraded');
    expect(qualitySummary).toHaveTextContent('1 direct-bond candidate waiting on THORNode source check');
    expect(decision).toHaveTextContent('Wait for THORNode source check before BOND review');
    expect(decision).toHaveTextContent('Source degraded');
    expect(within(decision).getByRole('link', { name: 'Review source checks' })).toHaveAttribute(
      'href',
      '#explorer-source-confidence'
    );
    expect(candidateCard).toHaveTextContent('Wait for source check');
    expect(candidateCard).toHaveTextContent('THORNode candidate source check is degraded');
    expect(candidateCard).not.toHaveTextContent('fresh enough');
    expect(within(candidateCard).getByRole('link', { name: 'Review source checks' })).toHaveAttribute(
      'href',
      '#explorer-source-confidence'
    );
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prepare BOND memo' })).not.toBeInTheDocument();

    const orderedSections = Array.from(container.querySelectorAll('section[aria-label]'))
      .map((section) => section.getAttribute('aria-label'))
      .filter((label) => label === 'Discovery source checks' || label === 'Candidate quality summary' || label === 'Discovery decision diagnosis');

    expect(orderedSections).toEqual([
      'Discovery source checks',
      'Discovery decision diagnosis',
      'Candidate quality summary',
    ]);
  });

  it('uses singular candidate count copy for one visible candidate', () => {
    mockUseAllNodes.mockReturnValue({
      data: [buildNode()],
      isLoading: false,
      error: undefined,
    });

    render(<ExplorerPage />);

    expect(screen.getByText('Showing 1 candidate')).toBeVisible();
    expect(screen.queryByText('Showing 1 nodes')).not.toBeInTheDocument();
  });

  it('blocks direct bonding when provider slots are full', () => {
    mockUseNetworkConstants.mockReturnValue({
      constants: { MaxBondProviders: 1 },
      isLoading: false,
      error: undefined,
    });
    mockUseAllNodes.mockReturnValue({
      data: [buildNode({
        bond_providers: {
          node_operator_fee: '0',
          providers: [{ bond_address: 'thor1otherprovider', bond: '100000000' }],
        },
      })],
      isLoading: false,
      error: undefined,
    });

    render(<ExplorerPage />);

    const decision = screen.getByLabelText('Discovery decision diagnosis');
    expect(decision).toHaveTextContent('Provider access needs confirmation');
    expect(decision).toHaveTextContent('Review Access');
    expect(screen.getByRole('link', { name: 'Review provider access' })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1exploreraddress&node=thor1candidatebelowoptimal0000000000000000000'
    );
    expect(screen.getByText('No direct-bond candidates with watched-provider evidence')).toBeVisible();
    expect(screen.queryByText('No direct-bond candidates with confirmed capacity')).not.toBeInTheDocument();
    expect(screen.getByText('Provider slots full')).toBeVisible();
  });

  it('offers to show all fees when filters hide every active candidate', () => {
    mockUseAllNodes.mockReturnValue({
      data: [buildNode({
        bond_providers: {
          node_operator_fee: '2500',
          providers: [{ bond_address: 'thor1exploreraddress', bond: '100000000' }],
        },
      })],
      isLoading: false,
      error: undefined,
    });

    render(<ExplorerPage />);

    fireEvent.click(screen.getByRole('button', { name: '<10%' }));

    const decision = screen.getByLabelText('Discovery decision diagnosis');
    expect(decision).toHaveTextContent('Filters hide every candidate');
    expect(decision).toHaveTextContent('1 active candidate exists, but the current filters hide it');
    expect(screen.getByText('No nodes match your filters. Try adjusting the fee filter.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Show all fees' }));

    expect(screen.getByText('Showing 1 candidate')).toBeVisible();
    expect(screen.getByLabelText('Discovery decision diagnosis')).toHaveTextContent('Review candidate trade-offs first');
    expect(screen.getByRole('link', { name: 'Review risk evidence' })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1exploreraddress&node=thor1candidatebelowoptimal0000000000000000000'
    );
  });

  it('renders malformed focused candidate metrics as unavailable instead of NaN', () => {
    mocks.searchParams.current = new URLSearchParams('address=thor1exploreraddress&node=thor1malformedcandidate000000000000000');
    mockUseAllNodes.mockReturnValue({
      data: [
        buildNode({
          node_address: 'thor1malformedcandidate000000000000000',
          bond_providers: {
            node_operator_fee: 'not-a-fee',
            providers: [{ bond_address: 'thor1exploreraddress', bond: '100000000' }],
          },
          current_award: 'not-an-award',
          slash_points: Number.NaN,
          total_bond: 'not-a-bond',
        }),
      ],
      isLoading: false,
      error: undefined,
    });

    const { container } = render(<ExplorerPage />);

    const decision = screen.getByLabelText('Discovery decision diagnosis');
    expect(decision).toHaveTextContent('No BOND candidate is review-ready');
    expect(decision).toHaveTextContent('Avoid');
    expect(within(decision).getByRole('link', { name: 'Review risk evidence' })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1exploreraddress&node=thor1malformedcandidate000000000000000'
    );
    const focusedContext = screen.getByLabelText('Focused candidate context');
    const qualitySummary = screen.getByLabelText('Candidate quality summary');
    expect(focusedContext).toBeInTheDocument();
    expect(focusedContext.compareDocumentPosition(qualitySummary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(focusedContext.compareDocumentPosition(decision) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(focusedContext).getByRole('link', { name: 'Review risk evidence' })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1exploreraddress&node=thor1malformedcandidate000000000000000'
    );
    expect(within(focusedContext).getByRole('link', { name: 'Jump to card' })).toHaveAttribute(
      'href',
      '#explorer-node-thor1malformedcandidate000000000000000'
    );
    const focusedEvidence = screen.getByTestId('focused-candidate-score-evidence');
    const metricDetails = screen.getByTestId('focused-candidate-metric-details');
    const focusedMetrics = screen.getByTestId('focused-candidate-metrics');

    expect(focusedEvidence).toHaveAccessibleName(
      'Candidate evidence from THORNode: 1 of 5 candidate inputs usable. Missing APY, bond, fee, slash. Watched address is listed as a bond provider.'
    );
    expect(focusedEvidence).toHaveTextContent('Candidate evidence · THORNode');
    expect(focusedEvidence).toHaveTextContent('Missing APY, bond, fee, slash');
    expect(metricDetails).toHaveTextContent('Operational details');
    expect(metricDetails).toHaveTextContent('Provider listed by THORNode · Slash -- · Fee --');
    expect(metricDetails).not.toHaveAttribute('open');
    expect(focusedMetrics.closest('[data-testid="focused-candidate-metric-details"]')).toBe(metricDetails);
    expect(focusedEvidence.compareDocumentPosition(metricDetails) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const detailsSummary = metricDetails.querySelector('summary');
    expect(detailsSummary).not.toBeNull();
    fireEvent.click(detailsSummary!);
    expect(metricDetails).toHaveAttribute('open');
    expect(screen.getAllByText('Avoid candidate').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/average APY unavailable/i)).toBeVisible();
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(6);
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
    expect(container).not.toHaveTextContent(/\d+\/100/);
  });
});
