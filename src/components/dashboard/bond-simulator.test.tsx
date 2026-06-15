import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { BondSimulator } from './bond-simulator';

describe('BondSimulator trust copy', () => {
  it('leads with a scenario diagnosis and assumption confidence before raw inputs', () => {
    render(<BondSimulator currentPositions={[]} />);

    const diagnosis = screen.getByLabelText('Simulator scenario diagnosis');
    const assumptions = screen.getByLabelText('Simulation assumptions');
    const firstInput = screen.getByLabelText('Bond Amount (RUNE)');

    expect(diagnosis).toHaveTextContent('Rewards-only projection');
    expect(diagnosis).toHaveTextContent('Verify node risk before bonding');
    expect(assumptions).toHaveTextContent('Risk coverage');
    expect(assumptions).toHaveTextContent('Excludes slash and jail');
    expect(
      diagnosis.compareDocumentPosition(firstInput) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('labels projections as estimates and exposes accessible simulator inputs', () => {
    render(<BondSimulator currentPositions={[]} />);

    expect(screen.getByText('Scenario estimates, not guarantees')).toBeInTheDocument();
    expect(screen.getByText(/does not model slashing, jail, churn-out/)).toBeInTheDocument();

    expect(screen.getByLabelText('Bond Amount (RUNE)')).toHaveValue(100000);
    expect(screen.getByLabelText('Lock Period (days)')).toHaveValue(180);
    expect(screen.getByLabelText('Est. Network APY (%)')).toHaveValue(65);
    expect(screen.getByLabelText('Operator Fee (bps)')).toHaveValue(1500);

    expect(screen.getByText('Est. Daily Reward')).toBeInTheDocument();
    expect(screen.getByText('Est. Per Churn')).toBeInTheDocument();
    expect(screen.getByText('Est. Total Reward')).toBeInTheDocument();
    expect(screen.getByText('Projected Total')).toBeInTheDocument();
  });

  it('keeps preset changes inside the explicit estimate model', async () => {
    const user = userEvent.setup();

    render(<BondSimulator currentPositions={[]} />);

    await user.click(screen.getByRole('button', {
      name: 'Conservative Low risk, established nodes, 10% fee',
    }));

    expect(screen.getByText('Scenario estimates, not guarantees')).toBeInTheDocument();
    expect(screen.getByLabelText('Bond Amount (RUNE)')).toHaveValue(50000);
    expect(screen.getByLabelText('Lock Period (days)')).toHaveValue(90);
    expect(screen.getByLabelText('Est. Network APY (%)')).toHaveValue(50);
    expect(screen.getByLabelText('Operator Fee (bps)')).toHaveValue(1000);
  });

  it('does not render a NaN APY delta when current positions have zero bonded RUNE', () => {
    render(
      <BondSimulator
        currentPositions={[
          {
            nodeAddress: 'thor1zerobond',
            nodeOperatorAddress: 'thor1operator',
            bondAmount: 0,
            bondSharePercent: 0,
            status: 'Active',
            operatorFee: 0,
            operatorFeeFormatted: '0.0%',
            netAPY: 12,
            totalBond: 0,
            slashPoints: 0,
            isJailed: false,
            jailReleaseHeight: 0,
            version: '3.19.0',
            requestedToLeave: false,
          },
        ]}
      />
    );

    expect(screen.getByText('Impact Preview')).toBeInTheDocument();
    expect(screen.getByText('First bonded baseline')).toBeInTheDocument();
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });
});
