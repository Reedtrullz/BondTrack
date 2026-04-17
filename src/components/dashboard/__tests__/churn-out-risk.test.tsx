import { render, screen, act, within, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ChurnOutRisk } from '../churn-out-risk';
import { useNodeRankings } from '../../../lib/hooks/use-node-rankings';
import { type BondPosition } from '../../../lib/types/node';

vi.mock('../../../lib/hooks/use-node-rankings', () => ({
  __esModule: true,
  default: vi.fn(),
  useNodeRankings: vi.fn(),
}));

const mockUseNodeRankings = vi.mocked(useNodeRankings);

interface NodeRanking {
  nodeAddress: string;
  rank: number;
  percentile: number;
  isAtRisk: boolean;
  totalNodes: number;
  bondRank: number;
}

const mockRankings: NodeRanking[] = [
  {
    nodeAddress: 'thor1abc123',
    rank: 10,
    percentile: 15,
    isAtRisk: false,
    totalNodes: 100,
    bondRank: 10,
  },
  {
    nodeAddress: 'thor1def456',
    rank: 50,
    percentile: 50,
    isAtRisk: true,
    totalNodes: 100,
    bondRank: 50,
  },
];

const mockPositions: BondPosition[] = [
  {
    nodeAddress: 'thor1abc123',
    nodeOperatorAddress: 'thor1abc123',
    bondAmount: 1_000_000_000_000,
    bondSharePercent: 0.1,
    status: 'Active',
    operatorFee: 0.1,
    operatorFeeFormatted: '0.1%',
    netAPY: 5.0,
    totalBond: 2_000_000_000_000,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '1.0.0',
    requestedToLeave: false,
    yieldGuardFlags: [],
  },
  {
    nodeAddress: 'thor1def456',
    nodeOperatorAddress: 'thor1def456',
    bondAmount: 2_000_000_000_000,
    bondSharePercent: 0.2,
    status: 'Active',
    operatorFee: 0.2,
    operatorFeeFormatted: '0.2%',
    netAPY: 4.5,
    totalBond: 3_000_000_000_000,
    slashPoints: 5,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '1.0.0',
    requestedToLeave: false,
    yieldGuardFlags: [],
  },
];

