import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NodeStatusCard } from './node-status-card';
import type { BondPosition } from '@/lib/types/node';
import { getCandidateBondSourceSafety } from '@/lib/dashboard/candidate-bond-source-safety';

const position: BondPosition = {
  nodeAddress: 'thor1nodestatus0000000000000000000000000000',
  nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
  bondAmount: 12_500,
  bondSharePercent: 100,
  status: 'Active',
  operatorFee: 500,
  operatorFeeFormatted: '5.0%',
  netAPY: 12.5,
  totalBond: 12_500,
  slashPoints: 0,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '3.19.0',
  requestedToLeave: false,
};
const freshSourceSafety = getCandidateBondSourceSafety('healthy');

describe('NodeStatusCard', () => {
  it('routes BOND action as a review-first memo entry without prefilled capital and withholds active-node UNBOND', () => {
    render(
      <NodeStatusCard
        position={position}
        address="thor1provider0000000000000000000000000000000"
        sourceSafety={freshSourceSafety}
      />
    );

    expect(screen.queryByRole('link', { name: /Bond 10k/i })).not.toBeInTheDocument();

    const bondLink = screen.getByRole('link', { name: /Review BOND Memo/i });
    expect(bondLink).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1provider0000000000000000000000000000000&action=bond&node=thor1nodestatus0000000000000000000000000000'
    );
    expect(bondLink).not.toHaveAttribute(
      'href',
      expect.stringContaining('amount=10000')
    );
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Review the generated memo and wallet payload before signing/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Review UNBOND Memo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Prepare UNBOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getByText(/UNBOND unavailable:/i)).toBeInTheDocument();
    expect(screen.getByText(/Node must be in Standby status to unbond/i)).toBeInTheDocument();
  });

  it('offers UNBOND memo preparation only for standby nodes', () => {
    render(
      <NodeStatusCard
        position={{ ...position, status: 'Standby' }}
        address="thor1provider0000000000000000000000000000000"
        sourceSafety={freshSourceSafety}
      />
    );

    expect(screen.getByRole('link', { name: /Review UNBOND Memo/i })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1provider0000000000000000000000000000000&action=unbond&node=thor1nodestatus0000000000000000000000000000'
    );
    expect(screen.queryByRole('link', { name: /Prepare UNBOND Memo/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/UNBOND unavailable:/i)).not.toBeInTheDocument();
  });

  it('omits empty dashboard address context from transaction links', () => {
    render(<NodeStatusCard position={position} address={null} sourceSafety={freshSourceSafety} />);

    expect(screen.getByRole('link', { name: /Review BOND Memo/i })).toHaveAttribute(
      'href',
      '/dashboard/transactions?action=bond&node=thor1nodestatus0000000000000000000000000000'
    );
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Review UNBOND Memo/i })).not.toBeInTheDocument();
  });

  it('describes provider exposure evidence on keyboard focus without a grade badge', () => {
    render(<NodeStatusCard position={position} address={null} sourceSafety={freshSourceSafety} />);

    const evidenceButton = screen.getByRole('button', { name: /Provider exposure evidence/i });
    const reviewLabel = screen.getByText('No urgent review');
    expect(reviewLabel).toBeInTheDocument();
    expect(evidenceButton).toHaveClass('text-sky-600');
    expect(evidenceButton).not.toHaveClass('text-emerald-600');
    expect(screen.queryByText('No exposure issue visible')).not.toBeInTheDocument();
    expect(screen.queryByText('A+')).not.toBeInTheDocument();

    fireEvent.focus(evidenceButton);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Provider Exposure');
    expect(screen.getByRole('tooltip')).toHaveTextContent('No urgent review');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Current node inputs show no jail, elevated slash, churn, or status issue');
    expect(screen.getByRole('tooltip')).not.toHaveTextContent(/\bhealthy\b|\bsafe\b/i);
    expect(evidenceButton).toHaveAttribute('aria-describedby');

    fireEvent.blur(evidenceButton);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not label low-bond churn risk as no urgent review', () => {
    render(<NodeStatusCard position={{ ...position, yieldGuardFlags: ['lowest_bond'] }} address={null} sourceSafety={freshSourceSafety} />);

    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.queryByText('No urgent review')).not.toBeInTheDocument();

    const evidenceButton = screen.getByRole('button', { name: /Provider exposure evidence/i });
    fireEvent.focus(evidenceButton);

    expect(screen.getByRole('tooltip')).toHaveTextContent('Churn-risk exposure detected');
    expect(screen.getByRole('tooltip')).not.toHaveTextContent('No urgent review');
  });

  it.each(['degraded', 'down', 'unknown'] as const)('routes BOND prep through focused source checks when THORNode confidence is %s', (thornode) => {
    render(
      <NodeStatusCard
        position={position}
        address="thor1provider0000000000000000000000000000000"
        sourceSafety={getCandidateBondSourceSafety(thornode)}
      />
    );

    expect(screen.queryByRole('link', { name: /Review BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review source checks/i })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1provider0000000000000000000000000000000&node=thor1nodestatus0000000000000000000000000000#risk-source-confidence'
    );
    expect(screen.getByText(thornode === 'unknown' ? /Source pending:/i : /Source degraded:/i)).toBeInTheDocument();
    expect(screen.getByText(thornode === 'unknown' ? /THORNode candidate source check has not completed yet/i : new RegExp(`THORNode candidate source check is ${thornode}`, 'i'))).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Review UNBOND Memo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Prepare UNBOND Memo/i })).not.toBeInTheDocument();
  });

  it('routes provider review nodes through exposure review before BOND memo review', () => {
    render(
      <NodeStatusCard
        position={{ ...position, slashPoints: 150 }}
        address="thor1provider0000000000000000000000000000000"
        sourceSafety={freshSourceSafety}
      />
    );

    expect(screen.queryByRole('link', { name: /Review BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review exposure first/i })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1provider0000000000000000000000000000000&node=thor1nodestatus0000000000000000000000000000'
    );
    expect(screen.getByText(/Provider review required:/i)).toBeInTheDocument();
    expect(screen.getByText(/flagged for provider review/i)).toBeInTheDocument();
    expect(screen.getByText(/Check jail, slash, churn, and yield-guard context before opening BOND memo review/i)).toBeInTheDocument();
    expect(screen.queryByText(/before preparing a BOND memo/i)).not.toBeInTheDocument();
  });

  it('surfaces minor slash exposure as monitor state instead of OK', () => {
    render(
      <NodeStatusCard
        position={{ ...position, slashPoints: 5 }}
        address="thor1provider0000000000000000000000000000000"
        sourceSafety={freshSourceSafety}
      />
    );

    expect(screen.getByText('Monitor slash exposure (5 points)')).toBeInTheDocument();
    expect(screen.queryByText(/OK slash exposure/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review BOND Memo/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Review exposure first/i })).not.toBeInTheDocument();
  });

  it('marks malformed node metrics unavailable instead of rendering NaN or Infinity near transaction actions', () => {
    const { container } = render(
      <NodeStatusCard
        position={{
          ...position,
          totalBond: Number.NaN,
          operatorFee: Number.POSITIVE_INFINITY,
          slashPoints: Number.NEGATIVE_INFINITY,
        }}
        address="thor1provider0000000000000000000000000000000"
        sourceSafety={freshSourceSafety}
      />
    );

    expect(screen.getByRole('link', { name: /Review BOND Memo/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('--')).toHaveLength(3);
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
    expect(screen.queryByText(/High slash exposure/i)).not.toBeInTheDocument();
  });
});
