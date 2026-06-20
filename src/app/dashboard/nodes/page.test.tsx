import { render, screen, within } from '@/test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NodesPage from './page';
import type { BondPosition } from '@/lib/types/node';

const mockUseBondPositions = vi.fn();

const mocks = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams('address=thor1nodeprovider') },
  apiHealth: {
    current: {
      midgard: 'healthy' as 'unknown' | 'healthy' | 'degraded' | 'down',
      thornode: 'healthy' as 'unknown' | 'healthy' | 'degraded' | 'down',
      lastChecked: new Date('2026-06-13T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-13T00:00:00.000Z') as Date | null,
        thornode: new Date('2026-06-13T00:00:00.000Z') as Date | null,
      },
    },
  },
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

vi.mock('@/lib/hooks/use-api-health', () => ({
  useApiHealthContext: () => mocks.apiHealth.current,
}));

vi.mock('@/components/dashboard/network-comparison-table', () => ({
  NetworkComparisonTable: () => <section aria-label="Network Comparison">Network Comparison</section>,
}));

const malformedPosition: BondPosition = {
  nodeAddress: 'thor1malformed0000000000000000000000000000',
  nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
  bondAmount: Number.NaN,
  bondSharePercent: Number.NaN,
  status: 'Standby',
  operatorFee: Number.POSITIVE_INFINITY,
  operatorFeeFormatted: 'Infinity%',
  netAPY: Number.NEGATIVE_INFINITY,
  totalBond: Number.NaN,
  slashPoints: Number.NaN,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '3.19.0',
  requestedToLeave: false,
  yieldGuardFlags: [],
};

const minorSlashPosition: BondPosition = {
  nodeAddress: 'thor1minor000000000000000000000000000000000',
  nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
  bondAmount: 12_500,
  bondSharePercent: 100,
  status: 'Active',
  operatorFee: 500,
  operatorFeeFormatted: '5.0%',
  netAPY: 12.5,
  totalBond: 12_500,
  slashPoints: 49,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '3.19.0',
  requestedToLeave: false,
  yieldGuardFlags: [],
};

const routinePosition: BondPosition = {
  ...minorSlashPosition,
  nodeAddress: 'thor1routine0000000000000000000000000000000',
  slashPoints: 0,
};

describe('NodesPage', () => {
  beforeEach(() => {
    mockUseBondPositions.mockReset();
    mocks.searchParams.current = new URLSearchParams('address=thor1nodeprovider');
    mocks.apiHealth.current = {
      midgard: 'healthy',
      thornode: 'healthy',
      lastChecked: new Date('2026-06-13T00:00:00.000Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-13T00:00:00.000Z'),
        thornode: new Date('2026-06-13T00:00:00.000Z'),
      },
    };
  });

  it('uses source-scoped language while node positions are loading', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: true,
    });

    render(<NodesPage />);

    expect(screen.getByRole('status', { name: 'Loading node positions' })).toBeInTheDocument();
    expect(screen.getByText('Waiting for THORNode source responses before ranking node exceptions, slash points, and validator status.')).toBeInTheDocument();
    expect(screen.queryByText('Waiting for live THORNode data before ranking node exceptions, slash points, and validator status.')).not.toBeInTheDocument();
  });

  it('scopes the empty node result to current source data instead of address validity', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [],
      isLoading: false,
    });

    render(<NodesPage />);

    expect(screen.getByLabelText('Node diagnosis')).toHaveTextContent('No Bond');
    expect(screen.getByText('No tracked node exceptions')).toBeInTheDocument();
    expect(screen.getByText(/current THORNode node data does not show bonded nodes for this address/i)).toBeInTheDocument();
    expect(screen.getByText(/current source result, not proof of address validity or past\/pending bond activity/i)).toBeInTheDocument();
    expect(screen.queryByText(/this address is valid/i)).not.toBeInTheDocument();
  });

  it('renders malformed node metrics as unavailable in cards and comparison rows', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [malformedPosition],
      isLoading: false,
    });

    const { container } = render(<NodesPage />);

    expect(screen.getByRole('heading', { name: 'Node Comparison' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort by Review State ascending' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Review Score/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Review exposure first/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Non-active')).toBeInTheDocument();
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(7);
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });

  it('routes node card BOND prep through source review when THORNode confidence is degraded', () => {
    mocks.apiHealth.current = {
      ...mocks.apiHealth.current,
      thornode: 'degraded',
      lastSuccessful: {
        ...mocks.apiHealth.current.lastSuccessful,
        thornode: null,
      },
    };
    mockUseBondPositions.mockReturnValue({
      positions: [minorSlashPosition],
      isLoading: false,
    });

    render(<NodesPage />);

    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    const sourceReviewHrefs = screen
      .getAllByRole('link', { name: /Review source checks/i })
      .map((link) => link.getAttribute('href'));
    expect(sourceReviewHrefs).toEqual(
      expect.arrayContaining([
        '/dashboard/risk?address=thor1nodeprovider&node=thor1minor000000000000000000000000000000000#risk-source-confidence',
      ])
    );
    expect(screen.getAllByText(/THORNode candidate source check is degraded/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('link', { name: /Prepare UNBOND Memo/i })).not.toBeInTheDocument();
  });

  it('keeps minor slash history in the comparison table instead of provider review cards', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [minorSlashPosition],
      isLoading: false,
    });

    const { container } = render(<NodesPage />);

    const diagnosis = screen.getByLabelText('Node diagnosis');
    expect(within(diagnosis).getByText('No urgent review', { exact: true })).toBeVisible();
    expect(diagnosis).toHaveClass('border-sky-200/70');
    expect(diagnosis).not.toHaveClass('border-emerald-200/70');
    expect(within(diagnosis).getByRole('link', { name: 'Inspect details' })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1nodeprovider'
    );
    expect(within(diagnosis).queryByRole('link', { name: 'Review exposure' })).not.toBeInTheDocument();
    expect(diagnosis).not.toHaveTextContent('Healthy');
    expect(screen.getByRole('heading', { name: 'Provider review cards' })).toBeInTheDocument();
    expect(screen.getByText('No urgent node exception visible')).toBeInTheDocument();
    expect(screen.getByText(/current THORNode node data does not show jail, elevated slash, churn-risk, or status exceptions/i)).toBeInTheDocument();
    expect(screen.getByText(/routine metrics remain visible below/i)).toBeInTheDocument();
    expect(screen.queryByText(/all tracked nodes are active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/clear of churn-risk flags/i)).not.toBeInTheDocument();
    expect(screen.getByText('No provider review cards to show. Minor slash history and routine node metrics remain visible in the comparison table below.')).toBeInTheDocument();
    expect(container.querySelector('[data-urgent-exception="true"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-urgent-exception="false"]')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '49' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /Minor slash Below provider-review threshold/i })).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/Review Score/);
  });

  it('renders routine review state as informational instead of green approval', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [routinePosition],
      isLoading: false,
    });

    render(<NodesPage />);

    const routineCell = screen.getByRole('cell', {
      name: /Routine No review flag from current node status or slash data/i,
    });
    const routineBadge = within(routineCell).getByText('Routine');

    expect(routineBadge).toHaveClass('border-sky-200');
    expect(routineBadge).toHaveClass('bg-sky-50');
    expect(routineBadge).not.toHaveClass('border-emerald-200');
    expect(routineBadge).not.toHaveClass('bg-emerald-50');
  });
});
