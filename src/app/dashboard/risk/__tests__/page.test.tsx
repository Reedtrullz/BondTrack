import { render, screen } from '@/test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RiskPage from '../page';

const mocks = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams('address=thor1mocknode000000000000000000000000000000') },
}));

const mockUseBondPositions = vi.fn();
const mockUseNetworkMetrics = vi.fn();
const mockUseCurrentBlockHeight = vi.fn();

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

vi.mock('@/lib/hooks/use-network-metrics', () => ({
  useNetworkMetrics: () => mockUseNetworkMetrics(),
}));

vi.mock('@/lib/hooks/use-current-block-height', () => ({
  useCurrentBlockHeight: () => mockUseCurrentBlockHeight(),
}));

describe('RiskPage', () => {
  beforeEach(() => {
    mockUseBondPositions.mockReset();
    mockUseNetworkMetrics.mockReset();
    mockUseCurrentBlockHeight.mockReset();
    mocks.searchParams.current = new URLSearchParams('address=thor1mocknode000000000000000000000000000000');

    mockUseBondPositions.mockReturnValue({
      positions: [mockPosition],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    mockUseNetworkMetrics.mockReturnValue({
      data: mockNetworkData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
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
});
