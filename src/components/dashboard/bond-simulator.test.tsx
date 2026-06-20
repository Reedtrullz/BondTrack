import { render, screen, within } from '@testing-library/react';
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
    expect(diagnosis).toHaveTextContent('Manual Estimate');
    expect(diagnosis).not.toHaveTextContent('Estimate Ready');
    expect(diagnosis).toHaveTextContent('Verify node risk before bonding');
    expect(assumptions).toHaveTextContent('Risk coverage');
    expect(assumptions).toHaveTextContent('Excludes slash and jail');
    expect(assumptions).toHaveTextContent('Manual APY');
    expect(assumptions).toHaveTextContent('No live source or compounding');
    expect(assumptions).toHaveTextContent('Minimum bond');
    expect(assumptions).toHaveTextContent('Meets active minimum');
    expect(assumptions).toHaveTextContent('threshold only');

    const minimumBondValue = screen.getByText('Meets active minimum');
    expect(minimumBondValue).toHaveClass('text-sky-600');
    expect(minimumBondValue).not.toHaveClass('text-emerald-600');

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
    expect(
      screen.getByText('Estimated rewards by period using manual APY math from the current simulator inputs')
    ).toBeInTheDocument();
    expect(screen.queryByText(/using simple APY math/i)).not.toBeInTheDocument();
  });

  it('keeps preset changes inside the explicit estimate model', async () => {
    const user = userEvent.setup();

    render(<BondSimulator currentPositions={[]} />);

    await user.click(screen.getByRole('button', {
      name: 'Baseline inputs 50% manual APY, 10% operator fee, 90-day window',
    }));

    expect(screen.getByText('Scenario estimates, not guarantees')).toBeInTheDocument();
    expect(screen.getByText('Baseline inputs')).toBeInTheDocument();
    expect(screen.getByText('Reference inputs')).toBeInTheDocument();
    expect(screen.queryByText('Conservative inputs')).not.toBeInTheDocument();
    expect(screen.queryByText('Balanced inputs')).not.toBeInTheDocument();
    expect(screen.queryByText('Low risk, established nodes, 10% fee')).not.toBeInTheDocument();
    expect(screen.queryByText('Moderate risk and return, 15% fee')).not.toBeInTheDocument();
    expect(screen.queryByText('Higher APY, newer nodes, 20% fee')).not.toBeInTheDocument();
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

    const impact = screen.getByRole('group', { name: 'Reward-only impact' });

    expect(impact).toBeInTheDocument();
    expect(screen.getByText('Reward-only impact')).toBeInTheDocument();
    expect(screen.queryByText('Impact Preview')).not.toBeInTheDocument();
    expect(screen.getByText('First bonded baseline')).toBeInTheDocument();
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });

  it('does not show a hardcoded projected health grade in the impact preview', () => {
    render(
      <BondSimulator
        currentPositions={[
          {
            nodeAddress: 'thor1existingbond',
            nodeOperatorAddress: 'thor1operator',
            bondAmount: 100_000,
            bondSharePercent: 100,
            status: 'Active',
            operatorFee: 1000,
            operatorFeeFormatted: '10.0%',
            netAPY: 12,
            totalBond: 100_000,
            slashPoints: 0,
            isJailed: false,
            jailReleaseHeight: 0,
            version: '3.19.0',
            requestedToLeave: false,
          },
        ]}
      />
    );

    const impact = screen.getByRole('group', { name: 'Reward-only impact' });
    expect(impact).toBeInTheDocument();
    expect(screen.getByText('Reward-only impact')).toBeInTheDocument();
    expect(screen.getByText('Risk check')).toBeInTheDocument();
    expect(screen.getByText('Not modeled')).toBeInTheDocument();
    expect(screen.getByText('Review slash, jail, and churn before acting')).toBeInTheDocument();
    expect(screen.queryByText('Projected Health')).not.toBeInTheDocument();
    expect(screen.queryByText('Impact Preview')).not.toBeInTheDocument();
  });

  it('frames positive APY delta as reward-only context instead of a green approval', () => {
    render(
      <BondSimulator
        currentPositions={[
          {
            nodeAddress: 'thor1existingbond',
            nodeOperatorAddress: 'thor1operator',
            bondAmount: 100_000,
            bondSharePercent: 100,
            status: 'Active',
            operatorFee: 1000,
            operatorFeeFormatted: '10.0%',
            netAPY: 12,
            totalBond: 100_000,
            slashPoints: 0,
            isJailed: false,
            jailReleaseHeight: 0,
            version: '3.19.0',
            requestedToLeave: false,
          },
        ]}
      />
    );

    const impact = screen.getByRole('group', { name: 'Reward-only impact' });

    expect(impact).toBeInTheDocument();
    expect(screen.getByText('Reward-only impact')).toBeInTheDocument();
    expect(screen.queryByText('Impact Preview')).not.toBeInTheDocument();

    const apyDelta = within(impact).getByText('+43.25%');
    expect(apyDelta).toHaveClass('text-sky-600');
    expect(apyDelta).not.toHaveClass('text-emerald-600');
    expect(screen.getByText('Risk check')).toBeInTheDocument();
    expect(screen.getByText('Not modeled')).toBeInTheDocument();
  });
});