describe('ChurnOutRisk', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    vi.clearAllMocks();
    mockUseNodeRankings.mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('shows loading state when hook returns empty array and positions exist', () => {
      render(<ChurnOutRisk positions={mockPositions} />);

      expect(screen.getByText('Loading node rankings...')).toBeInTheDocument();
      expect(screen.getByText('This may take a few seconds depending on network conditions.')).toBeInTheDocument();
    });

    it('continues showing loading state while data is being fetched', () => {
      render(<ChurnOutRisk positions={mockPositions} />);

      expect(screen.getByText('Loading node rankings...')).toBeInTheDocument();
      expect(screen.queryByText('Unable to load churn risk data')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error state after 10-second timeout when data fails to load', async () => {
      render(<ChurnOutRisk positions={mockPositions} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(screen.getByText('Unable to load churn risk data')).toBeInTheDocument();
      expect(screen.getByText('There was an error loading node rankings. Please check your connection or try again later.')).toBeInTheDocument();
    });

    it('shows retry button when error state is displayed', async () => {
      render(<ChurnOutRisk positions={mockPositions} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('retry button click resets error state', async () => {
      render(<ChurnOutRisk positions={mockPositions} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      });

      expect(screen.getByText('Loading node rankings...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no active nodes are found', () => {
      const emptyPositions: BondPosition[] = [{ ...mockPositions[0], status: 'Standby' }];

      mockUseNodeRankings.mockReturnValue([
        {
          nodeAddress: 'thor1abc123',
          rank: 10,
          percentile: 15,
          isAtRisk: false,
          totalNodes: 100,
          bondRank: 10,
        },
      ]);

      render(<ChurnOutRisk positions={emptyPositions} />);

      expect(screen.getByText('No active nodes found')).toBeInTheDocument();
      expect(screen.getByText('You have no active nodes currently bonded. Only active nodes are monitored for churn risk.')).toBeInTheDocument();
      expect(screen.getByText('Check your bond positions or wait for nodes to become active.')).toBeInTheDocument();
    });

    it('shows empty state when positions array is empty', () => {
      mockUseNodeRankings.mockReturnValue(mockRankings);

      render(<ChurnOutRisk positions={[]} />);

      expect(screen.getByText('No active nodes found')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('displays node rankings data correctly when loaded', () => {
      mockUseNodeRankings.mockReturnValue(mockRankings);

      render(<ChurnOutRisk positions={mockPositions} />);

      expect(screen.getByText('Churn-Out Risk')).toBeInTheDocument();
      expect(screen.getByText('thor1abc123...abc123')).toBeInTheDocument();
      expect(screen.getByText('thor1def456...def456')).toBeInTheDocument();
      expect(screen.getByText('#10/100')).toBeInTheDocument();
      expect(screen.getByText('#50/100')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();

      expect(within(screen.getByText('At Risk').parentElement as HTMLElement).getByText('1')).toBeInTheDocument();
      expect(within(screen.getByText('Safe').parentElement as HTMLElement).getByText('1')).toBeInTheDocument();
      expect(within(screen.getByText('Total').parentElement as HTMLElement).getByText('2')).toBeInTheDocument();
    });

    it('truncates node addresses using the last 6 characters', () => {
      mockUseNodeRankings.mockReturnValue(mockRankings);

      render(<ChurnOutRisk positions={mockPositions} />);

      expect(screen.getByText('thor1abc123...abc123')).toBeInTheDocument();
      expect(screen.getByText('thor1def456...def456')).toBeInTheDocument();
    });

    it('shows severity badges with correct colors', () => {
      mockUseNodeRankings.mockReturnValue(mockRankings);

      render(<ChurnOutRisk positions={mockPositions} />);

      expect(screen.getByText('#50/100')).toHaveClass('text-red-600');
      expect(screen.getByText('#10/100')).toHaveClass('text-emerald-600');
    });

    it('shows at-risk indicators correctly', () => {
      mockUseNodeRankings.mockReturnValue(mockRankings);

      const { container } = render(<ChurnOutRisk positions={mockPositions} />);

      const warningIcons = container.querySelectorAll('svg.text-red-500');

      expect(warningIcons).toHaveLength(1);
      expect(screen.getByText('1 of your nodes at risk of churn-out')).toBeInTheDocument();
    });

    it('shows correct summary when no nodes are at risk', () => {
      mockUseNodeRankings.mockReturnValue([
        {
          nodeAddress: 'thor1abc123',
          rank: 10,
          percentile: 15,
          isAtRisk: false,
          totalNodes: 100,
          bondRank: 10,
        },
      ]);

      render(<ChurnOutRisk positions={[mockPositions[0]]} />);

      expect(screen.getByText('All your active nodes are safe')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single node correctly', () => {
      const singlePosition: BondPosition[] = [mockPositions[0]];
      const singleRanking: NodeRanking[] = [mockRankings[0]];

      mockUseNodeRankings.mockReturnValue(singleRanking);

      render(<ChurnOutRisk positions={singlePosition} />);

      expect(screen.getByText('thor1abc123...abc123')).toBeInTheDocument();
      expect(screen.getByText('#10/100')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
      expect(within(screen.getByText('Safe').parentElement as HTMLElement).getByText('1')).toBeInTheDocument();
      expect(within(screen.getByText('Total').parentElement as HTMLElement).getByText('1')).toBeInTheDocument();
    });

    it('handles all nodes at risk correctly', () => {
      const allAtRiskRankings: NodeRanking[] = [
        {
          nodeAddress: 'thor1abc123',
          rank: 80,
          percentile: 90,
          isAtRisk: true,
          totalNodes: 100,
          bondRank: 80,
        },
        {
          nodeAddress: 'thor1def456',
          rank: 90,
          percentile: 95,
          isAtRisk: true,
          totalNodes: 100,
          bondRank: 90,
        },
      ];

      mockUseNodeRankings.mockReturnValue(allAtRiskRankings);

      const { container } = render(<ChurnOutRisk positions={mockPositions} />);

      expect(within(screen.getByText('At Risk').parentElement as HTMLElement).getByText('2')).toBeInTheDocument();
      expect(within(screen.getByText('Safe').parentElement as HTMLElement).getByText('0')).toBeInTheDocument();
      expect(within(screen.getByText('Total').parentElement as HTMLElement).getByText('2')).toBeInTheDocument();
      expect(screen.getByText('2 of your nodes at risk of churn-out')).toBeInTheDocument();

      const warningIcons = container.querySelectorAll('svg.text-red-500');

      expect(warningIcons).toHaveLength(2);
    });

    it('handles nodes with different statuses correctly', () => {
      const mixedPositions: BondPosition[] = [
        { ...mockPositions[0], status: 'Active' },
        { ...mockPositions[1], status: 'Standby' },
      ];

      mockUseNodeRankings.mockReturnValue([mockRankings[0]]);

      render(<ChurnOutRisk positions={mixedPositions} />);

      expect(screen.getByText('thor1abc123...abc123')).toBeInTheDocument();
      expect(screen.queryByText('thor1def456...def456')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not hang indefinitely when data takes time to load', async () => {
      render(<ChurnOutRisk positions={mockPositions} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(screen.getByText('Unable to load churn risk data')).toBeInTheDocument();
    });

    it('handles rapid data loading changes gracefully', () => {
      mockUseNodeRankings.mockReturnValue([]);

      const { rerender } = render(<ChurnOutRisk positions={mockPositions} />);

      expect(screen.getByText('Loading node rankings...')).toBeInTheDocument();

      mockUseNodeRankings.mockReturnValue(mockRankings);
      rerender(<ChurnOutRisk positions={mockPositions} />);

      expect(screen.getByText('Churn-Out Risk')).toBeInTheDocument();
      expect(screen.queryByText('Loading node rankings...')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure and retry button label', async () => {
      render(<ChurnOutRisk positions={mockPositions} />);

      expect(screen.getByRole('heading', { name: 'Churn-Out Risk' })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });
});
