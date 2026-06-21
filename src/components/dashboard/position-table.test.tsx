import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PositionTable } from './position-table';
import { METRIC_EXPLANATIONS } from '@/components/shared/metric-tooltip';
import type { BondPosition } from '@/lib/types/node';

const position: BondPosition = {
  nodeAddress: 'thor1node00000000000000000000000000000000001',
  nodeOperatorAddress: 'thor1operator000000000000000000000000000001',
  bondAmount: 125000,
  bondSharePercent: 42.5,
  status: 'Active',
  operatorFee: 2000,
  operatorFeeFormatted: '20.0%',
  netAPY: 14.21,
  totalBond: 250000,
  slashPoints: 0,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '3.19.0',
  requestedToLeave: false,
  yieldGuardFlags: [],
};

describe('PositionTable', () => {
  it('keeps the bond positions heading readable while preserving the explanation control', async () => {
    const user = userEvent.setup();

    render(<PositionTable positions={[position]} />);

    const heading = screen.getByRole('heading', { level: 2, name: 'Bonded Positions' });
    expect(heading).toHaveTextContent(/^Bonded Positions$/);
    expect(heading).not.toHaveTextContent('Bonded PositionsBonded Positions');

    const explanationButton = screen.getByRole('button', { name: 'Explain Bonded Positions' });
    await user.click(explanationButton);

    expect(screen.getByText(METRIC_EXPLANATIONS.totalBonded)).toBeInTheDocument();
  });

  it('marks malformed position metrics unavailable instead of rendering NaN or Infinity', () => {
    const { container } = render(
      <PositionTable
        positions={[{
          ...position,
          bondAmount: Number.NaN,
          bondSharePercent: Number.NEGATIVE_INFINITY,
          operatorFee: Number.POSITIVE_INFINITY,
          operatorFeeFormatted: 'Infinity%',
          netAPY: Number.POSITIVE_INFINITY,
        }]}
      />
    );

    expect(screen.getByText(/total unavailable/i)).toBeInTheDocument();
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(4);
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });
});
