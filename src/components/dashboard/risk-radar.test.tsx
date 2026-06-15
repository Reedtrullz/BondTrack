import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RiskRadar } from './risk-radar';
import type { BondPosition } from '@/lib/types/node';

vi.mock('recharts', () => ({
  PolarAngleAxis: () => null,
  PolarGrid: () => null,
  Radar: () => null,
  RadarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
}));

const position: BondPosition = {
  nodeAddress: 'thor1riskradar0000000000000000000000000000',
  nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
  bondAmount: 100,
  bondSharePercent: 1,
  status: 'Active',
  operatorFee: 500,
  operatorFeeFormatted: '5.0%',
  netAPY: 12,
  totalBond: 1000,
  slashPoints: 0,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '3.19.0',
  requestedToLeave: false,
};

describe('RiskRadar', () => {
  it('marks malformed radar inputs unavailable instead of rendering NaN', () => {
    const { container } = render(
      <RiskRadar
        positions={[{
          ...position,
          bondAmount: Number.NaN,
          bondSharePercent: Number.NaN,
          netAPY: Number.POSITIVE_INFINITY,
          slashPoints: Number.NEGATIVE_INFINITY,
        }]}
      />
    );

    expect(screen.getAllByText('-- / 100')).toHaveLength(3);
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });
});
