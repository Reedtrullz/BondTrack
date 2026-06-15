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
  it('routes BOND action as memo preparation without prefilled capital and withholds active-node UNBOND', () => {
    render(
      <NodeStatusCard
        position={position}
        address="thor1provider0000000000000000000000000000000"
        sourceSafety={freshSourceSafety}
      />
    );

    expect(screen.queryByRole('link', { name: /Bond 10k/i })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Prepare BOND Memo/i })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1provider0000000000000000000000000000000&node=thor1nodestatus0000000000000000000000000000&action=bond'
    );
    expect(screen.getByRole('link', { name: /Prepare BOND Memo/i })).not.toHaveAttribute(
      'href',
      expect.stringContaining('amount=10000')
    );
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

    expect(screen.getByRole('link', { name: /Prepare UNBOND Memo/i })).toHaveAttribute(
      'href',
      '/dashboard/transactions?address=thor1provider0000000000000000000000000000000&node=thor1nodestatus0000000000000000000000000000&action=unbond'
    );
    expect(screen.queryByText(/UNBOND unavailable:/i)).not.toBeInTheDocument();
  });

  it('omits empty dashboard address context from transaction links', () => {
    render(<NodeStatusCard position={position} address={null} sourceSafety={freshSourceSafety} />);

    expect(screen.getByRole('link', { name: /Prepare BOND Memo/i })).toHaveAttribute(
      'href',
      '/dashboard/transactions?node=thor1nodestatus0000000000000000000000000000&action=bond'
    );
    expect(screen.queryByRole('link', { name: /Prepare UNBOND Memo/i })).not.toBeInTheDocument();
  });

  it('describes provider exposure grade on keyboard focus', () => {
    render(<NodeStatusCard position={position} address={null} sourceSafety={freshSourceSafety} />);

    const gradeButton = screen.getByRole('button', { name: /Provider exposure grade/i });
    fireEvent.focus(gradeButton);

    expect(screen.getByRole('tooltip')).toHaveTextContent('Provider Exposure');
    expect(gradeButton).toHaveAttribute('aria-describedby');

    fireEvent.blur(gradeButton);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it.each(['degraded', 'down', 'unknown'] as const)('routes BOND prep through focused source review when THORNode confidence is %s', (thornode) => {
    render(
      <NodeStatusCard
        position={position}
        address="thor1provider0000000000000000000000000000000"
        sourceSafety={getCandidateBondSourceSafety(thornode)}
      />
    );

    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review source confidence/i })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1provider0000000000000000000000000000000&node=thor1nodestatus0000000000000000000000000000#risk-source-confidence'
    );
    expect(screen.getByText(thornode === 'unknown' ? /Source pending:/i : /Source degraded:/i)).toBeInTheDocument();
    expect(screen.getByText(thornode === 'unknown' ? /THORNode source confidence has not completed yet/i : new RegExp(`THORNode source confidence is ${thornode}`, 'i'))).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Prepare UNBOND Memo/i })).not.toBeInTheDocument();
  });

  it('routes provider review nodes through exposure review before BOND prep', () => {
    render(
      <NodeStatusCard
        position={{ ...position, slashPoints: 150 }}
        address="thor1provider0000000000000000000000000000000"
        sourceSafety={freshSourceSafety}
      />
    );

    expect(screen.queryByRole('link', { name: /Prepare BOND Memo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review exposure first/i })).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1provider0000000000000000000000000000000&node=thor1nodestatus0000000000000000000000000000'
    );
    expect(screen.getByText(/Provider review required:/i)).toBeInTheDocument();
    expect(screen.getByText(/flagged for provider review/i)).toBeInTheDocument();
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

    expect(screen.getByRole('link', { name: /Prepare BOND Memo/i })).toBeInTheDocument();
    expect(screen.getAllByText('--')).toHaveLength(3);
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
    expect(screen.queryByText(/High slash exposure/i)).not.toBeInTheDocument();
  });
});
