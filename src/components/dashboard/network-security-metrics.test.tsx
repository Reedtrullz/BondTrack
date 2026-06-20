import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkSecurityMetrics } from './network-security-metrics';

const mockUseNetworkMetrics = vi.fn();
const mockUseNetworkConstants = vi.fn();
const mockUseAllNodes = vi.fn();

vi.mock('@/lib/hooks/use-network-metrics', () => ({
  useNetworkMetrics: () => mockUseNetworkMetrics(),
}));

vi.mock('@/lib/hooks/use-network-constants', () => ({
  useNetworkConstants: () => mockUseNetworkConstants(),
}));

vi.mock('@/lib/hooks/use-all-nodes', () => ({
  useAllNodes: () => mockUseAllNodes(),
}));

describe('NetworkSecurityMetrics', () => {
  beforeEach(() => {
    mockUseNetworkMetrics.mockReturnValue({
      data: {
        bondMetrics: {
          totalActiveBond: '200000000000',
          totalStandbyBond: '50000000000',
        },
        blockRewards: {
          bondReward: '100000000',
          poolReward: '50000000',
        },
        poolActivationCountdown: '0',
        totalPooledRune: '100000000000',
        totalReserve: '1000000000000',
      },
      error: undefined,
      isLoading: false,
    });
    mockUseNetworkConstants.mockReturnValue({
      constants: {},
      error: undefined,
      isLoading: false,
    });
    mockUseAllNodes.mockReturnValue({
      data: [
        {
          node_address: 'thor1valid',
          status: 'Active',
          total_bond: '100000000000',
        },
        {
          node_address: 'thor1malformed',
          status: 'Active',
          total_bond: 'not-a-number',
        },
      ],
    });
  });

  it('keeps rendering when an active node has malformed bond data', () => {
    render(<NetworkSecurityMetrics />);

    expect(screen.getByText('Incentive Pendulum')).toBeInTheDocument();
    expect(screen.getByText('Effective Security')).toBeInTheDocument();
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });

  it('frames bond-to-pool status as incentive context instead of a safety verdict', () => {
    render(<NetworkSecurityMetrics />);

    expect(screen.getByText('Bond buffer in range')).toBeInTheDocument();
    expect(screen.getByText(/Network-level incentive context/)).toBeInTheDocument();
    expect(screen.getAllByText(/not a provider safety verdict/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\bhealthy\b|well secured|\bsafe\b/i)).not.toBeInTheDocument();

    const status = screen.getByText('Bond buffer in range');
    expect(status).toHaveClass('text-sky-600');
    expect(status).not.toHaveClass('text-emerald-600');
    expect(status.closest('div[class*="rounded"]')).toHaveClass('bg-sky-50');
    expect(status.closest('div[class*="rounded"]')).not.toHaveClass('bg-emerald-50');
  });
});
