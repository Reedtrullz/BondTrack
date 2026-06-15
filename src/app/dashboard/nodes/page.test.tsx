import { render, screen } from '@/test/utils';
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

  it('renders malformed node metrics as unavailable in cards and comparison rows', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [malformedPosition],
      isLoading: false,
    });

    const { container } = render(<NodesPage />);

    expect(screen.getByRole('heading', { name: 'Node Comparison' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Review risk first/i }).length).toBeGreaterThanOrEqual(1);
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
      .getAllByRole('link', { name: /Review source confidence/i })
      .map((link) => link.getAttribute('href'));
    expect(sourceReviewHrefs).toEqual(
      expect.arrayContaining([
        '/dashboard/risk?address=thor1nodeprovider&node=thor1minor000000000000000000000000000000000#risk-source-confidence',
      ])
    );
    expect(screen.getAllByText(/THORNode source confidence is degraded/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('link', { name: /Prepare UNBOND Memo/i })).not.toBeInTheDocument();
  });

  it('keeps minor slash history in the comparison table instead of urgent exception cards', () => {
    mockUseBondPositions.mockReturnValue({
      positions: [minorSlashPosition],
      isLoading: false,
    });

    const { container } = render(<NodesPage />);

    expect(screen.getByRole('heading', { name: 'Urgent exception cards' })).toBeInTheDocument();
    expect(screen.getByText('No urgent exception cards to show. Minor slash history and routine node metrics remain visible in the comparison table below.')).toBeInTheDocument();
    expect(container.querySelector('[data-urgent-exception="true"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-urgent-exception="false"]')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '49' })).toBeInTheDocument();
  });
});
